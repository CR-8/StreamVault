'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Tv, Search, Heart, ShoppingBag, Settings, Menu, X, Rss } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Tv },
  { href: '/browse', label: 'Browse', icon: Search },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0"
          aria-label="StreamVault home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rss className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">StreamVault</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                pathname === href
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 w-64">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="nav-search"
              type="search"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              aria-label="Search channels"
            />
          </div>
        </form>

        {/* Mobile menu */}
        <div className="flex md:hidden ml-auto">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 pt-10">
              <form onSubmit={handleSearch} className="mb-6 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search channels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" size="sm">Go</Button>
              </form>
              <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      pathname === href
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
