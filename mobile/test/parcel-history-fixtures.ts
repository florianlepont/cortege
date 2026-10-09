import {
  FACTOR_KEYS,
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  type CommunitySurveyHistoryItem,
  type FactorCanonical,
  type FactorClass,
  type FactorKey,
} from "@cortege/ibp-domain"
import type { HistoryEntry } from "../src/app/parcel-history"
import type { ParcelSurveyHistoryItem } from "../src/app/types"

// Shared fixtures of the parcel history model and of the views built on it (phase 24). Test
// helper only: nothing under src imports it.

/** The two method version tags of the package. */
export const V30 = IBP_METHOD_V3_0
export const V32 = IBP_METHOD_V3_2

/** `factor_results` for the given factors; every factor not listed is absent. */
export function factorResults(
  points: Partial<Record<FactorKey, number>>,
): Record<string, FactorCanonical> {
  const results: Record<string, FactorCanonical> = {}
  for (const key of FACTOR_KEYS) {
    const value = points[key]
    if (value === undefined) continue
    results[key] = {
      factor_id: key,
      observed_value_raw: value,
      selected_class: `S${value}` as FactorClass,
      score_points: value,
      warnings: [],
    }
  }
  return results
}

/** A history item as `GET /parcels/:id/surveys/history` returns it. */
export function ownItem(
  id: string,
  overrides: Partial<ParcelSurveyHistoryItem> = {},
): ParcelSurveyHistoryItem {
  return {
    survey_id: id,
    observation_year: 2024,
    version_number: 1,
    ibp_method_version: null,
    scores: { ibp_peuplement_gestion: 20, ibp_contexte: 10, ibp_total: 30 },
    factor_results: factorResults({ A: 3, B: 5 }),
    submitted_at: "2024-06-01T10:00:00.000Z",
    ...overrides,
  }
}

/** A history item of `GET /public/community-surveys/:id`. */
export function communityItem(
  id: string,
  overrides: Partial<CommunitySurveyHistoryItem> = {},
): CommunitySurveyHistoryItem {
  return {
    survey_id: id,
    site_name: "Bois des Aulnes",
    author_name: "Marie Lepont",
    observation_year: 2024,
    version_number: 1,
    ibp_method_version: null,
    ibp_total: 30,
    submitted_at: "2024-06-01T10:00:00.000Z",
    is_current: false,
    ...overrides,
  }
}

/** A model entry without factors (the community shape); pass `scores` and `factors` for an own one. */
export function entry(id: string, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    surveyId: id,
    year: 2024,
    version: 1,
    total: 30,
    method: null,
    isCurrent: false,
    ...overrides,
  }
}
