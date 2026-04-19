import { type NextRequest, NextResponse } from 'next/server'

// Node runtime: required for reliable binary streaming of HLS segments.
// Edge runtime can't stream binary data consistently across all CDN nodes.
export const runtime = 'nodejs'

// ── User-Agent rotation for better compatibility ──────────────────────────────
// Some CDNs/servers block or rate-limit specific User-Agents.
// Rotating through realistic agents avoids detection and rate-limiting.
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

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

// ── Helper: extract target URL from request (GET, POST, or cached ID) ────────
async function getTargetUrl(request: NextRequest): Promise<string | null> {
  const { searchParams } = new URL(request.url)

  // Try URL ID first (for long URLs stored client-side)
  const urlId = searchParams.get('urlId')
  if (urlId) {
    // Client passed urlId — we need them to send the actual URL via POST body
    // This is a fallback in case the URL ID expires
    try {
      const body = await request.json()
      if (body.url) return body.url
    } catch {
      // Not JSON, continue
    }
    // If no POST body, the urlId is invalid (shouldn't happen)
    return null
  }

  // Try direct URL parameter
  const queryUrl = searchParams.get('url')
  if (queryUrl) return queryUrl

  // Try POST body (for extremely long URLs)
  if (request.method === 'POST') {
    try {
      const body = await request.json()
      return body.url || null
    } catch {
      return null
    }
  }

  return null
}

// ── Main proxy handler (shared by GET and POST) ─────────────────────────────

async function proxyRequest(targetUrl: string | null): Promise<Response> {
  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing or invalid url parameter' }, { status: 400 })
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

  // Abort the upstream fetch after 15 seconds (increased from 10s)
  // Many live streams are slow or have high latency
  const controller = new AbortController()
  const timeoutMs = 15_000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const upstream = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: 'follow',  // Explicitly follow redirects (default, but being explicit)
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'close',  // Avoid connection pooling issues with some servers
        'DNT': '1',             // Do Not Track (some servers respect this)
        'Referer': new URL(targetUrl).origin,  // Some servers expect referer
      },
    })

    clearTimeout(timeout)

    if (!upstream.ok) {
      // Return more detailed error info to help diagnose issues
      const contentType = upstream.headers.get('content-type') ?? ''
      const isPlaylist = contentType.includes('mpegurl') || contentType.includes('m3u')

      console.error(
        `[Proxy] Upstream returned ${upstream.status}`,
        `URL: ${targetUrl}`,
        `Redirected: ${upstream.url !== targetUrl ? 'yes' : 'no'}`
      )

      return NextResponse.json(
        {
          error: `Upstream returned ${upstream.status}`,
          status: upstream.status,
          url: targetUrl,
          isPlaylist,
          finalUrl: upstream.url,
        },
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
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=5',
          // Shorter TTL for live playlists which update every few seconds
        },
      })
    }

    // ── Binary segment / other: stream the body directly ─────────────────────
    // Pass through as a raw stream — no buffering needed.
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    clearTimeout(timeout)

    if ((error as Error).name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'Upstream request timed out after 15 seconds',
          details: 'Stream server is slow or unreachable. Trying next source...',
          timeoutMs,
        },
        { status: 504 }
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    const errorType =
      message.includes('ECONNREFUSED') ? 'Connection refused' :
        message.includes('ENOTFOUND') ? 'Domain not found' :
          message.includes('ETIMEDOUT') ? 'Network timeout' :
            message.includes('certificate') ? 'SSL/TLS certificate error' :
              'Unknown error'

    console.error('[Proxy]', errorType, targetUrl, message)

    return NextResponse.json(
      {
        error: `Proxy fetch failed: ${errorType}`,
        details: message,
        url: targetUrl,
      },
      { status: 502 }
    )
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const targetUrl = await getTargetUrl(request)
  return proxyRequest(targetUrl)
}

// ── POST handler (for extremely long URLs) ────────────────────────────────────

export async function POST(request: NextRequest) {
  const targetUrl = await getTargetUrl(request)
  return proxyRequest(targetUrl)
}

// ── CORS preflight ────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
    },
  })
}
