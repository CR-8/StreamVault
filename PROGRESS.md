# StreamVault — Project Progress & Technical Reference

> **Last updated:** April 19 2026  
> **Status:** Active development — core feature-complete, UI polish ongoing

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Directory Map](#4-directory-map)
5. [Feature Inventory](#5-feature-inventory)
6. [Data Flow](#6-data-flow)
7. [State Management](#7-state-management)
8. [API Routes](#8-api-routes)
9. [UI Design System](#9-ui-design-system)
10. [Known Limitations](#10-known-limitations)
11. [Backlog / Planned Work](#11-backlog--planned-work)

---

## 1. Project Vision

**StreamVault** is a zero-backend, browser-native IPTV viewer.  
No server, no database, no account — everything lives in the browser via `localStorage` and `sessionStorage`.

**Core promise:**
- Open the URL → immediately browse 20 000+ live TV channels
- Enable curated source packs from an in-app Marketplace (powered by [iptv-org](https://github.com/iptv-org/iptv))
- Stream directly via HLS.js in-browser
- Works on both desktop and mobile

---

## 2. Tech Stack

### Runtime & Framework

| Layer | Choice | Version |
|---|---|---|
| Framework | **Next.js** (App Router) | 16.2.3 |
| Language | **TypeScript** | ^5 |
| Runtime | **React** | 19.2.4 |
| Deploy target | Vercel Edge Network | — |

### UI & Styling

| Library | Purpose | Version |
|---|---|---|
| **Tailwind CSS v4** | Utility-first CSS | ^4 |
| **shadcn/ui** | Headless component primitives | ^4.2.0 |
| **Radix UI** | Underlying accessible primitives | ^1.4.3 |
| **lucide-react** | Icon set | ^1.8.0 |
| **sonner** | Toast notifications | ^2.0.7 |
| **tw-animate-css** | CSS animation utilities | ^1.4.0 |
| **cmdk** | Command palette (future) | ^1.1.1 |

### State & Data

| Library | Purpose | Version |
|---|---|---|
| **Zustand v5** | Client-side global state | ^5.0.12 |
| **hls.js** | HLS stream playback | ^1.6.16 |
| **Browser localStorage** | Persistent channel cache & settings | — |
| **Browser sessionStorage** | Browse page navigation state | — |

### Build & Quality

| Tool | Purpose |
|---|---|
| **eslint** + `eslint-config-next` | Linting |
| **postcss** + `@tailwindcss/postcss` | CSS processing |
| `class-variance-authority` + `clsx` + `tailwind-merge` | Class merging utilities |

---

## 3. Architecture Overview

```
Browser (Client)
│
├── Next.js App Router (SSR shell, client components)
│   ├── /                   → Home (featured channels, recent)
│   ├── /browse             → Channel browser + filters + EPG tab
│   ├── /watch/[channelId]  → HLS player fullscreen
│   ├── /marketplace        → Enable / disable source packs
│   ├── /favorites          → Saved channels
│   └── /settings           → App configuration
│
├── Zustand stores (client-only)
│   ├── useStreamVaultStore  → Channels, packs, favorites, history
│   └── useEpgStore          → Live programme guide data
│
├── localStorage (persistence layer)
│   ├── sv:enabled-packs     → Which source packs the user enabled
│   ├── sv:pack:{id}         → Parsed channel list per pack (JSON)
│   ├── sv:favorites         → Array of favorite channel IDs
│   ├── sv:history           → Last 50 watched channels
│   └── sv:custom-sources    → User-added M3U URLs
│
└── sessionStorage (navigation state)
    └── browse-state         → { filters, page, tab } — survives page nav
```

```
Edge Network (Vercel)
│
└── /api/proxy?url=...
      Edge Function (runtime = 'edge')
      • SSRF-safe URL validation (blocks localhost / RFC-1918 ranges)
      • Proxies M3U files & EPG XML through → solves CORS for external sources
      • Cache-Control: public, s-maxage=300 (5-min CDN cache)
```

**Key architectural decision:** The app is entirely zero-backend. Every byte of channel data is fetched directly from the [iptv-org CDN](https://iptv-org.github.io/) through the Edge proxy, parsed in the browser, and stored in `localStorage`. There is no database, no auth, no server state.

---

## 4. Directory Map

```
next-js/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  Root layout — Nav + TooltipProvider + Toaster
│   │   ├── page.tsx                    Home page — hero, sections, recent
│   │   ├── globals.css                 Design tokens + Tailwind base
│   │   ├── browse/
│   │   │   └── page.tsx                Browse page (search, filters, EPG, pagination)
│   │   ├── watch/
│   │   │   └── [channelId]/            Dynamic watch page (HLS player)
│   │   ├── marketplace/                Source pack enable/disable UI
│   │   ├── favorites/                  Saved channels page
│   │   ├── settings/                   App settings
│   │   └── api/
│   │       └── proxy/
│   │           └── route.ts            Edge proxy — CORS + SSRF protection
│   │
│   ├── components/
│   │   ├── nav.tsx                     Sticky top nav — desktop + mobile Sheet
│   │   ├── channel-card.tsx            Channel thumbnail card + hover play
│   │   ├── epg-card.tsx                EPG-aware card (live badge, progress bar)
│   │   ├── filter-sidebar.tsx          Desktop sidebar + MobileFilterSheet + SearchBar
│   │   ├── hls-player.tsx              HLS.js video player wrapper
│   │   ├── source-pack-card.tsx        Marketplace pack card
│   │   ├── channel-grid.tsx            Responsive channel grid
│   │   ├── section-row.tsx             Horizontal scroll row (home sections)
│   │   ├── app-initializer.tsx         Zustand store bootstrap on mount
│   │   └── ui/                         shadcn/ui generated primitives
│   │
│   ├── store/
│   │   ├── useStreamVaultStore.ts      Main Zustand store (channels + packs + favorites)
│   │   └── useEpgStore.ts              EPG state — load, progress, data map
│   │
│   ├── lib/
│   │   ├── m3u-parser.ts               M3U/M3U8 text → Channel[] parser
│   │   ├── fetch-m3u.ts                Fetches M3U via /api/proxy
│   │   ├── epg.ts                      XMLTV fetch, parse, cache (epg.pw source)
│   │   ├── storage.ts                  All localStorage read/write helpers
│   │   └── utils.ts                    cn() class merge utility
│   │
│   ├── data/
│   │   └── source-packs.ts             Curated pack catalogue (name, id, m3u URL)
│   │
│   └── types/
│       └── index.ts                    Channel, CustomSource, CONTENT_CATEGORIES
│
├── next.config.ts                      Security headers + image config
├── components.json                     shadcn/ui registry config
├── package.json
├── tsconfig.json
├── PRD.md                              Original product requirements doc
└── IDEA.md                             Initial concept notes
```

---

## 5. Feature Inventory

### ✅ Implemented & Working

#### Source Pack Marketplace
- Curated list of iptv-org source packs (Free TV, Sports, News, etc.)
- Toggle packs on/off — channels load on first enable, served from cache thereafter
- Default packs seeded on first visit
- Custom M3U URL support — user pastes any M3U link → fetches + stores channels
- Storage usage indicator + warning when approaching limit

#### Browse Page (`/browse`)
- **Search bar** — filters by name, group, country, language in real-time
- **Filter sidebar** (desktop, `lg+`) — sticky panel with:
  - Category pills (mapped from `CONTENT_CATEGORIES`)
  - Sort (name A→Z, Z→A, category, country)
  - Country dropdown
  - Source pack dropdown
- **Mobile filter sheet** — slides in from left, triggered by a button placed next to the search bar (`lg:hidden`); desktop sidebar hidden on small screens
- **Pagination** — 30 channels per page, smart ellipsis, smooth scroll-to-top on page change
- **State persistence via `sessionStorage`** — saves active filters, current page number, and active tab; navigating away and returning restores exact state; URL params (`?q=`, `?view=epg`) take priority
- **"All Channels" tab** — full browseable 2→5 column responsive grid
- **"Live Guide" tab** — EPG-powered live TV view

#### Live Guide (EPG)
- Fetches XMLTV data from `epg.pw` via `/api/proxy`
- Concurrency-capped batch fetching (6 parallel requests max)
- In-memory cache per session (5-minute TTL)
- Inflight request deduplication (same `tvg-id` never fetched twice concurrently)
- Channels categorised into **Live Now** (with animated red dot) and **Not Currently Live**
- Per-channel progress bar showing how far through the current programme
- Progress bar + percentage during loading
- Manual "Refresh EPG" button
- Empty state if no channels have `tvg-id` metadata

#### Watch Page (`/watch/[channelId]`)
- Dynamic route — `channelId` looked up from Zustand store
- HLS.js player with native HLS fallback for Safari
- Auto-retry on stream error
- Watch history recorded (last 50 channels, persisted to localStorage)

#### Favorites
- Heart button on every channel card (toggle)
- `/favorites` page shows all saved channels
- Persisted to `localStorage`

#### Navigation
- Sticky top `<header>` with blur backdrop
- Desktop: horizontal nav links + search form (navigates to `/browse?q=`)
- Mobile: hamburger → Sheet with nav links + search form
- Active route highlighted

#### Edge Proxy (`/api/proxy`)
- Runs on Vercel Edge Runtime for global low-latency
- SSRF protection — blocks `localhost`, `127.x`, `10.x`, `192.168.x`, `172.16–31.x`
- Only allows `http:` / `https:` protocols
- 5-minute `Cache-Control` (both CDN and proxy level)
- CORS headers for browser fetch

---

## 6. Data Flow

### First Visit — Pack Loading

```
AppInitializer mounts
  → useStreamVaultStore.initialize()
  → reads localStorage: enabled packs, channels, favorites, history
  → if no packs yet: seeds DEFAULT_ENABLED_PACKS
  → for each pack with no cached channels:
      → fetchM3U(pack.m3uUrl)
          → GET /api/proxy?url={m3uUrl}        (Edge proxy → iptv-org CDN)
          ← M3U text
      → parseM3U(text, packId) → Channel[]
      → localStorage.setItem(`sv:pack:${packId}`, JSON.stringify(channels))
  → getAllChannels() merges all pack stores → Zustand channels[]
```

### EPG Loading (Live Guide tab)

```
User opens Live Guide tab
  → useEpgStore.loadEpg(channels)
  → filter channels where ch.tvgId != null
  → fetchEpgBatch(tvgIds, onProgress)
      → batches of 6 concurrent requests:
          GET /api/proxy?url=https://epg.pw/api/epg.xml?channel_id={id}&date={today}
          ← XMLTV XML
      → parseXmltv(xml) → EpgProgramme[]
      → pickCurrentAndNext() → { current, next }
      → in-memory cache (5 min TTL)
  → EpgStore.data = Map<tvgId, EpgChannelData>
  → EpgView re-renders: Live Now | Not Currently Live
```

---

## 7. State Management

### `useStreamVaultStore` (Zustand + `subscribeWithSelector`)

| Slice | Type | Source of truth |
|---|---|---|
| `enabledPacks` | `string[]` | localStorage + Zustand |
| `channels` | `Channel[]` | Derived: all pack caches merged |
| `favorites` | `string[]` | localStorage |
| `customSources` | `CustomSource[]` | localStorage |
| `history` | `WatchHistoryEntry[]` | localStorage (last 50) |
| `loadingStates` | `Record<packId, 'idle'│'loading'│'done'│'error'>` | Zustand only |
| `storageWarning` | `boolean` | Computed from storage usage |

### `useEpgStore` (Zustand)

| Slice | Type | Notes |
|---|---|---|
| `data` | `Map<tvgId, EpgChannelData>` | In-memory only (resets on reload) |
| `state` | `'idle'│'loading'│'done'│'error'` | — |
| `progress` | `number` (0–100) | Shown as progress bar in UI |

### Browse Page Session (`sessionStorage`)

Key: `browse-state`

```ts
{
  filters: Filters   // search, category, country, language, sourcePack, sort
  page: number       // current pagination page
  tab: string        // 'all' | 'epg'
}
```

Saved on every `filters`, `page`, or `tab` change. Restored on component mount. URL params (`?q=`, `?view=epg`) take priority over session state.

---

## 8. API Routes

### `GET /api/proxy?url={encodedUrl}`

**Runtime:** Edge  
**Purpose:** Transparent HTTP proxy to bypass CORS on external M3U and EPG sources.

| Validation step | Behaviour on failure |
|---|---|
| Missing `url` param | 400 Bad Request |
| Invalid URL (not parseable) | 400 Bad Request |
| Non-HTTP/S protocol | 400 Bad Request |
| Private/local IP range (SSRF) | 400 Bad Request |
| Upstream returns non-2xx | 502 Bad Gateway |
| Upstream fetch throws | 502 Bad Gateway |

**Success response:** `200 text/plain` with `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=300`.

---

## 9. UI Design System

### Colour Philosophy

Dark-first design. All colour tokens defined in `globals.css` using **OKLCH** for perceptually uniform hue control.

```
Background:  oklch(0.10 0.015 264)   — near-black indigo
Card:        oklch(0.14 0.018 264)   — elevated surface
Primary:     oklch(0.62 0.22 264)    — vivid violet-blue
Border:      oklch(1 0 0 / 8%)       — subtle white overlay
```

### Typography

`Inter` (Google Fonts) via `next/font`, applied as `--font-sans` CSS variable.  
`font-feature-settings: "cv02", "cv03", "cv04", "cv11"` for refined numerals and punctuation.

### Key Custom Utilities (`globals.css`)

| Class | Effect |
|---|---|
| `.scrollbar-none` | Hides scrollbar cross-browser |
| `.glass-card` | Glassmorphism — `backdrop-blur(16px) + saturate(180%)` |
| `.live-dot` | Animated red pulse for live indicators |
| `.gradient-text` | Violet→blue gradient clipped to text |
| `.hero-gradient` | Bottom-fade overlay for hero sections |

### Responsive Breakpoints (Tailwind defaults)

| Breakpoint | Width | Layout change |
|---|---|---|
| `sm` | 640px | Grid expands to 3 cols |
| `md` | 768px | Grid expands to 4 cols; desktop nav visible |
| `lg` | 1024px | Desktop filter sidebar visible; mobile search+filter row hidden |
| `xl` | 1280px | Grid expands to 5 cols |

---

## 10. Known Limitations

| # | Issue | Impact |
|---|---|---|
| 1 | **No stream health check** — channels shown regardless of whether the HLS URL is actually live | User may click channels that 404 or timeout |
| 2 | **EPG coverage gaps** — epg.pw only covers select channels; many show "no data" | Live Guide is incomplete for niche channels |
| 3 | **localStorage quota** — large packs can approach 5 MB browser limit | Storage warning shown but no auto-eviction |
| 4 | **No DRM support** — HLS.js only plays unencrypted or AES-128 streams | Premium DRM streams won't play |
| 5 | **Cold EPG load is slow** — fetching 100+ channels at 6 concurrent can take 15–30 seconds | Progress bar mitigates UX impact |
| 6 | **No PWA / offline support** | Must be online; no service worker caching |
| 7 | **Session state only** — browse state resets on browser close (sessionStorage) | By design; could be upgraded to localStorage if desired |

---

## 11. Backlog / Planned Work

### 🔴 High Priority

- [ ] **Stream health check** — silently HEAD-test stream URLs; dim/badge broken channels
- [ ] **Mini player (Picture-in-Picture)** — keep watching while browsing other pages
- [ ] **Debounced nav search** — search-as-you-type from the nav bar into browse page

### 🟡 Medium Priority

- [ ] **PWA manifest + service worker** — enable "Add to Home Screen" on mobile
- [ ] **Keyboard shortcuts** — `Space` play/pause, `/` focus search, arrow keys for channel switching
- [ ] **Channel detail modal** — logo, description, full EPG schedule before opening player
- [ ] **Auto-evict old pack caches** on storage warning (LRU by last-enabled date)
- [ ] **Remember volume + quality preference** via localStorage

### 🟢 Low Priority / Future

- [ ] **M3U export** — merge enabled packs → single downloadable `.m3u` file
- [ ] **Shareable watch links** — encode channelId in URL for easy sharing
- [ ] **Multiple EPG sources** — fall back to `xmltv.org` or Schedules Direct if epg.pw has no data
- [ ] **Dark/light mode toggle** — currently hard-locked to dark

---

*Generated from codebase snapshot — April 19 2026*
