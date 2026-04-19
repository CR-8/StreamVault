'use client'

import { create } from 'zustand'
import type { Channel } from '@/types'
import { fetchEpgBatch, type EpgChannelData } from '@/lib/epg'

export type EpgLoadState = 'idle' | 'loading' | 'done' | 'error'

interface EpgState {
  /** tvgId → EpgChannelData for every fetched channel */
  data: Map<string, EpgChannelData>
  state: EpgLoadState
  progress: number   // 0–100
  errorMsg: string

  /** Fetch EPG for a list of channels (deduplicates tvg-ids). */
  loadEpg: (channels: Channel[]) => Promise<void>
  /** Clear all EPG data (e.g. when channels change). */
  clear: () => void
}

export const useEpgStore = create<EpgState>()((set, get) => ({
  data: new Map(),
  state: 'idle',
  progress: 0,
  errorMsg: '',

  loadEpg: async (channels: Channel[]) => {
    if (get().state === 'loading') return

    // Only fetch channels that have a tvg-id
    const withId = channels.filter((ch) => !!ch.tvgId)
    if (withId.length === 0) {
      set({ state: 'done', progress: 100 })
      return
    }

    const tvgIds = withId.map((ch) => ch.tvgId!)
    set({ state: 'loading', progress: 0, errorMsg: '' })

    try {
      const result = await fetchEpgBatch(tvgIds, (done, total) => {
        set({ progress: Math.round((done / total) * 100) })
      })

      set({ data: result, state: 'done', progress: 100 })
    } catch (e) {
      set({
        state: 'error',
        errorMsg: e instanceof Error ? e.message : 'Failed to load EPG',
      })
    }
  },

  clear: () => set({ data: new Map(), state: 'idle', progress: 0, errorMsg: '' }),
}))

/** Selector: EPG data for a specific tvg-id */
export const selectEpgForChannel = (tvgId: string | undefined) =>
  (state: EpgState) => (tvgId ? (state.data.get(tvgId) ?? null) : null)
