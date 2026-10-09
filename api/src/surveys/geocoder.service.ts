import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { LRUCache } from "lru-cache"
import type { SearchPlaceItem, SearchPlaceKind, SearchPlacesResponse } from "@cortege/ibp-domain"
import { appConfigOf } from "../config/app-config"
import { fetchIgnJson } from "./ign-http"

type JsonRecord = Record<string, unknown>

// The geocoder answers 400 below 3 characters and 400 or 500 above its limit (RESEARCH Pitfall 4);
// we stop earlier and answer an empty list without a call.
const MIN_QUERY_LENGTH = 3
const MAX_QUERY_LENGTH = 100
// Cache and outbound protection (D-15, T-25-14): a place answer lives 10 minutes, a commune name
// resolution 30 minutes, at most 500 entries; at most 8 calls run at once.
export const PLACES_CACHE_TTL_MS = 10 * 60 * 1000
export const COMMUNES_CACHE_TTL_MS = 30 * 60 * 1000
export const GEOCODER_CACHE_MAX_ENTRIES = 500
export const MAX_CONCURRENT_IGN_CALLS = 8
// A commune name candidate must score at least this to count (D-13).
const MIN_COMMUNE_SCORE = 0.8
const MAX_COMMUNES = 3
// Provider limit parameter bounds (the geocoder accepts 1 to 50).
const MIN_LIMIT = 1
const MAX_LIMIT = 50

const ADDRESS_KINDS: Record<string, SearchPlaceKind> = {
  municipality: "municipality",
  locality: "locality",
  street: "street",
  housenumber: "address",
}

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {}
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

/** First non-empty string of a POI field, which the provider sends as an array. */
function firstString(value: unknown): string | null {
  return Array.isArray(value) ? asString(value[0]) : null
}

function coordinatesOf(geometry: unknown): { lat: number; lng: number } | null {
  const coordinates = asRecord(geometry).coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null
  }
  const [lng, lat] = coordinates as unknown[]
  if (typeof lng !== "number" || typeof lat !== "number") {
    return null
  }
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null
  }
  return { lat, lng }
}

function scoreOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/** "Seine-et-Marne (77)" from the address context "77, Seine-et-Marne, Île-de-France". */
function departmentLabel(properties: JsonRecord): string | null {
  const parts = (asString(properties.context) ?? "").split(",").map((part) => part.trim())
  const code = parts[0] || asString(properties.depcode)
  const name = parts[1] ?? null
  if (name && code) {
    return `${name} (${code})`
  }
  return code || null
}

function mapAddress(properties: JsonRecord, position: { lat: number; lng: number }) {
  const kind = ADDRESS_KINDS[asString(properties.type) ?? ""]
  const name = asString(properties.name)
  if (!kind || !name) {
    return null
  }
  const department = departmentLabel(properties)
  const city = asString(properties.city)
  // A municipality is its own city; anything else is located by the city first.
  const context =
    kind === "municipality" || !city ? department : department ? `${city}, ${department}` : city
  return {
    id: asString(properties.id) ?? `${name}:${asString(properties.citycode) ?? ""}`,
    name,
    kind,
    context,
    score: scoreOf(properties.score),
    ...position,
  } satisfies SearchPlaceItem
}

function mapPoi(properties: JsonRecord, position: { lat: number; lng: number }) {
  const name = asString(properties.toponym) ?? firstString(properties.name)
  if (!name) {
    return null
  }
  const city = firstString(properties.city)
  const department = firstString(properties.depcode)
  const context = city && department ? `${city} (${department})` : (city ?? department)
  return {
    id:
      asString(asRecord(properties.extrafields).cleabs) ??
      `${name}:${firstString(properties.citycode) ?? ""}`,
    name,
    kind: "other",
    context,
    score: scoreOf(properties.score),
    ...position,
  } satisfies SearchPlaceItem
}

/**
 * One provider feature to a wire item (RESEARCH Pitfall 3: address properties are strings, POI
 * properties are arrays). Every field is validated; a feature without a name or finite
 * coordinates is dropped, and no raw provider object is ever forwarded (T-25-16).
 */
export function mapGeocoderFeature(feature: unknown): SearchPlaceItem | null {
  const root = asRecord(feature)
  const position = coordinatesOf(root.geometry)
  if (!position) {
    return null
  }
  const properties = asRecord(root.properties)
  switch (properties._type) {
    case "address":
      return mapAddress(properties, position)
    case "poi":
      return mapPoi(properties, position)
    default:
      return null
  }
}

/** Trim, collapse spaces and drop leading punctuation; null when the length is out of range. */
function normalizeQuery(raw: string): string | null {
  const query = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, "")
  return query.length >= MIN_QUERY_LENGTH && query.length <= MAX_QUERY_LENGTH ? query : null
}

/** The cache key form of a query: accents and case removed (a server-side fold). */
function foldQuery(query: string): string {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export type GeocoderCommune = { code: string; name: string }

function featuresOf(payload: unknown): unknown[] {
  const features = asRecord(payload).features
  return Array.isArray(features) ? features : []
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: "search_provider_unavailable",
    message: "Place search provider unavailable",
  })
}

/**
 * Place and address search through the IGN Geoplateforme geocoder (D-08, D-12), called only by
 * our API. The URL, the timeout and the on/off switch (CADASTRE_PROVIDER) come from the cadastre
 * configuration; no other host exists in the code (D-09).
 */
@Injectable()
export class GeocoderService {
  private readonly logger = new Logger(GeocoderService.name)
  private readonly enabled: boolean
  private readonly searchUrl: string
  private readonly timeoutMs: number
  // Successful answers only: a failure is never stored. An empty answer is a valid one.
  private readonly cache = new LRUCache<string, object>({ max: GEOCODER_CACHE_MAX_ENTRIES })
  // Identical concurrent queries share one outbound call.
  private readonly inFlight = new Map<string, Promise<unknown>>()
  private running = 0

  constructor(config: ConfigService) {
    const cadastre = appConfigOf(config).cadastre
    this.enabled = cadastre.provider === "ign"
    this.searchUrl = cadastre.searchUrl
    this.timeoutMs = cadastre.timeoutMs
  }

  /** Places and addresses matching `rawQuery`, at most `limit`, in provider order. */
  async searchPlaces(rawQuery: string, limit: number): Promise<SearchPlacesResponse> {
    const query = normalizeQuery(rawQuery)
    if (!this.enabled || query === null) {
      return { items: [] }
    }
    const size = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, Math.floor(limit)))
    const key = `places|${size}|${foldQuery(query)}`
    return await this.shared(key, PLACES_CACHE_TTL_MS, async () => {
      const payload = await this.callProvider(query, { index: "address,poi", limit: String(size) })
      return { items: this.toPlaces(payload, size) }
    })
  }

  /**
   * INSEE codes of the communes a typed name may mean, best first, at most 3 (D-13). Used by the
   * parcel search to turn "Fontainebleau AB 123" into a commune code.
   */
  async resolveCommunes(name: string): Promise<GeocoderCommune[]> {
    const query = normalizeQuery(name)
    if (!this.enabled || query === null) {
      return []
    }
    const key = `communes|${foldQuery(query)}`
    return await this.shared(key, COMMUNES_CACHE_TTL_MS, async () => {
      const payload = await this.callProvider(query, {
        index: "address",
        type: "municipality",
        limit: String(MAX_COMMUNES),
      })
      return this.toCommunes(payload)
    })
  }

  /** Cache hit, else the call already running for this key, else a new call (then cached). */
  private shared<T extends object>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    if (cached !== undefined) {
      return Promise.resolve(cached as T)
    }
    const running = this.inFlight.get(key)
    if (running) {
      return running as Promise<T>
    }
    const call = load()
      .then((value) => {
        this.cache.set(key, value, { ttl: ttlMs })
        return value
      })
      .finally(() => {
        this.inFlight.delete(key)
      })
    this.inFlight.set(key, call)
    return call
  }

  /**
   * One IGN geocoder call, counted against the concurrency cap. Any failure, the cap included, is
   * logged without the query and becomes a 503.
   */
  private async callProvider(query: string, params: Record<string, string>): Promise<unknown> {
    if (this.running >= MAX_CONCURRENT_IGN_CALLS) {
      this.logger.warn("IGN geocoder failed: concurrent call cap reached")
      throw unavailable()
    }
    // The base comes from config; the text is one encoded q value (T-25-13).
    const url = new URL(this.searchUrl)
    url.searchParams.set("q", query)
    for (const [name, value] of Object.entries(params)) {
      url.searchParams.set(name, value)
    }
    this.running += 1
    try {
      return await fetchIgnJson(url, { timeoutMs: this.timeoutMs, label: "geocoder" })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      this.logger.warn(`IGN geocoder failed: ${detail}`)
      throw unavailable()
    } finally {
      this.running -= 1
    }
  }

  private toCommunes(payload: unknown): GeocoderCommune[] {
    const communes: GeocoderCommune[] = []
    for (const feature of featuresOf(payload)) {
      const properties = asRecord(asRecord(feature).properties)
      const code = asString(properties.citycode)
      const name = asString(properties.name)
      if (!code || !name || scoreOf(properties.score) < MIN_COMMUNE_SCORE) {
        continue
      }
      if (!communes.some((commune) => commune.code === code)) {
        communes.push({ code, name })
      }
    }
    return communes.slice(0, MAX_COMMUNES)
  }

  private toPlaces(payload: unknown, limit: number): SearchPlaceItem[] {
    const items: SearchPlaceItem[] = []
    const poiPositions = new Map<string, number>()
    for (const feature of featuresOf(payload)) {
      const item = mapGeocoderFeature(feature)
      if (!item) {
        continue
      }
      if (item.kind === "other") {
        // One POI per commune it crosses: keep the best score for a name and city code.
        const key = `${item.name}|${firstString(asRecord(asRecord(feature).properties).citycode)}`
        const seen = poiPositions.get(key)
        if (seen !== undefined) {
          if (item.score > items[seen].score) {
            items[seen] = item
          }
          continue
        }
        poiPositions.set(key, items.length)
      }
      items.push(item)
    }
    return items.slice(0, limit)
  }
}
