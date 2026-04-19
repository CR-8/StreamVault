'use client'

import { useEffect } from 'react'
import { useStreamVaultStore } from '@/store/useStreamVaultStore'

/**
 * Runs the store initialization once on mount.
 * Must be rendered inside the RootLayout body, outside any Suspense boundary.
 */
export function AppInitializer() {
  const initialize = useStreamVaultStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return null
}
