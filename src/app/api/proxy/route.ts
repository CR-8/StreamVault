import { type NextRequest, NextResponse } from 'next/server'

// Node runtime: required for reliable binary streaming of HLS segments.
// Edge runtime can't stream binary data consistently across all CDN nodes.
export const runtime = 'nodejs'

// ── SSRF protection — block private / loopback ranges ─────────────────────────
const BLOCKED_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/0\./,
  /^https?:\/\/\[::1\]/,       // IPv6 loopback
  /^https?:\/\/\[fc00:/i,      // IPv6 unique-local
]

function isBlockedUrl(url: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(url))
}

// ── Detect content type ────────────────────────────────────────────────────────

function isPlaylist(contentType: string, url: string): boolean {
  const ct = contentType.toLowerCase()
  if (ct.includes('mpegurl') || ct.includes('m3u')) return true
  const path = url.split('?')[0].toLowerCase()
  return path.endsWith('.m3u8') || path.endsWith('.m3u')
}

// ── Rewrite all URLs inside an .m3u8 playlist to go through this proxy ────────
// Handles both absolute (http://…) and relative (…/segment.ts) URLs.

function rewritePlaylist(text: string, targetUrl: string): string {
  const base = new URL(targetUrl)

  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()

      // Keep comment/directive lines untouched
      if (trimmed.startsWith('#') || trimmed === '') return line

      // Resolve relative or absolute URL against the playlist's base
      let absoluteUrl: string
      try {
        absoluteUrl = new URL(trimmed, base).toString()
      } catch {
        return line  // malformed — leave as-is
      }

      // Only rewrite http/https URLs (skip data:, blob:, etc.)
      if (!absoluteUrl.startsWith('http')) return line

      return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`
    })
    .join('\n')
}

// ── Main GET handler ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Validate URL structure
  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Only allow HTTP/HTTPS
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are supported' }, { status: 400 })
  }

  // Block private/local URLs (SSRF prevention)
  if (isBlockedUrl(targetUrl)) {
    return NextResponse.json({ error: 'This URL is not allowed' }, { status: 400 })
  }

  // Abort the upstream fetch after 10 seconds
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const upstream = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        // Mimic a real browser/player so servers don't block us
        'User-Agent':      'Mozilla/5.0 (compatible; StreamVault/1.0)',
        'Referer':         targetUrl,
        'Origin':          `${parsedUrl.protocol}//${parsedUrl.host}`,
        'Accept':          '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    clearTimeout(timeout)

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') ?? ''

    // ── Playlist: read as text, rewrite segment URLs, return text ─────────────
    if (isPlaylist(contentType, targetUrl)) {
      const text = await upstream.text()
      const rewritten = rewritePlaylist(text, targetUrl)

      return new Response(rewritten, {
        status: 200,
        headers: {
          'Content-Type':                'application/vnd.apple.mpegurl; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control':               'public, max-age=10, stale-while-revalidate=5',
          // Shorter TTL for live playlists which update every few seconds
        },
      })
    }

    // ── Binary segment / other: stream the body directly ─────────────────────
    // Pass through as a raw stream — no buffering needed.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type':                contentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':               'public, max-age=300',
      },
    })
  } catch (error) {
    clearTimeout(timeout)
    if ((error as Error).name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream request timed out' }, { status: 504 })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Proxy fetch failed: ${message}` }, { status: 502 })
  }
}

// ── CORS preflight ────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
    },
  })
}
