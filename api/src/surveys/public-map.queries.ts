// SQL of the two "public" map routes (D-13), shared by PublicMapService, the EXPLAIN script
// (scripts/explain-public-routes.js, through the compiled dist copy) and the EXPLAIN spec.
//
// Phase 2 (association-only sharing): both routes require an authenticated member (AuthGuard on
// PublicController) and show every submitted survey to every member, not just ones marked
// visibility = 'public'. The predicate below dropped the visibility check accordingly; the
// `visibility` column itself stays (REQ-X-visibility is restored with a future privacy-choice
// milestone), it's just no longer read here.
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { toFiniteNumber } from "./surveys-normalize.utils"

export const PUBLIC_SURVEY_PREDICATE = `s.status = 'submitted' AND s.deleted_at IS NULL`

/** Rows per /public/map-items answer, unchanged since before 01.7. */
export const PUBLIC_MAP_ITEMS_LIMIT = 500

/** Rows per /public/parcels/status answer on the database path, unchanged since before 01.7. */
export const PUBLIC_PARCEL_STATUSES_LIMIT = 1000

/**
 * The centre of the linked parcels of survey `s` (its `s.id`): the average of their generated
 * centroid columns (migration 015, NULL for a malformed or out-of-range centroid), over the whole
 * set when the survey covers several parcels. This is the one definition of a survey's map
 * position, shared by /public/map-items (below) and ParcelsService.displayLocation (the survey
 * pages), so both place a survey at the same point; the API then passes the pair through
 * normalizeCentroid. Owner decision 2026-10-08: the public map shows this exact centre, no longer
 * a rounded one. Used inside a LATERAL join on a relation aliased `s`.
 */
export const LINKED_PARCELS_CENTRE_SQL = `SELECT
     AVG(p.centroid_lat) AS parcel_centroid_lat,
     AVG(p.centroid_lng) AS parcel_centroid_lng
   FROM survey_parcels sp
   JOIN parcels p
     ON p.parcel_id = sp.parcel_id
   WHERE sp.survey_id = s.id`

export type PublicMapItemsFilters = {
  /** YYYY-MM-DD, already validated by normalizeDateInput. */
  from?: string | null
  /** YYYY-MM-DD, already validated by normalizeDateInput. */
  to?: string | null
  /** Trimmed, non-empty region code. */
  region?: string | null
  /** WGS84 degrees, already validated by parseBbox (finite, min < max). */
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number } | null
}

/**
 * /public/map-items (D-13, RESEARCH Pattern 6 and Pitfall 12).
 *
 * Before 01.7 the query joined survey_parcels and parcels to every public survey, grouped by
 * survey and only then kept the latest 500: at 10 000 surveys (2 000 public) that meant a Seq
 * Scan on surveys and on survey_parcels plus a HashAggregate over all 2 000 surveys (23.6 ms).
 * The partial index alone still left the Seq Scan on survey_parcels (18.9 ms), because the
 * aggregate ran before the LIMIT.
 *
 * Limit first: the inner query walks idx_surveys_public_submitted (submitted_at DESC) and
 * stops after 500 rows; the LATERAL aggregate then reads the 1-3 links of each of those
 * surveys through survey_parcels_pkey and the parcels unique index (5.0 ms, no seq scan).
 * The averages read the generated centroid columns instead of casting the JSON per row
 * (LINKED_PARCELS_CENTRE_SQL, the same centre as the survey pages).
 *
 * Optional filters are appended in the same order as before (from, to, region), so the
 * parameter list is unchanged.
 *
 * 01.9 D-05: optional bbox, index idx_parcels_centroid_lat_lng. It is appended last (its four
 * parameters follow from/to/region) as an EXISTS on the survey's linked parcels, inside the
 * limit-first subquery, so a bbox only narrows the public surveys and the 500 cap still
 * applies. Without a bbox the values are exactly the pre-01.9 ones.
 *
 * 01.8 D-10 (RESEARCH §4.2 rule 6): both select lists also carry s.ibp_method_version and
 * s.ibp_cas (migration 016, NULL = v3.0). Select list only: predicates, parameters and the
 * limit are unchanged, so the plan is too.
 *
 * CH-9: the region filter matches region_version exactly. v3.2 surveys store no region, so
 * `region` only ever matches v3.0 surveys (tagged or untagged); this is documented in the API
 * contract.
 */
export function buildPublicMapItemsQuery(filters: PublicMapItemsFilters = {}): {
  text: string
  values: unknown[]
} {
  const conditions: string[] = [PUBLIC_SURVEY_PREDICATE, `s.submitted_at IS NOT NULL`]
  const values: unknown[] = []

  if (filters.from) {
    values.push(filters.from)
    conditions.push(`s.submitted_at::date >= $${values.length}::date`)
  }
  if (filters.to) {
    values.push(filters.to)
    conditions.push(`s.submitted_at::date <= $${values.length}::date`)
  }
  if (filters.region) {
    values.push(filters.region)
    conditions.push(`s.region_version = $${values.length}`)
  }
  if (filters.bbox) {
    const { minLng, maxLng, minLat, maxLat } = filters.bbox
    values.push(minLng, maxLng, minLat, maxLat)
    const first = values.length - 3
    conditions.push(`EXISTS (
       SELECT 1
       FROM survey_parcels sp
       JOIN parcels p
         ON p.parcel_id = sp.parcel_id
       WHERE sp.survey_id = s.id
         AND p.centroid_lng BETWEEN $${first}::double precision AND $${first + 1}::double precision
         AND p.centroid_lat BETWEEN $${first + 2}::double precision AND $${first + 3}::double precision
     )`)
  }

  const text = `SELECT
   s.id,
   s.region_version,
   s.ibp_method_version,
   s.ibp_cas,
   s.scores,
   s.submitted_at::text,
   agg.parcel_centroid_lat,
   agg.parcel_centroid_lng
 FROM (
   SELECT s.id, s.region_version, s.ibp_method_version, s.ibp_cas, s.scores, s.submitted_at
   FROM surveys s
   WHERE ${conditions.join("\n     AND ")}
   ORDER BY s.submitted_at DESC
   LIMIT ${PUBLIC_MAP_ITEMS_LIMIT}
 ) s
 LEFT JOIN LATERAL (
   ${LINKED_PARCELS_CENTRE_SQL}
 ) agg ON true
 ORDER BY s.submitted_at DESC`

  return { text, values }
}

/**
 * The latest public submitted survey of parcel p, ranked as before 01.7 (year, then version,
 * then submission time). $1 is the optional observation year ceiling. Used by the LATERAL
 * joins below: one probe of idx_survey_parcels_parcel_id per parcel, instead of a
 * ROW_NUMBER() window over every public survey of the country. 01.8 D-10: the row also carries
 * its ibp_method_version, so the version and the total always come from the same survey.
 */
const LATEST_PUBLIC_SURVEY_OF_PARCEL = `SELECT
     s.id,
     s.observation_year,
     s.scores,
     s.ibp_method_version
   FROM survey_parcels sp
   JOIN surveys s
     ON s.id = sp.survey_id
   WHERE sp.parcel_id = p.parcel_id
     AND ${PUBLIC_SURVEY_PREDICATE}
     AND ($1::integer IS NULL OR s.observation_year IS NULL OR s.observation_year <= $1::integer)
   ORDER BY s.observation_year DESC NULLS LAST, s.version_number DESC NULLS LAST, s.submitted_at DESC NULLS LAST
   LIMIT 1`

const PARCEL_STATUS_COLUMNS = `p.parcel_id,
   p.geometry,
   p.centroid,
   CASE WHEN lp.id IS NULL THEN 'not_studied' ELSE 'studied' END AS study_status,
   lp.id AS latest_submitted_survey_id,
   lp.observation_year AS latest_observation_year,
   (lp.scores ->> 'ibp_total')::integer AS latest_ibp_total,
   lp.ibp_method_version AS latest_ibp_method_version`

/**
 * /public/parcels/status, database path with a bbox (D-13, RESEARCH Pattern 6).
 * $1 year ceiling or NULL, $2 minLng, $3 maxLng, $4 minLat, $5 maxLat (the pre-01.7 order).
 *
 * Before 01.7 the bbox was a JSON cast on every parcel row (Seq Scan on parcels) and the
 * latest survey came from a window over all public surveys. Now the bbox is a range on the
 * generated centroid_lat / centroid_lng columns (Bitmap Index Scan on
 * idx_parcels_centroid_lat_lng), the 1000 first parcels are kept, and only those get a
 * LATERAL latest-survey probe (1.6 ms at 10 000 surveys, no seq scan).
 *
 * A parcel whose centroid is not a number now has NULL generated columns and falls outside
 * every bbox; before 01.7 such a row made the whole query fail with a cast error.
 */
export const PUBLIC_PARCEL_STATUSES_BBOX_SQL = `SELECT
   ${PARCEL_STATUS_COLUMNS}
 FROM (
   SELECT p.parcel_id, p.geometry, p.centroid
   FROM parcels p
   WHERE p.centroid_lng BETWEEN $2::double precision AND $3::double precision
     AND p.centroid_lat BETWEEN $4::double precision AND $5::double precision
   ORDER BY p.parcel_id ASC
   LIMIT ${PUBLIC_PARCEL_STATUSES_LIMIT}
 ) p
 LEFT JOIN LATERAL (
   ${LATEST_PUBLIC_SURVEY_OF_PARCEL}
 ) lp ON true
 ORDER BY p.parcel_id ASC`

/**
 * /public/parcels/status, database path without a bbox: the first 1000 parcels by id (the
 * parcels unique index), each with its LATERAL latest-survey probe. $1 year ceiling or NULL.
 */
export const PUBLIC_PARCEL_STATUSES_SQL = `SELECT
   ${PARCEL_STATUS_COLUMNS}
 FROM (
   SELECT p.parcel_id, p.geometry, p.centroid
   FROM parcels p
   ORDER BY p.parcel_id ASC
   LIMIT ${PUBLIC_PARCEL_STATUSES_LIMIT}
 ) p
 LEFT JOIN LATERAL (
   ${LATEST_PUBLIC_SURVEY_OF_PARCEL}
 ) lp ON true
 ORDER BY p.parcel_id ASC`

/**
 * Study status for IGN features (D-08 / D-13): the latest public survey of every studied
 * parcel in the features' communes. $1 year ceiling or NULL, $2 commune codes (text[]).
 * Not bounded by centroid on purpose: parcels registered by id have an empty centroid and
 * would lose their "studied" flag (RESEARCH Pattern 7). Parcels without a public survey are
 * dropped by the inner LATERAL join.
 */
export const PUBLIC_STUDIED_BY_COMMUNES_SQL = `SELECT
   p.commune_code,
   p.section,
   p.number,
   lp.id::text AS latest_submitted_survey_id,
   lp.observation_year AS latest_observation_year,
   (lp.scores ->> 'ibp_total')::integer AS latest_ibp_total,
   lp.ibp_method_version AS latest_ibp_method_version
 FROM parcels p
 JOIN LATERAL (
   ${LATEST_PUBLIC_SURVEY_OF_PARCEL}
 ) lp ON true
 WHERE p.commune_code = ANY($2::text[])`

/** Surveys of the same parcels listed in a community survey's history. */
export const COMMUNITY_HISTORY_LIMIT = 20

/** Rows per /public/community-surveys answer when `limit` is not given. */
export const COMMUNITY_SURVEYS_DEFAULT_LIMIT = 30

/** Escapes the LIKE wildcards of a search text, so "50%" matches a literal percent sign. */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** A row of the community surveys queries (this file's and the search's): see the SELECT list. */
export type CommunitySurveyDbRow = {
  id: string
  site_name: string
  ibp_method_version: string | null
  scores: Record<string, unknown>
  submitted_at: string
  author_name: string | null
}

/** The wire shape of a community survey row; a missing score reads as 0. */
export function toCommunitySurveyItem(row: CommunitySurveyDbRow): CommunitySurveyItem {
  return {
    survey_id: row.id,
    site_name: row.site_name,
    author_name: row.author_name,
    submitted_at: row.submitted_at,
    ibp_total: toFiniteNumber(row.scores?.ibp_total) ?? 0,
    ibp_method_version: row.ibp_method_version ?? null,
  }
}

/**
 * /public/community-surveys: the submitted surveys of every member, newest first, optionally
 * narrowed to those whose site name or author name contains the text (case and accent insensitive,
 * unaccent from migration 022). Same inclusion rule as the
 * map (PUBLIC_SURVEY_PREDICATE: there is no private/public choice yet). The author is a LEFT JOIN
 * because an account deletion anonymises the survey (user_id becomes NULL, migration 012).
 */
export function buildCommunitySurveysQuery(input: { q?: string | null; limit: number }): {
  text: string
  values: unknown[]
} {
  const conditions: string[] = [PUBLIC_SURVEY_PREDICATE, `s.submitted_at IS NOT NULL`]
  const values: unknown[] = []
  if (input.q) {
    values.push(`%${escapeLikePattern(input.q)}%`)
    conditions.push(
      `(unaccent(s.site_name) ILIKE unaccent($${values.length})` +
        ` OR unaccent(u.display_name) ILIKE unaccent($${values.length}))`,
    )
  }
  values.push(input.limit)
  const text = `SELECT
   s.id,
   s.site_name,
   s.ibp_method_version,
   s.scores,
   s.submitted_at::text,
   u.display_name AS author_name
 FROM surveys s
 LEFT JOIN users u
   ON u.id = s.user_id
 WHERE ${conditions.join("\n   AND ")}
 ORDER BY s.submitted_at DESC
 LIMIT $${values.length}`
  return { text, values }
}
