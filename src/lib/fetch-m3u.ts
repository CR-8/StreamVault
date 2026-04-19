/**
 * CORS-aware M3U fetch helper.
 *
 * iptv-org.github.io serves Access-Control-Allow-Origin: * on all assets,
 * so those URLs can be fetched directly by the browser.
 * Custom user-supplied URLs may not have CORS headers, so they go via
 * the Vercel Edge Function at /api/proxy.
 *
 * For extremely long URLs (e.g., with JWT tokens, device IDs, auth params),
 * uses POST instead of GET to avoid 414 "URI Too Long" errors.
 */

const PROXY_BASE = '/api/proxy'
const MAX_URL_LENGTH = 2000  // Threshold for switching GET → POST

function isIptvOrg(url: string): boolean {
  return url.includes('iptv-org.github.io')
}

/**
 * Check if a URL is too long and should be sent via POST instead of GET.
 * This prevents 414 "Request-URI Too Long" errors from servers.
 */
function isTooLongForGet(url: string): boolean {
  // Estimate the final GET URL length after encoding
  const getUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`
  return getUrl.length > MAX_URL_LENGTH
}

/**
 * Fetch an M3U file and return its raw text.
 * Uses POST for jmp2.uk/Pluto URLs (auth tokens) and very long URLs.
 * Uses GET for normal URLs to maximize cache efficiency.
 * Throws if the response is not OK or if the network fails.
 */
export async function fetchM3U(url: string, signal?: AbortSignal): Promise<string> {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided')
  }

  // Direct fetch for iptv-org (no proxy needed)
  if (isIptvOrg(url)) {
    const response = await fetch(url, {
      signal,
      headers: {
        'Accept': 'application/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch M3U: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()

    if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
      throw new Error('Response does not appear to be a valid M3U playlist')
    }

    return text
  }

  // Proxy fetch for custom URLs
  // Use POST for known problematic domains with auth tokens, or extremely long URLs
  const isProblematicDomain = url.includes('jmp2.uk') || url.includes('pluto.tv')
  const shouldUsePost = isProblematicDomain || isTooLongForGet(url)

  if (shouldUsePost) {
    // POST request: URL in request body (no length limit, preserves auth tokens)
    const response = await fetch(PROXY_BASE, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch M3U: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()

    if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
      throw new Error('Response does not appear to be a valid M3U playlist')
    }

    return text
  } else {
    // GET request: URL in query parameter (traditional method, better cache)
    const fetchUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`
    const response = await fetch(fetchUrl, {
      signal,
      headers: {
        'Accept': 'application/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch M3U: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()

    if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
      throw new Error('Response does not appear to be a valid M3U playlist')
    }

    return text
  }
}
