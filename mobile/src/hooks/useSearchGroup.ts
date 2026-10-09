import { useCallback, useEffect, useState } from "react"
import { ApiError } from "../api/client"
import { logStatusDetail } from "../i18n"
import { useLatestCallback } from "../state/useLatestCallback"
import { useDebouncedValue } from "./useDebouncedValue"

/** How long the text stays unchanged before a network group is queried (UI-SPEC U-13). */
export const SEARCH_DEBOUNCE_MS = 350

/**
 * Where a group stands: "idle" (not requested), "offline" (needs a connection), "waiting" (the
 * text changed, the request is not sent yet), "loading", "ready" or "error".
 */
export type SearchGroupStatus = "idle" | "offline" | "waiting" | "loading" | "ready" | "error"

/** Why a group failed: the server throttled the phone (HTTP 429) or anything else. */
export type SearchGroupError = "rateLimited" | "failed"

export type SearchGroupState<T> = {
  data: T | null
  status: SearchGroupStatus
  error: SearchGroupError | null
  /** Runs this group again at once, with its current text (D-02b). */
  retry: () => void
}

type Params<T> = {
  query: string
  /** False when the group must not be requested (text too short, no token, not parcel-like). */
  enabled: boolean
  offline: boolean
  fetcher: (query: string) => Promise<T>
  /** Request a changed text at once, without the pause (a tapped recent search). */
  immediate?: boolean
}

type Settled<T> = { data: T | null; key: string | null; error: SearchGroupError | null }

const EMPTY: Settled<never> = { data: null, key: null, error: null }

function toGroupError(error: unknown): SearchGroupError {
  return error instanceof ApiError && error.status === 429 ? "rateLimited" : "failed"
}

/**
 * One network group of the global search (D-10, D-11, D-15, D-02b): waits for a pause in typing,
 * keeps the previous rows while the next ones load, drops an answer a newer request replaced,
 * reports "offline" without any request and queries again by itself when the connection returns,
 * and re-runs only this group on `retry`.
 */
export function useSearchGroup<T>({
  query,
  enabled,
  offline,
  fetcher,
  immediate = false,
}: Params<T>): SearchGroupState<T> {
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const effective = immediate ? query : debounced
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>(EMPTY)
  const request = useLatestCallback(fetcher)
  const key = `${nonce}:${effective}`
  const requested = enabled && !offline
  const waiting = query !== effective

  useEffect(() => {
    if (!requested) {
      setSettled(EMPTY)
      return
    }
    // The text moved on: the request for the older one is pointless, the next one follows the pause.
    if (waiting) return
    let cancelled = false
    request(effective)
      .then((data) => {
        if (!cancelled) setSettled({ data, key, error: null })
      })
      .catch((error: unknown) => {
        // Only the error goes to the debug log, never the typed text (T-25-19).
        logStatusDetail("search", error)
        if (!cancelled) setSettled({ data: null, key, error: toGroupError(error) })
      })
    return () => {
      cancelled = true
    }
  }, [requested, waiting, effective, key, request])

  const retry = useCallback(() => setNonce((value) => value + 1), [])

  if (!enabled) return { data: null, status: "idle", error: null, retry }
  if (offline) return { data: null, status: "offline", error: null, retry }
  const data = settled.data
  if (waiting) return { data, status: "waiting", error: null, retry }
  if (settled.key !== key) return { data, status: "loading", error: null, retry }
  if (settled.error) return { data: null, status: "error", error: settled.error, retry }
  return { data, status: "ready", error: null, retry }
}
