# StreamVault 📺

A clean, zero-auth, browser-based IPTV player. No accounts. No payments. No backend. Open it and watch TV.

> Built with Next.js · Powered by iptv-org · Deployed on Vercel · Everything in localStorage

---

## What it is

StreamVault lets you browse and watch live TV channels organized by region and content type — directly in your browser. Enable curated source packs from the built-in marketplace (powered by [iptv-org](https://github.com/iptv-org/iptv)) or bring your own M3U source.

Everything you do (favorites, enabled sources, watch history) is stored in your browser's localStorage. Nothing is ever sent to a server. No tracking. No ads.

---

## Features

- **20,000+ channels out of the box** — powered by iptv-org, organized by country, region, and category
- **Marketplace** — browse and enable source packs by Region, Country (160+), or Category (30+)
- **Section-based browsing** — channels organized by content type: Movies, Sports, News, Entertainment, Kids, Music, Documentary
- **Custom sources** — paste any M3U URL; proxied through a Vercel Edge Function to handle CORS
- **Search & filter** — live search across all enabled channels, filter by region/category
- **Favorites** — bookmark channels, persisted in localStorage
- **HLS player** — plays .m3u8 streams via HLS.js; native fallback on Safari
- **Export / Import** — backup your profile (enabled sources, favorites) as JSON
- **Zero cost** — runs entirely on Vercel Hobby, ₹0 infrastructure, zero env vars required

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | shadcn/ui + Tailwind CSS v3 |
| Player | HLS.js |
| Proxy | Vercel Edge Function (custom sources only) |
| Source Library | iptv-org (GitHub Pages, CC0) |
| Storage | localStorage |
| Hosting | Vercel Hobby |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Vercel account (free)

### Local development

```bash
git clone https://github.com/your-username/streamvault
cd streamvault
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No `.env` file needed. All built-in source packs use public iptv-org URLs — no secrets, no configuration.

### Deploy to Vercel

```bash
npx vercel
```

That's it. No environment variables required for the default setup.

> If you want to add **private custom sources** (not iptv-org), you can optionally add them as env vars and reference them from your source-packs config. But this is entirely optional.

---

## Project Structure

```
streamvault/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home — section rows
│   ├── browse/page.tsx             # Channel grid + filters
│   ├── watch/[channelId]/page.tsx  # HLS player
│   ├── marketplace/page.tsx        # Source pack discovery
│   ├── favorites/page.tsx
│   ├── settings/page.tsx
│   └── api/proxy/route.ts          # Edge Function — proxies custom M3U sources
│
├── components/
│   ├── channel-card.tsx
│   ├── channel-grid.tsx
│   ├── section-row.tsx
│   ├── source-pack-card.tsx
│   ├── marketplace-toggle.tsx
│   ├── hls-player.tsx
│   ├── search-bar.tsx
│   ├── filter-sidebar.tsx
│   └── nav.tsx
│
├── lib/
│   ├── m3u-parser.ts               # Parses M3U text → Channel[]
│   ├── storage.ts                  # localStorage read/write helpers
│   └── fetch-m3u.ts                # CORS-aware fetch (direct vs proxy)
│
└── data/
    └── source-packs.ts             # Full marketplace config — iptv-org URLs hardcoded
```

---

## Source Library: iptv-org

All built-in source packs point to [iptv-org/iptv](https://github.com/iptv-org/iptv) playlists hosted on GitHub Pages. These are free, publicly available, CC0 licensed, and served with CORS headers — meaning the browser fetches them directly with no proxy needed.

Available playlist types used in the marketplace:

```
By region:    https://iptv-org.github.io/iptv/regions/afr.m3u
By country:   https://iptv-org.github.io/iptv/countries/in.m3u
By category:  https://iptv-org.github.io/iptv/categories/movies.m3u
By language:  https://iptv-org.github.io/iptv/languages/hin.m3u
```

Adding a new country or category to the marketplace is one line in `data/source-packs.ts`.

---

## How the proxy works

iptv-org URLs are fetched directly by the browser (GitHub Pages allows it). The proxy only activates for **custom user-added M3U URLs** where CORS headers are unknown.

```
Custom URL → /api/proxy?url=<encoded> → Edge Function fetches → returns with CORS headers
```

The proxy is a single Edge Function file and is free on Vercel Hobby. It never proxies video bytes — only small M3U text files (a few KB each).

---

## How localStorage is used

```
streamvault:enabled_packs         → ["in", "cat_movies", "cat_news"]
streamvault:channels:in           → Channel[] (parsed from India M3U)
streamvault:channels:cat_movies   → Channel[] (parsed from movies category)
streamvault:favorites             → ["ch_abc123", "ch_def456"]
streamvault:custom_sources        → [{id, name, m3uUrl}]
streamvault:history               → [{channelId, watchedAt}]
```

Clear everything via **Settings → Clear all data**.

---

## Content Architecture

```
Source Pack (iptv-org)   group-title (from M3U)   Channel
──────────────────────────────────────────────────────────────
India (in.m3u)       →   Sports             →   Star Sports 1
Africa (afr.m3u)     →   Movies             →   AfricaMagic Cinema
Global News pack     →   News               →   Al Jazeera English
USA (us.m3u)         →   Kids               →   Cartoon Network
```

The `group-title` attribute in every M3U `#EXTINF` line maps channels to content sections automatically. No manual curation required.

---

## Zero Cost

| Service | Free Tier | Usage |
|---|---|---|
| Vercel Hobby | 100GB bandwidth/month | Only tiny M3U text files proxied; video is direct |
| Vercel Edge Functions | 500K invocations/month | One call per custom source enable |
| iptv-org / GitHub Pages | Unlimited public access | Direct browser fetch, Vercel not involved |
| localStorage | ~5MB per origin | Channel lists + user preferences |

**Total: ₹0. No env vars. No paid tiers.**

---

## Legal

StreamVault does not host, distribute, or store any video streams. It is a client-side M3U playlist parser and HLS player. All built-in source packs point to [iptv-org/iptv](https://github.com/iptv-org/iptv), which is CC0 licensed and contains only user-submitted links to publicly available streams. Users are responsible for ensuring they have the right to access any streams they add via custom sources.

---

## Roadmap

- [ ] EPG / Electronic Program Guide (iptv-org/epg integration)
- [ ] PWA support
- [ ] Stream health indicators per channel
- [ ] Channel metadata enrichment via TMDB
- [ ] Keyboard shortcuts

---

## Contributing

PRs welcome. Open an issue first for anything beyond bug fixes.

---

## License

MIT

---

## Attribution

Channel data powered by [iptv-org/iptv](https://github.com/iptv-org/iptv) — CC0 1.0 Universal.