'use client'

import { useRef, useState } from 'react'
import {
  Download, Upload, Trash2, Info, Database,
  AlertTriangle, CheckCircle, Package, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useStreamVaultStore } from '@/store/useStreamVaultStore'
import { exportProfile, importProfile, clearAllData, getStorageUsageBytes } from '@/lib/storage'
import { getPackById } from '@/data/source-packs'
import { toast } from 'sonner'
import type { UserProfile } from '@/types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function SettingsPage() {
  const enabledPacks = useStreamVaultStore((s) => s.enabledPacks)
  const customSources = useStreamVaultStore((s) => s.customSources)
  const channels = useStreamVaultStore((s) => s.channels)
  const favorites = useStreamVaultStore((s) => s.favorites)
  const history = useStreamVaultStore((s) => s.history)
  const storeDisablePack = useStreamVaultStore((s) => s.disablePack)
  const refreshChannels = useStreamVaultStore((s) => s.refreshChannels)
  const storageWarning = useStreamVaultStore((s) => s.storageWarning)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)

  const storageBytes = typeof window !== 'undefined' ? getStorageUsageBytes() : 0

  const handleExport = () => {
    const profile = exportProfile()
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `streamvault-profile-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Profile exported!')
  }

  const handleImportClick = () => {
    setImportError('')
    setImportSuccess(false)
    fileInputRef.current?.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.json')) {
      setImportError('Please select a .json file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as UserProfile
        if (!data.enabledPacks || !Array.isArray(data.favorites)) {
          throw new Error('Invalid profile format')
        }
        importProfile(data)
        refreshChannels()
        setImportSuccess(true)
        toast.success('Profile imported! Reload to apply channel packs.')
      } catch {
        setImportError('Invalid profile file. Please select a valid exported profile.')
        toast.error('Profile import failed.')
      }
    }
    reader.readAsText(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleClearAll = () => {
    clearAllData()
    window.location.reload()
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Settings</h1>

      <div className="space-y-8">

        {/* ── Storage Info ─────────────────────────────────────────── */}
        <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="p-5 pb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Storage</h2>
          </div>
          <Separator />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Active Packs', value: enabledPacks.length },
                { label: 'Channels', value: channels.length.toLocaleString() },
                { label: 'Favorites', value: favorites.length },
                { label: 'History', value: history.length },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">localStorage used</span>
              <span className={storageWarning ? 'text-amber-500 font-medium' : 'text-foreground'}>
                {formatBytes(storageBytes)} / ~5 MB
                {storageWarning && ' ⚠️'}
              </span>
            </div>

            {storageWarning && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Storage is nearly full. Disable unused packs to free up space.</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Enabled Packs ────────────────────────────────────────── */}
        <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="p-5 pb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Enabled Source Packs</h2>
            <Badge variant="secondary" className="ml-auto">
              {enabledPacks.length} active
            </Badge>
          </div>
          <Separator />
          <div className="p-5">
            {enabledPacks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No packs enabled. Go to the Marketplace to add channels.
              </p>
            ) : (
              <div className="space-y-2">
                {enabledPacks.map((packId) => {
                  const pack = getPackById(packId)
                  const customSrc = customSources.find((s) => s.id === packId)
                  const displayName = pack?.name ?? customSrc?.name ?? packId
                  const isCustom = !pack

                  return (
                    <div
                      key={packId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/30 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">
                          {pack?.flag ?? pack?.icon ?? (isCustom ? '🔗' : '📦')}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {pack?.type ?? 'custom'} • {pack?.channelCount ? `~${pack.channelCount.toLocaleString()} ch` : 'custom'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => {
                          storeDisablePack(packId)
                          toast.info(`${displayName} disabled`)
                        }}
                        id={`disable-pack-${packId}`}
                      >
                        Disable
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Profile Export / Import ───────────────────────────────── */}
        <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="p-5 pb-4 flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Profile Backup</h2>
          </div>
          <Separator />
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Export your enabled packs, favorites, and custom sources as a JSON file. Import it
              on another device or browser to restore your setup.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExport} variant="outline" className="gap-2" id="export-btn">
                <Download className="h-4 w-4" />
                Export Profile
              </Button>
              <Button onClick={handleImportClick} variant="outline" className="gap-2" id="import-btn">
                <Upload className="h-4 w-4" />
                Import Profile
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
                aria-hidden="true"
              />
            </div>

            {importError && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                {importError}
              </p>
            )}
            {importSuccess && (
              <p className="text-sm text-green-500 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                Profile imported! Refresh the page to load all packs.
              </p>
            )}
          </div>
        </section>

        {/* ── Danger Zone ───────────────────────────────────────────── */}
        <section className="rounded-xl border border-destructive/20 bg-destructive/5 overflow-hidden">
          <div className="p-5 pb-4 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold text-destructive">Danger Zone</h2>
          </div>
          <Separator className="bg-destructive/20" />
          <div className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              This will permanently delete all your enabled packs, favorites, custom sources,
              and watch history from this browser. You cannot undo this.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2" id="clear-all-btn">
                  <Trash2 className="h-4 w-4" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes all enabled packs, channels cache, favorites, custom
                    sources, and watch history from your browser. You will need to re-enable packs
                    from the Marketplace.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    id="confirm-clear-btn"
                  >
                    Yes, clear everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>
    </div>
  )
}