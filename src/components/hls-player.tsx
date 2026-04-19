'use client'

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react'
import Hls, { type Level } from 'hls.js'
import {
  AlertTriangle,
  RefreshCw,
  Loader2,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Settings,
  Wifi,
  Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useStreamVaultStore } from '@/store/useStreamVaultStore'

// ─── Types ──────────────────────────────────────────────────────────────────

type PlayerStatus = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error'

interface HlsPlayerProps {
  streamUrl: string
  sources?: string[]
  channelName: string
  autoPlay?: boolean
  className?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isHlsUrl(url: string): boolean {
  let target = url
  if (url.startsWith('/api/proxy')) {
    const match = url.match(/[?&]url=([^&]+)/)
    if (match) target = decodeURIComponent(match[1])
  }
  const path = target.split('?')[0].toLowerCase()
  return path.endsWith('.m3u8') || path.endsWith('.m3u') || path.includes('/hls/')
}

function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`
}

interface PlayQueueItem {
  url: string
  isProxy: boolean
  srcIdx: number
}

function buildPlayQueue(sources: string[], health: Record<string, number>): PlayQueueItem[] {
  const sorted = [...sources].sort((a, b) => (health[b] ?? 0) - (health[a] ?? 0))
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  
  const queue: PlayQueueItem[] = []
  
  sorted.forEach((source, srcIdx) => {
    // If we're on HTTPS and the source is HTTP, we MUST proxy it. Direct HTTP will fail.
    if (isHttps && source.startsWith('http:')) {
      queue.push({ url: proxyUrl(source), isProxy: true, srcIdx })
    } else {
      // Normal flow: add direct, then we'll add proxy later
      queue.push({ url: source, isProxy: false, srcIdx })
    }
  })

  // Add proxy versions as fallbacks for everything that wasn't already ONLY proxied
  sorted.forEach((source, srcIdx) => {
    if (isHttps && source.startsWith('http:')) {
      // Already exclusively proxied, don't add again
      return
    }
    queue.push({ url: proxyUrl(source), isProxy: true, srcIdx })
  })

  return queue
}

function formatQuality(level: Level): string {
  if (level.height) return `${level.height}p`
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)}k`
  return 'Auto'
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HlsPlayer({
  streamUrl,
  sources = [],
  channelName,
  autoPlay = true,
  className,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const allSources = useRef<string[]>([])
  const queueRef = useRef<PlayQueueItem[]>([])
  const queueIdx = useRef(0)
  const playingUrl = useRef('')
  const isProxy = useRef(false)
  // Use a ref for status so timeout callbacks read fresh value
  const statusRef = useRef<PlayerStatus>('idle')

  const [status, setStatusState] = useState<PlayerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [sourceLabel, setSourceLabel] = useState('')
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [levels, setLevels] = useState<Level[]>([])
  const [currentLevel, setCurrentLevel] = useState(-1)   // -1 = auto
  const [isPiP, setIsPiP] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)

  // Sync status ref with state
  const setStatus = useCallback((s: PlayerStatus) => {
    statusRef.current = s
    setStatusState(s)
  }, [])

  const markSuccess = useStreamVaultStore((s) => s.markStreamSuccess)
  const markFailure = useStreamVaultStore((s) => s.markStreamFailure)
  const health = useStreamVaultStore((s) => s.streamHealth)

  // ── SSR-safe PiP detection ────────────────────────────────────────────────
  useEffect(() => {
    setPipSupported(typeof document !== 'undefined' && 'pictureInPictureEnabled' in document)
  }, [])

  // ── Controls auto-hide ────────────────────────────────────────────────────
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => {
      if (statusRef.current === 'playing') setShowControls(false)
    }, 3000)
  }, [])

  // ── Stall timer helpers ───────────────────────────────────────────────────
  const clearStallTimer = useCallback(() => {
    if (stallTimer.current) { clearTimeout(stallTimer.current); stallTimer.current = null }
  }, [])

  // ── Destroy HLS instance ──────────────────────────────────────────────────
  const destroyHls = useCallback(() => {
    clearStallTimer()
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    setLevels([])
    setCurrentLevel(-1)
  }, [clearStallTimer])

  // ── Try the next URL in the queue ─────────────────────────────────────────
  const tryNext = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const queue = queueRef.current

    if (queueIdx.current >= queue.length) {
      setStatus('error')
      setErrorMessage('All stream sources failed. The channel may be offline.')
      return
    }

    const { url, isProxy: proxied, srcIdx } = queue[queueIdx.current]
    const total = allSources.current.length

    queueIdx.current++
    isProxy.current = proxied
    playingUrl.current = allSources.current[srcIdx] ?? url

    setSourceLabel(
      total > 1 || proxied
        ? `source ${srcIdx + 1}/${total}${proxied ? ' · proxy' : ''}`
        : ''
    )

    destroyHls()
    setStatus('loading')
    setErrorMessage('')

    // ── Native HLS (Safari) / non-HLS path ───────────────────────────────
    const isMp4 = url.split('?')[0].toLowerCase().endsWith('.mp4')
    const canPlayNativeHls = video.canPlayType('application/vnd.apple.mpegurl')
    const hlsSupported = Hls.isSupported()

    if (isMp4 || (canPlayNativeHls && !hlsSupported) || !hlsSupported) {
      video.src = url
      if (autoPlay) {
        video.play().catch((e: DOMException) => {
          if (e.name === 'AbortError') return
          if (e.name === 'NotAllowedError') {
            console.warn('[HlsPlayer] Autoplay blocked:', e)
            setStatus('paused')
            return
          }
          if (e.name === 'NotSupportedError') {
             // Fall through to failure
          }
          markFailure(playingUrl.current)
          tryNext()
        })
      }
      stallTimer.current = setTimeout(() => {
        if (statusRef.current !== 'playing' && statusRef.current !== 'paused') {
          markFailure(playingUrl.current)
          tryNext()
        }
      }, 10_000)
      return
    }

    // ── HLS.js path ───────────────────────────────────────────────────────

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      fragLoadingTimeOut: 15_000,
      manifestLoadingTimeOut: 10_000,
      levelLoadingTimeOut: 10_000,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      startPosition: -1,
      xhrSetup: (xhr) => { xhr.withCredentials = false },
    })

    hls.loadSource(url)
    hls.attachMedia(video)

    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      clearStallTimer()
      setLevels(data.levels)
      setStatus('playing')
      markSuccess(playingUrl.current)
      if (autoPlay) {
        video.play().catch((e) => {
          if (e.name === 'AbortError') return
          if (e.name === 'NotAllowedError') {
            console.warn('[HlsPlayer] Autoplay blocked:', e)
            setStatus('paused')
            return
          }
          console.warn('[HlsPlayer] Autoplay error:', e)
        })
      }
    })

    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      setCurrentLevel(data.level)
    })

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return

      clearStallTimer()
      markFailure(playingUrl.current)

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError()
        stallTimer.current = setTimeout(() => {
          if (statusRef.current !== 'playing') tryNext()
        }, 3_000)
        return
      }

      tryNext()
    })

    // Manifest stall guard
    stallTimer.current = setTimeout(() => {
      if (statusRef.current !== 'playing' && statusRef.current !== 'paused') {
        markFailure(playingUrl.current)
        tryNext()
      }
    }, 12_000)

    hlsRef.current = hls
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, clearStallTimer, destroyHls, markSuccess, markFailure])

  // ── Start / restart the whole queue ──────────────────────────────────────
  const initPlayer = useCallback(() => {
    const unique = [...new Set([streamUrl, ...sources].filter(Boolean))]
    allSources.current = unique
    queueRef.current = buildPlayQueue(unique, health)
    queueIdx.current = 0
    setShowControls(true)
    tryNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, sources, tryNext])

  useEffect(() => {
    initPlayer()
    return destroyHls
  }, [initPlayer, destroyHls])

  // ── Video element event listeners ─────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlaying = () => { setStatus('playing'); showControlsTemporarily() }
    const onPause = () => { setStatus('paused'); setShowControls(true) }
    const onWaiting = () => {
      // Only show buffering when stream was already playing
      if (statusRef.current === 'playing') setStatus('buffering')
    }
    const onCanPlay = () => {
      if (statusRef.current === 'buffering') setStatus('playing')
    }
    const onVolumeChange = () => {
      setVolume(video.volume)
      setMuted(video.muted)
    }
    const onEnterPiP = () => setIsPiP(true)
    const onLeavePiP = () => setIsPiP(false)

    video.addEventListener('playing', onPlaying)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('volumechange', onVolumeChange)
    video.addEventListener('enterpictureinpicture', onEnterPiP)
    video.addEventListener('leavepictureinpicture', onLeavePiP)

    return () => {
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('volumechange', onVolumeChange)
      video.removeEventListener('enterpictureinpicture', onEnterPiP)
      video.removeEventListener('leavepictureinpicture', onLeavePiP)
    }
  }, [setStatus, showControlsTemporarily])

  // ── Fullscreen listener ───────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onKey = (e: KeyboardEvent) => {
      // Only intercept when focus is inside the player
      if (!container.contains(document.activeElement) && document.activeElement !== document.body) return

      const video = videoRef.current
      if (!video) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          if (video.paused) {
            video.play().catch(err => {
              if (err.name !== 'AbortError' && err.name !== 'NotAllowedError' && err.name !== 'NotSupportedError') {
                console.warn('[HlsPlayer] Play error:', err)
              }
            })
          } else {
            video.pause()
          }
          showControlsTemporarily()
          break
        case 'ArrowUp':
          e.preventDefault()
          video.volume = Math.min(1, video.volume + 0.1)
          showControlsTemporarily()
          break
        case 'ArrowDown':
          e.preventDefault()
          video.volume = Math.max(0, video.volume - 0.1)
          showControlsTemporarily()
          break
        case 'm':
          e.preventDefault()
          video.muted = !video.muted
          showControlsTemporarily()
          break
        case 'f':
          e.preventDefault()
          handleFullscreen()
          break
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showControlsTemporarily])

  // ── Control handlers ──────────────────────────────────────────────────────
  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch((e) => {
        if (e.name !== 'AbortError' && e.name !== 'NotAllowedError' && e.name !== 'NotSupportedError') {
          console.warn('[HlsPlayer] Play error:', e)
        }
      })
    } else {
      video.pause()
    }
    showControlsTemporarily()
  }

  const handleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const val = parseFloat(e.target.value)
    video.volume = val
    if (val === 0) video.muted = true
    else if (video.muted) video.muted = false
  }

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
    const el = containerRef.current
    if (!el) return
    try {
      document.fullscreenElement
        ? await document.exitFullscreen()
        : await el.requestFullscreen()
    } catch (e) { console.warn('[HlsPlayer] Fullscreen error:', e) }
  }

  const handleQualityChange = (levelIndex: number) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = levelIndex
    setCurrentLevel(levelIndex)
  }

  const handleRetry = () => initPlayer()

  // ── Derived state ─────────────────────────────────────────────────────────
  const isLoading = status === 'loading'
  const isBuffering = status === 'buffering'
  const isError = status === 'error'
  const isPlaying = status === 'playing' || status === 'buffering'
  const isPaused = status === 'paused'
  const isActive = isPlaying || isPaused

  const currentLevelLabel = useMemo(() => {
    if (currentLevel === -1 || !levels[currentLevel]) return 'Auto'
    return formatQuality(levels[currentLevel])
  }, [currentLevel, levels])

  const controlsVisible = showControls || isLoading || isError || isBuffering || isPaused

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full bg-black rounded-xl overflow-hidden aspect-video group select-none',
        className
      )}
      tabIndex={0}
      aria-label={`${channelName} player`}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => { if (isPlaying) setShowControls(false) }}
      onClick={isActive ? handlePlayPause : undefined}
    >
      {/* Video element — no native controls */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        title={channelName}
        aria-label={`${channelName} live stream`}
      />

      {/* ── Loading overlay ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3 pointer-events-none">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <Radio className="absolute inset-0 m-auto h-5 w-5 text-primary/60" />
          </div>
          <p className="text-sm font-medium">Connecting to stream…</p>
          {sourceLabel && (
            <p className="text-xs text-white/40 flex items-center gap-1.5">
              <Wifi className="h-3 w-3" />
              {sourceLabel}
            </p>
          )}
        </div>
      )}

      {/* ── Buffering spinner (during playback) ───────────────────────── */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>
      )}

      {/* ── Error overlay ──────────────────────────────────────────────── */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white gap-5 p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-destructive/15 p-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mt-1">Stream Unavailable</h3>
            <p className="text-sm text-white/50 max-w-xs">{errorMessage}</p>
          </div>
          <Button onClick={handleRetry} variant="secondary" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry all sources
          </Button>
        </div>
      )}

      {/* ── Controls bar ───────────────────────────────────────────────── */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 transition-all duration-300',
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}
        onClick={(e) => e.stopPropagation()}  // don't propagate to play/pause
      >
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-2 px-3 pb-3 pt-8">
          {/* Play / Pause */}
          {isActive && (
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-primary transition-colors p-1.5 rounded-md hover:bg-white/10"
              aria-label={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused
                ? <Play className="h-5 w-5 fill-current" />
                : <Pause className="h-5 w-5 fill-current" />
              }
            </button>
          )}

          {/* Live badge */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80 ml-1 mr-auto">
            <span className="live-dot" />
            <span className="tracking-widest uppercase text-[10px]">Live</span>
            {sourceLabel && (
              <span className="text-white/30 font-normal ml-1">· {sourceLabel}</span>
            )}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              onClick={handleMute}
              className="text-white hover:text-primary transition-colors p-1.5 rounded-md hover:bg-white/10"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0
                ? <VolumeX className="h-4 w-4" />
                : <Volume2 className="h-4 w-4" />
              }
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 accent-primary cursor-pointer"
              aria-label="Volume"
            />
          </div>

          {/* Quality selector */}
          {levels.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 text-white hover:text-primary transition-colors p-1.5 rounded-md hover:bg-white/10"
                  aria-label="Quality settings"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-[10px] font-mono font-medium">{currentLevelLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Quality</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleQualityChange(-1)}
                  className={cn('text-xs', currentLevel === -1 && 'text-primary font-semibold')}
                >
                  Auto
                </DropdownMenuItem>
                {levels.map((lvl, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={() => handleQualityChange(idx)}
                    className={cn('text-xs', currentLevel === idx && 'text-primary font-semibold')}
                  >
                    {formatQuality(lvl)}
                    {lvl.bitrate && (
                      <span className="ml-auto text-muted-foreground">{Math.round(lvl.bitrate / 1000)}k</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* PiP */}
          {pipSupported && (
            <button
              onClick={handlePiP}
              className={cn(
                'text-white hover:text-primary transition-colors p-1.5 rounded-md hover:bg-white/10',
                isPiP && 'text-primary'
              )}
              aria-label={isPiP ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
            >
              <PictureInPicture2 className="h-4 w-4" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className="text-white hover:text-primary transition-colors p-1.5 rounded-md hover:bg-white/10"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen
              ? <Minimize2 className="h-4 w-4" />
              : <Maximize2 className="h-4 w-4" />
            }
          </button>
        </div>
      </div>

      {/* ── Channel name badge (top-left, shows on hover) ─────────────── */}
      {isActive && (
        <div
          className={cn(
            'absolute top-3 left-3 transition-all duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <span className="text-xs bg-black/60 text-white/80 rounded-md px-2 py-1 font-medium backdrop-blur-sm">
            {channelName}
          </span>
        </div>
      )}
    </div>
  )
}