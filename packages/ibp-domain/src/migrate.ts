import { casFromRegionStage } from "./context/cas"
import type { IbpEvaluationInput } from "./evaluate"
import { isRecord } from "./input"
import { IBP_METHOD_V3_2, resolveMethodVersion } from "./method-version"
import { readLegacyBCover } from "./rules/common"

const LEGACY_B_COVER_KEYS = ["covered_autochthonous_percent", "native_cover_percent"] as const

/** Moves B's legacy native cover to A (A-1), unless A records its own; B keeps no cover. */
function moveCoverFromBToA(factors: Record<string, unknown>): Record<string, unknown> {
  const rawB = factors.B
  if (!isRecord(rawB)) return { ...factors }

  const cover = readLegacyBCover(rawB)
  const nextB = { ...rawB }
  for (const key of LEGACY_B_COVER_KEYS) delete nextB[key]
  const next: Record<string, unknown> = { ...factors, B: nextB }

  const rawA = factors.A
  if (cover === null) return next
  if (isRecord(rawA)) {
    const hasOwnCover =
      rawA.native_cover_percent !== undefined || rawA.native_cover_below_50 !== undefined
    if (!hasOwnCover) next.A = { ...rawA, native_cover_percent: cover }
  } else if (rawA === undefined || rawA === null || rawA === "") {
    // A has not been entered yet: keep the cover for it (A stays incomplete until its count).
    next.A = { native_cover_percent: cover }
  }
  return next
}

/**
 * Switches an unsubmitted v3.0 draft to v3.2 (CH-7, D-08): sets the v3.2 tag, moves B's legacy
 * cover to A, pre-fills `ibp_cas` from region and stage (null when ambiguous: the observer picks),
 * clears `ibp_cas3_scale` and drops `region_version`/`vegetation_stage` (v3.2 surveys carry none).
 * Pure: returns a new object; a draft already on v3.2 comes back as an unchanged copy.
 */
export function migrateDraftToV32<T extends IbpEvaluationInput>(draft: T): T {
  if (resolveMethodVersion(draft.ibp_method_version) === IBP_METHOD_V3_2) {
    return { ...draft }
  }

  const { region_version: region, vegetation_stage: stage, ...rest } = draft
  const migrated: IbpEvaluationInput = {
    ...rest,
    ibp_method_version: IBP_METHOD_V3_2,
    ibp_cas: casFromRegionStage(region, stage),
    ibp_cas3_scale: false,
  }
  if (isRecord(draft.factors)) {
    migrated.factors = moveCoverFromBToA(draft.factors)
  }
  return migrated as T
}
