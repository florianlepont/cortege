import { BadRequestException } from "@nestjs/common"
import {
  IBP_METHOD_V3_2,
  isSameMethodVersion,
  resolveMethodVersion,
  type IbpMethodFields,
} from "@cortege/ibp-domain"
import { SurveyPatchBody, SurveyRow, SurveyUpsertBody } from "./surveys.types"

export function normalizeSurveyStatusFilter(status?: string): SurveyRow["status"] | null {
  if (!status || typeof status !== "string") {
    return null
  }

  const normalized = status.trim().toLowerCase()
  if (
    normalized === "draft" ||
    normalized === "submitted" ||
    normalized === "synced" ||
    normalized === "error"
  ) {
    return normalized
  }

  return null
}

export function getSubmittedReadOnlyFields(body: SurveyPatchBody): string[] {
  const readonlyFields: Array<keyof SurveyPatchBody> = [
    "site_name",
    "parcel_id",
    "parcel_ids",
    "observation_year",
    "version_number",
    "previous_survey_id",
    "region_version",
    "vegetation_stage",
    "ibp_method_version",
    "ibp_cas",
    "ibp_cas3_scale",
    "factors",
    "scores",
  ]

  return readonlyFields.filter((field) => Object.prototype.hasOwnProperty.call(body, field))
}

/** The station columns a survey row stores (migration 016 plus the v3.0 region and stage). */
export type SurveyMethodColumns = {
  ibp_method_version: string | null
  ibp_cas: number | null
  ibp_cas3_scale: boolean | null
  region_version: string | null
  vegetation_stage: string | null
}

type SurveyMethodInput = IbpMethodFields & {
  region_version?: string | null
  vegetation_stage?: string | null
}

type StoredSurveyMethod = Pick<SurveyRow, keyof SurveyMethodColumns>

function isV32(version: unknown): boolean {
  return resolveMethodVersion(version) === IBP_METHOD_V3_2
}

/**
 * The station columns a write stores, and the context the IBP rules run with (phase 01.8,
 * RESEARCH §4.2 rules 1-2).
 * - The effective method is the body's tag, else the stored row's tag; neither means v3.0. An
 *   absent or null body field keeps the stored value, so an untagged edit of a v3.2 draft stays
 *   v3.2 and an untagged row is never stamped (its tag stays NULL).
 * - v3.2 stores no region/stage; v3.0 stores no cas and no cas-3 flag (D-08 amended). Computing
 *   the final values here lets a write clear a field, which `body.x ?? existing.x` never can.
 */
export function resolveSurveyMethodColumns(
  body: SurveyMethodInput,
  existing: StoredSurveyMethod | null,
): SurveyMethodColumns {
  const version = body.ibp_method_version ?? existing?.ibp_method_version ?? null
  if (isV32(version)) {
    return {
      ibp_method_version: version,
      ibp_cas: body.ibp_cas ?? existing?.ibp_cas ?? null,
      ibp_cas3_scale: body.ibp_cas3_scale ?? existing?.ibp_cas3_scale ?? null,
      region_version: null,
      vegetation_stage: null,
    }
  }
  return {
    ibp_method_version: version,
    ibp_cas: null,
    ibp_cas3_scale: null,
    region_version: body.region_version ?? existing?.region_version ?? null,
    vegetation_stage: body.vegetation_stage ?? existing?.vegetation_stage ?? null,
  }
}

/** Two column sets that give the IBP rules the same context. */
export function sameSurveyMethodColumns(a: SurveyMethodColumns, b: SurveyMethodColumns): boolean {
  return (
    a.ibp_method_version === b.ibp_method_version &&
    a.ibp_cas === b.ibp_cas &&
    a.ibp_cas3_scale === b.ibp_cas3_scale &&
    a.region_version === b.region_version &&
    a.vegetation_stage === b.vegetation_stage
  )
}

function jsonDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false
    }
    return a.every((item, index) => jsonDeepEqual(item, b[index]))
  }

  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null

  if (isPlainObject(a) || isPlainObject(b)) {
    if (!isPlainObject(a) || !isPlainObject(b)) {
      return false
    }
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) {
      return false
    }
    return aKeys.every((key) => jsonDeepEqual(a[key], b[key]))
  }

  return false
}

function parcelIdSetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const setA = new Set(a)
  const setB = new Set(b)
  if (setA.size !== setB.size) {
    return false
  }
  for (const value of setA) {
    if (!setB.has(value)) {
      return false
    }
  }
  return true
}

/**
 * Value comparison of the read-only fields of a submitted survey, for the
 * upsert path (D-04, D-13). Unlike getSubmittedReadOnlyFields (key-presence
 * check used by PATCH), this reports a field only when its (normalized)
 * value actually differs from what is stored. Absent/undefined/null fields
 * on `body` are treated as "unchanged" and never reported. `scores` is
 * excluded: it is recomputed server-side and must never block a resync.
 *
 * The method fields (phase 01.8) are compared after the write normalisation of
 * resolveSurveyMethodColumns (Pattern 3): the method version through
 * isSameMethodVersion, so the explicit v3.0 tag replayed for a NULL row is
 * unchanged; the cas fields only under v3.2 and region/stage only under v3.0,
 * because the other method's fields are never stored. A missing cas-3 flag
 * equals false.
 */
export function getChangedSubmittedReadOnlyFields(
  body: SurveyUpsertBody,
  existing: SurveyRow,
  existingParcelIds: string[],
): string[] {
  const readonlyFields: Array<Exclude<keyof SurveyPatchBody, "scores">> = [
    "site_name",
    "parcel_id",
    "parcel_ids",
    "observation_year",
    "version_number",
    "previous_survey_id",
    "region_version",
    "vegetation_stage",
    "factors",
  ]

  const changed: string[] = []
  const effectiveV32 = isV32(body.ibp_method_version ?? existing.ibp_method_version)

  for (const field of readonlyFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      continue
    }
    const bodyValue = (body as Record<string, unknown>)[field]
    if (bodyValue === undefined || bodyValue === null) {
      continue
    }

    switch (field) {
      case "site_name": {
        if (bodyValue !== existing.site_name) {
          changed.push(field)
        }
        break
      }
      case "parcel_id": {
        if (normalizeParcelId(bodyValue) !== normalizeParcelId(existing.parcel_id)) {
          changed.push(field)
        }
        break
      }
      case "parcel_ids": {
        const bodyParcelIds = normalizeParcelIds(bodyValue)
        const baselineParcelIds =
          existingParcelIds.length > 0
            ? existingParcelIds
            : existing.parcel_id
              ? [existing.parcel_id]
              : []
        if (!parcelIdSetEqual(bodyParcelIds, normalizeParcelIds(baselineParcelIds))) {
          changed.push(field)
        }
        break
      }
      case "observation_year": {
        if (normalizeObservationYear(bodyValue) !== existing.observation_year) {
          changed.push(field)
        }
        break
      }
      case "version_number": {
        if (normalizeVersionNumber(bodyValue) !== existing.version_number) {
          changed.push(field)
        }
        break
      }
      case "previous_survey_id": {
        if (normalizePreviousSurveyId(bodyValue) !== existing.previous_survey_id) {
          changed.push(field)
        }
        break
      }
      case "region_version": {
        if (!effectiveV32 && bodyValue !== existing.region_version) {
          changed.push(field)
        }
        break
      }
      case "vegetation_stage": {
        if (!effectiveV32 && bodyValue !== existing.vegetation_stage) {
          changed.push(field)
        }
        break
      }
      case "factors": {
        if (!jsonDeepEqual(bodyValue, existing.factors ?? {})) {
          changed.push(field)
        }
        break
      }
      default:
        break
    }
  }

  if (
    body.ibp_method_version !== undefined &&
    body.ibp_method_version !== null &&
    !isSameMethodVersion(body.ibp_method_version, existing.ibp_method_version)
  ) {
    changed.push("ibp_method_version")
  }
  if (effectiveV32) {
    if (body.ibp_cas !== undefined && body.ibp_cas !== null && body.ibp_cas !== existing.ibp_cas) {
      changed.push("ibp_cas")
    }
    if (
      body.ibp_cas3_scale !== undefined &&
      body.ibp_cas3_scale !== null &&
      body.ibp_cas3_scale !== (existing.ibp_cas3_scale ?? false)
    ) {
      changed.push("ibp_cas3_scale")
    }
  }

  return changed
}

export type SameVersionContent = "identical" | "visibility_only" | "conflict"

/**
 * Classify an upsert that carries the sync_version the server already stored
 * (D-04, D-16 amended 2026-09-25).
 *
 * - "conflict": a read-only field differs by value. Racing writers on the same
 *   version must not overwrite each other silently, so the caller answers 409.
 * - "visibility_only": only visibility differs. Visibility is last-writer-wins,
 *   like the version-less visibility_update action: installed apps rewrite a
 *   pending upsert's visibility without bumping sync_version, so a retry after
 *   a lost response must be applied, not blocked.
 * - "identical": an idempotent replay.
 *
 * The comparison is by value and computed on the fly (no stored hash): JSONB
 * reorders object keys, so hashing raw JSON would report false conflicts.
 * scores, status and expires_at are excluded, and absent or null body fields
 * are never treated as changes.
 */
export function classifySameVersionContent(
  body: SurveyUpsertBody,
  existing: SurveyRow,
  existingParcelIds: string[],
): SameVersionContent {
  if (getChangedSubmittedReadOnlyFields(body, existing, existingParcelIds).length > 0) {
    return "conflict"
  }
  if ((body.visibility ?? existing.visibility) !== existing.visibility) {
    return "visibility_only"
  }
  return "identical"
}

export function normalizeParcelId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim().toUpperCase()
  return normalized.length > 0 ? normalized : null
}

export function normalizeParcelIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const normalized: string[] = []
  for (const candidate of value) {
    const parcelId = normalizeParcelId(candidate)
    if (!parcelId || seen.has(parcelId)) {
      continue
    }
    seen.add(parcelId)
    normalized.push(parcelId)
  }
  return normalized
}

export function normalizeObservationYear(value: unknown): number | null {
  const parsed = toFiniteNumber(value)
  if (parsed === null) {
    return null
  }
  const integer = Math.trunc(parsed)
  if (integer < 1900 || integer > 2200) {
    return null
  }
  return integer
}

export function normalizeVersionNumber(value: unknown): number | null {
  const parsed = toFiniteNumber(value)
  if (parsed === null) {
    return null
  }
  const integer = Math.trunc(parsed)
  return integer >= 1 ? integer : null
}

export function normalizePreviousSurveyId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function normalizeCentroid(
  value: Record<string, unknown>,
): { lat: number; lng: number } | null {
  const lat = toFiniteNumber(value.lat)
  const lng = toFiniteNumber(value.lng)
  if (lat === null || lng === null) {
    return null
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  }
}

// The IGN parcel identifier (IDU) the app sends for a parcel picked on the map: commune 5 digits,
// absorbed-commune prefix 3, section 2 (a leading zero for one-letter sections, "0A"; two digits
// for a numbered section in Alsace-Moselle, "09"), number 4.
const IDU_PATTERN = /^(\d{5})\d{3}([0-9A-Z]{2})(\d{4})$/

/**
 * Commune, section and number of an IGN parcel identifier (IDU), or null when the id is not one
 * (or its section is "00"). The one reading of an IDU, shared by the registration of a parcel by
 * id, the IGN features the Explorer draws and the API Carto lookup.
 */
export function parseParcelIdu(
  parcelId: string,
): { communeCode: string; section: string; number: string } | null {
  const idu = IDU_PATTERN.exec(parcelId.trim().toUpperCase())
  const section = idu ? normalizeParcelSection(idu[2]) : null
  return idu && section ? { communeCode: idu[1], section, number: idu[3] } : null
}

/**
 * Commune, section and number of a parcel id, in the form the IGN WFS features are keyed by
 * (`parseWfsFeatures`: section through normalizeParcelSection, number on 4 digits), so the public
 * parcel statuses match a parcel registered by id to the IGN polygon drawn for it (12.2-19). An
 * IDU gives its own commune (the arrondissement in Paris, Lyon and Marseille) and its section,
 * lettered or numbered (Alsace-Moselle "09"). The legacy short form ("75104AE3") only knows
 * lettered sections. Unknown forms get the placeholder "00000"/"AA"/"0000".
 */
export function parseParcelIdentifier(parcelId: string): {
  communeCode: string
  section: string
  number: string
} {
  const normalized = parcelId.trim().toUpperCase()
  const idu = parseParcelIdu(normalized)
  if (idu) {
    return idu
  }
  const match = /^(\d{5})([A-Z]{1,3})(\d{1,4})$/.exec(normalized)
  if (match) {
    return {
      communeCode: match[1],
      section: match[2].padEnd(2, "A").slice(0, 3),
      number: match[3].padStart(4, "0").slice(-4),
    }
  }
  return {
    communeCode: "00000",
    section: "AA",
    number: "0000",
  }
}

export function normalizeParcelHistoryLimit(limitRaw?: string): number {
  const parsed = toFiniteNumber(limitRaw)
  if (parsed === null) {
    return 20
  }
  const integer = Math.trunc(parsed)
  if (integer <= 0) {
    return 20
  }
  return Math.min(100, integer)
}

export function parseBbox(
  raw?: string,
): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
  if (!raw || raw.trim().length === 0) {
    return null
  }

  const parts = raw.split(",").map((part) => part.trim())
  if (parts.length !== 4) {
    throw new BadRequestException("bbox must contain exactly 4 comma-separated numbers")
  }

  const minLng = toFiniteNumber(parts[0])
  const minLat = toFiniteNumber(parts[1])
  const maxLng = toFiniteNumber(parts[2])
  const maxLat = toFiniteNumber(parts[3])
  if (minLng === null || minLat === null || maxLng === null || maxLat === null) {
    throw new BadRequestException("bbox contains invalid coordinate values")
  }
  if (minLng >= maxLng || minLat >= maxLat) {
    throw new BadRequestException("bbox bounds are invalid")
  }

  return { minLng, minLat, maxLng, maxLat }
}

export function buildFallbackParcelGeometry(centroid: {
  lat: number
  lng: number
}): Record<string, unknown> {
  // Approximate 20m square used when true cadastre geometry is unavailable.
  const halfLat = 0.00009
  const halfLng = 0.00013
  const minLat = Math.max(-90, centroid.lat - halfLat)
  const maxLat = Math.min(90, centroid.lat + halfLat)
  const minLng = Math.max(-180, centroid.lng - halfLng)
  const maxLng = Math.min(180, centroid.lng + halfLng)

  return {
    type: "Polygon",
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  }
}

export function normalizeParcelPartToDigits(value: unknown, width: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }
  const digits = String(value)
    .trim()
    .replace(/[^0-9]/g, "")
  if (digits.length === 0) {
    return null
  }
  return digits.padStart(width, "0").slice(-width)
}

/**
 * A cadastral section in the one form shared by the parcels the app registers and the IGN
 * polygons it draws (the Explorer key, `buildParcelKey`):
 * - a section with a letter keeps its letters only ("0A" becomes "A", "AB" stays "AB");
 * - a numbered section, as in Alsace-Moselle ("09"), keeps its two digits ("9" becomes "09").
 *   Letters-only and digits-only forms never collide. An all-zero section ("00") is not one.
 */
export function normalizeParcelSection(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }
  const upper = String(value).trim().toUpperCase()
  const letters = upper.replace(/[^A-Z]/g, "")
  if (letters.length > 0) {
    return letters.slice(0, 3)
  }
  const digits = upper.replace(/[^0-9]/g, "")
  if (digits.length === 0 || /^0+$/.test(digits)) {
    return null
  }
  return digits.padStart(2, "0").slice(-2)
}

/**
 * The section as API Carto expects it: always two characters ("A" is asked as "0A"; "AB" and a
 * numbered "09" as they are).
 */
export function apiCartoSection(section: string): string {
  return section.length === 1 ? `0${section}` : section
}

// Paris, Lyon and Marseille: the IGN cadastre numbers their parcels by arrondissement. The IDU and
// the parcel's commune key carry the arrondissement code (75112, 69381, 13201), while code_insee
// of the WFS and API Carto is the city's (75056, 69123, 13055), with the arrondissement in
// code_arr. Sections and numbers restart in every arrondissement, so the key keeps the
// arrondissement code: the city code would make parcels of two arrondissements collide.
const ARRONDISSEMENT_CITIES: Array<{ city: string; first: number; last: number }> = [
  { city: "75056", first: 75101, last: 75120 },
  { city: "69123", first: 69381, last: 69389 },
  { city: "13055", first: 13201, last: 13216 },
]

/**
 * The city of an arrondissement commune code and the arrondissement's code_arr ("75112" gives
 * 75056 and 112), or null for any other commune.
 */
export function arrondissementCity(communeCode: string): { city: string; codeArr: string } | null {
  if (!/^\d{5}$/.test(communeCode)) return null
  const code = Number(communeCode)
  const found = ARRONDISSEMENT_CITIES.find((entry) => code >= entry.first && code <= entry.last)
  return found ? { city: found.city, codeArr: communeCode.slice(2) } : null
}

/**
 * The commune key of an IGN feature (WFS, API Carto) from its properties: the commune of its IDU
 * when it has one (an arrondissement in Paris, Lyon and Marseille), else code_dep + code_arr for
 * an arrondissement, else code_insee.
 */
export function featureCommuneCode(properties: Record<string, unknown>): string | null {
  const idu = typeof properties.idu === "string" ? properties.idu.trim().toUpperCase() : ""
  const iduMatch = IDU_PATTERN.exec(idu)
  if (iduMatch) return iduMatch[1]
  const department = typeof properties.code_dep === "string" ? properties.code_dep.trim() : ""
  const codeArr = typeof properties.code_arr === "string" ? properties.code_arr.trim() : ""
  if (/^\d{2}$/.test(department) && /^\d{3}$/.test(codeArr) && codeArr !== "000") {
    const candidate = `${department}${codeArr}`
    if (arrondissementCity(candidate)) return candidate
  }
  return normalizeParcelPartToDigits(properties.code_insee, 5)
}

export function buildParcelKey(communeCode: string, section: string, number: string): string {
  return `${communeCode}|${section.toUpperCase()}|${number}`
}

export function normalizeChangesLimit(limitRaw?: number): number {
  if (!Number.isFinite(limitRaw)) return 50
  const integer = Math.trunc(limitRaw ?? 0)
  if (integer <= 0) return 50
  return Math.min(200, integer)
}

// Changes-feed cursor (D-01, D-12, D-13). The mobile app stores and replays the cursor without
// parsing it, so the server is free to change the format. `v2:<xid8>:<seq>` pages on the
// (xid8, seq) pair; the legacy `<created_at text>|<event or survey id>` form is still accepted
// and translated by the feed. xid8 and seq stay strings: both can exceed Number.MAX_SAFE_INTEGER.
export type SyncChangesCursor =
  | { kind: "none"; original: null }
  | { kind: "position"; xid8: string; seq: string; original: string }
  | { kind: "legacy"; timestamp: string; eventId: string; original: string }

export const SYNC_CURSOR_V2_PATTERN = /^v2:(\d{1,20}):(\d{1,19})$/
const XID8_MAX = BigInt("18446744073709551615")
const BIGINT_MAX = BigInt("9223372036854775807")

// D-12: the one strict timestamp check shared by the legacy sync cursor and the `v1:` list
// cursors (list-cursor.ts). It accepts the PostgreSQL `timestamptz::text` output that installed
// apps replay ("2026-03-09 10:20:31.991234+00") and ISO strings ("2026-03-09T10:20:31.991Z"),
// and it rejects anything the `::timestamptz` cast would refuse: impossible dates (Feb 30,
// month 13, hour 24), trailing junk, more than six fractional digits, a missing offset, year 0,
// and offsets beyond PostgreSQL's +/-15:59 limit.
const STRICT_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(\.\d{1,6})?(Z|[+-](\d{2})(?::?(\d{2}))?)$/

export function isStrictTimestamp(value: string): boolean {
  if (typeof value !== "string") return false
  const match = STRICT_TIMESTAMP_PATTERN.exec(value)
  if (!match) return false

  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number)
  if (year < 1) return false

  const offsetHours = match[9] === undefined ? 0 : Number(match[9])
  const offsetMinutes = match[10] === undefined ? 0 : Number(match[10])
  if (offsetHours > 15 || offsetMinutes > 59) return false

  // Round-trip the wall-clock components: the UTC setters normalise overflow (Feb 30 becomes
  // Mar 1, hour 24 becomes the next day), so any component that changes means the input named an
  // impossible instant. setUTCFullYear, unlike Date.UTC, keeps years 1..99 literal.
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second)
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  )
}

export function parseSyncChangesCursor(cursor?: string): SyncChangesCursor {
  if (!cursor || cursor.trim().length === 0) {
    return { kind: "none", original: null }
  }

  const position = SYNC_CURSOR_V2_PATTERN.exec(cursor)
  if (position) {
    // Out-of-range values would make the `::xid8` / `::bigint` casts fail with a 500.
    if (BigInt(position[1]) > XID8_MAX || BigInt(position[2]) > BIGINT_MAX) {
      throw new BadRequestException("Invalid sync cursor")
    }
    return { kind: "position", xid8: position[1], seq: position[2], original: cursor }
  }
  if (cursor.startsWith("v2:")) {
    throw new BadRequestException("Invalid sync cursor")
  }

  // Every legacy cursor was built as `${timestamptz}|${id}`. The timestamp half goes through the
  // strict validator (D-12) because it is later cast with `::timestamptz`: a looser check let
  // "2024-02-30T00:00:00Z|x" through and the cast raised 22008, answering 500.
  const [timestampRaw, eventIdRaw] = cursor.split("|")
  if (eventIdRaw === undefined || !timestampRaw || !isStrictTimestamp(timestampRaw)) {
    throw new BadRequestException("Invalid sync cursor")
  }

  return { kind: "legacy", timestamp: timestampRaw, eventId: eventIdRaw ?? "", original: cursor }
}

export function buildSyncChangesCursor(xid8: string, seq: string): string {
  return `v2:${xid8}:${seq}`
}

export function extractAttachmentId(payload: Record<string, unknown> | null): string | null {
  if (!payload || typeof payload !== "object") {
    return null
  }
  const value = (payload as { attachment_id?: unknown }).attachment_id
  if (typeof value !== "string" || value.trim().length === 0) {
    return null
  }
  return value
}
