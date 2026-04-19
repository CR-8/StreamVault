'use client'

import { ChannelCard, ChannelCardSkeleton } from '@/components/channel-card'
import type { Channel } from '@/types'

interface ChannelGridProps {
  channels: Channel[]
  loading?: boolean
  skeletonCount?: number
  className?: string
}

export function ChannelGrid({
  channels,
  loading = false,
  skeletonCount = 20,
  className,
}: ChannelGridProps) {
  const gridClass =
    'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3'

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ChannelCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClass}>
      {channels.map((ch) => (
        <ChannelCard key={ch.id} channel={ch} />
      ))}
    </div>
  )
}
