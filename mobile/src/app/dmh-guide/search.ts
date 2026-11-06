import { DMH_GROUP_CODES, type DmhGroupCode } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { selectionLabel } from "../factor-selections"
import { foldSearchText } from "../search-text"
import { dmhGroupContent } from "./content"

// Phase 32 (plan 32-10, D-08 lever b and UI-SPEC S2.1): the search field of the guide catalogue.
// The query and the haystack of a group are folded with the same function as the global search,
// so "Écorce" and "ecorce" give the same groups. The haystack is the group label, its common-name
// keywords and the names of the types the IBP counts in it. Local, not debounced (fifteen items),
// nothing stored or sent.

function haystackOf(code: DmhGroupCode): string {
  const counted = dmhGroupContent(code, null).typesCounted
  return foldSearchText(
    [selectionLabel("F", code), fr.dmhGuide.groups[code].keywords, ...counted].join(" "),
  )
}

const HAYSTACKS: Readonly<Record<DmhGroupCode, string>> = Object.fromEntries(
  DMH_GROUP_CODES.map((code) => [code, haystackOf(code)]),
) as Record<DmhGroupCode, string>

/** The groups whose label, keywords or counted types contain the query, in IBP order. */
export function searchDmhGroups(query: string): DmhGroupCode[] {
  const wanted = foldSearchText(query).trim()
  if (wanted === "") return [...DMH_GROUP_CODES]
  return DMH_GROUP_CODES.filter((code) => HAYSTACKS[code].includes(wanted))
}
