'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Rss, ShoppingBag, Tv2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionRow } from '@/components/section-row'
import { ChannelCard } from '@/components/channel-card'
import { useStreamVaultStore } from '@/store/useStreamVaultStore'
import { CONTENT_CATEGORIES, CATEGORY_ICONS, type ContentCategory } from '@/types'

export default function HomePage() {
  const channels = useStreamVaultStore((s) => s.channels)
  const history = useStreamVaultStore((s) => s.history)
  const favorites = useStreamVaultStore((s) => s.favorites)
  const loadingStates = useStreamVaultStore((s) => s.loadingStates)

  const isLoading = Object.values(loadingStates).some((s) => s === 'loading')
  const hasChannels = channels.length > 0

  // Group channels by category for section rows
  const channelsByCategory = useMemo(() => {
    const map: Record<string, typeof channels> = {}
    for (const ch of channels) {
      const cat = ch.groupTitle || 'Other'
      if (!map[cat]) map[cat] = []
      map[cat].push(ch)
    }
    return map
  }, [channels])

  // Continue watching (from history)
  const historyChannels = useMemo(() => {
    const channelMap = new Map(channels.map((c) => [c.id, c]))
    return history
      .slice(0, 20)
      .map((h) => channelMap.get(h.channelId))
      .filter(Boolean) as typeof channels
  }, [history, channels])

  // Favourites
  const favoriteChannels = useMemo(() => {
    const channelMap = new Map(channels.map((c) => [c.id, c]))
    return favorites.map((id) => channelMap.get(id)).filter(Boolean) as typeof channels
  }, [favorites, channels])

  // Featured hero channel (first available)
  const heroChannel = channels[0] ?? null

  // Sections to render in order
  const categoryOrder: ContentCategory[] = [
    'News', 'Sports', 'Movies', 'Entertainment',
    'Music', 'Documentary', 'Kids', 'Education', 'Animation', 'Comedy', 'Lifestyle',
  ]

  return (
    <div className="flex flex-col">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex flex-col items-start gap-6 max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary">
              <span className="live-dot" />
              <span className="font-medium">{channels.length.toLocaleString()} channels available</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Watch Live TV
              <br />
              <span className="gradient-text">Anywhere, Instantly</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed">
              Thousands of free channels from 160+ countries. No account. No payment. Just TV.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2 font-semibold">
                <Link href="/browse">
                  <Tv2 className="h-5 w-5" />
                  Browse Channels
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="/marketplace">
                  <ShoppingBag className="h-5 w-5" />
                  Explore Marketplace
                </Link>
              </Button>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-6 mt-2">
              {[
                { icon: Zap, label: 'Instant Access', desc: 'No signup needed' },
                { icon: Rss, label: 'Live Streams', desc: 'HLS / .m3u8 supported' },
                { icon: ShoppingBag, label: 'Marketplace', desc: '30+ category packs' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium leading-none">{label}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Content rows ──────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 space-y-10 sm:px-6 lg:px-8">
        {/* First visit / loading state */}
        {!hasChannels && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">No channels yet</h2>
              <p className="text-muted-foreground mt-1 text-sm max-w-sm mx-auto">
                Enable source packs from the Marketplace to start streaming. Default packs will load shortly.
              </p>
            </div>
            <Button asChild>
              <Link href="/marketplace">Open Marketplace</Link>
            </Button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && !hasChannels && (
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-3">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="shrink-0 w-44">
                      <Skeleton className="h-28 w-full rounded-xl" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Continue Watching */}
        {historyChannels.length > 0 && (
          <SectionRow
            title="Continue Watching"
            icon="⏱️"
            channels={historyChannels}
          />
        )}

        {/* Favorites */}
        {favoriteChannels.length > 0 && (
          <SectionRow
            title="Your Favorites"
            icon="❤️"
            channels={favoriteChannels}
          />
        )}

        {/* Category sections */}
        {categoryOrder.map((cat) => {
          const catChannels = channelsByCategory[cat] ?? []
          if (catChannels.length === 0) return null
          return (
            <SectionRow
              key={cat}
              title={cat}
              icon={CATEGORY_ICONS[cat]}
              channels={catChannels}
            />
          )
        })}

        {/* Unknown categories */}
        {Object.entries(channelsByCategory)
          .filter(([cat]) => !(categoryOrder as string[]).includes(cat))
          .map(([cat, chs]) => (
            <SectionRow key={cat} title={cat} channels={chs} />
          ))
        }

        {/* Browse all CTA */}
        {hasChannels && (
          <div className="flex items-center justify-center pt-4">
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/browse">
                View all {channels.length.toLocaleString()} channels
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
