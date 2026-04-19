import type { Channel } from '@/types'

/**
 * Simple, stable hash from a string (djb2 variant).
 * Produces a hex string prefixed with 'ch_'.
 */
function hashUrl(url: string): string {
  let hash = 5381
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 33) ^ url.charCodeAt(i)
  }
  return 'ch_' + Math.abs(hash >>> 0).toString(16)
}

/**
 * Extract a named attribute from an EXTINF line.
 * e.g. extractAttr('tvg-name="CNN"', 'tvg-name') → 'CNN'
 * Handles both single and double quotes.
 */
function extractAttr(line: string, attr: string): string {
  const regex = new RegExp(`${attr}=[\"']([^\"']*)[\"']`, 'i')
  const match = line.match(regex)
  return match?.[1]?.trim() ?? ''
}

/** Normalise a channel name for deduplication key */
function normaliseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Raw parsed entry before deduplication */
interface ParsedEntry {
  name: string
  logo: string
  streamUrl: string
  groupTitle: string
  country: string
  language: string
  sourcePack: string
  tvgId: string
}

const MAX_SOURCES_PER_CHANNEL = 5

/**
 * Parse raw M3U text into a typed Channel[].
 *
 * New behaviour (Phase 3):
 * - Duplicate channel names → merged into a single Channel with up to 3 `sources[]`
 * - The first-seen URL becomes `streamUrl` (primary); alternatives go into `sources[]`
 * - `sources[]` is always non-empty (contains at least `streamUrl`)
 * - Bad URLs (non-http, empty) are dropped early
 */
export function parseM3U(text: string, packId: string): Channel[] {
  if (!text || !text.includes('#EXTM3U')) return []

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  // Phase 1: collect all raw entries (no deduplication yet)
  const entries: ParsedEntry[] = []
  let currentExtInf: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF')) {
      currentExtInf = line
      continue
    }

    // A URL line must follow an EXTINF header
    if (!currentExtInf || line.startsWith('#')) {
      if (!line.startsWith('#')) currentExtInf = null
      continue
    }

    // Early filter: only http/https streams; drop rtmp/rtsp/data/etc.
    if (!line.startsWith('http://') && !line.startsWith('https://')) {
      currentExtInf = null
      continue
    }

    try {
      const commaIdx = currentExtInf.lastIndexOf(',')
      const rawName  = commaIdx >= 0 ? currentExtInf.slice(commaIdx + 1).trim() : ''
      const name     = extractAttr(currentExtInf, 'tvg-name') || rawName || 'Unknown Channel'

      entries.push({
        name,
        logo:       extractAttr(currentExtInf, 'tvg-logo'),
        streamUrl:  line,
        groupTitle: extractAttr(currentExtInf, 'group-title') || 'Other',
        country:    extractAttr(currentExtInf, 'tvg-country'),
        language:   extractAttr(currentExtInf, 'tvg-language'),
        sourcePack: packId,
        tvgId:      extractAttr(currentExtInf, 'tvg-id'),
      })
    } catch {
      // Skip malformed entries silently
    } finally {
      currentExtInf = null
    }
  }

  // Phase 2: deduplicate by normalised name, merging sources[]
  const byName = new Map<string, Channel>()
  const seenUrls = new Set<string>()

  for (const entry of entries) {
    const key = normaliseName(entry.name)

    if (seenUrls.has(entry.streamUrl)) continue
    seenUrls.add(entry.streamUrl)

    if (!byName.has(key)) {
      // First occurrence → create channel
      byName.set(key, {
        id:         hashUrl(entry.streamUrl),
        name:       entry.name,
        logo:       entry.logo,
        streamUrl:  entry.streamUrl,
        sources:    [entry.streamUrl],
        groupTitle: entry.groupTitle,
        country:    entry.country,
        language:   entry.language,
        sourcePack: entry.sourcePack,
        ...(entry.tvgId ? { tvgId: entry.tvgId } : {}),
      })
    } else {
      // Subsequent occurrence → merge as an alternate source (up to limit)
      const existing = byName.get(key)!
      if (existing.sources.length < MAX_SOURCES_PER_CHANNEL) {
        existing.sources.push(entry.streamUrl)
        // Prefer logo/tvgId from whichever entry has them if the primary didn't
        if (!existing.logo && entry.logo) existing.logo = entry.logo
        if (!existing.tvgId && entry.tvgId) existing.tvgId = entry.tvgId
      }
    }
  }

  return Array.from(byName.values())
}
