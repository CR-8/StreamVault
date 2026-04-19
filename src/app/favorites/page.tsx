'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChannelCard, ChannelCardSkeleton } from '@/components/channel-card'
import { useStreamVaultStore } from '@/store/useStreamVaultStore'

export default function FavoritesPage() {
  const channels = useStreamVaultStore((s) => s.channels)
  const favorites = useStreamVaultStore((s) => s.favorites)
  const loadingStates = useStreamVaultStore((s) => s.loadingStates)
  const isLoading = Object.values(loadingStates).some((s) => s === 'loading') && channels.length === 0

  const favoriteChannels = useMemo(() => {
    const channelMap = new Map(channels.map((c) => [c.id, c]))
    return favorites.map((id) => channelMap.get(id)).filter(Boolean) as typeof channels
  }, [favorites, channels])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500 fill-current" />
            Favorites
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {favoriteChannels.length > 0
              ? `${favoriteChannels.length} saved channel${favoriteChannels.length !== 1 ? 's' : ''}`
              : 'Your bookmarked channels appear here'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <ChannelCardSkeleton key={i} />)}
        </div>
      ) : favoriteChannels.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-6 py-32 text-center">
          <div className="h-20 w-20 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Heart className="h-10 w-10 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">No favorites yet</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
              Click the ❤️ on any channel card or on the watch page to save it here.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/browse">Browse Channels</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/marketplace">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Marketplace
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {favoriteChannels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} />
          ))}
        </div>
      )}
    </div>
  )
}
