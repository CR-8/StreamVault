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
  const regex = new RegExp(`${attr}=["']([^"']*)["']`, 'i')
  const match = line.match(regex)
  return match?.[1]?.trim() ?? ''
}

/**
 * Parse raw M3U text into a typed Channel[].
 * - Never throws; malformed entries are skipped.
 * - Handles Windows/Unix line endings.
 * - Skips duplicate stream URLs.
 */
export function parseM3U(text: string, packId: string): Channel[] {
  const channels: Channel[] = []
  const seenUrls = new Set<string>()

  if (!text || !text.includes('#EXTM3U')) {
    return channels
  }

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let currentExtInf: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (!line) continue

    if (line.startsWith('#EXTINF')) {
      currentExtInf = line
      continue
    }

    // Stream URL line (must follow an EXTINF)
    if (currentExtInf && !line.startsWith('#') && (line.startsWith('http') || line.startsWith('rtmp'))) {
      try {
        const streamUrl = line.trim()

        if (seenUrls.has(streamUrl)) {
          currentExtInf = null
          continue
        }

        seenUrls.add(streamUrl)

        const id = hashUrl(streamUrl)

        // Extract display name: after comma at end of EXTINF line
        const commaIdx = currentExtInf.lastIndexOf(',')
        const rawName = commaIdx >= 0 ? currentExtInf.slice(commaIdx + 1).trim() : ''

        const name = extractAttr(currentExtInf, 'tvg-name') || rawName || 'Unknown Channel'
        const logo = extractAttr(currentExtInf, 'tvg-logo')
        const tvgId = extractAttr(currentExtInf, 'tvg-id')
        const tvgCountry = extractAttr(currentExtInf, 'tvg-country')
        const tvgLanguage = extractAttr(currentExtInf, 'tvg-language')
        const groupTitle = extractAttr(currentExtInf, 'group-title') || 'Other'

        channels.push({
          id,
          name,
          logo,
          streamUrl,
          groupTitle,
          country: tvgCountry,
          language: tvgLanguage,
          sourcePack: packId,
          ...(tvgId ? { tvgId } : {}),
        })
      } catch {
        // Skip malformed entries silently
      } finally {
        currentExtInf = null
      }
    } else if (!line.startsWith('#')) {
      // Non-comment, non-URL line after EXTINF — reset
      currentExtInf = null
    }
  }

  return channels
}
