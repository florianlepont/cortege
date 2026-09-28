import { useMemo } from "react"
import type { ReactElement } from "react"
import type { LocalSurvey } from "../../storage"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { createListStyles } from "./styles"

// A non-survey item at the top of the list (currently: the search-results header only).
export type LeadingListItem = { kind: "leading"; key: string; element: ReactElement }
export type SurveyListItem = LeadingListItem | LocalSurvey

export function isLeadingListItem(item: SurveyListItem): item is LeadingListItem {
  return "kind" in item && item.kind === "leading"
}

export const keyExtractor = (item: SurveyListItem): string =>
  isLeadingListItem(item) ? `leading:${item.key}` : item.id

type LeadingItemsInput = {
  hasQuery: boolean
  visibleSurveySummary: string
}

// HOME-01/LIST: Mes Relevés is a pure list now — the create card and the "à faire" card moved
// out (the create action is the header's "+", the dashboard concerns stayed on Home). The only
// leading item left is a "Résultats" caption while a search is active.
export function useLeadingItems({ hasQuery, visibleSurveySummary }: LeadingItemsInput) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createListStyles(theme), [theme])
  const sectionHeaderElement = useMemo(
    () =>
      hasQuery ? (
        <AppSectionHeader
          title={fr.surveyList.section.results}
          subtitle={visibleSurveySummary}
          titleStyle={styles.homeSectionTitle}
          subtitleStyle={styles.homeSectionSubtitle}
          style={styles.listSectionHeader}
        />
      ) : null,
    [hasQuery, styles, visibleSurveySummary],
  )

  return useMemo<LeadingListItem[]>(
    () =>
      sectionHeaderElement
        ? [{ kind: "leading", key: "section", element: sectionHeaderElement }]
        : [],
    [sectionHeaderElement],
  )
}
