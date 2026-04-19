'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { AlertTriangle, RefreshCw, Loader2, Maximize2, PictureInPicture2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error'

interface HlsPlayerProps {
  streamUrl: string
  channelName: string
  autoPlay?: boolean
  className?: string
}

export function HlsPlayer({ streamUrl, channelName, autoPlay = true, className }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [status, setStatus] = useState<PlayerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [retryCount, setRetryCount] = useState(0)

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
  }, [])

  const initPlayer = useCallback(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return

    destroyHls()
    setStatus('loading')
    setErrorMessage('')

    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('.m3u')

    // Safari / native HLS or non-HLS streams
    if (!isHls || (video.canPlayType('application/vnd.apple.mpegurl') && !Hls.isSupported())) {
      video.src = streamUrl
      video.play().catch((e: DOMException) => {
        // AbortError = cleanup interrupted a pending play() — benign, ignore it
        if (e.name === 'AbortError') return
        // NotSupportedError = browser can't play this media type
        setStatus('error')
        setErrorMessage(
          e.name === 'NotSupportedError'
            ? 'This stream format is not supported by your browser.'
            : 'Playback failed. The stream may be offline or unsupported.'
        )
      })
      return
    }

    // HLS.js path (Chrome, Firefox, etc.)
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 20000,
        levelLoadingTimeOut: 20000,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startPosition: -1,
      })

      hls.loadSource(streamUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('playing')
        if (autoPlay) {
          video.play().catch((e) => {
            console.warn('[HlsPlayer] Autoplay blocked:', e)
            setStatus('playing') // Controls still visible
          })
        }
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setStatus('error')
              setErrorMessage('Network error — stream may be offline or rate-limited. Try again.')
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              // Attempt recovery once
              hls.recoverMediaError()
              break
            default:
              setStatus('error')
              setErrorMessage('Stream playback error. The channel may be temporarily unavailable.')
              break
          }
        }
      })

      hlsRef.current = hls
    } else {
      setStatus('error')
      setErrorMessage('HLS is not supported in this browser.')
    }
  }, [streamUrl, autoPlay, destroyHls])

  useEffect(() => {
    initPlayer()
    return destroyHls
  }, [initPlayer, destroyHls])

  const handleRetry = () => {
    setRetryCount((c) => c + 1)
    initPlayer()
  }

  const handlePiP = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch (e) {
      console.warn('[HlsPlayer] PiP error:', e)
    }
  }

  const handleFullscreen = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await video.requestFullscreen()
      }
    } catch (e) {
      console.warn('[HlsPlayer] Fullscreen error:', e)
    }
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Connecting to stream…</p>
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
            Retry {retryCount > 0 ? `(${retryCount})` : ''}
          </Button>
        </div>
      )}

      {/* Floating controls (PiP + Fullscreen) */}
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
    </div>
  )
}
