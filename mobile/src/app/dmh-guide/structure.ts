import type { DmhGroupCode } from "@cortege/ibp-domain"
import { DMH_GROUP_CODES } from "@cortege/ibp-domain"

// Phase 32 (plan 32-10, ROADMAP criterion 2): the crossing of the two typologies, the fifteen IBP
// groups of factor F and the seven forms and 52 types of the pocket guide. The table is section 5
// of the validated spec docs/specs/dmh-guide-content-v1.md; spec-sync.test.ts fails on any
// difference. Pure data and lookups: no French text (the names come from fr.dmhGuide) and no rule
// (no density, no cap, no score: those stay in the package).

/** The seven forms of the pocket guide, in the order of the guide. */
export const DMH_FORM_IDS = [
  "cavities",
  "wounds",
  "crown_deadwood",
  "growths",
  "fruiting_bodies",
  "epiphytic",
  "exudates",
] as const

export type DmhFormId = (typeof DMH_FORM_IDS)[number]

/** The type numbers belong to the 2024 edition of the pocket guide and are never shown. */
export const DMH_WSL_EDITION = 2024

/** Types described by that edition: 43 counted by the IBP, 9 not counted. */
export const DMH_WSL_TYPE_COUNT = 52

export type DmhGroupStructure = {
  form: DmhFormId
  /** Types of the pocket guide that the IBP counts in this group. */
  wslTypes: readonly number[]
  /** Types the pocket guide ranges in this group and the IBP does not count. */
  wslTypesOutsideIbp: readonly number[]
}

export const DMH_GUIDE_STRUCTURE: Readonly<Record<DmhGroupCode, DmhGroupStructure>> = {
  dmh_01: { form: "cavities", wslTypes: [1, 2, 3, 4], wslTypesOutsideIbp: [] },
  dmh_02: { form: "cavities", wslTypes: [5, 6, 7, 8, 9, 10], wslTypesOutsideIbp: [] },
  dmh_03: { form: "cavities", wslTypes: [11], wslTypesOutsideIbp: [] },
  dmh_04: { form: "cavities", wslTypes: [12, 13, 14, 15], wslTypesOutsideIbp: [] },
  dmh_05: { form: "wounds", wslTypes: [16, 17, 18, 19], wslTypesOutsideIbp: [] },
  dmh_06: { form: "wounds", wslTypes: [20, 21, 22, 23, 24], wslTypesOutsideIbp: [25] },
  dmh_07: { form: "crown_deadwood", wslTypes: [26, 27, 28], wslTypesOutsideIbp: [] },
  dmh_08: { form: "growths", wslTypes: [29, 30], wslTypesOutsideIbp: [] },
  dmh_09: { form: "growths", wslTypes: [32, 33], wslTypesOutsideIbp: [] },
  dmh_10: { form: "fruiting_bodies", wslTypes: [34], wslTypesOutsideIbp: [] },
  dmh_11: { form: "fruiting_bodies", wslTypes: [35, 36], wslTypesOutsideIbp: [37, 38, 39] },
  dmh_12: { form: "epiphytic", wslTypes: [40, 41, 42, 43, 44], wslTypesOutsideIbp: [] },
  dmh_13: { form: "epiphytic", wslTypes: [45], wslTypesOutsideIbp: [46] },
  dmh_14: { form: "epiphytic", wslTypes: [49], wslTypesOutsideIbp: [47, 48] },
  dmh_15: { form: "exudates", wslTypes: [51, 52], wslTypesOutsideIbp: [] },
}

/** The two types the pocket guide ranges in groups that the IBP does not have (spec section 5). */
export const DMH_WSL_TYPES_WITHOUT_IBP_GROUP: readonly number[] = [31, 50]

/**
 * Types without an IBP group that a group sheet still lists as described but not counted (spec
 * section 5): the galls, next to the growths of group 9. The other type, the alluvial deposit, is
 * shown nowhere. This is display data only; the crossing table above keeps the pocket guide's own
 * ranging.
 */
export const DMH_UNGROUPED_TYPES_SHOWN_ON: Readonly<
  Partial<Record<DmhGroupCode, readonly number[]>>
> = {
  dmh_09: [31],
}

/** The validated order of the list inside a form (spec section 7, O-32-12 option a). */
export const DMH_LIST_ORDER: readonly DmhGroupCode[] = [
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
]

/** The form of a group. */
export function formOf(code: DmhGroupCode): DmhFormId {
  return DMH_GUIDE_STRUCTURE[code].form
}

/** The codes of a form, in IBP order. */
export function groupsOf(form: DmhFormId): DmhGroupCode[] {
  return DMH_GROUP_CODES.filter((code) => DMH_GUIDE_STRUCTURE[code].form === form)
}
