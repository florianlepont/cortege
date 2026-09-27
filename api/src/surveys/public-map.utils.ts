import type { PublicMapItem as PublicMapItemContract } from "@cortege/ibp-domain"

export type PublicMapDbRow = {
  id: string
  region_version: string | null
  /** Migration 016; NULL = v3.0. Optional so rows of older SELECTs still type-check. */
  ibp_method_version?: string | null
  ibp_cas?: number | null
  scores: Record<string, unknown>
  submitted_at: string | null
  parcel_centroid_lat?: number | null
  parcel_centroid_lng?: number | null
}

export type PublicMapItem = {
  survey_id: string
  display_location: { lat: number; lng: number }
  survey_date: string
  region_code: string
  ibp_total: number
  /** 01.8 D-10: the survey's method tag, null for an untagged survey (= v3.0). Always present. */
  ibp_method_version: string | null
  /** 01.8 D-10: the v3.2 cas (1-4), null for a v3.0 or untagged survey. Always present. */
  ibp_cas: number | null
}

export function normalizeDateInput(value: string | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null
  }
  return trimmed
}

export function toPublicMapItem(row: PublicMapDbRow): PublicMapItem | null {
  const lat = asFiniteNumber(row.parcel_centroid_lat)
  const lng = asFiniteNumber(row.parcel_centroid_lng)
  if (lat === null || lng === null) {
    return null
  }

  const ibpTotal = asFiniteNumber(row.scores?.ibp_total) ?? 0
  const surveyDate =
    typeof row.submitted_at === "string" && row.submitted_at.length >= 10
      ? row.submitted_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10)

  return {
    survey_id: row.id,
    display_location: {
      lat: Number(lat.toFixed(2)),
      lng: Number(lng.toFixed(2)),
    },
    survey_date: surveyDate,
    region_code: row.region_version ?? "unknown",
    ibp_total: ibpTotal,
    // Null stays null: the phone resolves null to v3.0, the API never stamps a tag on the wire.
    ibp_method_version: row.ibp_method_version ?? null,
    ibp_cas: asFiniteNumber(row.ibp_cas),
    // The wire shape must stay assignable to the shared contract (01.8-01).
  } satisfies PublicMapItemContract
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}
