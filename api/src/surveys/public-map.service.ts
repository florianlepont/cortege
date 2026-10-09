import type {
  CommunitySurveyItem,
  PublicParcelStatusItem as PublicParcelStatusItemContract,
} from "@cortege/ibp-domain"
import { Injectable } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"
import { CadastreProviderService, WfsParcelFeature } from "./cadastre-provider.service"
import {
  buildCommunitySurveysQuery,
  buildPublicMapItemsQuery,
  COMMUNITY_SURVEYS_DEFAULT_LIMIT,
  PUBLIC_PARCEL_STATUSES_BBOX_SQL,
  PUBLIC_PARCEL_STATUSES_SQL,
  PUBLIC_STUDIED_BY_COMMUNES_SQL,
} from "./public-map.queries"
import {
  normalizeDateInput,
  PublicMapDbRow,
  PublicMapItem,
  toPublicMapItem,
} from "./public-map.utils"
import {
  buildFallbackParcelGeometry,
  buildParcelKey,
  normalizeCentroid,
  normalizeObservationYear,
  parseBbox,
  toFiniteNumber,
} from "./surveys-normalize.utils"

export type PublicParcelStatusItem = {
  parcel_id: string
  study_status: "studied" | "not_studied"
  latest_submitted_survey_id: string | null
  latest_observation_year: number | null
  latest_ibp_total: number | null
  /** 01.8 D-10: method tag of the same latest survey as latest_ibp_total; null = v3.0 or none. */
  latest_ibp_method_version: string | null
  geometry?: Record<string, unknown>
}

type ParcelStatusDbRow = {
  parcel_id: string
  study_status: "studied" | "not_studied"
  latest_submitted_survey_id: string | null
  latest_observation_year: number | null
  latest_ibp_total: number | null
  latest_ibp_method_version?: string | null
  geometry: Record<string, unknown>
  centroid: Record<string, unknown>
}

type StudiedParcelDbRow = {
  commune_code: string
  section: string
  number: string
  latest_submitted_survey_id: string
  latest_observation_year: number | null
  latest_ibp_total: number | null
  latest_ibp_method_version?: string | null
}

type CommunitySurveyDbRow = {
  id: string
  site_name: string
  ibp_method_version: string | null
  scores: Record<string, unknown>
  submitted_at: string
  author_name: string | null
}

/** Below this map zoom the mobile shows no parcel, so the route answers without a query. */
const MIN_PARCEL_STATUS_ZOOM = 12
/**
 * From this zoom the IGN cadastre gives every parcel of the view. Between MIN_PARCEL_STATUS_ZOOM
 * and this zoom only the studied parcels (those with a public survey) are answered, from the
 * database: a forest of large parcels shows its coloured parcels without zooming right in, and
 * the IGN is not asked for a whole wide view.
 */
const IGN_PARCEL_ZOOM = 15

/**
 * Unauthenticated public map reads (D-07): /v1/public/map-items and /v1/public/parcels/status.
 * The SQL lives in public-map.queries.ts (D-13), where each query explains its plan.
 */
@Injectable()
export class PublicMapService {
  constructor(
    private readonly db: DatabaseService,
    // D-08: the single IGN client (WFS features for the parcel statuses).
    private readonly cadastreProvider: CadastreProviderService,
  ) {}

  async getPublicMapItems(input?: {
    from?: string
    to?: string
    region?: string
    bbox?: string
  }): Promise<{ items: PublicMapItem[] }> {
    const region = input?.region?.trim()
    // 01.9 D-05: parseBbox throws its fixed-message 400 before any query; blank means no bbox.
    const bbox = parseBbox(input?.bbox)
    const query = buildPublicMapItemsQuery({
      from: normalizeDateInput(input?.from),
      to: normalizeDateInput(input?.to),
      region: region && region.length > 0 ? region : null,
      bbox,
    })

    const result = await this.db.query<PublicMapDbRow>(query.text, query.values)

    const items = result.rows
      .map((row) => toPublicMapItem(row))
      .filter((item): item is PublicMapItem => Boolean(item))

    return { items }
  }

  /** The community search: finished surveys of every member, with their author (see the query). */
  async searchCommunitySurveys(input?: {
    q?: string
    limit?: number
  }): Promise<{ items: CommunitySurveyItem[] }> {
    const q = input?.q?.trim()
    const query = buildCommunitySurveysQuery({
      q: q && q.length > 0 ? q : null,
      limit: Math.min(Math.max(input?.limit ?? COMMUNITY_SURVEYS_DEFAULT_LIMIT, 1), 50),
    })
    const result = await this.db.query<CommunitySurveyDbRow>(query.text, query.values)
    const items = result.rows.map(
      (row): CommunitySurveyItem => ({
        survey_id: row.id,
        site_name: row.site_name,
        author_name: row.author_name,
        submitted_at: row.submitted_at,
        ibp_total: toFiniteNumber(row.scores?.ibp_total) ?? 0,
        ibp_method_version: row.ibp_method_version ?? null,
      }),
    )
    return { items }
  }

  async getPublicParcelStatuses(input?: {
    bbox?: string
    zoom?: string
    year?: string
  }): Promise<{ items: PublicParcelStatusItem[] }> {
    const zoom = toFiniteNumber(input?.zoom)
    if (zoom !== null && zoom < MIN_PARCEL_STATUS_ZOOM) {
      return { items: [] }
    }

    const studiedOnly = zoom !== null && zoom < IGN_PARCEL_ZOOM
    const bbox = parseBbox(input?.bbox)
    const year = normalizeObservationYear(input?.year)
    if (!studiedOnly && this.cadastreProvider.wfsEnabled && bbox) {
      // D-08: null (too many tiles, or IGN failed) and an empty answer both use the DB path.
      const features = await this.cadastreProvider.fetchParcelFeaturesInBbox(bbox)
      if (features && features.length > 0) {
        return { items: await this.withStudyStatus(features, year) }
      }
    }

    const result = bbox
      ? await this.db.query<ParcelStatusDbRow>(PUBLIC_PARCEL_STATUSES_BBOX_SQL, [
          year,
          bbox.minLng,
          bbox.maxLng,
          bbox.minLat,
          bbox.maxLat,
        ])
      : await this.db.query<ParcelStatusDbRow>(PUBLIC_PARCEL_STATUSES_SQL, [year])

    const seenParcelIds = new Set<string>()
    const items = result.rows
      .map((row): PublicParcelStatusItem => {
        const centroid = normalizeCentroid(row.centroid)
        const geometry =
          row.geometry && Object.keys(row.geometry).length > 0
            ? row.geometry
            : centroid
              ? buildFallbackParcelGeometry(centroid)
              : undefined
        return {
          parcel_id: row.parcel_id,
          study_status: row.study_status,
          latest_submitted_survey_id: row.latest_submitted_survey_id,
          latest_observation_year: row.latest_observation_year,
          latest_ibp_total: row.latest_ibp_total,
          latest_ibp_method_version: row.latest_ibp_method_version ?? null,
          geometry,
          // The wire shape must stay assignable to the shared contract (01.8-01).
        } satisfies PublicParcelStatusItemContract
      })
      .filter((item) => {
        if (studiedOnly && item.study_status !== "studied") {
          return false
        }
        if (seenParcelIds.has(item.parcel_id)) {
          return false
        }
        seenParcelIds.add(item.parcel_id)
        return true
      })

    return { items }
  }

  /**
   * Study status for IGN features, computed per request (never cached, D-08): the latest
   * public submitted survey of each parcel, ranked as before. The lookup only covers parcels
   * in the features' communes (D-08, T-01.7-39). Features only match parcels on their exact
   * commune code, so the restriction does not change the result. Both sides use the same key
   * (parseWfsParcelProperties, parseParcelIdu): the arrondissement code in Paris, Lyon and
   * Marseille, a two-digit section for a numbered Alsace-Moselle section.
   */
  private async withStudyStatus(
    features: WfsParcelFeature[],
    year: number | null,
  ): Promise<PublicParcelStatusItem[]> {
    const communeCodes = [...new Set(features.map((feature) => feature.commune_code))]
    const latestResult = await this.db.query<StudiedParcelDbRow>(PUBLIC_STUDIED_BY_COMMUNES_SQL, [
      year,
      communeCodes,
    ])

    const studiedByParcelKey = new Map<
      string,
      {
        latest_submitted_survey_id: string
        latest_observation_year: number | null
        latest_ibp_total: number | null
        latest_ibp_method_version: string | null
      }
    >()
    for (const row of latestResult.rows) {
      studiedByParcelKey.set(buildParcelKey(row.commune_code, row.section, row.number), {
        latest_submitted_survey_id: row.latest_submitted_survey_id,
        latest_observation_year: row.latest_observation_year,
        latest_ibp_total: row.latest_ibp_total,
        latest_ibp_method_version: row.latest_ibp_method_version ?? null,
      })
    }

    return features.map((feature) => {
      const studied = studiedByParcelKey.get(
        buildParcelKey(feature.commune_code, feature.section, feature.number),
      )
      return {
        parcel_id: feature.parcel_id,
        study_status: studied ? "studied" : "not_studied",
        latest_submitted_survey_id: studied?.latest_submitted_survey_id ?? null,
        latest_observation_year: studied?.latest_observation_year ?? null,
        latest_ibp_total: studied?.latest_ibp_total ?? null,
        latest_ibp_method_version: studied?.latest_ibp_method_version ?? null,
        geometry: feature.geometry,
      } satisfies PublicParcelStatusItemContract
    })
  }
}
