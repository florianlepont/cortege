import { useCallback, useEffect, useRef, useState } from "react"
import {
  DEFAULT_OFFLINE_LAYERS_POLICY,
  loadOfflineLayersPolicy,
  saveOfflineLayersPolicy,
  type OfflineLayersPolicy,
} from "../storage/offline-layers-policy"
import { useScreenFocus } from "../ui/useScreenFocus"

/**
 * The offline layers policy ("base" or "all", default "all") as React state.
 *
 * Tabs stay mounted, so a change made in Paramètres would never reach the map screen through a
 * mount-only read: the stored value is read again each time the screen regains focus. The setting
 * applies to future downloads only.
 */
export function useOfflineLayersPolicy(): {
  policy: OfflineLayersPolicy
  setPolicy: (next: OfflineLayersPolicy) => void
  reload: () => Promise<void>
} {
  const [policy, setPolicyState] = useState<OfflineLayersPolicy>(DEFAULT_OFFLINE_LAYERS_POLICY)
  const policyRef = useRef(policy)
  policyRef.current = policy
  const mountedRef = useRef(true)
  const focused = useScreenFocus()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const reload = useCallback(async () => {
    const stored = await loadOfflineLayersPolicy()
    if (mountedRef.current) {
      setPolicyState(stored)
    }
  }, [])

  // Read on mount, whatever the focus, then each time the screen turns focused again.
  const loadedOnceRef = useRef(false)
  useEffect(() => {
    if (!loadedOnceRef.current || focused) {
      loadedOnceRef.current = true
      void reload()
    }
  }, [focused, reload])

  const setPolicy = useCallback((next: OfflineLayersPolicy) => {
    if (next === policyRef.current) return
    policyRef.current = next
    setPolicyState(next)
    void saveOfflineLayersPolicy(next)
  }, [])

  return { policy, setPolicy, reload }
}
