// Core domain types for StreamVault

export type SourcePackType = 'region' | 'country' | 'category' | 'custom' | 'curated'

export interface SourcePack {
  id: string
  name: string
  description: string
  type: SourcePackType
  m3uUrl: string
  channelCount: number
  tags: string[]
  flag?: string    // emoji flag for country packs
  icon?: string    // emoji icon for category/region packs
  /**
   * Conflict resolution priority (higher wins on duplicate channel names).
   * Curated/quality packs should use a high value (e.g. 100).
   * Regular iptv-org packs default to 0.
   */
  priority?: number
}

export interface Channel {
  id: string           // stable hash of stream URL
  name: string
  logo: string
  streamUrl: string
  groupTitle: string   // raw from M3U, used for section/category mapping
  country: string
  language: string
  sourcePack: string   // which pack this channel came from
  tvgId?: string       // EPG identifier from tvg-id attribute
}

export interface CustomSource {
  id: string
  name: string
  m3uUrl: string
  addedAt: number
}

export interface WatchHistoryEntry {
  channelId: string
  watchedAt: number
  channelName: string
  channelLogo: string
}

export interface UserProfile {
  enabledPacks: string[]
  favorites: string[]
  customSources: CustomSource[]
  history: WatchHistoryEntry[]
  exportedAt: string
}

export type ContentCategory =
  | 'Movies'
  | 'Sports'
  | 'News'
  | 'Entertainment'
  | 'Kids'
  | 'Music'
  | 'Documentary'
  | 'Education'
  | 'Animation'
  | 'Comedy'
  | 'Lifestyle'
  | 'Other'

export const CONTENT_CATEGORIES: ContentCategory[] = [
  'Movies', 'Sports', 'News', 'Entertainment', 'Kids',
  'Music', 'Documentary', 'Education', 'Animation', 'Comedy', 'Lifestyle'
]

export const CATEGORY_ICONS: Record<string, string> = {
  Movies: '🎬',
  Sports: '⚽',
  News: '📰',
  Entertainment: '🎭',
  Kids: '🧒',
  Music: '🎵',
  Documentary: '🎥',
  Education: '📚',
  Animation: '🎨',
  Comedy: '😂',
  Lifestyle: '🌿',
  Other: '📺',
}
