import type { SearchParcelItem, SearchParcelsResponse } from "@cortege/ibp-domain"
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { LRUCache } from "lru-cache"
import { DatabaseService } from "../database/database.service"
import { CadastreProviderService } from "./cadastre-provider.service"
import { GeocoderService } from "./geocoder.service"
import { parseParcelQuery, type ParcelQuery } from "./parcel-query"
import {
  buildParcelByKeyQuery,
  buildParcelSurveyCountQuery,
  buildParcelsBySectionNumberQuery,
  type ParcelKey,
  type ParcelSearchDbRow,
  type ParcelSurveyCountDbRow,
} from "./parcel-search.queries"

/** Parcels per answer. */
export const PARCEL_SEARCH_LIMIT = 10
// A parcel answer lives 10 minutes, at most 500 entries (D-15, T-25-27). Failures are not stored.
export const PARCEL_SEARCH_CACHE_TTL_MS = 10 * 60 * 1000
export const PARCEL_SEARCH_CACHE_MAX_ENTRIES = 500

type ParcelOutcome = { item: SearchParcelItem | null; failed: boolean }

function keyId(key: ParcelKey): string {
  return `${key.communeCode}|${key.section}|${key.number}`
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: "search_provider_unavailable",
    message: "Parcel search provider unavailable",
  })
}

/** A registered parcel as a wire item; it has no polygon and no commune name. */
function itemFromRow(row: ParcelSearchDbRow): SearchParcelItem | null {
  if (row.centroid_lat === null || row.centroid_lng === null) {
    return null
  }
  return {
    parcel_id: row.parcel_id,
    commune_code: row.commune_code,
    commune_name: null,
    section: row.section,
    number: row.number,
    centroid: { lat: row.centroid_lat, lng: row.centroid_lng },
    bbox: null,
    survey_count: 0,
  }
}

/**
 * The parcel group of the global search (phase 25, D-06, D-13). A key that can be resolved is
 * looked up on IGN API Carto (never on the geocoder parcel index); a commune name is first turned
 * into INSEE codes by the geocoder; a section and number alone are matched against the parcels
 * the app already knows. What the database knows is also the fallback when IGN is off or fails,
 * so a studied parcel is still found and no parcel is ever invented. The typed text is never
 * logged (T-25-28).
 */
@Injectable()
export class ParcelSearchService {
  private readonly logger = new Logger(ParcelSearchService.name)
  private readonly cache = new LRUCache<string, SearchParcelsResponse>({
    max: PARCEL_SEARCH_CACHE_MAX_ENTRIES,
    ttl: PARCEL_SEARCH_CACHE_TTL_MS,
  })

  constructor(
    private readonly db: DatabaseService,
    private readonly cadastre: CadastreProviderService,
    private readonly geocoder: GeocoderService,
  ) {}

  /**
   * Parcels matching the typed text, at most PARCEL_SEARCH_LIMIT. Text that is not a parcel
   * reference answers an empty list with no call. Answers 503 `search_provider_unavailable` only
   * when IGN failed and the database knows nothing.
   */
  async search(rawQuery: string): Promise<SearchParcelsResponse> {
    const query = parseParcelQuery(rawQuery)
    if (query === null) {
      return { items: [] }
    }
    // The parsed form is the cache key: "77186 ab 123" and "77186AB0123" share one entry.
    const cacheKey = JSON.stringify(query)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return cached
    }
    const { items, failed } = await this.resolve(query)
    if (items.length === 0 && failed) {
      throw unavailable()
    }
    const response = { items: await this.withSurveyCounts(items.slice(0, PARCEL_SEARCH_LIMIT)) }
    // An answer built while IGN failed is degraded and is not kept.
    if (!failed) {
      this.cache.set(cacheKey, response)
    }
    return response
  }

  private async resolve(
    query: ParcelQuery,
  ): Promise<{ items: SearchParcelItem[]; failed: boolean }> {
    if (query.kind === "sectionNumber") {
      return { items: await this.fromSectionNumber(query), failed: false }
    }
    const keys =
      query.kind === "key"
        ? [{ communeCode: query.communeCode, section: query.section, number: query.number }]
        : (await this.geocoder.resolveCommunes(query.communeName)).map((commune) => ({
            communeCode: commune.code,
            section: query.section,
            number: query.number,
          }))
    const outcomes = await Promise.all(keys.map((key) => this.resolveKey(key)))
    return {
      items: outcomes.flatMap((outcome) => (outcome.item ? [outcome.item] : [])),
      failed: outcomes.some((outcome) => outcome.failed),
    }
  }

  /** IGN first; the registered parcel when IGN has none, is off or fails. */
  private async resolveKey(key: ParcelKey): Promise<ParcelOutcome> {
    let failed = false
    try {
      const found = await this.cadastre.lookupParcelByKey(key.communeCode, key.section, key.number)
      if (found) {
        return {
          item: {
            parcel_id: found.idu,
            commune_code: key.communeCode,
            commune_name: found.communeName,
            section: key.section,
            number: key.number,
            centroid: found.centroid,
            bbox: found.bbox,
            survey_count: 0,
          },
          failed: false,
        }
      }
    } catch (error) {
      failed = true
      const detail = error instanceof Error ? error.message : String(error)
      this.logger.warn(`IGN API Carto parcel search failed: ${detail}`)
    }
    const query = buildParcelByKeyQuery(key.communeCode, key.section, key.number)
    const result = await this.db.query<ParcelSearchDbRow>(query.text, query.values)
    const item = result.rows.length > 0 ? itemFromRow(result.rows[0]) : null
    // The failure is reported even when the database answers: that answer is degraded (no polygon)
    // and must not be cached.
    return { item, failed }
  }

  private async fromSectionNumber(
    query: Extract<ParcelQuery, { kind: "sectionNumber" }>,
  ): Promise<SearchParcelItem[]> {
    const sql = buildParcelsBySectionNumberQuery({
      section: query.section,
      number: query.number,
      departmentPrefix: query.departmentPrefix,
      limit: PARCEL_SEARCH_LIMIT,
    })
    const result = await this.db.query<ParcelSearchDbRow>(sql.text, sql.values)
    return result.rows.flatMap((row) => {
      const item = itemFromRow(row)
      return item ? [item] : []
    })
  }

  /** Finished public surveys per parcel (any member, the map's visibility), in one query. */
  private async withSurveyCounts(items: SearchParcelItem[]): Promise<SearchParcelItem[]> {
    if (items.length === 0) {
      return items
    }
    const sql = buildParcelSurveyCountQuery(
      items.map((item) => ({
        communeCode: item.commune_code,
        section: item.section,
        number: item.number,
      })),
    )
    const result = await this.db.query<ParcelSurveyCountDbRow>(sql.text, sql.values)
    const counts = new Map(
      result.rows.map((row) => [
        keyId({ communeCode: row.commune_code, section: row.section, number: row.number }),
        Number(row.survey_count),
      ]),
    )
    return items.map((item) => ({
      ...item,
      survey_count:
        counts.get(
          keyId({ communeCode: item.commune_code, section: item.section, number: item.number }),
        ) ?? 0,
    }))
  }
}
