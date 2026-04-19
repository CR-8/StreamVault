/**
 * EPG (Electronic Program Guide) utilities.
 *
 * Data source: epg.pw — free public XMLTV service.
 * Each channel fetched individually by tvg-id on demand, via the /api/proxy.
 *
 * XMLTV format:
 *   <programme start="20240419143000 +0000" stop="20240419150000 +0000" channel="CNN">
 *     <title lang="en">CNN Newsroom</title>
 *     <desc lang="en">Live news coverage...</desc>
 *   </programme>
 */

export interface EpgProgramme {
  title: string
  description: string
  start: Date
  stop: Date
  channelId: string
}

export interface EpgChannelData {
  channelId: string   // tvg-id
  current: EpgProgramme | null
  next: EpgProgramme | null
  fetchedAt: number   // timestamp for cache invalidation
}

// ── In-memory cache (survives re-renders, clears on page reload) ──────────────
const cache = new Map<string, EpgChannelData>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Inflight request deduplication
const inflight = new Map<string, Promise<EpgChannelData | null>>()

/** Parse an XMLTV datetime string like "20240419143000 +0000" into a Date. */
function parseXmltvDate(raw: string): Date {
  const s = raw.trim()
  // "20240419143000 +0000" or "20240419143000 +0530"
  const dateStr = s.slice(0, 14) // "20240419143000"
  const tzStr   = s.slice(15).trim() // "+0000"

  const year  = parseInt(dateStr.slice(0, 4), 10)
  const month = parseInt(dateStr.slice(4, 6), 10) - 1
  const day   = parseInt(dateStr.slice(6, 8), 10)
  const hour  = parseInt(dateStr.slice(8, 10), 10)
  const min   = parseInt(dateStr.slice(10, 12), 10)
  const sec   = parseInt(dateStr.slice(12, 14), 10)

  // Offset in minutes
  let offsetMin = 0
  if (tzStr && tzStr.length >= 5) {
    const sign = tzStr[0] === '-' ? -1 : 1
    const hh   = parseInt(tzStr.slice(1, 3), 10)
    const mm   = parseInt(tzStr.slice(3, 5), 10)
    offsetMin  = sign * (hh * 60 + mm)
  }

  // Build UTC timestamp
  const utc = Date.UTC(year, month, day, hour, min, sec) - offsetMin * 60 * 1000
  return new Date(utc)
}

/** Parse XMLTV XML text → EpgProgramme[] for a given channelId. */
function parseXmltv(xml: string, channelId: string): EpgProgramme[] {
  const programmes: EpgProgramme[] = []

  // Use DOMParser if available (browser), otherwise regex fallback
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const nodes = doc.querySelectorAll('programme')

    for (const node of nodes) {
      const ch = node.getAttribute('channel') ?? ''
      if (ch.toLowerCase() !== channelId.toLowerCase()) continue

      const startRaw = node.getAttribute('start') ?? ''
      const stopRaw  = node.getAttribute('stop') ?? ''
      if (!startRaw || !stopRaw) continue

      const titleEl = node.querySelector('title')
      const descEl  = node.querySelector('desc')

      try {
        programmes.push({
          channelId,
          title: titleEl?.textContent?.trim() ?? 'Untitled',
          description: descEl?.textContent?.trim() ?? '',
          start: parseXmltvDate(startRaw),
          stop:  parseXmltvDate(stopRaw),
        })
      } catch {
        // Skip malformed entry
      }
    }
  }

  return programmes
}

/**
 * Build the EPG URL for a given tvg-id.
 * epg.pw supports: /api/epg.xml?channel_id={id}&date={YYYY-MM-DD}
 */
function buildEpgUrl(tvgId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `https://epg.pw/api/epg.xml?channel_id=${encodeURIComponent(tvgId)}&date=${today}`
}

/** Proxy the EPG URL through our existing /api/proxy route. */
function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`
}

/** Pick current and next programmes for `now`. */
function pickCurrentAndNext(
  programmes: EpgProgramme[],
  now: Date
): Pick<EpgChannelData, 'current' | 'next'> {
  const sorted = programmes.slice().sort((a, b) => a.start.getTime() - b.start.getTime())

  let current: EpgProgramme | null = null
  let next: EpgProgramme | null = null

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    if (p.start <= now && p.stop > now) {
      current = p
      next = sorted[i + 1] ?? null
      break
    }
  }

  // If nothing is live, pick the soonest upcoming one as "next"
  if (!current && !next) {
    const upcoming = sorted.filter((p) => p.start > now)
    next = upcoming[0] ?? null
  }

  return { current, next }
}

/**
 * Fetch EPG data for a single channel by tvg-id.
 * Returns null if the channel has no EPG data or the fetch fails.
 * Results are cached for 5 minutes.
 */
export async function fetchEpgForChannel(tvgId: string): Promise<EpgChannelData | null> {
  if (!tvgId) return null

  const cached = cache.get(tvgId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached
  }

  // Deduplicate concurrent requests for same tvg-id
  if (inflight.has(tvgId)) {
    return inflight.get(tvgId)!
  }

  const promise = (async (): Promise<EpgChannelData | null> => {
    try {
      const url = proxyUrl(buildEpgUrl(tvgId))
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null

      const xml = await res.text()
      if (!xml.includes('<programme')) return null

      const programmes = parseXmltv(xml, tvgId)
      if (programmes.length === 0) return null

      const { current, next } = pickCurrentAndNext(programmes, new Date())
      const result: EpgChannelData = {
        channelId: tvgId,
        current,
        next,
        fetchedAt: Date.now(),
      }

      cache.set(tvgId, result)
      return result
    } catch {
      return null
    } finally {
      inflight.delete(tvgId)
    }
  })()

  inflight.set(tvgId, promise)
  return promise
}

/**
 * Batch-fetch EPG for multiple tvg-ids.
 * Fires requests in parallel with a concurrency cap of 6.
 * Returns a map of tvgId → EpgChannelData.
 */
export async function fetchEpgBatch(
  tvgIds: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, EpgChannelData>> {
  const results = new Map<string, EpgChannelData>()
  const unique = [...new Set(tvgIds.filter(Boolean))]
  const CONCURRENCY = 6

  let done = 0

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(batch.map((id) => fetchEpgForChannel(id)))

    settled.forEach((result, idx) => {
      done++
      if (result.status === 'fulfilled' && result.value) {
        results.set(batch[idx], result.value)
      }
      onProgress?.(done, unique.length)
    })
  }

  return results
}

/** Format a Date as "HH:MM" in local time. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Returns the percentage of the current programme that has elapsed (0–100). */
export function getProgrammeProgress(programme: EpgProgramme): number {
  const now = Date.now()
  const start = programme.start.getTime()
  const stop  = programme.stop.getTime()
  const total = stop - start
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, ((now - start) / total) * 100))
}
