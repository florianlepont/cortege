import type { PublicMapItem, SurveyDetailResponse } from "../app/types"

/**
 * OA-59: the author's own unfinished surveys, as Explorer markers. The API's public map only holds
 * submitted surveys, so a draft is drawn from the canonical detail the phone already has (its
 * display position and score): nothing about it leaves the device, and only its author sees it.
 */
export function ownDraftMapItems(
  surveyDetails: Record<string, SurveyDetailResponse>,
  publishedIds: ReadonlySet<string>,
): PublicMapItem[] {
  const items: PublicMapItem[] = []
  for (const detail of Object.values(surveyDetails)) {
    if (detail.status !== "draft" || publishedIds.has(detail.id)) continue
    const lat = detail.display_location?.lat
    const lng = detail.display_location?.lng
    const total = detail.scores?.ibp_total
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(total)) continue
    items.push({
      survey_id: detail.id,
      display_location: { lat: lat as number, lng: lng as number },
      survey_date: (detail.created_at ?? "").slice(0, 10),
      region_code: detail.region_version ?? "",
      ibp_total: total as number,
      ibp_method_version: detail.ibp_method_version ?? null,
      ibp_cas: detail.ibp_cas ?? null,
    })
  }
  return items
}
