import type { Channel, CustomSource, WatchHistoryEntry, UserProfile, StreamHealth } from '@/types'
import { SOURCE_PACKS } from '@/data/source-packs'

// ── Key constants ──────────────────────────────────────────────────────────────

const KEYS = {
  ENABLED_PACKS: 'streamvault:enabled_packs',
  CHANNELS: (packId: string) => `streamvault:channels:${packId}`,
  FAVORITES: 'streamvault:favorites',
  CUSTOM_SOURCES: 'streamvault:custom_sources',
  HISTORY: 'streamvault:history',
  STREAM_HEALTH: 'streamvault:stream_health',
} as const

const MAX_HISTORY = 40
const STORAGE_WARNING_THRESHOLD = 5 * 1024 * 1024 // 5 MB

// ── Internal safe helpers ──────────────────────────────────────────────────────

function safeGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): boolean {
  try {
    if (typeof window === 'undefined') return false
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
    return true
  } catch (e) {
    // QuotaExceededError or similar
    console.warn('[StreamVault] localStorage write failed:', e)
    return false
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ── Approximate storage usage ──────────────────────────────────────────────────

export function getStorageUsageBytes(): number {
  if (typeof window === 'undefined') return 0
  let total = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('streamvault:')) {
        total += (localStorage.getItem(key) ?? '').length * 2 // UTF-16
      }
    }
  } catch {
    return 0
  }
  return total
}

export function isNearStorageLimit(): boolean {
  return getStorageUsageBytes() > STORAGE_WARNING_THRESHOLD
}

// ── Enabled packs ──────────────────────────────────────────────────────────────

export function getEnabledPacks(): string[] {
  return safeGet<string[]>(KEYS.ENABLED_PACKS, [])
}

export function setEnabledPacks(packIds: string[]): void {
  safeSet(KEYS.ENABLED_PACKS, packIds)
}

export function enablePack(packId: string): void {
  const current = getEnabledPacks()
  if (!current.includes(packId)) {
    safeSet(KEYS.ENABLED_PACKS, [...current, packId])
  }
}

export function disablePack(packId: string): void {
  const current = getEnabledPacks()
  safeSet(KEYS.ENABLED_PACKS, current.filter((id) => id !== packId))
  safeRemove(KEYS.CHANNELS(packId))
}

export function isPackEnabled(packId: string): boolean {
  return getEnabledPacks().includes(packId)
}

// ── Channels per pack ──────────────────────────────────────────────────────────

export function getChannelsForPack(packId: string): Channel[] {
  return safeGet<Channel[]>(KEYS.CHANNELS(packId), [])
}

export function setChannelsForPack(packId: string, channels: Channel[]): boolean {
  return safeSet(KEYS.CHANNELS(packId), channels)
}

/** Lookup map from pack ID → priority (higher wins on name conflict). */
function getPackPriority(packId: string): number {
  return SOURCE_PACKS.find((p) => p.id === packId)?.priority ?? 0
}

export function getAllChannels(): Channel[] {
  const packs = getEnabledPacks()
  const byName = new Map<string, Channel>()  // normalised name → best channel

  for (const packId of packs) {
    const packPriority = getPackPriority(packId)
    const channels = getChannelsForPack(packId)

    for (const ch of channels) {
      // Backward compat: channels cached before sources[] was introduced
      const chSources: string[] =
        Array.isArray(ch.sources) && ch.sources.length > 0
          ? ch.sources
          : [ch.streamUrl]

      const normName = ch.name.trim().toLowerCase()
      const existing = byName.get(normName)

      if (!existing) {
        byName.set(normName, { ...ch, sources: chSources })
      } else {
        const existingPriority = getPackPriority(existing.sourcePack)

        // Merge unique source URLs from this pack (cap at 3)
        const merged = [...existing.sources]
        for (const url of chSources) {
          if (!merged.includes(url) && merged.length < 3) merged.push(url)
        }
        existing.sources = merged

        // If higher-priority pack, promote its URL to primary
        if (packPriority > existingPriority) {
          existing.streamUrl  = ch.streamUrl
          existing.id         = ch.id
          existing.sourcePack = ch.sourcePack
          existing.logo       = ch.logo || existing.logo
          existing.tvgId      = ch.tvgId || existing.tvgId
          byName.set(normName, existing)
        }
      }
    }
  }

  return Array.from(byName.values())
}

export function getChannelById(id: string): Channel | null {
  return getAllChannels().find((ch) => ch.id === id) ?? null
}

// ── Favorites ──────────────────────────────────────────────────────────────────

export function getFavorites(): string[] {
  return safeGet<string[]>(KEYS.FAVORITES, [])
}

export function addFavorite(channelId: string): void {
  const current = getFavorites()
  if (!current.includes(channelId)) {
    safeSet(KEYS.FAVORITES, [...current, channelId])
  }
}

export function removeFavorite(channelId: string): void {
  safeSet(KEYS.FAVORITES, getFavorites().filter((id) => id !== channelId))
}

export function isFavorite(channelId: string): boolean {
  return getFavorites().includes(channelId)
}

export function getFavoriteChannels(): Channel[] {
  const ids = getFavorites()
  const all = getAllChannels()
  const map = new Map(all.map((ch) => [ch.id, ch]))
  return ids.map((id) => map.get(id)).filter(Boolean) as Channel[]
}

// ── Custom sources ─────────────────────────────────────────────────────────────

export function getCustomSources(): CustomSource[] {
  return safeGet<CustomSource[]>(KEYS.CUSTOM_SOURCES, [])
}

export function addCustomSource(source: CustomSource): void {
  const current = getCustomSources()
  safeSet(KEYS.CUSTOM_SOURCES, [...current, source])
}

export function removeCustomSource(id: string): void {
  safeSet(KEYS.CUSTOM_SOURCES, getCustomSources().filter((s) => s.id !== id))
  safeRemove(KEYS.CHANNELS(id))
  disablePack(id)
}

// ── Watch history ──────────────────────────────────────────────────────────────

export function getWatchHistory(): WatchHistoryEntry[] {
  return safeGet<WatchHistoryEntry[]>(KEYS.HISTORY, [])
}

export function addToHistory(entry: WatchHistoryEntry): void {
  const current = getWatchHistory()
  const filtered = current.filter((h) => h.channelId !== entry.channelId)
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY)
  safeSet(KEYS.HISTORY, updated)
}

export function clearHistory(): void {
  safeRemove(KEYS.HISTORY)
}

// ── Export / Import ────────────────────────────────────────────────────────────

export function exportProfile(): UserProfile {
  return {
    enabledPacks: getEnabledPacks(),
    favorites: getFavorites(),
    customSources: getCustomSources(),
    history: getWatchHistory(),
    exportedAt: new Date().toISOString(),
  }
}

export function importProfile(profile: UserProfile): void {
  if (!profile || typeof profile !== 'object') return

  if (Array.isArray(profile.enabledPacks)) {
    safeSet(KEYS.ENABLED_PACKS, profile.enabledPacks)
  }
  if (Array.isArray(profile.favorites)) {
    safeSet(KEYS.FAVORITES, profile.favorites)
  }
  if (Array.isArray(profile.customSources)) {
    safeSet(KEYS.CUSTOM_SOURCES, profile.customSources)
  }
  if (Array.isArray(profile.history)) {
    safeSet(KEYS.HISTORY, profile.history)
  }
}

// ── Clear all ──────────────────────────────────────────────────────────────────

export function clearAllData(): void {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('streamvault:')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

// ── Stream health ──────────────────────────────────────────────────────────────
// Score is a signed integer; positive = reliable, negative = failing.
// markSuccess: +1  |  markFailure: -2
// Capped at MAX_HEALTH_ENTRIES to avoid unbounded growth.

const MAX_HEALTH_ENTRIES = 500

export function getStreamHealth(): StreamHealth {
  return safeGet<StreamHealth>(KEYS.STREAM_HEALTH, {})
}

function saveStreamHealth(health: StreamHealth): void {
  const entries = Object.entries(health)
  if (entries.length > MAX_HEALTH_ENTRIES) {
    // Evict the lowest-scoring URLs to stay under the cap
    const trimmed = Object.fromEntries(
      entries.sort((a, b) => b[1] - a[1]).slice(0, MAX_HEALTH_ENTRIES)
    )
    safeSet(KEYS.STREAM_HEALTH, trimmed)
  } else {
    safeSet(KEYS.STREAM_HEALTH, health)
  }
}

export function markStreamSuccess(url: string): void {
  const health = getStreamHealth()
  health[url] = (health[url] ?? 0) + 1
  saveStreamHealth(health)
}

export function markStreamFailure(url: string): void {
  const health = getStreamHealth()
  health[url] = (health[url] ?? 0) - 2
  saveStreamHealth(health)
}

export function getStreamScore(url: string): number {
  return getStreamHealth()[url] ?? 0
}
