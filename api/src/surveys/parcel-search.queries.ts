// SQL of the parcel group of the global search (phase 25, D-06, D-13): parcels the app already
// knows, and the number of finished public surveys on a parcel. Every value is a bound parameter.

import { PUBLIC_SURVEY_PREDICATE } from "./public-map.queries"

/** The key under which a parcel is registered and matched to its IGN polygon. */
export type ParcelKey = { communeCode: string; section: string; number: string }

/** A registered parcel as the search reads it; the centroid is NULL when it was never filled in. */
export type ParcelSearchDbRow = {
  parcel_id: string
  commune_code: string
  section: string
  number: string
  centroid_lat: number | null
  centroid_lng: number | null
}

/** A row of the survey count query. */
export type ParcelSurveyCountDbRow = {
  commune_code: string
  section: string
  number: string
  survey_count: number | string
}

const PARCEL_COLUMNS = `p.parcel_id,
   p.commune_code,
   p.section,
   p.number,
   p.centroid_lat,
   p.centroid_lng`

/** The parcel registered under a commune, section and number, if any. */
export function buildParcelByKeyQuery(
  communeCode: string,
  section: string,
  number: string,
): { text: string; values: unknown[] } {
  const text = `SELECT
   ${PARCEL_COLUMNS}
 FROM parcels p
 WHERE p.commune_code = $1
   AND p.section = $2
   AND p.number = $3
 ORDER BY p.parcel_id
 LIMIT 1`
  return { text, values: [communeCode, section, number] }
}

/**
 * Finished public surveys per parcel key, any member (the same visibility as the map: the public
 * predicate plus a submission date, so a draft is never counted). Parcels are matched by key and
 * their surveys counted once each even when a survey carries several parcels. A key without a
 * survey has no row.
 */
export function buildParcelSurveyCountQuery(keys: ParcelKey[]): {
  text: string
  values: unknown[]
} {
  const text = `SELECT
   p.commune_code,
   p.section,
   p.number,
   COUNT(DISTINCT s.id)::int AS survey_count
 FROM unnest($1::text[], $2::text[], $3::text[]) AS k(commune_code, section, number)
 INNER JOIN parcels p
   ON p.commune_code = k.commune_code
  AND p.section = k.section
  AND p.number = k.number
 INNER JOIN survey_parcels sp
   ON sp.parcel_id = p.parcel_id
 INNER JOIN surveys s
   ON s.id = sp.survey_id
 WHERE ${PUBLIC_SURVEY_PREDICATE}
   AND s.submitted_at IS NOT NULL
 GROUP BY p.commune_code, p.section, p.number`
  return {
    text,
    values: [
      keys.map((key) => key.communeCode),
      keys.map((key) => key.section),
      keys.map((key) => key.number),
    ],
  }
}

/**
 * Registered parcels with that section and number and a centroid, the one studied last first. With
 * a department, only the communes whose code starts with it (a bound value, never interpolated).
 */
export function buildParcelsBySectionNumberQuery(input: {
  section: string
  number: string
  departmentPrefix: string | null
  limit: number
}): { text: string; values: unknown[] } {
  const values: unknown[] = [input.section, input.number]
  const conditions = [
    `p.section = $1`,
    `p.number = $2`,
    `p.centroid_lat IS NOT NULL`,
    `p.centroid_lng IS NOT NULL`,
  ]
  if (input.departmentPrefix) {
    values.push(input.departmentPrefix)
    conditions.push(`p.commune_code LIKE $${values.length} || '%'`)
  }
  values.push(input.limit)
  const text = `SELECT
   ${PARCEL_COLUMNS}
 FROM parcels p
 LEFT JOIN LATERAL (
   SELECT MAX(s.submitted_at) AS last_studied_at
   FROM survey_parcels sp
   INNER JOIN surveys s
     ON s.id = sp.survey_id
   WHERE sp.parcel_id = p.parcel_id
     AND ${PUBLIC_SURVEY_PREDICATE}
     AND s.submitted_at IS NOT NULL
 ) studied ON TRUE
 WHERE ${conditions.join("\n   AND ")}
 ORDER BY studied.last_studied_at DESC NULLS LAST, p.parcel_id
 LIMIT $${values.length}`
  return { text, values }
}
