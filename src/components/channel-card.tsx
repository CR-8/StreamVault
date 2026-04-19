'use client'

import Link from 'next/link'
import { Heart, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Channel } from '@/types'
import { CATEGORY_ICONS } from '@/types'
import { useStreamVaultStore, selectIsFavorite } from '@/store/useStreamVaultStore'

interface ChannelCardProps {
  channel: Channel
  variant?: 'compact' | 'default' | 'featured'
  className?: string
}


export function ChannelCard({ channel, variant = 'default', className }: ChannelCardProps) {
  const isFav = useStreamVaultStore(selectIsFavorite(channel.id))
  const toggleFavorite = useStreamVaultStore((s) => s.toggleFavorite)

  if (variant === 'compact') {
    return (
      <Link
        href={`/watch/${channel.id}`}
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3',
          'hover:bg-accent/50 hover:border-border transition-all duration-200',
          className
        )}
        aria-label={`Watch ${channel.name}`}
      >
        {channel.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logo}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded object-contain bg-muted shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            loading="lazy"
          />
        ) : (
          <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-lg shrink-0">
            {CATEGORY_ICONS[channel.groupTitle as keyof typeof CATEGORY_ICONS] ?? '📺'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-tight">{channel.name}</p>
          <p className="text-xs text-muted-foreground truncate">{channel.groupTitle}</p>
        </div>
        <Play className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </Link>
    )
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden',
        'hover:border-border hover:shadow-md transition-all duration-200',
        className
      )}
    >
      {/* Logo area */}
      <Link
        href={`/watch/${channel.id}`}
        className="relative flex h-28 items-center justify-center bg-muted/50 group/link"
        aria-label={`Watch ${channel.name}`}
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
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/link:bg-black/40 transition-colors duration-200">
          <Play className="h-8 w-8 text-white opacity-0 group-hover/link:opacity-100 transition-opacity duration-200 fill-white" />
        </div>
      </Link>

      {/* Details */}
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate leading-tight">{channel.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {CATEGORY_ICONS[channel.groupTitle as keyof typeof CATEGORY_ICONS]}{' '}
              {channel.groupTitle}
            </Badge>
            {channel.country && (
              <span className="text-xs text-muted-foreground uppercase">{channel.country}</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0 transition-colors',
            isFav ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'
          )}
          onClick={(e) => {
            e.preventDefault()
            toggleFavorite(channel.id)
          }}
          aria-label={isFav ? `Remove ${channel.name} from favorites` : `Add ${channel.name} to favorites`}
          aria-pressed={isFav}
        >
          <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
        </Button>
      </div>
    </div>
  )
}

export function ChannelCardSkeleton({ variant = 'default' }: { variant?: 'compact' | 'default' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
        <Skeleton className="h-9 w-9 rounded shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <Skeleton className="h-28 w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
