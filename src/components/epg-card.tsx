'use client'

import Link from 'next/link'
import { Play, Clock, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Channel } from '@/types'
import { CATEGORY_ICONS } from '@/types'
import type { EpgChannelData } from '@/lib/epg'
import { formatTime, getProgrammeProgress } from '@/lib/epg'

interface EpgCardProps {
  channel: Channel
  epg: EpgChannelData | null
  /** true = EPG is still being fetched for this channel */
  loading?: boolean
}

export function EpgCard({ channel, epg, loading = false }: EpgCardProps) {
  const current = epg?.current ?? null
  const next     = epg?.next ?? null
  const hasLive  = !!current
  const progress = current ? getProgrammeProgress(current) : 0

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border bg-card overflow-hidden transition-all duration-200',
        hasLive
          ? 'border-primary/40 hover:border-primary hover:shadow-md hover:shadow-primary/10'
          : 'border-border/40 opacity-60 grayscale-[40%]'
      )}
    >
      {/* LIVE badge */}
      {hasLive && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
          </span>
          LIVE
        </div>
      )}

      {/* Logo / thumbnail area */}
      <Link
        href={hasLive ? `/watch/${channel.id}` : '#'}
        className={cn(
          'relative flex h-28 items-center justify-center bg-muted/50',
          hasLive ? 'group/link cursor-pointer' : 'cursor-not-allowed pointer-events-none'
        )}
        aria-label={hasLive ? `Watch ${channel.name}` : `${channel.name} — no live programme`}
        tabIndex={hasLive ? 0 : -1}
      >
        {channel.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logo}
            alt=""
            className="h-20 w-auto max-w-full object-contain p-2"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            loading="lazy"
          />
        ) : (
          <span className="text-4xl text-muted-foreground">
            {CATEGORY_ICONS[channel.groupTitle as keyof typeof CATEGORY_ICONS] ?? '📺'}
          </span>
        )}

        {/* Play overlay — only for live channels */}
        {hasLive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/link:bg-black/40 transition-colors duration-200">
            <Play className="h-8 w-8 text-white opacity-0 group-hover/link:opacity-100 transition-opacity duration-200 fill-white" />
          </div>
        )}

        {/* No-EPG overlay */}
        {!hasLive && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Radio className="h-6 w-6 text-muted-foreground/60" />
          </div>
        )}
      </Link>

      {/* Progress bar — only when live */}
      {hasLive && (
        <div className="h-0.5 w-full bg-border/50">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        <p className="text-sm font-semibold truncate leading-tight">{channel.name}</p>

        {loading ? (
          <div className="space-y-1.5 mt-1">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : current ? (
          <>
            <p className="text-xs font-medium text-primary truncate leading-tight" title={current.title}>
              {current.title}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span>
                {formatTime(current.start)} – {formatTime(current.stop)}
              </span>
            </div>
            {next && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                Up next: <span className="text-foreground/70">{next.title}</span>
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">No programme data</p>
        )}

        <div className="mt-auto pt-2 flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {CATEGORY_ICONS[channel.groupTitle as keyof typeof CATEGORY_ICONS]}{' '}
            {channel.groupTitle}
          </Badge>
          {channel.country && (
            <span className="text-xs text-muted-foreground uppercase">{channel.country}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function EpgCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <Skeleton className="h-28 w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
