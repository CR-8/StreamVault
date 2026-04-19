'use client'

import { useMemo, useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChannelCard, ChannelCardSkeleton } from '@/components/channel-card'
import { EpgCard, EpgCardSkeleton } from '@/components/epg-card'
import { FilterSidebar, MobileFilterSheet, SearchBar, type Filters, DEFAULT_FILTERS } from '@/components/filter-sidebar'
import { useStreamVaultStore } from '@/store/useStreamVaultStore'
import { useEpgStore } from '@/store/useEpgStore'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tv2, CalendarDays, Loader2, RefreshCw, Radio, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const PAGE_SIZE = 30
const SESSION_KEY = 'browse-state'

// ── Session state persistence ─────────────────────────────────────────────────

interface BrowseSession {
  filters: Filters
  page: number
  tab: string
}

function readSession(): Partial<BrowseSession> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Partial<BrowseSession>) : {}
  } catch {
    return {}
  }
}

function writeSession(state: BrowseSession) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota errors */
  }
}

// ── Pagination component ─────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  // Generate page numbers with ellipsis
  const getPages = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '…')[] = []
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
    return pages
  }

  const pages = getPages()

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 mt-8 select-none"
    >
      {/* Prev */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === '…' ? (
          <span
            key={`ellipsis-${i}`}
            className="w-9 h-9 flex items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'h-9 w-9 rounded-md text-sm font-medium transition-colors',
              p === page
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

function sortChannels(
  channels: ReturnType<typeof useStreamVaultStore.getState>['channels'],
  sort: Filters['sort']
) {
  return [...channels].sort((a, b) => {
    switch (sort) {
      case 'name-asc': return a.name.localeCompare(b.name)
      case 'name-desc': return b.name.localeCompare(a.name)
      case 'category': return a.groupTitle.localeCompare(b.groupTitle) || a.name.localeCompare(b.name)
      case 'country': return a.country.localeCompare(b.country) || a.name.localeCompare(b.name)
      default: return 0
    }
  })
}

// ── EPG / Live Guide view ─────────────────────────────────────────────────────

function EpgView({ channels }: { channels: ReturnType<typeof useStreamVaultStore.getState>['channels'] }) {
  const { data, state, progress, loadEpg, clear } = useEpgStore()
  const hasFetched = useRef(false)
  const epgCapable = useMemo(() => channels.filter((ch) => !!ch.tvgId), [channels])

  useEffect(() => {
    if (epgCapable.length === 0) return
    if (hasFetched.current && state !== 'idle') return
    hasFetched.current = true
    loadEpg(channels)
  }, [epgCapable.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    clear()
    hasFetched.current = false
    loadEpg(channels)
  }

  const { liveChannels, otherChannels } = useMemo(() => {
    const live: typeof epgCapable = []
    const other: typeof epgCapable = []
    for (const ch of epgCapable) {
      const epg = data.get(ch.tvgId!)
      if (epg?.current) live.push(ch)
      else other.push(ch)
    }
    return { liveChannels: live, otherChannels: other }
  }, [epgCapable, data])

  const isLoading = state === 'loading'
  const isDone = state === 'done'

  if (epgCapable.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <Radio className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-semibold">No EPG-capable channels</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            None of your enabled channels include a <code className="text-xs bg-muted px-1 py-0.5 rounded">tvg-id</code> EPG identifier.
            Enable the <strong>Free TV</strong> pack or similar curated sources from the Marketplace.
          </p>
        </div>
        <Button asChild variant="outline"><Link href="/marketplace">Marketplace</Link></Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-32 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
              </div>
              <span className="text-sm text-muted-foreground truncate">Loading programme guide…</span>
            </>
          ) : isDone ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{liveChannels.length}</span> live now
              {' · '}
              <span>{otherChannels.length} no data</span>
            </p>
          ) : state === 'error' ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-destructive">EPG unavailable</span>
              {' · '}
              <span>epg.pw is not responding right now — try again later</span>
            </p>
          ) : null}
        </div>
        {(isDone || state === 'error') && (
          <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>

      {/* Live Now section */}
      {(isLoading || liveChannels.length > 0) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <h2 className="text-base font-semibold">Live Now</h2>
            {!isLoading && (
              <span className="text-sm text-muted-foreground">({liveChannels.length})</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => <EpgCardSkeleton key={i} />)
              : liveChannels.map((ch) => (
                <EpgCard key={ch.id} channel={ch} epg={data.get(ch.tvgId!) ?? null} />
              ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {isDone && liveChannels.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-semibold">No live programmes right now</p>
            <p className="text-sm text-muted-foreground mt-1">EPG data loaded but no channels are airing a current programme.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh EPG
          </Button>
        </div>
      )}

      {/* Not currently live */}
      {isDone && otherChannels.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Not currently live ({otherChannels.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {otherChannels.map((ch) => (
              <EpgCard key={ch.id} channel={ch} epg={data.get(ch.tvgId!) ?? null} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── All Channels view ─────────────────────────────────────────────────────────

function AllChannelsView({
  channels,
  filters,
  onFiltersChange,
  countries,
  languages,
  sourcePacks,
  page,
  onPageChange,
}: {
  channels: ReturnType<typeof useStreamVaultStore.getState>['channels']
  filters: Filters
  onFiltersChange: (f: Filters) => void
  countries: string[]
  languages: string[]
  sourcePacks: string[]
  page: number
  onPageChange: (p: number) => void
}) {
  const filteredChannels = useMemo(() => {
    let result = channels
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.groupTitle.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          c.language.toLowerCase().includes(q)
      )
    }
    if (filters.category) result = result.filter((c) => c.groupTitle.toLowerCase() === filters.category.toLowerCase())
    if (filters.country) result = result.filter((c) => c.country.toLowerCase() === filters.country.toLowerCase())
    if (filters.language) result = result.filter((c) => c.language.toLowerCase() === filters.language.toLowerCase())
    if (filters.sourcePack) result = result.filter((c) => c.sourcePack === filters.sourcePack)
    return sortChannels(result, filters.sort)
  }, [channels, filters])

  const totalPages = Math.ceil(filteredChannels.length / PAGE_SIZE)
  const pagedChannels = filteredChannels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const handlePageChange = (p: number) => {
    onPageChange(p)
    scrollToTop()
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Desktop filter sidebar — hidden below lg */}
      <FilterSidebar
        filters={filters}
        onFiltersChange={onFiltersChange}
        countries={countries}
        languages={languages}
        sourcePacks={sourcePacks}
        totalCount={channels.length}
        filteredCount={filteredChannels.length}
      />

      {/* Channel grid */}
      <div className="flex-1 min-w-0">
        {/* Desktop search bar — only shown on lg+ since mobile has its own bar */}
        <div className="hidden lg:block mb-4">
          <SearchBar
            value={filters.search}
            onChange={(v) => onFiltersChange({ ...filters, search: v })}
          />
        </div>

        {filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Tv2 className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-semibold">No channels found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {channels.length === 0
                  ? 'Enable source packs in the Marketplace first.'
                  : 'Try adjusting your filters or search term.'}
              </p>
            </div>
            {channels.length === 0 && (
              <Button asChild><Link href="/marketplace">Open Marketplace</Link></Button>
            )}
          </div>
        ) : (
          <>
            {/* Results count + page info */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">
                {filteredChannels.length.toLocaleString()} channels
                {totalPages > 1 && (
                  <> · page <span className="font-medium text-foreground">{page}</span> of {totalPages}</>
                )}
              </p>
            </div>

            {/* Grid — 2-col on mobile, expands on larger screens */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {pagedChannels.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
            </div>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function BrowsePageInner() {
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''
  const initialTab = searchParams.get('view') === 'epg' ? 'epg' : 'all'

  // Restore persisted session (runs once on mount — client only)
  const session = useMemo(() => {
    const s = readSession()
    return {
      filters: initialQ
        ? { ...DEFAULT_FILTERS, search: initialQ }  // URL param wins over session for search
        : (s.filters ?? { ...DEFAULT_FILTERS }),
      page: s.page ?? 1,
      tab: searchParams.get('view') ? initialTab : (s.tab ?? 'all'),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentionally run once

  const allChannels = useStreamVaultStore((s) => s.channels)
  const loadingStates = useStreamVaultStore((s) => s.loadingStates)
  const isLoading = Object.values(loadingStates).some((s) => s === 'loading') && allChannels.length === 0

  const [filters, setFilters] = useState<Filters>(session.filters)
  const [page, setPage] = useState<number>(session.page)
  const [activeTab, setActiveTab] = useState(session.tab)

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    writeSession({ filters, page, tab: activeTab })
  }, [filters, page, activeTab])

  // Reset page to 1 whenever filters change (but not on initial mount)
  const isFirstFilterRender = useRef(true)
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false
      return
    }
    setPage(1)
  }, [filters])

  const handleFiltersChange = useCallback((f: Filters) => setFilters(f), [])

  const countries = useMemo(() => {
    const set = new Set(allChannels.map((c) => c.country).filter(Boolean))
    return [...set].sort()
  }, [allChannels])

  const languages = useMemo(() => {
    const set = new Set(allChannels.map((c) => c.language).filter(Boolean))
    return [...set].sort()
  }, [allChannels])

  const sourcePacks = useMemo(() => {
    const set = new Set(allChannels.map((c) => c.sourcePack).filter(Boolean))
    return [...set].sort()
  }, [allChannels])

  const epgCount = useMemo(() => allChannels.filter((c) => !!c.tvgId).length, [allChannels])

  // Filtered count for mobile sheet badge
  const filteredCount = useMemo(() => {
    let result = allChannels
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.groupTitle.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          c.language.toLowerCase().includes(q)
      )
    }
    if (filters.category) result = result.filter((c) => c.groupTitle.toLowerCase() === filters.category.toLowerCase())
    if (filters.country) result = result.filter((c) => c.country.toLowerCase() === filters.country.toLowerCase())
    if (filters.language) result = result.filter((c) => c.language.toLowerCase() === filters.language.toLowerCase())
    if (filters.sourcePack) result = result.filter((c) => c.sourcePack === filters.sourcePack)
    return result.length
  }, [allChannels, filters])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Browse Channels</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {allChannels.length.toLocaleString()} channels
          {epgCount > 0 && (
            <> · <span className="text-primary">{epgCount.toLocaleString()} with EPG</span></>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} id="browse-tabs">

        {/* ── Tab bar ───────────────────────────────────────────────── */}
        <TabsList className="mb-5">
          <TabsTrigger value="all" className="gap-2" id="tab-all">
            <Tv2 className="h-4 w-4" />
            All Channels
          </TabsTrigger>
          <TabsTrigger value="epg" className="gap-2" id="tab-epg">
            <CalendarDays className="h-4 w-4" />
            Live Guide
            {epgCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                {epgCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── All Channels ──────────────────────────────────────────── */}
        <TabsContent value="all" className="mt-0 space-y-4">
          {/*
            Mobile: search bar + filter button side by side.
            The filter button (MobileFilterSheet) is hidden on lg+ since the
            desktop sidebar is rendered inside AllChannelsView.
          */}
          <div className="flex gap-2 lg:hidden">
            <SearchBar
              value={filters.search}
              onChange={(v) => handleFiltersChange({ ...filters, search: v })}
              className="flex-1 min-w-0"
            />
            <MobileFilterSheet
              filters={filters}
              onFiltersChange={handleFiltersChange}
              countries={countries}
              languages={languages}
              sourcePacks={sourcePacks}
              totalCount={allChannels.length}
              filteredCount={filteredCount}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 20 }).map((_, i) => <ChannelCardSkeleton key={i} />)}
            </div>
          ) : (
            <AllChannelsView
              channels={allChannels}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              countries={countries}
              languages={languages}
              sourcePacks={sourcePacks}
              page={page}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        {/* ── Live Guide ────────────────────────────────────────────── */}
        <TabsContent value="epg" className="mt-0">
          <EpgView channels={allChannels} />
        </TabsContent>

      </Tabs>
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowsePageInner />
    </Suspense>
  )
}
