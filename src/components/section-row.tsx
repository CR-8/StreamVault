'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChannelCard, ChannelCardSkeleton } from '@/components/channel-card'
import type { Channel } from '@/types'
import { cn } from '@/lib/utils'

interface SectionRowProps {
  title: string
  icon?: string
  channels: Channel[]
  loading?: boolean
  className?: string
}

export function SectionRow({ title, icon, channels, loading = false, className }: SectionRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  if (!loading && channels.length === 0) return null

  return (
    <section className={cn('space-y-3', className)} aria-labelledby={`section-${title}`}>
      <div className="flex items-center justify-between px-1">
        <h2 id={`section-${title}`} className="text-lg font-semibold flex items-center gap-2">
          {icon && <span aria-hidden="true">{icon}</span>}
          {title}
          {!loading && (
            <span className="text-sm font-normal text-muted-foreground">
              ({channels.length})
            </span>
          )}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => scroll('left')}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => scroll('right')}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shrink-0 w-44 snap-start">
                <ChannelCardSkeleton />
              </div>
            ))
          : channels.slice(0, 40).map((channel) => (
              <div key={channel.id} className="shrink-0 w-44 snap-start">
                <ChannelCard channel={channel} />
              </div>
            ))}
      </div>
    </section>
  )
}
