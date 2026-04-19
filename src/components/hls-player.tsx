'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { AlertTriangle, RefreshCw, Loader2, Maximize2, PictureInPicture2, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStreamVaultStore } from '@/store/useStreamVaultStore'

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error'

interface HlsPlayerProps {
  /** Primary stream URL */
  streamUrl: string
  /** All known source URLs for this channel (including streamUrl) */
  sources?: string[]
  channelName: string
  autoPlay?: boolean
  className?: string
}

// Detect HLS content by URL extension or by content that HLS.js should handle
function isHlsUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase()
  return path.endsWith('.m3u8') || path.endsWith('.m3u') || path.includes('/hls/')
}

// Route a stream URL through /api/proxy so segments are also proxied
function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`
}

// Build the ordered list of URLs to try:
//   Pass 1 — direct (no proxy), best-scored first
//   Pass 2 — via proxy, same order
function buildPlayQueue(sources: string[], health: Record<string, number>): string[] {
  const sorted = [...sources].sort((a, b) => (health[b] ?? 0) - (health[a] ?? 0))
  return [...sorted, ...sorted.map(proxyUrl)]
}

export function HlsPlayer({
  streamUrl,
  sources = [],
  channelName,
  autoPlay = true,
  className,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef   = useRef<Hls | null>(null)

  const [status,       setStatus]       = useState<PlayerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [sourceLabel,  setSourceLabel]  = useState('')   // e.g. "source 2 of 3 (proxy)"

  const markSuccess = useStreamVaultStore((s) => s.markStreamSuccess)
  const markFailure = useStreamVaultStore((s) => s.markStreamFailure)
  const health      = useStreamVaultStore((s) => s.streamHealth)

  // Build the queue from all unique sources (streamUrl always included)
  const allSources = useRef<string[]>([])
  const queueRef   = useRef<string[]>([])
  const queueIdx   = useRef(0)
  const playingUrl  = useRef('')          // raw (un-proxied) URL being attempted
  const isProxy     = useRef(false)

  // Timeout handle for stalled-stream detection
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearStallTimer = () => {
    if (stallTimer.current) { clearTimeout(stallTimer.current); stallTimer.current = null }
  }

  const destroyHls = useCallback(() => {
    clearStallTimer()
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
  }, [])

  // ── Try the next URL in the queue ──────────────────────────────────────────
  const tryNext = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const queue = queueRef.current

    if (queueIdx.current >= queue.length) {
      // Exhausted all sources + proxy variants
      setStatus('error')
      setErrorMessage('All stream sources failed. The channel may be offline.')
      return
    }

    const url = queue[queueIdx.current]
    const srcIdx  = queueIdx.current < allSources.current.length
      ? queueIdx.current
      : queueIdx.current - allSources.current.length
    const total   = allSources.current.length
    const proxied = queueIdx.current >= allSources.current.length

    queueIdx.current++
    isProxy.current  = proxied
    playingUrl.current = allSources.current[srcIdx] ?? url

    setSourceLabel(
      total > 1 || proxied
        ? `source ${srcIdx + 1}/${total}${proxied ? ' · proxy' : ''}`
        : ''
    )

    destroyHls()
    setStatus('loading')
    setErrorMessage('')

    // ── Native / non-HLS path ─────────────────────────────────────────────
    if (!isHlsUrl(url) || (video.canPlayType('application/vnd.apple.mpegurl') && !Hls.isSupported())) {
      video.src = url
      video.play().catch((e: DOMException) => {
        if (e.name === 'AbortError') return
        markFailure(playingUrl.current)
        tryNext()
      })
      // Stall guard: if readyState hasn't reached HAVE_ENOUGH_DATA within 8s, bail
      stallTimer.current = setTimeout(() => {
        if (video.readyState < 3 && status !== 'playing') {
          markFailure(playingUrl.current)
          tryNext()
        }
      }, 8000)
      return
    }

    // ── HLS.js path ───────────────────────────────────────────────────────
    if (!Hls.isSupported()) {
      setStatus('error')
      setErrorMessage('HLS is not supported in this browser.')
      return
    }

    const hls = new Hls({
      enableWorker:            true,
      lowLatencyMode:          false,
      fragLoadingTimeOut:      15000,
      manifestLoadingTimeOut:  10000,
      levelLoadingTimeOut:     10000,
      maxBufferLength:         30,
      maxMaxBufferLength:      60,
      startPosition:           -1,
      xhrSetup: (xhr) => {
        // Ensure CORS credentials are NOT sent (avoids preflight failures)
        xhr.withCredentials = false
      },
    })

    hls.loadSource(url)
    hls.attachMedia(video)

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setStatus('playing')
      markSuccess(playingUrl.current)
      clearStallTimer()
      if (autoPlay) {
        video.play().catch((e) => {
          if (e.name !== 'AbortError') console.warn('[HlsPlayer] Autoplay blocked:', e)
        })
      }
    })

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return   // non-fatal: HLS.js handles internally

      clearStallTimer()
      markFailure(playingUrl.current)

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        // Try media recovery once before moving to the next source
        hls.recoverMediaError()
        stallTimer.current = setTimeout(() => {
          // If recovery didn't help, move on
          tryNext()
        }, 3000)
        return
      }

      tryNext()
    })

    // Stall guard: if manifest hasn't parsed within 10s, try the next source
    stallTimer.current = setTimeout(() => {
      if (status !== 'playing') {
        markFailure(playingUrl.current)
        tryNext()
      }
    }, 10000)

    hlsRef.current = hls

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, destroyHls, markSuccess, markFailure])

  // ── Start / restart the whole queue ──────────────────────────────────────
  const initPlayer = useCallback(() => {
    const unique = [...new Set([streamUrl, ...sources].filter(Boolean))]
    allSources.current = unique
    queueRef.current   = buildPlayQueue(unique, health)
    queueIdx.current   = 0
    tryNext()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, sources, tryNext])  // health intentionally excluded — don't re-init on every health update

  useEffect(() => {
    initPlayer()
    return destroyHls
  }, [initPlayer, destroyHls])

  // Track playing state from video element events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onPlaying = () => setStatus('playing')
    const onWaiting = () => { /* keep status as playing to avoid overlay flash */ }
    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    return () => {
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
    }
  }, [])

  const handleRetry = () => initPlayer()

  const handlePiP = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      document.pictureInPictureElement
        ? await document.exitPictureInPicture()
        : await video.requestPictureInPicture()
    } catch (e) { console.warn('[HlsPlayer] PiP error:', e) }
  }

  const handleFullscreen = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      document.fullscreenElement
        ? await document.exitFullscreen()
        : await video.requestFullscreen()
    } catch (e) { console.warn('[HlsPlayer] Fullscreen error:', e) }
  }

  return (
    <div className={cn('relative w-full bg-black rounded-xl overflow-hidden aspect-video group', className)}>
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
        title={channelName}
        aria-label={`${channelName} live stream player`}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3 pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Connecting to stream…</p>
          {sourceLabel && (
            <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
              <Wifi className="h-3 w-3" /> {sourceLabel}
            </p>
          )}
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white gap-4 p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h3 className="text-lg font-semibold">Stream Unavailable</h3>
            <p className="text-sm text-muted-foreground max-w-xs">{errorMessage}</p>
          </div>
          <Button onClick={handleRetry} variant="secondary" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry all sources
          </Button>
        </div>
      )}

      {/* Floating controls (PiP + Fullscreen) — only on hover */}
      {status === 'playing' && (
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {'pictureInPictureEnabled' in document && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-md"
              onClick={handlePiP}
              aria-label="Toggle Picture-in-Picture"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-md"
            onClick={handleFullscreen}
            aria-label="Toggle fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Source label badge (bottom-left, shown while loading or playing multi-source) */}
      {sourceLabel && status === 'playing' && (
        <div className="absolute bottom-12 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] bg-black/60 text-white/70 rounded px-1.5 py-0.5 font-mono">
            {sourceLabel}
          </span>
        </div>
      )}
    </div>
  )
}
