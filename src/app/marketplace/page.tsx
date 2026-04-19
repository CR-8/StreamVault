'use client'

import { useState, useMemo } from 'react'
import { Plus, Loader2, Search, Globe, Tag, BookOpen } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { SourcePackCard } from '@/components/source-pack-card'
import { useStreamVaultStore } from '@/store/useStreamVaultStore'
import { SOURCE_PACKS, getPacksByType } from '@/data/source-packs'
import type { CustomSource } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function generateId() {
  return 'custom_' + Math.random().toString(36).slice(2, 10)
}

const regionPacks = getPacksByType('region')
const countryPacks = getPacksByType('country')
const categoryPacks = getPacksByType('category')

function PackGrid({ packs }: { packs: typeof SOURCE_PACKS }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return packs
    const q = search.toLowerCase()
    return packs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q))
    )
  }, [packs, search])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search packs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          id="pack-search"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No packs match your search.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="list">
          {filtered.map((pack) => (
            <SourcePackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  )
}

function CustomSourcesSection() {
  const customSources = useStreamVaultStore((s) => s.customSources)
  const storeAddCustom = useStreamVaultStore((s) => s.addCustomSource)
  const storeRemoveCustom = useStreamVaultStore((s) => s.removeCustomSource)
  const enabledPacks = useStreamVaultStore((s) => s.enabledPacks)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [urlError, setUrlError] = useState('')

  const validateUrl = (u: string) => {
    try {
      const parsed = new URL(u)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'Only HTTP/HTTPS URLs are allowed.'
      }
      return ''
    } catch {
      return 'Please enter a valid URL.'
    }
  }

  const handleAdd = async () => {
    setUrlError('')
    const err = validateUrl(url.trim())
    if (err) { setUrlError(err); return }
    if (!name.trim()) return

    setAdding(true)
    const source: CustomSource = {
      id: generateId(),
      name: name.trim(),
      m3uUrl: url.trim(),
      addedAt: Date.now(),
    }
    try {
      await storeAddCustom(source, url.trim())
      toast.success(`"${name}" added and loaded successfully!`)
      setName('')
      setUrl('')
      setDialogOpen(false)
    } catch (e) {
      toast.error(`Failed to load source: ${e instanceof Error ? e.message : 'Network error'}`)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Custom M3U Sources</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add any M3U/M3U8 playlist URL. Proxied securely to handle CORS.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setDialogOpen(true)}
          id="add-custom-source-btn"
        >
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      {customSources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card p-10 text-center">
          <p className="text-muted-foreground text-sm">No custom sources yet.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Paste any M3U playlist URL to add channels from your own sources.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {customSources.map((src) => {
            const isEnabled = enabledPacks.includes(src.id)
            return (
              <div
                key={src.id}
                className="rounded-xl border border-border/50 bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{src.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{src.m3uUrl}</p>
                  </div>
                  <span className={cn(
                    'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                    isEnabled
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {isEnabled ? 'Active' : 'Off'}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs h-7"
                  onClick={() => {
                    storeRemoveCustom(src.id)
                    toast.info(`"${src.name}" removed`)
                  }}
                  id={`remove-source-${src.id}`}
                >
                  Remove
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Source Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" id="add-source-dialog">
          <DialogHeader>
            <DialogTitle>Add Custom M3U Source</DialogTitle>
            <DialogDescription>
              Paste the URL to any M3U/M3U8 playlist. It will be proxied to bypass CORS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="source-name">Name</Label>
              <Input
                id="source-name"
                placeholder="My IPTV Source"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-url">M3U URL</Label>
              <Input
                id="source-url"
                type="url"
                placeholder="https://example.com/playlist.m3u"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError('') }}
                className={cn(urlError && 'border-destructive')}
              />
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding || !name.trim() || !url.trim()} id="confirm-add-source">
              {adding ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…</> : 'Add Source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MarketplacePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enable source packs to add channels from around the world.
        </p>
      </div>

      <Tabs defaultValue="categories" className="space-y-6" id="marketplace-tabs">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Categories ({categoryPacks.length})
          </TabsTrigger>
          <TabsTrigger value="regions" className="gap-2">
            <Globe className="h-4 w-4" />
            Regions ({regionPacks.length})
          </TabsTrigger>
          <TabsTrigger value="countries" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Countries ({countryPacks.length})
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <Plus className="h-4 w-4" />
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <PackGrid packs={categoryPacks} />
        </TabsContent>

        <TabsContent value="regions" className="space-y-4">
          <PackGrid packs={regionPacks} />
        </TabsContent>

        <TabsContent value="countries" className="space-y-4">
          <PackGrid packs={countryPacks} />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <CustomSourcesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
