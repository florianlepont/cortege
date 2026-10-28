import { isRecord } from "./input"

// Detail inputs of a relevé déplafonné (phase 30, D-07, spec section 7): B cover per stratum and F
// tree counts per dendromicrohabitat group. They are never read by a scorer. The scored keys
// `strata_count` and `trees_per_ha` stay the only inputs of the score: the app derives them from
// these details with the helpers below while the factor is counted in full (U-O10), so the same
// survey with and without the details scores and validates identically (D-09, parity cases
// MAT-B-UNC-* and MAT-F-UNC-*).
//
// The F key is `dmh_counts`, never `dmh_group_counts`: that one is an array the F scorer already
// reads (each group capped at 2, never divided by a surface). F's own `surface_ha` is the divisor of
// the density; the app prefills it from the route's surface décrite, like C, D and E.
//
// The capped survey mode also writes `dmh_counts` (follow-up of phase 32, owner decision
// 2026-10-28): there the values are whole trees PER HECTARE, 0 to 2 per group, no `surface_ha` is
// written and `trees_per_ha` is their sum (`cappedDmhTotalPerHa`). Still never read by a scorer.

/** The five strata of factor B, the codes the current B input already stores. */
export const B_STRATUM_CODES = ["very_low", "low", "intermediate", "high", "herbaceous"] as const

export type BStratumCode = (typeof B_STRATUM_CODES)[number]

/** The fifteen dendromicrohabitat groups of factor F, `dmh_01` to `dmh_15`. */
export const DMH_GROUP_CODES = [
  "dmh_01",
  "dmh_02",
  "dmh_03",
  "dmh_04",
  "dmh_05",
  "dmh_06",
  "dmh_07",
  "dmh_08",
  "dmh_09",
  "dmh_10",
  "dmh_11",
  "dmh_12",
  "dmh_13",
  "dmh_14",
  "dmh_15",
] as const

export type DmhGroupCode = (typeof DMH_GROUP_CODES)[number]

/** The detail keys stored beside the scored keys of B and F. No scorer reads them. */
export const UNCAPPED_DETAIL_KEYS = {
  B: ["strata_cover"],
  F: ["dmh_counts", "surface_ha"],
} as const

/** A stratum counts from this share of the sampled surface, in percent (S p. 20). */
export const STRATUM_MIN_COVER_PERCENT = 20

/** Highest density one dendromicrohabitat group can add, in trees per hectare (M p. 9 and p. 17). */
export const DMH_GROUP_DENSITY_CAP_PER_HA = 2

/** Cover per stratum, in percent of the sampled surface; a stratum may be absent. */
export type StrataCover = Partial<Record<BStratumCode, number>>

/** Number of trees per dendromicrohabitat group; a group may be absent. */
export type DmhCounts = Partial<Record<DmhGroupCode, number>>

/** Density derived from the counts of F, and the groups that reached the cap. */
export type DmhDensity = {
  trees_per_ha: number
  capped_groups: DmhGroupCode[]
}

/**
 * Number of strata that reach `STRATUM_MIN_COVER_PERCENT` (19 does not count, 20 does). The strata
 * overlap, so the covers may add up to more than 100.
 */
export function strataCountFromCover(cover: StrataCover): number {
  return B_STRATUM_CODES.filter((code) => (cover[code] ?? 0) >= STRATUM_MIN_COVER_PERCENT).length
}

/**
 * Trees per hectare of F from the counts per group: each group's count divided by F's surface,
 * capped at `DMH_GROUP_DENSITY_CAP_PER_HA`, then summed. The groups that reached the cap are named.
 * Nothing is rounded: rounding could move the value across a score threshold (2, 3 or 8). A surface
 * that is not a finite number above zero gives null.
 */
export function dmhDensityPerHa(counts: DmhCounts, surfaceHa: number): DmhDensity | null {
  if (!Number.isFinite(surfaceHa) || surfaceHa <= 0) return null

  let total = 0
  const cappedGroups: DmhGroupCode[] = []
  for (const code of DMH_GROUP_CODES) {
    const count = counts[code]
    if (count === undefined) continue
    const density = count / surfaceHa
    if (density > DMH_GROUP_DENSITY_CAP_PER_HA) {
      cappedGroups.push(code)
      total += DMH_GROUP_DENSITY_CAP_PER_HA
    } else {
      total += density
    }
  }
  return { trees_per_ha: total, capped_groups: cappedGroups }
}

/**
 * The counts of F in the capped survey mode (phase 32 follow-up, owner decision 2026-10-28): each
 * group holds a whole number of trees PER HECTARE, so no surface divides them, and a group counts
 * for at most `DMH_GROUP_DENSITY_CAP_PER_HA`. Returns the counts with every value brought down to
 * that cap (the input is not changed); the groups stay as given.
 */
export function cappedDmhCounts(counts: DmhCounts): DmhCounts {
  const result: DmhCounts = {}
  for (const code of DMH_GROUP_CODES) {
    const count = counts[code]
    if (count !== undefined) result[code] = Math.min(count, DMH_GROUP_DENSITY_CAP_PER_HA)
  }
  return result
}

/**
 * Trees per hectare of F in the capped survey mode: the sum of the group counts, each held at
 * `DMH_GROUP_DENSITY_CAP_PER_HA`. The app writes it as the scored `trees_per_ha` once an observer
 * counts a group. Not limited to 8: the score classes already stop there (8 and above is the top
 * class), so the sheet's total cap of 8 is a display matter, never a different score.
 */
export function cappedDmhTotalPerHa(counts: DmhCounts): number {
  const capped = cappedDmhCounts(counts)
  let total = 0
  for (const code of DMH_GROUP_CODES) total += capped[code] ?? 0
  return total
}

/**
 * Reads `strata_cover` from untrusted input: only the five known codes, with finite numbers from 0
 * to 100. Null for a non-object or when no entry is valid.
 */
export function readStrataCover(value: unknown): StrataCover | null {
  if (!isRecord(value)) return null
  const result: StrataCover = {}
  let found = false
  for (const code of B_STRATUM_CODES) {
    const entry = value[code]
    if (typeof entry === "number" && Number.isFinite(entry) && entry >= 0 && entry <= 100) {
      result[code] = entry
      found = true
    }
  }
  return found ? result : null
}

/**
 * Reads `dmh_counts` from untrusted input: only the fifteen known codes, with whole numbers of 0 or
 * more. Null for a non-object or when no entry is valid.
 */
export function readDmhCounts(value: unknown): DmhCounts | null {
  if (!isRecord(value)) return null
  const result: DmhCounts = {}
  let found = false
  for (const code of DMH_GROUP_CODES) {
    const entry = value[code]
    if (typeof entry === "number" && Number.isInteger(entry) && entry >= 0) {
      result[code] = entry
      found = true
    }
  }
  return found ? result : null
}
