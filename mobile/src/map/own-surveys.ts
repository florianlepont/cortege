import type { PublicMapItem, PublicParcelStatusItem, SurveyDetailResponse } from "../app/types"
import {
  computeIbpTotalsFromRetainedScores,
  computeRetainedScoresFromRawFactors,
  resolveDraftParcelIds,
} from "../app/ibp-scoring"
import { boundsOfRings, parcelPolygonsFrom } from "../app/survey-pdf/map-projection"
import type { LocalSurveyMapSource, SurveyQueuePayload } from "../storage/types"

/**
 * OA-59 plus phase 29 D-01 and D-09: the author's own surveys, draft or submitted, as Explorer
 * markers drawn from local data. D-01: every row the phone holds in `local_surveys` is a candidate,
 * with a score read from the payload or computed on the phone. D-09: the position is the centre of
 * the cached parcel geometry of the downloaded areas, or the server position already in memory for
 * a survey opened this session (so an online marker never moves). Nothing about these items leaves
 * the device, and only their author sees them.
 */
export type OwnSurveyMapItems = { drafts: PublicMapItem[]; own: PublicMapItem[] }

/**
 * The IBP total (/50) of a local survey: the server total the pull stored when it is a finite
 * number, else the one computed through the package adapters from the payload's factors and method
 * context (a payload with no factor scores 0).
 */
export function localSurveyTotal(payload: SurveyQueuePayload): number {
  const stored = payload.scores?.ibp_total
  if (typeof stored === "number" && Number.isFinite(stored)) return stored
  const retained = computeRetainedScoresFromRawFactors(payload.factors, {
    ibp_method_version: payload.ibp_method_version,
    ibp_cas: payload.ibp_cas,
    ibp_cas3_scale: payload.ibp_cas3_scale,
    region_version: payload.region_version,
    vegetation_stage: payload.vegetation_stage,
  })
  return computeIbpTotalsFromRetainedScores(retained).ibp_total
}

/**
 * The centre of the bounding box of the cached geometry of the wanted parcels (matched without
 * regard to case), or null when none of them is cached.
 */
export function cachedParcelCentre(
  parcels: PublicParcelStatusItem[],
  parcelIds: string[],
): { lat: number; lng: number } | null {
  const bounds = boundsOfRings(parcelPolygonsFrom(parcels, parcelIds).flatMap(({ rings }) => rings))
  if (!bounds) return null
  return { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 }
}

function knownPosition(
  detail: SurveyDetailResponse | undefined,
): { lat: number; lng: number } | null {
  const lat = detail?.display_location?.lat
  const lng = detail?.display_location?.lng
  // Number.isFinite is false for undefined and for anything that is not a number.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat: lat as number, lng: lng as number }
}

/**
 * Splits the local surveys into drafts (dashed marker: any status other than "submitted") and own
 * submitted surveys (normal marker).
 * An id already drawn from the API (`publishedIds`) is skipped, and so is a survey with no position
 * (a survey outside every downloaded area is not drawn offline).
 */
export function ownSurveyMapItems(input: {
  sources: LocalSurveyMapSource[]
  parcels: PublicParcelStatusItem[]
  surveyDetails: Record<string, SurveyDetailResponse>
  publishedIds: ReadonlySet<string>
}): OwnSurveyMapItems {
  const result: OwnSurveyMapItems = { drafts: [], own: [] }
  for (const source of input.sources) {
    if (input.publishedIds.has(source.id)) continue
    const { payload } = source
    const position =
      knownPosition(input.surveyDetails[source.id]) ??
      cachedParcelCentre(input.parcels, resolveDraftParcelIds(payload))
    if (!position) continue
    // Same rule as Home, the list and the detail screen: a draft that has synced is stored as
    // "synced" (or "error"), so "not finished" is "not submitted", never `=== "draft"`.
    const isDraft = source.status !== "submitted"
    const item: PublicMapItem = {
      survey_id: source.id,
      display_location: position,
      survey_date: (isDraft ? source.created_at : source.updated_at).slice(0, 10),
      region_code: payload.region_version ?? "",
      ibp_total: localSurveyTotal(payload),
      ibp_method_version: payload.ibp_method_version ?? null,
      ibp_cas: payload.ibp_cas ?? null,
    }
    if (isDraft) result.drafts.push(item)
    else result.own.push(item)
  }
  return result
}
