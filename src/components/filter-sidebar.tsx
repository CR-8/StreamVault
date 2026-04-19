'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { CONTENT_CATEGORIES } from '@/types'
import { cn } from '@/lib/utils'

export interface Filters {
  search: string
  category: string
  country: string
  language: string
  sourcePack: string
  sort: 'name-asc' | 'name-desc' | 'category' | 'country'
}

export const DEFAULT_FILTERS: Filters = {
  search: '',
  category: '',
  country: '',
  language: '',
  sourcePack: '',
  sort: 'name-asc',
}

interface FilterSidebarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  countries: string[]
  languages: string[]
  sourcePacks: string[]
  totalCount: number
  filteredCount: number
  className?: string
}

function FilterPanel({
  filters,
  onFiltersChange,
  countries,
  languages,
  sourcePacks,
}: Omit<FilterSidebarProps, 'totalCount' | 'filteredCount' | 'className'>) {
  const update = (key: keyof Filters, value: string) =>
    onFiltersChange({ ...filters, [key]: value })

  const clearAll = () => onFiltersChange(DEFAULT_FILTERS)

  const hasActiveFilters =
    filters.category || filters.country || filters.language || filters.sourcePack

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearAll}>
            <X className="h-3 w-3" /> Clear all
          </Button>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONTENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => update('category', filters.category === cat ? '' : cat)}
              className={cn(
                'text-xs rounded-full px-3 py-1 border transition-colors',
                filters.category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sort */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Sort by
        </label>
        <Select value={filters.sort} onValueChange={(v) => update('sort', v)}>
          <SelectTrigger className="h-9 text-sm" id="filter-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A → Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z → A)</SelectItem>
            <SelectItem value="category">By Category</SelectItem>
            <SelectItem value="country">By Country</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Country */}
      {countries.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Country
            </label>
            <Select
              value={filters.country}
              onValueChange={(v) => update('country', v === '_all' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-sm" id="filter-country">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All countries</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Source pack */}
      {sourcePacks.length > 1 && (
        <>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Source
            </label>
            <Select
              value={filters.sourcePack}
              onValueChange={(v) => update('sourcePack', v === '_all' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-sm" id="filter-source">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All sources</SelectItem>
                {sourcePacks.map((sp) => (
                  <SelectItem key={sp} value={sp}>
                    {sp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  )
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  countries,
  languages,
  sourcePacks,
  totalCount,
  filteredCount,
  className,
}: FilterSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn('hidden lg:flex flex-col gap-2 w-60 shrink-0', className)}
        aria-label="Channel filters"
      >
        <div className="sticky top-24 rounded-xl border border-border/50 bg-card p-4">
          <FilterPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            countries={countries}
            languages={languages}
            sourcePacks={sourcePacks}
          />
          <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground text-center">
            {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} channels
          </div>
        </div>
      </aside>

      {/* Mobile filter sheet trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="lg:hidden gap-2" id="mobile-filter-btn">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {(filters.category || filters.country || filters.sourcePack) && (
              <Badge className="h-4 px-1 text-xs ml-1">!</Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 overflow-y-auto pt-8">
          <SheetHeader>
            <SheetTitle>Filter channels</SheetTitle>
          </SheetHeader>
          <div className="mt-5">
            <FilterPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
              countries={countries}
              languages={languages}
              sourcePacks={sourcePacks}
            />
            <p className="mt-5 text-xs text-muted-foreground text-center">
              {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} channels
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search channels…', className }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        id="channel-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Search channels"
      />
      {value && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
