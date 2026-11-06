import type { DmhGroupCode } from "@cortege/ibp-domain"
import { summaryRows } from "../../app/global-search"
import { SearchGroupCard } from "./SearchGroupCard"
import { SearchResultRow } from "./SearchResultRow"
import { guideLabels } from "./result-labels"

type SearchGuideGroupProps = {
  /** The groups of the guide that match the query, in IBP order. */
  groups: readonly DmhGroupCode[]
  onOpen: (code: DmhGroupCode) => void
  /** "Voir les N": the full list of the matching groups. */
  onSeeAll: () => void
}

/**
 * The "Guide des dendromicrohabitats" group of the search summary (phase 32, owner request
 * 2026-10-28): at most three slim rows in the shared group card, each the group name and its
 * official form, and "Voir les N" when more match. The groups come from the bundled catalogue, so
 * the group has no loading, offline or error line; with no match it draws nothing.
 */
export function SearchGuideGroup({ groups, onOpen, onSeeAll }: SearchGuideGroupProps) {
  const summary = summaryRows(groups, null)
  if (summary.rows.length === 0) return null
  return (
    <SearchGroupCard
      group="guide"
      seeAll={summary.hasMore ? { count: summary.total, capped: false, onPress: onSeeAll } : null}
    >
      {summary.rows.map((code) => {
        const labels = guideLabels(code)
        return (
          <SearchResultRow
            key={code}
            kind="guide"
            title={labels.title}
            meta={labels.meta}
            accessibilityLabel={labels.accessibilityLabel}
            onPress={() => onOpen(code)}
            testID={`search-guide-${code}`}
          />
        )
      })}
    </SearchGroupCard>
  )
}
