import { useCallback, useRef, useState } from "react"
import {
  B_STRATUM_CODES,
  DMH_GROUP_CODES,
  dmhDensityPerHa,
  readDmhCounts,
  readStrataCover,
  strataCountFromCover,
  type BStratumCode,
  type DmhCounts,
  type DmhGroupCode,
  type StrataCover,
} from "@cortege/ibp-domain"
import { parseFiniteNumberInput } from "../app/number-utils"

/**
 * The detail inputs of the relevé déplafonné, as the form holds them (phase 30, D-07, spec section
 * 7 and U-O10): B cover per stratum and F tree counts per dendromicrohabitat group, with F's own
 * surface. The 20 % stratum rule and the 2 trees per hectare cap are the package's
 * (`strataCountFromCover`, `dmhDensityPerHa`); this hook only stores text and calls them. The
 * detail keys are never read by a scorer: the form writes them only beside their scored key.
 */
export type UncappedState = {
  /** Cover per stratum as typed (percent), so the cursor never jumps. */
  strataCoverText: Partial<Record<BStratumCode, string>>
  /** Whole trees counted per group; a group with no entry has not been counted. */
  dmhCounts: Partial<Record<DmhGroupCode, number>>
  /** F's own surface in hectares, as typed. */
  fSurfaceText: string
}

/** What the form writes beside the scored keys, only valid entries, in package code order. */
export type UncappedPayload = {
  strata_cover?: StrataCover
  dmh_counts?: DmhCounts
  f_surface_ha?: number
}

/** The most trees a group row counts (a field survey never reaches it; it only bounds the taps). */
const MAX_DMH_COUNT = 999

const EMPTY_STATE: UncappedState = { strataCoverText: {}, dmhCounts: {}, fSurfaceText: "" }

/** Covers are stored to one decimal (spec section 7). */
const roundToTenth = (value: number): number => Math.round(value * 10) / 10

/** A typed cover when it is a number from 0 to 100, rounded to one decimal; else null (absent). */
const parseCover = (text: string): number | null => {
  const parsed = parseFiniteNumberInput(text)
  return parsed !== null && parsed >= 0 && parsed <= 100 ? roundToTenth(parsed) : null
}

/** F's surface when it is a finite number above zero; else null. */
const parseSurface = (text: string): number | null => {
  const parsed = parseFiniteNumberInput(text)
  return parsed !== null && parsed > 0 ? parsed : null
}

const validCovers = (texts: UncappedState["strataCoverText"]): StrataCover => {
  const covers: StrataCover = {}
  for (const code of B_STRATUM_CODES) {
    const text = texts[code]
    if (text === undefined) continue
    const cover = parseCover(text)
    if (cover !== null) covers[code] = cover
  }
  return covers
}

const orderedCounts = (counts: UncappedState["dmhCounts"]): DmhCounts => {
  const ordered: DmhCounts = {}
  for (const code of DMH_GROUP_CODES) {
    const count = counts[code]
    if (count !== undefined) ordered[code] = count
  }
  return ordered
}

const hasEntries = (value: object): boolean => Object.keys(value).length > 0

/** Strata count of the typed covers, or null when no cover is valid (nothing to derive). */
const deriveStrataCount = (state: UncappedState): number | null => {
  const covers = validCovers(state.strataCoverText)
  return hasEntries(covers) ? strataCountFromCover(covers) : null
}

/** Trees per hectare of the counts, or null without a count or without a valid surface. */
const deriveTreesPerHa = (state: UncappedState): number | null => {
  const counts = orderedCounts(state.dmhCounts)
  const surface = parseSurface(state.fSurfaceText)
  if (!hasEntries(counts) || surface === null) return null
  return dmhDensityPerHa(counts, surface)?.trees_per_ha ?? null
}

export function useUncappedEntry() {
  const [state, setState] = useState<UncappedState>(EMPTY_STATE)
  // The setters return the value they derive, so they read the latest state synchronously: a
  // second call in the same batch must see the first one.
  const latest = useRef<UncappedState>(state)

  const commit = useCallback((next: UncappedState): UncappedState => {
    latest.current = next
    setState(next)
    return next
  }, [])

  /** Stores the typed cover of a stratum; returns the derived strata count (null: nothing valid). */
  const setStratumCover = useCallback(
    (code: BStratumCode, text: string): number | null => {
      const strataCoverText = { ...latest.current.strataCoverText }
      if (text.trim() === "") delete strataCoverText[code]
      else strataCoverText[code] = text
      return deriveStrataCount(commit({ ...latest.current, strataCoverText }))
    },
    [commit],
  )

  /** Stores a group count (0 or more, whole); returns the derived trees per hectare or null. */
  const setDmhCount = useCallback(
    (code: DmhGroupCode, count: number): number | null => {
      const dmhCounts = { ...latest.current.dmhCounts }
      if (Number.isInteger(count) && count >= 0) dmhCounts[code] = count
      else delete dmhCounts[code]
      return deriveTreesPerHa(commit({ ...latest.current, dmhCounts }))
    },
    [commit],
  )

  /**
   * Phase 32 (D-08, D-10): moves a group count by `delta` from the latest state (two quick taps in
   * one batch both count), clamped to 0..999, so going down stops at 0 and never removes the entry.
   * Returns the derived trees per hectare or null, like setDmhCount.
   */
  const bumpDmhCount = useCallback(
    (code: DmhGroupCode, delta: number): number | null => {
      const current = latest.current.dmhCounts[code] ?? 0
      const count = Math.min(MAX_DMH_COUNT, Math.max(0, current + delta))
      return deriveTreesPerHa(
        commit({ ...latest.current, dmhCounts: { ...latest.current.dmhCounts, [code]: count } }),
      )
    },
    [commit],
  )

  /** Stores F's surface text; returns the derived trees per hectare (null without a valid one). */
  const setFSurface = useCallback(
    (text: string): number | null =>
      deriveTreesPerHa(commit({ ...latest.current, fSurfaceText: text })),
    [commit],
  )

  /** Puts the stored detail keys back in the form (research Pitfall 5); unreadable ones are dropped. */
  const loadUncapped = useCallback(
    (factors: Record<string, unknown> | undefined): void => {
      const factorB = (factors?.B ?? null) as Record<string, unknown> | null
      const factorF = (factors?.F ?? null) as Record<string, unknown> | null
      const covers = readStrataCover(factorB?.strata_cover)
      const counts = readDmhCounts(factorF?.dmh_counts)
      const surface = typeof factorF?.surface_ha === "number" ? factorF.surface_ha : null

      const strataCoverText: UncappedState["strataCoverText"] = {}
      for (const code of B_STRATUM_CODES) {
        const cover = covers?.[code]
        if (cover !== undefined) strataCoverText[code] = String(cover)
      }
      commit({
        strataCoverText,
        dmhCounts: counts ?? {},
        fSurfaceText:
          surface !== null && Number.isFinite(surface) && surface > 0 ? String(surface) : "",
      })
    },
    [commit],
  )

  const resetUncapped = useCallback((): void => {
    commit(EMPTY_STATE)
  }, [commit])

  /** Only valid entries, in package code order, empty objects omitted. */
  const uncappedPayload = useCallback((): UncappedPayload => {
    const payload: UncappedPayload = {}
    const covers = validCovers(state.strataCoverText)
    if (hasEntries(covers)) payload.strata_cover = covers
    const counts = orderedCounts(state.dmhCounts)
    if (hasEntries(counts)) payload.dmh_counts = counts
    const surface = parseSurface(state.fSurfaceText)
    if (surface !== null) payload.f_surface_ha = surface
    return payload
  }, [state])

  return {
    strataCoverText: state.strataCoverText,
    dmhCounts: state.dmhCounts,
    fSurfaceText: state.fSurfaceText,
    setStratumCover,
    setDmhCount,
    bumpDmhCount,
    setFSurface,
    loadUncapped,
    resetUncapped,
    uncappedPayload,
  }
}

export type UncappedEntry = ReturnType<typeof useUncappedEntry>
