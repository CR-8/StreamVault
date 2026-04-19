/**
 * CORS-aware M3U fetch helper.
 *
 * iptv-org.github.io serves Access-Control-Allow-Origin: * on all assets,
 * so those URLs can be fetched directly by the browser.
 * Custom user-supplied URLs may not have CORS headers, so they go via
 * the Vercel Edge Function at /api/proxy.
 */

const PROXY_BASE = '/api/proxy'

function isIptvOrg(url: string): boolean {
  return url.includes('iptv-org.github.io')
}

/**
 * Fetch an M3U file and return its raw text.
 * Throws if the response is not OK or if the network fails.
 */
export async function fetchM3U(url: string, signal?: AbortSignal): Promise<string> {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided')
  }

  const fetchUrl = isIptvOrg(url)
    ? url
    : `${PROXY_BASE}?url=${encodeURIComponent(url)}`

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
