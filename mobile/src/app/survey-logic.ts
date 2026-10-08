import { fr } from "../i18n"
import { LocalAttachment, LocalSurvey } from "../storage"
import { SubmitBlockReason, SurveyListFilters, SurveyStats } from "./types"

const statusLabels = fr.common.surveyStatus

const parseDate = (value: string): number => {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

const parseDateFilterBoundary = (value: string, boundary: "start" | "end"): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z"
  const timestamp = Date.parse(`${trimmed}${suffix}`)
  return Number.isFinite(timestamp) ? timestamp : null
}

export const buildAttachmentCountBySurvey = (
  attachments: LocalAttachment[],
): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const attachment of attachments) {
    counts[attachment.survey_id] = (counts[attachment.survey_id] ?? 0) + 1
  }
  return counts
}

export const buildAttachmentsBySurvey = (
  attachments: LocalAttachment[],
): Record<string, LocalAttachment[]> => {
  const grouped: Record<string, LocalAttachment[]> = {}
  for (const attachment of attachments) {
    if (!grouped[attachment.survey_id]) {
      grouped[attachment.survey_id] = []
    }
    grouped[attachment.survey_id].push(attachment)
  }
  return grouped
}

export const computeSurveyStats = (surveys: LocalSurvey[]): SurveyStats => {
  let draft = 0
  let submitted = 0
  let pending = 0
  let synced = 0
  let failed = 0
  let blocked = 0

  for (const survey of surveys) {
    if (survey.status === "submitted") submitted += 1
    if (survey.status === "draft") draft += 1
    if (survey.sync_state === "pending") pending += 1
    if (survey.sync_state === "synced") synced += 1
    if (survey.sync_state === "failed") failed += 1
    if (survey.sync_blocked === 1) blocked += 1
  }

  return {
    total: surveys.length,
    draft,
    submitted,
    pending,
    synced,
    failed,
    blocked,
  }
}

export const resolveEffectiveSurveyStatus = (survey: LocalSurvey): LocalSurvey["status"] => {
  if (survey.status === "submitted") {
    return survey.status
  }
  if (survey.sync_state === "failed") {
    return "error"
  }
  if (survey.sync_state === "synced") {
    return "synced"
  }
  return survey.status
}

export type SurveyUiStatus = "draft" | "sync_pending" | "sync_error" | "sync_blocked" | "submitted"

// BUG-03 (UX audit, Phase 2): a sync failure is checked before "submitted", so a survey the app
// already marked submitted but then failed to sync never reads "Soumis" in green — the workflow
// status and the sync status are two different axes, and a failure on either always wins.
export const resolveSurveyUiStatus = (survey: LocalSurvey): SurveyUiStatus => {
  if (survey.sync_state === "failed") {
    return survey.sync_blocked === 1 ? "sync_blocked" : "sync_error"
  }
  if (survey.status === "submitted") return "submitted"
  if (survey.sync_state === "pending") return "sync_pending"
  return "draft"
}

export const formatSurveyUiStatusLabel = (uiStatus: SurveyUiStatus): string => {
  if (uiStatus === "submitted") return statusLabels.submitted
  if (uiStatus === "sync_pending") return statusLabels.syncPending
  if (uiStatus === "sync_error") return statusLabels.syncError
  if (uiStatus === "sync_blocked") return statusLabels.syncBlocked
  return statusLabels.draft
}

export type SurveySyncDisplay = "local" | "sync" | "sync_error" | "sync_blocked"

export const resolveSurveySyncDisplay = (survey: LocalSurvey): SurveySyncDisplay => {
  if (survey.sync_state === "failed") {
    return survey.sync_blocked === 1 ? "sync_blocked" : "sync_error"
  }
  // OA-38: a draft reaches the server too, so a synced draft is "synced", not "local". "Local"
  // now only means work still waiting to go out.
  if (survey.sync_state === "synced") {
    return "sync"
  }
  return "local"
}

export const formatSurveySyncDisplayLabel = (syncDisplay: SurveySyncDisplay): string => {
  if (syncDisplay === "sync") return statusLabels.synced
  if (syncDisplay === "sync_error") return statusLabels.syncError
  if (syncDisplay === "sync_blocked") return statusLabels.syncBlocked
  return statusLabels.local
}

export const filterAndSortSurveys = (
  surveys: LocalSurvey[],
  filters: SurveyListFilters,
  attachmentCountBySurvey: Record<string, number>,
): LocalSurvey[] => {
  const query = filters.surveyQuery.trim().toLowerCase()
  const fromBoundary = parseDateFilterBoundary(filters.surveyFromDate, "start")
  const toBoundary = parseDateFilterBoundary(filters.surveyToDate, "end")

  const filtered = surveys.filter((survey) => {
    const lifecycleStatus: "draft" | "submitted" =
      survey.status === "submitted" ? "submitted" : "draft"
    const updatedAtTs = parseDate(survey.updated_at)
    if (fromBoundary !== null && updatedAtTs < fromBoundary) return false
    if (toBoundary !== null && updatedAtTs > toBoundary) return false

    if (filters.statusFilter !== "all" && lifecycleStatus !== filters.statusFilter) {
      return false
    }
    if (filters.visibilityFilter !== "all" && survey.visibility !== filters.visibilityFilter)
      return false
    if (filters.syncFilter !== "all" && survey.sync_state !== filters.syncFilter) return false

    const isBlocked = survey.sync_blocked === 1
    if (filters.blockedFilter === "blocked" && !isBlocked) return false
    if (filters.blockedFilter === "unblocked" && isBlocked) return false

    const attachmentCount = attachmentCountBySurvey[survey.id] ?? 0
    if (filters.attachmentFilter === "with" && attachmentCount === 0) return false
    if (filters.attachmentFilter === "without" && attachmentCount > 0) return false

    if (query.length > 0) {
      const haystack =
        `${survey.site_name} ${survey.id} ${survey.last_sync_error ?? ""}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }

    return true
  })

  const sorted = [...filtered]
  if (filters.sortMode === "site_asc") {
    sorted.sort((a, b) => a.site_name.localeCompare(b.site_name))
    return sorted
  }

  if (filters.sortMode === "updated_asc") {
    sorted.sort((a, b) => parseDate(a.updated_at) - parseDate(b.updated_at))
    return sorted
  }

  sorted.sort((a, b) => parseDate(b.updated_at) - parseDate(a.updated_at))
  return sorted
}

// D-25 (12.2-14): a draft not synced yet is no longer refused here. The finish sends the survey's
// pending changes itself before the submit call. An unnamed draft is refused instead: it never
// leaves the phone (OA-18), so its pending changes could not be sent.
export const getSubmitBlockReason = (
  surveyId: string,
  surveys: LocalSurvey[],
): SubmitBlockReason => {
  const target = surveys.find((survey) => survey.id === surveyId)
  if (!target) return "not_found"

  if (target.status === "submitted") return "already_submitted"
  if (target.sync_blocked === 1) return "survey_blocked"
  if (!target.site_name?.trim()) return "name_required"

  return null
}
