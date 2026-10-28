import { IBP_METHOD_V3_2, resolveMethodVersion, type DmhGroupCode } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import type { DmhGroupText } from "../../i18n/fr/dmh-guide"
import { selectionLabel } from "../factor-selections"
import { DMH_GUIDE_STRUCTURE, DMH_UNGROUPED_TYPES_SHOWN_ON, type DmhFormId } from "./structure"

// Phase 32 (plan 32-10): everything a group page shows, read from the catalogue and the structure.
// The counting rule follows the survey's method (research pitfall 2): groups 6, 12 and 15 have a
// version 3.0 wording, shown when the survey follows version 3.0 (a missing version is version
// 3.0). The group label is never retyped: it comes from the list of factor F through
// `selectionLabel`. Pure: no density, no cap and no score are computed here; the rules stay in the
// package.

export type DmhRuleNote = "v30" | "v32"

export type DmhGroupContent = {
  code: DmhGroupCode
  label: string
  form: DmhFormId
  formName: string
  definition: string
  rule: { text: string; versionNote: DmhRuleNote | null }
  recognise: string
  confusions: readonly string[]
  difference: string | null
  typesCounted: readonly string[]
  typesNotCounted: readonly string[]
  illustrationAlt: string
}

type TypeNames = Readonly<Record<number, string>>

function typeNames(numbers: readonly number[]): string[] {
  const names: TypeNames = fr.dmhGuide.types
  return numbers.map((number) => names[number] as string)
}

/**
 * The content of one group page for a survey of the given method version (`null` or missing is
 * version 3.0, an unknown value reads like it, as `selectionLabel` does).
 */
export function dmhGroupContent(
  code: DmhGroupCode,
  methodVersion: string | null | undefined,
): DmhGroupContent {
  const text: DmhGroupText = fr.dmhGuide.groups[code]
  const structure = DMH_GUIDE_STRUCTURE[code]
  const hasV30 = text.ibpRuleV30 !== undefined
  const followsV30 = resolveMethodVersion(methodVersion) !== IBP_METHOD_V3_2
  const rule =
    hasV30 && followsV30
      ? { text: text.ibpRuleV30 as string, versionNote: "v30" as const }
      : { text: text.ibpRule, versionNote: hasV30 ? ("v32" as const) : null }
  return {
    code,
    label: selectionLabel("F", code, methodVersion) ?? code,
    form: structure.form,
    formName: fr.dmhGuide.forms[structure.form],
    definition: text.definition,
    rule,
    recognise: text.recognise,
    confusions: text.confusions,
    difference: text.difference ?? null,
    typesCounted: typeNames(structure.wslTypes),
    typesNotCounted: typeNames([
      ...structure.wslTypesOutsideIbp,
      ...(DMH_UNGROUPED_TYPES_SHOWN_ON[code] ?? []),
    ]),
    illustrationAlt: text.illustrationAlt,
  }
}
