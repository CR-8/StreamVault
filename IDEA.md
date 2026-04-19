# StreamVault — Idea & Tech Stack

## The Idea

StreamVault is a browser-based IPTV player. No accounts. No payments. No backend. Open it, pick a source, and watch TV.

It solves a specific problem: IPTV streams exist everywhere but there's no clean, instant, web-based way to watch them. VLC is a desktop app. Most web players are ad-riddled or require signup. StreamVault is the frictionless alternative.

The core loop is:
1. Open the app — a few default category packs are pre-loaded, channels visible immediately
2. Browse channels organized by region and content type
3. Click a channel and watch

Everything beyond that — enabling more packs, adding your own sources, saving favorites — is optional and progressive.

---

## The Source Library: iptv-org

All built-in content is powered by [iptv-org/iptv](https://github.com/iptv-org/iptv) — a community-maintained, CC0-licensed collection of 20,000+ publicly available IPTV channels from every country. Hosted on GitHub Pages, always-on, CORS-friendly.

iptv-org provides pre-filtered M3U playlists for everything StreamVault needs:

| Filter | URL Pattern | Example |
|---|---|---|
| By region | `/regions/<id>.m3u` | `regions/afr.m3u` — all Africa |
| By country | `/countries/<cc>.m3u` | `countries/in.m3u` — India |
| By category | `/categories/<name>.m3u` | `categories/movies.m3u` — 390 movie channels |
| By language | `/languages/<code>.m3u` | `languages/hin.m3u` — Hindi |

This means the entire marketplace is just a static TypeScript config file with iptv-org URLs. No scraping, no backend, no curation effort. Adding a new country to the marketplace is one line of code.

---

## The Marketplace Angle

StreamVault ships a marketplace of source packs. Each pack is a curated iptv-org playlist — or a custom M3U URL the user brings. Users browse the marketplace, enable packs, and those channels appear in their app.

This keeps StreamVault legally clean: it's a client-side playlist parser and viewer. The actual video bytes always travel directly from stream servers to the user's browser. StreamVault proxies nothing except small M3U text files for custom non-CORS sources.

iptv-org itself operates on the same legal principle — it links to publicly available streams, stores no video, and is CC0 licensed.

---

## Content Architecture

Channels are organized in a 3-level hierarchy that maps directly to how iptv-org M3U files are structured:

```
Region (from source pack)  →  Category (from group-title tag)  →  Channel

Africa      →  Movies       →  AfricaMagic Cinema
India       →  Sports       →  Star Sports 1
Global      →  News         →  Al Jazeera English
USA         →  Kids         →  Cartoon Network
```

The `group-title` attribute in every `#EXTINF` line handles Level 2 automatically. No manual tagging needed.

---

## What's Stored Where

Everything user-specific lives in localStorage:
- Which source packs are enabled
- Parsed channel lists per pack (keyed by pack ID)
- Favorited channels
- Watch history
- Custom user-added M3U sources

Zero database. Zero cloud sync. Export/import as JSON for backup. No env vars needed for any of this.

---

## CORS: Simpler Than Expected

iptv-org is hosted on GitHub Pages, which serves `Access-Control-Allow-Origin: *` on all assets. That means the browser can fetch iptv-org M3U playlists directly — no proxy needed.

The Edge Function proxy is only needed for **custom user-added URLs**, where CORS headers are unknown. One if-statement in the fetch layer handles the routing:

```ts
const isIptvOrg = url.includes('iptv-org.github.io')
const fetchUrl = isIptvOrg ? url : `/api/proxy?url=${encodeURIComponent(url)}`
```

---

## Finalized Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Edge Function support baked in |
| Language | TypeScript | M3U parser needs typed Channel schema |
| UI Library | shadcn/ui | Pull components via `npx shadcn@latest add` |
| Styling | Tailwind CSS v3 | Co-installed with shadcn |
| Video Player | HLS.js | Handles .m3u8 streams in browser |
| CORS Proxy | Vercel Edge Function | One file, free tier, custom sources only |
| Source Library | iptv-org | CC0, GitHub Pages, 20k+ channels |
| Storage | localStorage | No backend needed |
| Icons | Lucide React | Bundled with shadcn |
| Deployment | Vercel Hobby | Free tier, zero config, zero env vars |

---

## Why These Choices

**iptv-org over hardcoded/env-var sources:** Better in every dimension — legally clean (CC0), maintained by a community, already organized by country/category/region, CORS-friendly, and zero cost. The marketplace writes itself.

**Next.js over Vite+React:** Edge Functions deploy alongside the app on Vercel with zero extra config. The proxy is one file. With Vite you'd need a separate service.

**shadcn/ui over a component library:** shadcn components are copied into your repo, not installed as a black-box dependency. You own the code, can customize freely, no version lock-in. Pull exactly what you need via the registry CLI.

**HLS.js:** Native `<video>` can't play `.m3u8` streams in non-Safari browsers. HLS.js is the standard, well-maintained solution — handles adaptive bitrate automatically.

**localStorage only:** For a zero-cost fun project, a database is massive overkill. localStorage handles all state needs for a single-user experience. Export/import JSON covers the backup use case.

**Vercel Hobby:** Free forever for hobby projects. The bandwidth limit is irrelevant — video bytes never pass through Vercel, only small M3U text files do.

---

## Zero Cost Guarantee

| Service | Free Tier Limit | Actual Usage |
|---|---|---|
| Vercel Hobby | 100GB bandwidth/month | ~KB per custom source proxy call — never video |
| Vercel Edge Functions | 500K invocations/month | One call per custom source enable |
| iptv-org (GitHub Pages) | Unlimited public access | Direct client fetch, Vercel not involved |
| localStorage | ~5MB per origin | Channel lists + metadata |

Total spend: ₹0. Forever.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Home — section rows by content type |
| `/browse` | Full channel grid with filters + search |
| `/watch/[id]` | HLS player + channel info + related channels |
| `/marketplace` | Source pack discovery (Region / Country / Category tabs) |
| `/favorites` | User's saved channels |
| `/settings` | Sources management, export/import, clear data |

---

## One-Day Build Order

1. Scaffold Next.js + shadcn + Tailwind
2. Write M3U parser (`lib/m3u-parser.ts`)
3. Write localStorage helpers (`lib/storage.ts`)
4. Write CORS-aware fetch helper (`lib/fetch-m3u.ts`)
5. Build Edge Function proxy (`app/api/proxy/route.ts`) — for custom sources
6. Write source packs config (`data/source-packs.ts`) — iptv-org URLs
7. Build Marketplace page + enable/disable flow
8. Build Browse page + search/filter
9. Build Watch page + HLS player
10. Build Home page with section rows (auto-built from enabled packs)
11. Build Favorites + Settings pages
12. Deploy to Vercel, test end-to-end