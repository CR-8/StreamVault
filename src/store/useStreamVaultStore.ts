'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Channel, CustomSource } from '@/types'
import {
  getEnabledPacks,
  setEnabledPacks,
  getChannelsForPack,
  setChannelsForPack,
  getAllChannels,
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  getCustomSources,
  addCustomSource,
  removeCustomSource,
  enablePack,
  disablePack,
  isPackEnabled,
  addToHistory,
  getWatchHistory,
  isNearStorageLimit,
} from '@/lib/storage'
import { fetchM3U } from '@/lib/fetch-m3u'
import { parseM3U } from '@/lib/m3u-parser'
import { DEFAULT_ENABLED_PACKS } from '@/data/source-packs'

interface LoadingState {
  [packId: string]: 'idle' | 'loading' | 'done' | 'error'
}

interface StreamVaultState {
  // Data
  enabledPacks: string[]
  channels: Channel[]
  favorites: string[]
  customSources: CustomSource[]
  history: ReturnType<typeof getWatchHistory>

  // UI state
  loadingStates: LoadingState
  storageWarning: boolean

  // Actions
  initialize: () => Promise<void>
  enablePack: (packId: string, m3uUrl: string) => Promise<void>
  disablePack: (packId: string) => void
  toggleFavorite: (channelId: string) => void
  addCustomSource: (source: CustomSource, m3uUrl: string) => Promise<void>
  removeCustomSource: (id: string) => void
  addToHistory: (channel: Channel) => void
  refreshChannels: () => void
}

export const useStreamVaultStore = create<StreamVaultState>()(
  subscribeWithSelector((set, get) => ({
    enabledPacks: [],
    channels: [],
    favorites: [],
    customSources: [],
    history: [],
    loadingStates: {},
    storageWarning: false,

    initialize: async () => {
      const stored = getEnabledPacks()

      // First visit — seed with default packs
      let packs = stored
      if (stored.length === 0) {
        setEnabledPacks(DEFAULT_ENABLED_PACKS)
        packs = DEFAULT_ENABLED_PACKS
      }

      set({
        enabledPacks: packs,
        favorites: getFavorites(),
        customSources: getCustomSources(),
        history: getWatchHistory(),
        channels: getAllChannels(),
        storageWarning: isNearStorageLimit(),
      })

      // Load packs that have no cached channels yet
      const toFetch = packs.filter((id) => getChannelsForPack(id).length === 0)
      if (toFetch.length > 0) {
        const { SOURCE_PACKS } = await import('@/data/source-packs')
        await Promise.allSettled(
          toFetch.map(async (packId) => {
            const pack = SOURCE_PACKS.find((p) => p.id === packId)
            if (!pack) return
            await get().enablePack(packId, pack.m3uUrl)
          })
        )
      }
    },

    enablePack: async (packId: string, m3uUrl: string) => {
      set((state) => ({
        loadingStates: { ...state.loadingStates, [packId]: 'loading' },
      }))

      try {
        const text = await fetchM3U(m3uUrl)
        const parsed = parseM3U(text, packId)

        setChannelsForPack(packId, parsed)
        enablePack(packId)

        const packs = getEnabledPacks()
        set((state) => ({
          enabledPacks: packs,
          channels: getAllChannels(),
          loadingStates: { ...state.loadingStates, [packId]: 'done' },
          storageWarning: isNearStorageLimit(),
        }))
      } catch (error) {
        console.error(`[StreamVault] Failed to load pack ${packId}:`, error)
        set((state) => ({
          loadingStates: { ...state.loadingStates, [packId]: 'error' },
        }))
        throw error
      }
    },

    disablePack: (packId: string) => {
      disablePack(packId)
      const packs = getEnabledPacks()
      set({
        enabledPacks: packs,
        channels: getAllChannels(),
      })
    },

    toggleFavorite: (channelId: string) => {
      if (isFavorite(channelId)) {
        removeFavorite(channelId)
      } else {
        addFavorite(channelId)
      }
      set({ favorites: getFavorites() })
    },

    addCustomSource: async (source: CustomSource, m3uUrl: string) => {
      addCustomSource(source)
      set({ customSources: getCustomSources() })
      await get().enablePack(source.id, m3uUrl)
    },

    removeCustomSource: (id: string) => {
      removeCustomSource(id)
      const packs = getEnabledPacks()
      set({
        customSources: getCustomSources(),
        enabledPacks: packs,
        channels: getAllChannels(),
      })
    },

    addToHistory: (channel: Channel) => {
      addToHistory({
        channelId: channel.id,
        channelName: channel.name,
        channelLogo: channel.logo,
        watchedAt: Date.now(),
      })
      set({ history: getWatchHistory() })
    },

    refreshChannels: () => {
      set({
        channels: getAllChannels(),
        favorites: getFavorites(),
        history: getWatchHistory(),
      })
    },
  }))
)

// Convenience selectors
export const selectChannelById = (id: string) => (state: StreamVaultState) =>
  state.channels.find((ch) => ch.id === id) ?? null

export const selectIsFavorite = (id: string) => (state: StreamVaultState) =>
  state.favorites.includes(id)

export const selectIsPackEnabled = (id: string) => (state: StreamVaultState) =>
  state.enabledPacks.includes(id)

export const selectPackLoading = (id: string) => (state: StreamVaultState) =>
  state.loadingStates[id] ?? 'idle'

export const selectFavoriteChannels = (state: StreamVaultState) =>
  state.channels.filter((ch) => state.favorites.includes(ch.id))

export const selectChannelsByCategory = (category: string) => (state: StreamVaultState) =>
  state.channels.filter(
    (ch) => ch.groupTitle.toLowerCase() === category.toLowerCase()
  )
