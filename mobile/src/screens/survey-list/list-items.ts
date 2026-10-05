import type { LocalSurvey } from "../../storage"

/** The two sections of Mes Relevés (OA-55): surveys still to finish, then the finished ones. */
export type SectionKey = "toFinish" | "finished"

export type SectionHeaderItem = { kind: "section"; key: SectionKey; count: number }
export type SurveyListItem = SectionHeaderItem | LocalSurvey

export function isSectionHeader(item: SurveyListItem): item is SectionHeaderItem {
  return "kind" in item && item.kind === "section"
}

export const keyExtractor = (item: SurveyListItem): string =>
  isSectionHeader(item) ? `section:${item.key}` : item.id

const byMostRecent = (left: LocalSurvey, right: LocalSurvey): number =>
  right.updated_at.localeCompare(left.updated_at)

/**
 * The list data of Mes Relevés: "À terminer" (every survey not yet submitted) then "Terminés",
 * each most recently updated first and each shown only when it has surveys.
 */
export function buildListItems(surveys: readonly LocalSurvey[]): {
  items: SurveyListItem[]
  toFinishCount: number
} {
  const toFinish = surveys.filter((survey) => survey.status !== "submitted").sort(byMostRecent)
  const finished = surveys.filter((survey) => survey.status === "submitted").sort(byMostRecent)
  const items: SurveyListItem[] = []
  if (toFinish.length > 0) {
    items.push({ kind: "section", key: "toFinish", count: toFinish.length }, ...toFinish)
  }
  if (finished.length > 0) {
    items.push({ kind: "section", key: "finished", count: finished.length }, ...finished)
  }
  return { items, toFinishCount: toFinish.length }
}
