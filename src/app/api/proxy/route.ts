import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// Allowlist: only proxy HTTP/HTTPS URLs, never localhost or private ranges
const BLOCKED_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/10\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/0\./,
]

function isBlockedUrl(url: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(url))
}

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

  try {
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'StreamVault/1.0 M3U-Fetcher',
        'Accept': 'application/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*',
      },
      // Edge runtimes don't support AbortSignal.timeout universally, so skip
    })

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Upstream server returned ${upstreamResponse.status}` },
        { status: 502 }
      )
    }

    const text = await upstreamResponse.text()

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // cache for 5 minutes
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Proxy fetch failed: ${message}` }, { status: 502 })
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
