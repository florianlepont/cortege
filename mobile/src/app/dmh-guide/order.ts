import { DMH_GROUP_CODES, type DmhGroupCode } from "@cortege/ibp-domain"

import { DMH_FORM_IDS, DMH_LIST_ORDER, formOf, type DmhFormId } from "./structure"

// Phase 32 (plan 32-10, D-08 lever c and the open sections of lever b): the order of the seven form
// sections of the list of factor F and of their rows. Ticked or counted groups come first (their
// section, then their place in the section), the rest follows the validated order of the spec
// (section 7, O-32-12 option a). Every section starts closed, except one that holds a ticked or
// counted group at mount, so what is already entered stays visible (O-32-4, amended by the owner on
// 2026-10-28). Pure: no score, no density; the stored dmh_groups order is never touched, only the
// displayed one.

export type DmhListSection = {
  form: DmhFormId
  codes: readonly DmhGroupCode[]
  defaultExpanded: boolean
}

const KNOWN: ReadonlySet<string> = new Set(DMH_GROUP_CODES)

/**
 * Orders the sections and rows of the F list. Call it once, when the F page mounts, and never on a
 * tick (the rows do not jump under the observer's thumb). `ticked` is the stored group selection
 * (`null` when the survey has none), `counts` the stored tree counts per group.
 */
export function orderDmhRows({
  ticked,
  counts,
}: {
  ticked: readonly string[] | null
  counts: Partial<Record<DmhGroupCode, number>>
}): DmhListSection[] {
  const active = new Set<DmhGroupCode>()
  for (const code of ticked ?? []) {
    if (KNOWN.has(code)) active.add(code as DmhGroupCode)
  }
  for (const code of DMH_GROUP_CODES) {
    if ((counts[code] ?? 0) > 0) active.add(code)
  }

  const inListOrder = (codes: readonly DmhGroupCode[]): DmhGroupCode[] =>
    DMH_LIST_ORDER.filter((code) => codes.includes(code))
  const sections = DMH_FORM_IDS.map((form) => {
    const own = inListOrder(DMH_GROUP_CODES.filter((code) => formOf(code) === form))
    return {
      form,
      codes: [
        ...own.filter((code) => active.has(code)),
        ...own.filter((code) => !active.has(code)),
      ],
      hasActive: own.some((code) => active.has(code)),
    }
  })
  return [
    ...sections.filter((section) => section.hasActive),
    ...sections.filter((section) => !section.hasActive),
  ].map(({ form, codes, hasActive }) => ({
    form,
    codes,
    defaultExpanded: hasActive,
  }))
}
