import { useCallback, useEffect, useRef, useState } from "react"
import {
  clearSearchRecents,
  loadSearchRecents,
  removeSearchRecent,
  saveSearchRecent,
} from "../storage/search-recents"

export type SearchRecents = {
  recents: string[]
  /** Puts the text first (de-duplicated, at most 8); the screen decides when to call it (U-14). */
  save: (query: string) => Promise<void>
  remove: (query: string) => Promise<void>
  clear: () => Promise<void>
  /** Reads the list from storage again. */
  reload: () => Promise<void>
}

/**
 * The recent searches of the start page (D-02b, D-16), over the best-effort storage of
 * `storage/search-recents`. Loaded on mount; an answer that arrives after unmount is ignored.
 */
export function useSearchRecents(): SearchRecents {
  const [recents, setRecents] = useState<string[]>([])
  const mounted = useRef(true)

  const apply = useCallback((next: string[]) => {
    if (mounted.current) setRecents(next)
  }, [])

  const reload = useCallback(async () => apply(await loadSearchRecents()), [apply])
  const save = useCallback(async (query: string) => apply(await saveSearchRecent(query)), [apply])
  const remove = useCallback(
    async (query: string) => apply(await removeSearchRecent(query)),
    [apply],
  )
  const clear = useCallback(async () => {
    await clearSearchRecents()
    apply([])
  }, [apply])

  useEffect(() => {
    mounted.current = true
    void reload()
    return () => {
      mounted.current = false
    }
  }, [reload])

  return { recents, save, remove, clear, reload }
}
