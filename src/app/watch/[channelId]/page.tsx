'use client'

import { use, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Heart, Tag } from 'lucide-react'
import { HlsPlayer } from '@/components/hls-player'
import { ChannelCard } from '@/components/channel-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useStreamVaultStore,
  selectIsFavorite,
  selectChannelById,
} from '@/store/useStreamVaultStore'
import { CATEGORY_ICONS } from '@/types'
import { cn } from '@/lib/utils'

interface WatchPageProps {
  params: Promise<{ channelId: string }>
}

export default function WatchPage({ params }: WatchPageProps) {
  const { channelId } = use(params)
  const router = useRouter()

  const channel = useStreamVaultStore(selectChannelById(channelId))
  const allChannels = useStreamVaultStore((s) => s.channels)
  const isFav = useStreamVaultStore(selectIsFavorite(channelId))
  const toggleFavorite = useStreamVaultStore((s) => s.toggleFavorite)
  const addToHistory = useStreamVaultStore((s) => s.addToHistory)

  // Related channels (same group-title, excluding current)
  const relatedChannels = useMemo(() => {
    if (!channel) return []
    return allChannels
      .filter((c) => c.groupTitle === channel.groupTitle && c.id !== channelId)
      .slice(0, 30)
  }, [allChannels, channel, channelId])

  // Add to watch history when channel loaded
  useEffect(() => {
    if (channel) {
      addToHistory(channel)
    }
  }, [channel, addToHistory])

  // If channels haven't loaded yet, show skeleton
  if (allChannels.length > 0 && !channel) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
        <p className="text-muted-foreground">Channel not found.</p>
        <Button asChild variant="outline">
          <Link href="/browse">← Browse Channels</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-2 -ml-2"
        onClick={() => router.back()}
        id="back-btn"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Player */}
          {channel ? (
            <HlsPlayer
              streamUrl={channel.streamUrl}
              channelName={channel.name}
              autoPlay
            />
          ) : (
            <Skeleton className="w-full aspect-video rounded-xl" />
          )}

          {/* Channel info */}
          {channel ? (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {channel.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={channel.logo}
                    alt=""
                    className="h-12 w-12 rounded-lg object-contain bg-muted shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="min-w-0">
                  <h1 className="text-xl font-bold truncate">{channel.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Tag className="h-3 w-3" />
                      {CATEGORY_ICONS[channel.groupTitle as keyof typeof CATEGORY_ICONS]}{' '}
                      {channel.groupTitle}
                    </Badge>
                    {channel.country && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Globe className="h-3 w-3" />
                        {channel.country.toUpperCase()}
                      </Badge>
                    )}
                    {channel.language && (
                      <span className="text-xs text-muted-foreground">{channel.language}</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="live-dot" />
                      LIVE
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant={isFav ? 'default' : 'outline'}
                size="sm"
                className={cn('gap-2 shrink-0', isFav && 'bg-red-500 hover:bg-red-600 border-red-500')}
                onClick={() => toggleFavorite(channelId)}
                aria-pressed={isFav}
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                id="favorite-btn"
              >
                <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
                {isFav ? 'Favorited' : 'Favorite'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          )}
        </div>

        {/* Related channels sidebar */}
        {relatedChannels.length > 0 && (
          <aside
            className="w-full lg:w-72 xl:w-80 shrink-0"
            aria-label="Related channels"
          >
            <div className="rounded-xl border border-border/50 bg-card">
              <div className="p-4 pb-3">
                <h2 className="text-sm font-semibold">
                  More {channel?.groupTitle ?? 'channels'}
                </h2>
              </div>
              <Separator />
              <ScrollArea className="h-[calc(100vh-16rem)] lg:h-[520px]">
                <div className="p-3 space-y-2">
                  {relatedChannels.map((ch) => (
                    <ChannelCard key={ch.id} channel={ch} variant="compact" />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
