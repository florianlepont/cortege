import { IBP_METHOD_V3_2, resolveMethodVersion } from "@cortege/ibp-domain"

import { fr } from "../i18n"

// Phase 25.1 (D-12): the survey keeps the details it only counted before, as arrays of catalogue
// option codes stored next to the scored value of the factor (B.strata, F.dmh_groups, H.evidence,
// I.types, J.types). The domain package never reads them (its keys are count, class, score and
// dmh_group_counts), so the scores are the same with or without them. They travel with the
// payload: `factors` is `Record<string, unknown>` on the wire. A detail array is written only
// together with its scored key, since a factor object without it is a blocking invalid input.
// Pure module: it imports no react-native code, so the PDF builders can read it too.

export type SelectionFactor = "B" | "F" | "H" | "I" | "J"

export type SelectionOption = { value: string; label: string }

/** The key each factor stores its detail array under. */
export const SELECTION_KEYS: Readonly<Record<SelectionFactor, string>> = {
  B: "strata",
  F: "dmh_groups",
  H: "evidence",
  I: "types",
  J: "types",
}

type OptionList = readonly SelectionOption[]

const { factorInput } = fr

const FIXED_OPTIONS: Readonly<Record<"B" | "F" | "H", OptionList>> = {
  B: factorInput.strataOptions,
  F: factorInput.dmhGroupOptions,
  H: factorInput.continuityEvidenceOptions,
}

function listsFor(factor: SelectionFactor): { v3_2: OptionList; v3_0: OptionList } {
  switch (factor) {
    case "I":
      return factorInput.aquaticHabitatTypes
    case "J":
      return factorInput.rockyHabitatTypes
    default:
      return { v3_2: FIXED_OPTIONS[factor], v3_0: FIXED_OPTIONS[factor] }
  }
}

function labelIn(list: OptionList, value: string): string | null {
  return list.find((option) => option.value === value)?.label ?? null
}

/**
 * The options offered for a factor under a method (null is v3.0). A selected code that belongs to
 * the other method is appended with its label: a selection is never filtered on a method switch.
 */
export function selectionOptionsFor(
  factor: SelectionFactor,
  methodVersion: string | null | undefined,
  selected: readonly string[] | null,
): SelectionOption[] {
  const lists = listsFor(factor)
  const own = resolveMethodVersion(methodVersion) === IBP_METHOD_V3_2 ? lists.v3_2 : lists.v3_0
  const other = own === lists.v3_2 ? lists.v3_0 : lists.v3_2
  const options = [...own]
  for (const code of selected ?? []) {
    if (options.some((option) => option.value === code)) continue
    const label = labelIn(other, code)
    if (label !== null) options.push({ value: code, label })
  }
  return options
}

/**
 * Label of a code, or null when the code is not in the catalogue. With a method version the
 * survey's own wording wins (a few codes are worded differently in v3.0 and v3.2); without one,
 * v3.2 is tried first, then v3.0.
 */
export function selectionLabel(
  factor: SelectionFactor,
  value: string,
  methodVersion?: string | null,
): string | null {
  const lists = listsFor(factor)
  const v3_0First =
    methodVersion !== undefined && resolveMethodVersion(methodVersion) !== IBP_METHOD_V3_2
  return v3_0First
    ? (labelIn(lists.v3_0, value) ?? labelIn(lists.v3_2, value))
    : (labelIn(lists.v3_2, value) ?? labelIn(lists.v3_0, value))
}

/**
 * Reads the stored detail array of a factor object: the known codes of either method, strings
 * only, de-duplicated with the first occurrence kept. Null when the factor is not an object or
 * holds no array under the key (a draft saved before this phase).
 */
export function readSelection(rawFactor: unknown, factor: SelectionFactor): string[] | null {
  if (typeof rawFactor !== "object" || rawFactor === null || Array.isArray(rawFactor)) return null
  const stored = (rawFactor as Record<string, unknown>)[SELECTION_KEYS[factor]]
  if (!Array.isArray(stored)) return null
  const seen = new Set<string>()
  const codes: string[] = []
  for (const item of stored) {
    if (typeof item !== "string" || seen.has(item)) continue
    if (selectionLabel(factor, item) === null) continue
    seen.add(item)
    codes.push(item)
  }
  return codes
}
