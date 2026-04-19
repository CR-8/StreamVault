'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SourcePack } from '@/types'
import {
  useStreamVaultStore,
  selectIsPackEnabled,
  selectPackLoading,
} from '@/store/useStreamVaultStore'
import { toast } from 'sonner'
import { isNearStorageLimit } from '@/lib/storage'

interface SourcePackCardProps {
  pack: SourcePack
  className?: string
}

export function SourcePackCard({ pack, className }: SourcePackCardProps) {
  const isEnabled = useStreamVaultStore(selectIsPackEnabled(pack.id))
  const loadingState = useStreamVaultStore(selectPackLoading(pack.id))
  const storeEnablePack = useStreamVaultStore((s) => s.enablePack)
  const storeDisablePack = useStreamVaultStore((s) => s.disablePack)
  const [isPending, startTransition] = useTransition()

  const isLoading = loadingState === 'loading' || isPending
  const hasError = loadingState === 'error'

  const handleToggle = (checked: boolean) => {
    if (isLoading) return

    if (!checked) {
      storeDisablePack(pack.id)
      toast.info(`${pack.name} disabled`)
      return
    }

    // Check storage before enabling
    if (isNearStorageLimit()) {
      toast.warning('Storage almost full. Disable unused packs first.', { duration: 5000 })
    }

    startTransition(() => {
      storeEnablePack(pack.id, pack.m3uUrl)
        .then(() => {
          toast.success(`${pack.name} enabled — channels are now available!`)
        })
        .catch((err) => {
          toast.error(`Failed to load ${pack.name}: ${err?.message ?? 'Network error'}`)
        })
    })
  }

  const typeColors: Record<string, string> = {
    region: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    country: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    category: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    custom: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    curated: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all duration-200',
        isEnabled
          ? 'border-primary/30 bg-primary/5'
          : 'border-border/50 hover:border-border hover:shadow-sm',
        className
      )}
      role="listitem"
      aria-label={`${pack.name} source pack, ${isEnabled ? 'enabled' : 'disabled'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {(pack.flag || pack.icon) && (
            <span className="text-2xl shrink-0 leading-none mt-0.5" aria-hidden="true">
              {pack.flag ?? pack.icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{pack.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium capitalize',
                  typeColors[pack.type]
                )}
              >
                {pack.type}
              </span>
              <span className="text-xs text-muted-foreground">
                ~{pack.channelCount.toLocaleString()} channels
              </span>
            </div>
          </div>
        </div>

        {/* Toggle with loading state */}
        <div className="shrink-0 flex items-center gap-2">
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {hasError && !isLoading && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-label="Failed to load" />
          )}
          {loadingState === 'done' && isEnabled && (
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          )}
          <Switch
            id={`toggle-${pack.id}`}
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
            aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${pack.name}`}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {pack.description}
      </p>

      {/* Tags */}
      {pack.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pack.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 h-4 font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {hasError && (
        <p className="text-xs text-destructive">
          Failed to load channels. Check your connection and try again.
        </p>
      )}
    </div>
  )
}
