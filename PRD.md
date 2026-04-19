# Product Requirements Document
## StreamVault — Browser-Based IPTV Web Player

**Version:** 1.1  
**Date:** April 2026  
**Author:** Pratyush Tiwari  
**Status:** Draft

---

## 1. Overview

StreamVault is a zero-auth, zero-backend, fully client-side IPTV web player built with Next.js and deployed on Vercel. Users can browse television channels organized by region, content type, and category — watch live streams directly in the browser — and manage their own M3U playlist sources. A marketplace page lets users discover and enable curated source packs without any account, payment, or signup.

All built-in source packs are powered by [iptv-org](https://github.com/iptv-org/iptv) — an open, CC0-licensed collection of 20,000+ publicly available IPTV channels organized by country, region, language, and category. No env vars, no secrets, no backend required for the default source library.

---

## 2. Problem Statement

IPTV streams are widely available but painful to use. Existing players are either desktop apps (VLC, Kodi), require account creation, are ad-laden, or have terrible UIs. There is no clean, instant, browser-based IPTV experience that works out of the box with no friction. StreamVault fills that gap.

---

## 3. Goals

- Zero friction: no login, no payment, no setup required to start watching
- Clean, navigable UI with section-based content architecture
- User-owned data: all preferences, favorites, and sources live in localStorage
- Extensible via a marketplace of source packs (powered by iptv-org)
- Deployable for free, maintainable solo, zero infrastructure cost

---

## 4. Non-Goals (v1)

- No user accounts or cloud sync
- No EPG/program guide parsing (v2)
- No DVR or recording
- No mobile app (responsive web only)
- No social features (comments, ratings)
- No monetization

---

## 5. Users

**Primary:** Tech-savvy individuals who know what IPTV is and want a clean interface to watch it. They bring their own M3U URLs or enable source packs from the marketplace.

**Secondary:** Casual users who just want to browse and watch without any setup — a few default category packs load immediately on first visit with no action required.

---

## 6. Pages & Routes

### 6.1 Home — `/`
- Hero section with featured channels (seeded from default-enabled category packs)
- Section rows by content type: Movies, Sports, News, Entertainment, Kids, Music, Documentary
- Each row is horizontally scrollable with channel cards
- "Continue Watching" row (from localStorage watch history)
- Quick-access Favorites row

### 6.2 Browse — `/browse`
- Full channel grid with filtering sidebar
- Filters: Region/Nation, Category, Source Pack, Language
- Search bar (live filter, no server call)
- Sort: Alphabetical, By Region, By Category
- Client-side pagination

### 6.3 Watch — `/watch/[channelId]`
- Full-width HLS video player (HLS.js)
- Channel metadata: name, logo, category, region
- Related channels sidebar (same group-title)
- Add to Favorites button
- Picture-in-Picture toggle
- Stream error state with retry button

### 6.4 Marketplace — `/marketplace`
- Three tabs: Regions, Countries, Categories
- Each card shows: name, emoji flag or icon, channel count, description, enable/disable toggle
- Enabling writes pack ID to localStorage, triggers M3U fetch and parse
- "Add Custom Source" section — user pastes any M3U URL
- iptv-org packs fetch directly from GitHub Pages (CORS-friendly)
- Custom user sources route through the Edge Function proxy

### 6.5 Favorites — `/favorites`
- Grid of user-favorited channels
- Empty state with CTA to browse
- Remove from favorites per channel

### 6.6 Settings — `/settings`
- View and manage enabled source packs
- Manage custom sources (add/remove/rename)
- Export profile as JSON download
- Import profile from JSON file
- Clear all data button with confirmation
- App version and attribution to iptv-org

---

## 7. Content Architecture

Channels are organized in a 3-level hierarchy:

```
Level 1 — Region/Nation
  Africa, Asia, Europe, Latin America, Middle East, North America, South Asia, Global

Level 2 — Content Type  (parsed from M3U group-title tag — already present in iptv-org files)
  Movies, Sports, News, Entertainment, Kids, Music, Documentary, Education, Lifestyle

Level 3 — Channel
  Individual stream: name, logo URL, stream URL, language, country code
```

iptv-org M3U files already tag every channel with `group-title`, which maps directly to Level 2. Region context comes from which source pack the channel belongs to. No manual curation is required — the content structure is derived automatically from the parsed M3U data.

---

## 8. Source Packs (Marketplace)

Source packs are defined entirely in a static TypeScript file at `src/data/source-packs.ts`, committed directly to the repo. **Zero environment variables are needed for built-in packs.** All iptv-org URLs are public, stable GitHub Pages URLs under the CC0 license.

**Source pack schema:**

```ts
type SourcePackType = 'region' | 'country' | 'category' | 'custom'

type SourcePack = {
  id: string
  name: string
  description: string
  type: SourcePackType
  m3uUrl: string           // public iptv-org GitHub Pages URL — hardcoded in repo
  channelCount: number     // approximate, sourced from iptv-org docs
  tags: string[]
  flag?: string            // emoji flag for country packs
}
```

**Representative built-in packs:**

```ts
// Regions
{ id: "afr",     name: "Africa",        type: "region",   channelCount: 900,  m3uUrl: "https://iptv-org.github.io/iptv/regions/afr.m3u"      }
{ id: "asia",    name: "Asia",          type: "region",   channelCount: 3200, m3uUrl: "https://iptv-org.github.io/iptv/regions/asia.m3u"     }
{ id: "eur",     name: "Europe",        type: "region",   channelCount: 2800, m3uUrl: "https://iptv-org.github.io/iptv/regions/eur.m3u"      }
{ id: "latam",   name: "Latin America", type: "region",   channelCount: 1400, m3uUrl: "https://iptv-org.github.io/iptv/regions/latam.m3u"   }
{ id: "mideast", name: "Middle East",   type: "region",   channelCount: 600,  m3uUrl: "https://iptv-org.github.io/iptv/regions/mideast.m3u" }
{ id: "sas",     name: "South Asia",    type: "region",   channelCount: 700,  m3uUrl: "https://iptv-org.github.io/iptv/regions/sas.m3u"     }

// Countries (160+ available from iptv-org)
{ id: "in",  flag: "🇮🇳", name: "India",   type: "country", channelCount: 460, m3uUrl: "https://iptv-org.github.io/iptv/countries/in.m3u" }
{ id: "us",  flag: "🇺🇸", name: "USA",     type: "country", channelCount: 830, m3uUrl: "https://iptv-org.github.io/iptv/countries/us.m3u" }
{ id: "uk",  flag: "🇬🇧", name: "UK",      type: "country", channelCount: 180, m3uUrl: "https://iptv-org.github.io/iptv/countries/uk.m3u" }
{ id: "ng",  flag: "🇳🇬", name: "Nigeria", type: "country", channelCount: 55,  m3uUrl: "https://iptv-org.github.io/iptv/countries/ng.m3u" }

// Categories (30 available from iptv-org)
{ id: "cat_movies",  name: "Movies",        type: "category", channelCount: 390,  m3uUrl: "https://iptv-org.github.io/iptv/categories/movies.m3u"        }
{ id: "cat_sports",  name: "Sports",        type: "category", channelCount: 312,  m3uUrl: "https://iptv-org.github.io/iptv/categories/sports.m3u"        }
{ id: "cat_news",    name: "News",          type: "category", channelCount: 917,  m3uUrl: "https://iptv-org.github.io/iptv/categories/news.m3u"          }
{ id: "cat_kids",    name: "Kids",          type: "category", channelCount: 221,  m3uUrl: "https://iptv-org.github.io/iptv/categories/kids.m3u"          }
{ id: "cat_music",   name: "Music",         type: "category", channelCount: 637,  m3uUrl: "https://iptv-org.github.io/iptv/categories/music.m3u"         }
{ id: "cat_docs",    name: "Documentary",   type: "category", channelCount: 127,  m3uUrl: "https://iptv-org.github.io/iptv/categories/documentary.m3u"   }
{ id: "cat_edu",     name: "Education",     type: "category", channelCount: 185,  m3uUrl: "https://iptv-org.github.io/iptv/categories/education.m3u"     }
{ id: "cat_ent",     name: "Entertainment", type: "category", channelCount: 621,  m3uUrl: "https://iptv-org.github.io/iptv/categories/entertainment.m3u" }
{ id: "cat_ani",     name: "Animation",     type: "category", channelCount: 79,   m3uUrl: "https://iptv-org.github.io/iptv/categories/animation.m3u"     }
{ id: "cat_comedy",  name: "Comedy",        type: "category", channelCount: 66,   m3uUrl: "https://iptv-org.github.io/iptv/categories/comedy.m3u"        }
```

All 160+ countries, 7 regions, and 30 categories from iptv-org can be added to the marketplace with no code changes beyond adding entries to this file.

---

## 9. CORS Strategy & Proxy

Two modes of M3U fetching based on source origin:

| Source Type | Fetch Strategy | Reason |
|---|---|---|
| iptv-org packs | Direct browser fetch | GitHub Pages serves `Access-Control-Allow-Origin: *` |
| Custom user URLs | Route through `/api/proxy` Edge Function | CORS headers unknown |

Auto-detection in the fetch layer (`lib/fetch-m3u.ts`):

```ts
const isIptvOrg = url.includes('iptv-org.github.io')
const fetchUrl = isIptvOrg ? url : `/api/proxy?url=${encodeURIComponent(url)}`
const res = await fetch(fetchUrl)
return res.text()
```

The Edge Function is a single file (`app/api/proxy/route.ts`):

```ts
export const runtime = 'edge'
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url')
  const res = await fetch(url)
  const text = await res.text()
  return new Response(text, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  })
}
```

No secrets. No env vars. Free on Vercel Hobby forever.

---

## 10. Data Flow

**iptv-org pack (direct):**
```
User enables "India" pack in marketplace
        ↓
App detects iptv-org URL → fetches directly from GitHub Pages
        ↓
M3U text parsed → Channel[] (group-title auto-maps to categories)
        ↓
Stored: localStorage['streamvault:channels:in']
        ↓
All enabled packs merged → sections rendered on home/browse
```

**Custom user source (proxied):**
```
User pastes custom M3U URL in marketplace
        ↓
App detects non-iptv-org URL → calls /api/proxy?url=<encoded>
        ↓
Edge Function fetches M3U, returns with CORS headers
        ↓
Same parse → store → render flow as above
```

---

## 11. M3U Parser Requirements

The client-side parser (`lib/m3u-parser.ts`) must handle:
- `#EXTM3U` header
- `#EXTINF` lines with attributes: `tvg-name`, `tvg-logo`, `tvg-id`, `tvg-country`, `tvg-language`, `group-title`
- Stream URL lines (HTTP/HTTPS, `.m3u8`, `.ts`)
- Malformed or incomplete entries — skip gracefully, never throw
- Output: typed `Channel[]` array

```ts
type Channel = {
  id: string           // stable hash of stream URL
  name: string
  logo: string
  streamUrl: string
  groupTitle: string   // raw from M3U, used for section/category mapping
  country: string
  language: string
  sourcePack: string   // which pack this channel came from
}
```

---

## 12. Player Requirements

- Library: HLS.js (npm)
- Safari fallback: native `<video>` (has built-in HLS support)
- Stream error: retry button + "stream unavailable" message — never a broken video element
- Picture-in-Picture via browser PiP API
- Loading spinner overlay during stream initialization
- Native browser video controls (no custom controls in v1)

---

## 13. localStorage Schema

```ts
// Enabled pack IDs
localStorage['streamvault:enabled_packs'] = '["in","cat_movies","cat_news"]'

// Parsed channels per pack
localStorage['streamvault:channels:in']         = '[...Channel[]]'
localStorage['streamvault:channels:cat_movies'] = '[...Channel[]]'

// User favorites (channel IDs)
localStorage['streamvault:favorites'] = '["ch_abc123","ch_def456"]'

// Custom user-added sources
localStorage['streamvault:custom_sources'] = '[{id, name, m3uUrl}]'

// Watch history
localStorage['streamvault:history'] = '[{channelId, watchedAt}]'
```

---

## 14. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Free on Vercel, Edge Function support baked in |
| Language | TypeScript | Type safety for M3U parser and channel schema |
| UI Components | shadcn/ui | Free, composable, code-owned via registry CLI |
| Styling | Tailwind CSS v3 | Ships with shadcn setup |
| Player | HLS.js | Only cross-browser option for .m3u8 streams |
| Proxy | Vercel Edge Function | Free, co-deployed, only needed for custom sources |
| Source Library | iptv-org (GitHub Pages) | CC0, 20k+ channels, CORS headers, no auth |
| Storage | localStorage only | Zero backend, zero cost |
| Hosting | Vercel Hobby | Free forever, zero config |
| Icons | Lucide React | Ships with shadcn |

---

## 15. Component Map

```
app/
  layout.tsx                  ← root layout, nav
  page.tsx                    ← Home (section rows)
  browse/page.tsx             ← full grid + filters
  watch/[channelId]/page.tsx  ← HLS player
  marketplace/page.tsx        ← source pack discovery (Region/Country/Category tabs)
  favorites/page.tsx
  settings/page.tsx
  api/proxy/route.ts          ← Edge Function (custom user sources only)

components/
  channel-card.tsx
  channel-grid.tsx
  section-row.tsx
  source-pack-card.tsx
  marketplace-toggle.tsx
  hls-player.tsx
  search-bar.tsx
  filter-sidebar.tsx
  nav.tsx

lib/
  m3u-parser.ts               ← parses M3U text → Channel[]
  storage.ts                  ← localStorage read/write helpers
  fetch-m3u.ts                ← CORS-aware fetch (direct vs proxy)

data/
  source-packs.ts             ← full marketplace config, all iptv-org URLs hardcoded
```

---

## 16. MVP Acceptance Criteria

- [ ] App loads with a few category packs enabled by default — channels visible immediately with no user action
- [ ] User can click a channel and watch it in the HLS player
- [ ] User can browse channels by region and category
- [ ] User can search channels by name (live, client-side)
- [ ] User can favorite a channel and view it on the Favorites page
- [ ] User can go to Marketplace, enable a country/region/category pack, and see new channels appear
- [ ] User can paste a custom M3U URL and have it parsed and displayed
- [ ] User can export and import their profile as JSON
- [ ] All data persists across browser refresh via localStorage
- [ ] App deploys to Vercel Hobby with zero paid config and zero environment variables

---

## 17. Out of Scope for v1 (Future Backlog)

- EPG / Electronic Program Guide (iptv-org/epg repo exists — natural v2 addition)
- PWA / offline support
- Channel metadata enrichment via TMDB (logos, descriptions)
- Stream health / uptime indicators per channel
- Community-submitted source packs
- Mobile-optimized gestures
- Keyboard shortcuts

---

## 18. Risks

| Risk | Mitigation |
|---|---|
| iptv-org stream URLs go dead | Expected for IPTV — show "stream unavailable" + retry gracefully |
| iptv-org repo restructures URLs | GitHub Pages pattern is stable; monitor repo if it ever changes |
| localStorage quota exceeded on large packs | Warn user approaching limit; prompt to disable unused packs |
| Custom source CORS failure | Edge Function proxy handles it; show clear error if proxy itself fails |
| Vercel bandwidth limit hit | Only M3U text (few KB) is proxied — video bytes go direct to user |
| Large M3U parse blocking the UI thread | Parse in a Web Worker for files with 5000+ channels |