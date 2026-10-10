import * as Network from "expo-network"
import { Platform } from "react-native"
import { isOnlineNetworkState } from "../../hooks/survey-sync/utils"
import { logStatusDetail } from "../../i18n"
import { fetchPublicParcelStatuses } from "../../api/ibp-api"
import { isPhotoAttachment, resolveAttachmentPreview } from "../../screens/survey-screen-helpers"
import { getCachedParcelById } from "../../storage/offline-map"
import {
  loadParcelHistoryCache,
  type CachedParcelHistory,
} from "../../storage/parcel-history-cache"
import { getLocalSurveyDraft, listSurveyPhotosInCaptureOrder } from "../../storage/surveys"
import type { LocalAttachment } from "../../storage/types"
import { buildBboxAroundPoint } from "../map-viewport"
import type { PublicParcelStatusItem } from "../types"
import { loadExportAssets } from "./assets"
import {
  GEOMETRY_FETCH_TIMEOUT_MS,
  MAP_FRAME_SIZE,
  PHOTO_EXPORT_SETTINGS,
  pdfLayoutFor,
} from "./export-settings"
import {
  boundsOfRings,
  fitFrameToBounds,
  OFFLINE_ZOOM_RANGE,
  parcelPolygonsFrom,
  type MapFrame,
} from "./map-projection"
import {
  decideBasemap,
  defaultBasemapDeps,
  takeBasemapJpeg,
  type BasemapChoice,
} from "./map-snapshot"
import {
  preparePhotosForExport,
  type PhotoExportSettings,
  type PhotoSource,
  type PreparedPhoto,
} from "./photo-prep"
import type { ExportMap, PdfAssets, SurveyExportData, SurveyExportInput } from "./types"

// Phase 25.1, D-01 / D-05 / D-06 / D-10 / D-13: turns what the screen hands over into the data the
// pure builders read. Offline first: storage and the offline-area cache are read before anything
// else, the network is touched only when the phone is online, and every optional piece is bounded
// and caught on its own, so a missing piece is `null` or an empty list (the builders print a note)
// and never a failed export. The access token and the API URL stay in this file: they are not part
// of `SurveyExportData`.

/** Half-side of the box asked from the API around the survey location, in degrees (about 110 m). */
const GEOMETRY_RADIUS_DEG = 0.001
/** From zoom 15 the API answers every parcel of the view, not only the studied ones. */
const GEOMETRY_ZOOM = 16
/** Zoom of the snapshot when no parcel outline is known and only the location is. */
const LOCATION_ZOOM = 16
/** Share of the frame kept free on each side around the parcels. */
const FRAME_PADDING_RATIO = 0.12

type BasemapSnapshot = { dataUri: string; frame: MapFrame }

/** Every reader and native wrapper the loader uses, so a test runs it without storage or network. */
export type AssembleDeps = {
  platform: "ios" | "android"
  now: () => Date
  isOnline: () => Promise<boolean>
  loadDraft: (surveyId: string) => Promise<{ factors?: Record<string, unknown> } | null>
  listPhotos: (surveyId: string) => Promise<LocalAttachment[]>
  preparePhotos: (
    sources: readonly PhotoSource[],
    settings: PhotoExportSettings,
  ) => Promise<{ photos: PreparedPhoto[]; failed: number; capped: number }>
  loadAssets: () => Promise<PdfAssets>
  getCachedParcel: (parcelId: string) => Promise<PublicParcelStatusItem | null>
  fetchParcelStatuses: (
    apiUrl: string,
    accessToken: string,
    input: { bbox: string; zoom: number },
  ) => Promise<{ items: PublicParcelStatusItem[] }>
  decideBasemap: (center: { lat: number; lng: number }, isOnline: boolean) => Promise<BasemapChoice>
  takeBasemap: (input: {
    mapStyle: string
    frame: MapFrame
    kind: BasemapChoice["kind"]
  }) => Promise<BasemapSnapshot | null>
  loadHistory: (parcelId: string) => Promise<CachedParcelHistory | null>
}

export function defaultAssembleDeps(): AssembleDeps {
  return {
    platform: Platform.OS === "ios" ? "ios" : "android",
    now: () => new Date(),
    isOnline: async () => isOnlineNetworkState(await Network.getNetworkStateAsync()),
    loadDraft: getLocalSurveyDraft,
    listPhotos: listSurveyPhotosInCaptureOrder,
    preparePhotos: (sources, settings) => preparePhotosForExport(sources, settings),
    loadAssets: loadExportAssets,
    getCachedParcel: (parcelId) => getCachedParcelById<PublicParcelStatusItem>(parcelId),
    fetchParcelStatuses: fetchPublicParcelStatuses,
    decideBasemap: (center, isOnline) => decideBasemap(center, defaultBasemapDeps(isOnline)),
    takeBasemap: takeBasemapJpeg,
    loadHistory: loadParcelHistoryCache,
  }
}

type Located = { lat: number; lng: number }
type MapPiece = { coordinates: Located | null; map: ExportMap | null }
type Polygons = ExportMap["polygons"]

function logPiece(piece: string, error: unknown): void {
  logStatusDetail("surveyExport.assemble", { piece, error })
}

/** The result of `work`, or `fallback` when it throws; a failure is logged, never raised. */
async function orFallback<T>(piece: string, fallback: T, work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    logPiece(piece, error)
    return fallback
  }
}

async function loadRawFactors(
  surveyId: string,
  deps: AssembleDeps,
): Promise<Record<string, unknown>> {
  const draft = await deps.loadDraft(surveyId)
  return draft?.factors ?? {}
}

const NO_PHOTOS: SurveyExportData["photos"] = { items: [], total: 0, unavailable: 0 }

/** Photos in shooting order: the local ones are prepared, the others are counted as unavailable. */
async function loadPhotos(
  surveyId: string,
  deps: AssembleDeps,
): Promise<SurveyExportData["photos"]> {
  const attachments = (await deps.listPhotos(surveyId)).filter(isPhotoAttachment)
  const sources: PhotoSource[] = []
  for (const attachment of attachments) {
    const preview = resolveAttachmentPreview(attachment)
    if (preview.kind === "image") sources.push({ id: attachment.id, uri: preview.uri })
  }
  const notLocal = attachments.length - sources.length
  if (sources.length === 0) {
    return { items: [], total: attachments.length, unavailable: notLocal }
  }
  try {
    const prepared = await deps.preparePhotos(sources, PHOTO_EXPORT_SETTINGS)
    return {
      items: prepared.photos,
      total: attachments.length,
      unavailable: notLocal + prepared.failed,
    }
  } catch (error) {
    logPiece("photos", error)
    return { items: [], total: attachments.length, unavailable: attachments.length }
  }
}

async function loadHistory(
  parcelId: string | undefined,
  deps: AssembleDeps,
): Promise<SurveyExportData["history"]> {
  if (!parcelId) return null
  const cached = await deps.loadHistory(parcelId)
  return cached ? { fetchedAt: cached.fetched_at, items: cached.items } : null
}

/** Rejects nothing: `work` raced against a timer, null when the timer wins. */
async function boundedBy<T>(ms: number, work: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** The parcels asked of the offline-area cache; a parcel the cache cannot read counts as missing. */
async function readCachedParcels(
  parcelIds: readonly string[],
  deps: AssembleDeps,
): Promise<PublicParcelStatusItem[]> {
  const items: PublicParcelStatusItem[] = []
  for (const parcelId of parcelIds) {
    const item = await orFallback("parcel", null, () => deps.getCachedParcel(parcelId))
    if (item) items.push(item)
  }
  return items
}

/** One optional read of the parcels around the survey, only online, 4 s at most. */
async function fetchMissingParcels(
  input: SurveyExportInput,
  location: Located,
  deps: AssembleDeps,
): Promise<PublicParcelStatusItem[]> {
  const token = input.accessToken
  if (!token) return []
  const request = deps.fetchParcelStatuses(input.apiUrl, token, {
    bbox: buildBboxAroundPoint(location, GEOMETRY_RADIUS_DEG),
    zoom: GEOMETRY_ZOOM,
  })
  // A request that fails after the timer won must not surface as an unhandled rejection.
  request.catch(() => undefined)
  const answer = await boundedBy(GEOMETRY_FETCH_TIMEOUT_MS, request)
  return Array.isArray(answer?.items) ? answer.items : []
}

async function loadPolygons(
  input: SurveyExportInput,
  online: boolean,
  deps: AssembleDeps,
): Promise<Polygons> {
  const cached = await readCachedParcels(input.parcelIds, deps)
  const known = new Set(cached.map((item) => item.parcel_id.trim().toUpperCase()))
  const missing = input.parcelIds.filter((id) => !known.has(id.trim().toUpperCase()))
  let items = cached
  if (online && input.displayLocation && missing.length > 0) {
    const fetched = await orFallback("geometry", [], () =>
      fetchMissingParcels(input, input.displayLocation as Located, deps),
    )
    items = [...cached, ...fetched]
  }
  return parcelPolygonsFrom(items, input.parcelIds)
}

function frameFor(polygons: Polygons, coordinates: Located): MapFrame {
  const bounds = boundsOfRings(polygons.flatMap(({ rings }) => rings))
  if (bounds) {
    return fitFrameToBounds(bounds, MAP_FRAME_SIZE, {
      paddingRatio: FRAME_PADDING_RATIO,
      zoomRange: OFFLINE_ZOOM_RANGE,
    })
  }
  return {
    centerLng: coordinates.lng,
    centerLat: coordinates.lat,
    zoom: LOCATION_ZOOM,
    width: MAP_FRAME_SIZE.width,
    height: MAP_FRAME_SIZE.height,
  }
}

/** The snapshot of the frame, decided from what the phone can serve; null on any failure. */
async function loadBasemap(
  frame: MapFrame,
  online: boolean,
  deps: AssembleDeps,
): Promise<BasemapSnapshot | null> {
  return orFallback("basemap", null, async () => {
    const choice = await deps.decideBasemap({ lat: frame.centerLat, lng: frame.centerLng }, online)
    if (choice.kind === "none") return null
    return deps.takeBasemap({ mapStyle: choice.mapStyle, frame, kind: choice.kind })
  })
}

function centreOf(polygons: Polygons): Located | null {
  const bounds = boundsOfRings(polygons.flatMap(({ rings }) => rings))
  return bounds
    ? { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 }
    : null
}

/** Geometry first, then the snapshot of its frame; no parcel gives no map and no read at all. */
async function loadMapPiece(input: SurveyExportInput, deps: AssembleDeps): Promise<MapPiece> {
  const location = input.displayLocation
  if (input.parcelIds.length === 0) return { coordinates: location, map: null }
  const online = await orFallback("network", false, deps.isOnline)
  const polygons = await loadPolygons(input, online, deps)
  const coordinates = location ?? centreOf(polygons)
  if (!coordinates) return { coordinates: null, map: null }
  const basemap = await loadBasemap(frameFor(polygons, coordinates), online, deps)
  return { coordinates, map: { polygons, basemap, frameSize: { ...MAP_FRAME_SIZE } } }
}

/**
 * Everything the PDF builders read, gathered offline first. It resolves whatever fails: a piece
 * that cannot be read is `{}`, `null`, an empty list or no font, and the builders print a note.
 * The photo branch, the map branch (geometry then snapshot) and the history and asset reads run in
 * parallel. Online, the only network reads are the optional parcel outline (4 s) and the optional
 * basemap snapshot (8 s offline style, 12 s online style).
 */
export async function assembleSurveyExportData(
  input: SurveyExportInput,
  deps: AssembleDeps = defaultAssembleDeps(),
): Promise<SurveyExportData> {
  const [rawFactors, photos, mapPiece, history, assets] = await Promise.all([
    orFallback("factors", {}, () => loadRawFactors(input.surveyId, deps)),
    orFallback("photos", NO_PHOTOS, () => loadPhotos(input.surveyId, deps)),
    orFallback<MapPiece>("map", { coordinates: input.displayLocation, map: null }, () =>
      loadMapPiece(input, deps),
    ),
    orFallback("history", null, () => loadHistory(input.parcelIds[0], deps)),
    orFallback<PdfAssets>("assets", { fonts: [], logoDataUri: null }, deps.loadAssets),
  ])
  // Field by field: the access token and the API URL never reach the builders.
  return {
    surveyId: input.surveyId,
    siteName: input.siteName,
    parcelIds: input.parcelIds,
    observationYear: input.observationYear,
    versionNumber: input.versionNumber,
    dateIso: input.dateIso,
    isDraft: input.isDraft,
    observerName: input.observerName,
    method: input.method,
    scores: input.scores,
    factorEntries: input.factorEntries,
    generatedAtIso: deps.now().toISOString(),
    coordinates: mapPiece.coordinates,
    rawFactors,
    photos,
    map: mapPiece.map,
    history,
    assets,
    layout: pdfLayoutFor(deps.platform),
  }
}
