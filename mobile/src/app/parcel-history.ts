import {
  FACTOR_KEYS,
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  resolveMethodVersion,
  type CommunitySurveyHistoryItem,
} from "@cortege/ibp-domain"
import { computeFactorDeltas, computeIbpTotalDelta } from "./ibp-scoring"
import type { TrendInputPoint } from "./trend-geometry"
import type { FactorCanonical, FactorKey, IbpScores, ParcelSurveyHistoryItem } from "./types"

// Every derived value of the parcel history (phase 24: D-01, D-06 to D-10). Pure: no React, no
// colour, no catalogue. Method comparison goes through the package (`resolveMethodVersion`) and
// deltas through `ibp-scoring.ts`; no IBP rule is re-implemented here.

/** How many of the latest surveys the trend title and the curve use. */
export const DRAWN_POINTS = 8

/** One survey of a parcel, whether it comes from the own history or from the community detail. */
export type HistoryEntry = {
  surveyId: string
  year: number | null
  version: number | null
  total: number
  /** Raw wire value: undefined = field absent (older server), null = v3.0. */
  method: string | null | undefined
  /** Own history only. */
  scores?: IbpScores
  /** Own history only. A community entry has none, so it never shows per-factor deltas. */
  factors?: Record<string, FactorCanonical>
  /** Community history only. */
  author?: string | null
  isCurrent: boolean
}

export type MethodShortLabel = "v3.0" | "v3.2"

export type TrendSummary =
  | { kind: "none" }
  | { kind: "change"; delta: number; sinceYear: number | null; mixed: boolean }
  | { kind: "newMethod"; method: MethodShortLabel | null; year: number | null; mixed: true }

export type HistoryRowState =
  | { kind: "noParcel" }
  | { kind: "unavailable" }
  | { kind: "loading" }
  | { kind: "first" }
  | { kind: "count"; count: number }
  | { kind: "range"; first: number; latest: number }

export type DeltaCardState =
  | { kind: "hidden" }
  | { kind: "differentMethod" }
  | {
      kind: "card"
      titleYear: number | null
      total: { delta: number; current: number; previous: number }
      rows: Array<{ factor: FactorKey; points: number | null; delta: number | null }>
    }

export type HistoryListRow = {
  entry: HistoryEntry
  /** Against the entry before it in API order: null for the oldest, "unavailable" across a method change. */
  deltaVsPrevious: number | "unavailable" | null
  /** Only on a parcel that mixes methods. */
  methodLabel: MethodShortLabel | null
}

export type ParcelHistoryModel = {
  isFirst: boolean
  drawn: TrendInputPoint[]
  trend: TrendSummary
  deltaCard: DeltaCardState
  rows: HistoryListRow[]
}

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

/** A total from the wire is untrusted: anything but a finite number becomes 0. */
const safeTotal = (value: unknown): number => finiteOrNull(value) ?? 0

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Scores are kept only when all three are finite, so a delta never turns into NaN. */
function safeScores(value: unknown): IbpScores | undefined {
  if (!isRecord(value)) return undefined
  const standAndManagement = finiteOrNull(value.ibp_peuplement_gestion)
  const context = finiteOrNull(value.ibp_contexte)
  const total = finiteOrNull(value.ibp_total)
  if (standAndManagement === null || context === null || total === null) return undefined
  return { ibp_peuplement_gestion: standAndManagement, ibp_contexte: context, ibp_total: total }
}

/** Entries of the own parcel history (`GET /parcels/:id/surveys/history`, oldest first). */
export function buildEntriesFromOwn(
  items: readonly ParcelSurveyHistoryItem[],
  currentSurveyId: string | null,
): HistoryEntry[] {
  return items.map((item) => ({
    surveyId: item.survey_id,
    year: finiteOrNull(item.observation_year),
    version: finiteOrNull(item.version_number),
    total: safeTotal(item.scores?.ibp_total),
    method: item.ibp_method_version,
    scores: safeScores(item.scores),
    factors: isRecord(item.factor_results) ? item.factor_results : undefined,
    isCurrent: item.survey_id === currentSurveyId,
  }))
}

/** Entries of the community detail (`history[]` of `GET /public/community-surveys/:id`). */
export function buildEntriesFromCommunity(
  history: readonly CommunitySurveyHistoryItem[],
): HistoryEntry[] {
  return history.map((item) => ({
    surveyId: item.survey_id,
    year: finiteOrNull(item.observation_year),
    version: finiteOrNull(item.version_number),
    total: safeTotal(item.ibp_total),
    method: item.ibp_method_version,
    author: item.author_name,
    isCurrent: item.is_current,
  }))
}

/**
 * One method key per entry. A missing field (undefined, an older server) inherits the previous
 * known key, a leading gap the first known one, so no mixed state is invented: undefined is
 * handled before the package, because `resolveMethodVersion(undefined)` would say v3.0. An
 * unsupported tag is its own key and never matches a known method.
 */
export function methodKeys(entries: readonly HistoryEntry[]): string[] {
  const raw = entries.map((item) =>
    item.method === undefined ? null : (resolveMethodVersion(item.method) ?? "unsupported"),
  )
  let last = raw.find((key) => key !== null) ?? "unknown"
  return raw.map((key) => {
    if (key !== null) last = key
    return last
  })
}

/** The short label of a method key, null for any key that is not a package method. */
export function methodShortLabel(key: string): MethodShortLabel | null {
  if (key === IBP_METHOD_V3_2) return "v3.2"
  if (key === IBP_METHOD_V3_0) return "v3.0"
  return null
}

/** Index where the maximal suffix sharing the last key begins. */
export function trailingRunStart(keys: readonly string[]): number {
  let start = keys.length - 1
  while (start > 0 && keys[start - 1] === keys[keys.length - 1]) start -= 1
  return Math.max(0, start)
}

/** The surveys the trend title and the curve use: the latest `DRAWN_POINTS`. */
export function drawnWindow<T>(items: readonly T[]): T[] {
  return items.slice(-DRAWN_POINTS)
}

/** Title data of the trend card: computed on the drawn window, method keys on the full list. */
export function trendSummary(entries: readonly HistoryEntry[]): TrendSummary {
  const drawn = drawnWindow(entries)
  if (drawn.length < 2) return { kind: "none" }
  const keys = drawnWindow(methodKeys(entries))
  const start = trailingRunStart(keys)
  const trailing = drawn.slice(start)
  const mixed = trailing.length < drawn.length
  const latest = drawn[drawn.length - 1]
  if (trailing.length < 2) {
    return {
      kind: "newMethod",
      method: methodShortLabel(keys[keys.length - 1]),
      year: latest.year,
      mixed: true,
    }
  }
  const first = trailing[0]
  return {
    kind: "change",
    delta: latest.total - first.total,
    sinceYear: first.year === null || first.year === latest.year ? null : first.year,
    mixed,
  }
}

/** The value of the summary row "Historique de la parcelle" (D-01, D-09). */
export function historyRowState(
  input: { hasParcel: boolean; loading: boolean; error: boolean; offline: boolean },
  entries: readonly HistoryEntry[],
): HistoryRowState {
  if (!input.hasParcel) return { kind: "noParcel" }
  if (input.offline || input.error) return { kind: "unavailable" }
  if (input.loading && entries.length === 0) return { kind: "loading" }
  if (entries.length === 0 || (entries.length === 1 && entries[0].isCurrent)) {
    return { kind: "first" }
  }
  if (entries.length === 1) return { kind: "count", count: 1 }
  // The row ranges over ALL entries, the trend title over the latest 8 (kept on purpose).
  const start = trailingRunStart(methodKeys(entries))
  if (entries.length - start >= 2) {
    return { kind: "range", first: entries[start].total, latest: entries[entries.length - 1].total }
  }
  return { kind: "count", count: entries.length }
}

/** The per-factor delta card (D-07): the current survey against the one JUST BEFORE it. */
export function deltaCardState(entries: readonly HistoryEntry[]): DeltaCardState {
  const index = entries.findIndex((item) => item.isCurrent)
  if (index < 1) return { kind: "hidden" }
  const current = entries[index]
  const previous = entries[index - 1]
  if (!current.factors || !current.scores || !previous.factors || !previous.scores) {
    return { kind: "hidden" }
  }
  const keys = methodKeys(entries)
  if (keys[index] !== keys[index - 1]) return { kind: "differentMethod" }
  const deltas = computeFactorDeltas(current.factors, previous.factors)
  const factors = current.factors
  return {
    kind: "card",
    titleYear: previous.year === null || previous.year === current.year ? null : previous.year,
    total: {
      delta: computeIbpTotalDelta(current.scores, previous.scores).total,
      current: current.scores.ibp_total,
      previous: previous.scores.ibp_total,
    },
    rows: FACTOR_KEYS.map((factor) => ({
      factor,
      points: finiteOrNull(factors[factor]?.score_points),
      delta: deltas[factor] ?? null,
    })),
  }
}

/** The list of surveys (D-08), newest first (the API order is oldest first). */
export function listRows(entries: readonly HistoryEntry[]): HistoryListRow[] {
  const keys = methodKeys(entries)
  const mixed = new Set(keys).size > 1
  return entries
    .map((item, index): HistoryListRow => {
      let deltaVsPrevious: HistoryListRow["deltaVsPrevious"] = null
      if (index > 0) {
        deltaVsPrevious =
          keys[index] === keys[index - 1] ? item.total - entries[index - 1].total : "unavailable"
      }
      return {
        entry: item,
        deltaVsPrevious,
        methodLabel: mixed ? methodShortLabel(keys[index]) : null,
      }
    })
    .reverse()
}

/** Everything the parcel history views need, from the entries in API order (oldest first). */
export function buildParcelHistory(entries: readonly HistoryEntry[]): ParcelHistoryModel {
  const keys = methodKeys(entries)
  const firstKeyIndex = Math.max(0, entries.length - DRAWN_POINTS)
  return {
    isFirst: entries.length === 0 || (entries.length === 1 && entries[0].isCurrent),
    drawn: drawnWindow(entries).map((item, offset) => ({
      surveyId: item.surveyId,
      total: item.total,
      year: item.year,
      isCurrent: item.isCurrent,
      methodKey: keys[firstKeyIndex + offset],
    })),
    trend: trendSummary(entries),
    deltaCard: deltaCardState(entries),
    rows: listRows(entries),
  }
}
