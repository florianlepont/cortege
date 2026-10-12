import { useCallback, useState } from "react"
import type { FactorAnnotations } from "@cortege/ibp-domain"
import type { FactorKey } from "../app/types"

/**
 * The doubt flag and the note of each factor, as the form holds them (phase 27, D-12). The note
 * is kept as typed so the cursor never jumps; the canonical form (trimmed, capped, empty entries
 * dropped) is applied only when the form builds the draft payload.
 */
export type FactorAnnotationDraft = Partial<Record<FactorKey, { doubt: boolean; note: string }>>

const EMPTY_ENTRY = { doubt: false, note: "" }

/** An entry with no doubt and no note carries nothing: it is removed from the state. */
const withEntry = (
  current: FactorAnnotationDraft,
  factor: FactorKey,
  entry: { doubt: boolean; note: string },
): FactorAnnotationDraft => {
  const next = { ...current }
  if (!entry.doubt && entry.note === "") delete next[factor]
  else next[factor] = entry
  return next
}

export function useFactorAnnotations() {
  const [annotations, setAnnotations] = useState<FactorAnnotationDraft>({})

  const setFactorDoubt = useCallback((factor: FactorKey, doubt: boolean): void => {
    setAnnotations((current) =>
      withEntry(current, factor, { ...EMPTY_ENTRY, ...current[factor], doubt }),
    )
  }, [])

  const setFactorNote = useCallback((factor: FactorKey, note: string): void => {
    setAnnotations((current) =>
      withEntry(current, factor, { ...EMPTY_ENTRY, ...current[factor], note }),
    )
  }, [])

  /** Puts a stored `factors.annotations` back in the form (research Pitfall 5). */
  const loadAnnotations = useCallback((stored: FactorAnnotations): void => {
    const next: FactorAnnotationDraft = {}
    for (const [factor, entry] of Object.entries(stored) as [
      FactorKey,
      NonNullable<FactorAnnotations[FactorKey]>,
    ][]) {
      next[factor] = { doubt: entry.doubt === true, note: entry.note ?? "" }
    }
    setAnnotations(next)
  }, [])

  const resetAnnotations = useCallback((): void => {
    setAnnotations({})
  }, [])

  return { annotations, setFactorDoubt, setFactorNote, loadAnnotations, resetAnnotations }
}
