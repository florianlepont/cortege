import {
  OfflineManager,
  type OfflinePack,
  type OfflinePackStatus,
} from "@maplibre/maplibre-react-native"
import { LAYER_CATALOGUE, isMapLayerKey } from "./layers"
import type { MapLayerKey } from "./layers"
import { writeOfflineStyle } from "./offline-styles"
import type { LatLngBounds } from "./tile-math"

/** Highest zoom stored offline (the owner-validated cap: size and IGN fair use). */
export const OFFLINE_MAX_ZOOM = 17
export const OFFLINE_MIN_ZOOM = 13

export type PackMetadata = { areaId: string; layer: MapLayerKey }

/**
 * Pitfall 3 of the research: the native downloader frees a request slot only for a 404, any other
 * tile error can leave a pack "active" at 99 %. A pack that reports no new resource for this long
 * is ended by the watchdog.
 */
export const STALL_TIMEOUT_MS = 45_000

/** A stalled pack at or above this percentage is accepted (with its pause), below it fails. */
export const STALL_ACCEPT_PERCENT = 90

/** The layer a pack holds, from its metadata: the two exact shapes, anything else is ignored. */
function packLayer(metadata: unknown): { areaId: string; layer: MapLayerKey } | null {
  const record = metadata as Record<string, unknown> | null
  if (typeof record?.areaId !== "string") return null
  if (isMapLayerKey(record.layer)) return { areaId: record.areaId, layer: record.layer }
  // Packs of earlier builds carry `basemap`: still listed, so they are deleted with their area
  // and no orphan pack stays on the phone. No migration (prod data is test data).
  if (record.basemap === "map" || record.basemap === "satellite") {
    return { areaId: record.areaId, layer: record.basemap }
  }
  return null
}

/**
 * The style a native pack is created from. iOS reads the composite style file. MapLibre Native on
 * Android only accepts an http(s) style for a pack (it rejects `file://` and inline JSON, so the
 * download stayed at 0 %: device check F-3): there the API publishes the same composite style.
 */
export function packStyleFor(
  os: string,
  apiUrl: string,
  layer: MapLayerKey,
  styleFileUri: string,
): string {
  return os === "android" ? `${apiUrl.replace(/\/+$/, "")}/map-styles/${layer}.json` : styleFileUri
}

async function packsOfArea(areaId: string): Promise<OfflinePack[]> {
  const packs = await OfflineManager.getPacks()
  return packs.filter((pack) => packLayer(pack.metadata)?.areaId === areaId)
}

export async function deleteAreaPacks(areaId: string): Promise<void> {
  for (const pack of await packsOfArea(areaId)) {
    await OfflineManager.deletePack(pack.id)
  }
}

/** Area ids that still own at least one native pack (for reconciling the local list). */
export async function listPackAreaIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  for (const pack of await OfflineManager.getPacks()) {
    const found = packLayer(pack.metadata)
    if (found) ids.add(found.areaId)
  }
  return ids
}

/** The layers each area owns a pack for (packs of earlier builds count as their basemap). */
export async function listAreaLayers(): Promise<Map<string, Set<MapLayerKey>>> {
  const areas = new Map<string, Set<MapLayerKey>>()
  for (const pack of await OfflineManager.getPacks()) {
    const found = packLayer(pack.metadata)
    if (!found) continue
    const layers = areas.get(found.areaId) ?? new Set<MapLayerKey>()
    layers.add(found.layer)
    areas.set(found.areaId, layers)
  }
  return areas
}

/**
 * Percentage of an area from its layers: `weight` is the estimated bytes of a layer, `percentage`
 * its progress (finished packs 100, the running pack its native percentage, the rest 0). Layers
 * differ by a factor of 100 in size, so an equal mean would be meaningless. No weight gives 0.
 */
export function weightedPercentage(entries: { weight: number; percentage: number }[]): number {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (total === 0) return 0
  return entries.reduce((sum, entry) => sum + entry.weight * entry.percentage, 0) / total
}

export type AreaPackProgress = {
  /** 0 to 100, weighted by the estimated bytes of each layer. */
  percentage: number
  completedTileCount: number
  /** The layer being downloaded (the last one once the area is done), null without layers. */
  currentLayer: MapLayerKey | null
  complete: boolean
}

export type LayerPackOutcome = "complete" | "accepted" | "failed"

export type AreaPacksResult = {
  percentage: number
  layers: { key: MapLayerKey; outcome: LayerPackOutcome; completedResourceSize: number }[]
  /** Extra layers that failed or stalled: deleted, the area is still complete. */
  failedLayers: MapLayerKey[]
  /** Sum of the real size of the finished packs. */
  totalBytes: number
}

type PackRun = {
  outcome: LayerPackOutcome
  pack: OfflinePack
  completedResourceSize: number
  error: string
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * Creates one native pack and settles when it is complete, stopped or stalled. A reported error is
 * remembered but not fatal (the downloader goes on after a missing sprite or tile, found on the
 * phone: the IGN "Gris" style has no @2x sprite); only a pack that goes inactive after it was
 * active without completing fails. The watchdog restarts whenever the completed resource count
 * grows.
 */
function runPack(
  options: Parameters<typeof OfflineManager.createPack>[0],
  onStatus: (status: OfflinePackStatus) => void,
): Promise<PackRun> {
  return new Promise<PackRun>((resolve, reject) => {
    let settled = false
    let started = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastError = ""
    let lastPercentage = 0
    let lastSize = 0
    let lastCount = -1

    const finish = (pack: OfflinePack, outcome: LayerPackOutcome, error = ""): void => {
      settled = true
      clearTimeout(timer)
      resolve({ outcome, pack, completedResourceSize: lastSize, error })
    }
    const watch = (pack: OfflinePack): void => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (lastPercentage >= STALL_ACCEPT_PERCENT) {
          void pack.pause().catch(() => undefined)
          finish(pack, "accepted")
        } else {
          finish(pack, "failed", "offline pack stalled before it was complete")
        }
      }, STALL_TIMEOUT_MS)
    }

    OfflineManager.createPack(
      options,
      (pack, status) => {
        if (settled) return
        lastPercentage = status.percentage
        lastSize = status.completedResourceSize
        if (status.state === "active") started = true
        if (status.completedResourceCount > lastCount) {
          lastCount = status.completedResourceCount
          watch(pack)
        }
        if (status.state === "inactive" && started) {
          finish(pack, "failed", lastError || "offline pack stopped before it was complete")
          return
        }
        onStatus(status)
        if (status.state === "complete") finish(pack, "complete")
      },
      (_pack, error) => {
        lastError = error.message
      },
    ).then((pack) => {
      if (!settled && lastCount < 0) watch(pack)
    }, reject)
  })
}

/**
 * Downloads an area as one native pack per layer, one after the other (fair use of the IGN servers:
 * each pack already opens up to 20 requests), in the order given: the Plan first, it carries the
 * cadastre, glyphs and sprite. The two base layers are required: one that fails rejects. An extra
 * layer is best effort: one that fails or stalls is deleted and listed in `failedLayers`, the area
 * still completes (research Pitfall 4: an older API answers 404 for the new Android styles). The
 * progress is weighted by `weight` (estimated bytes), a failed extra counts as done.
 */
export async function downloadAreaLayerPacks(input: {
  documentDirectory: string
  /** `Platform.OS`, passed in so this module never loads react-native. */
  os: string
  /** API base URL (`.../v1`), the source of the pack styles on Android. */
  apiUrl: string
  areaId: string
  bounds: LatLngBounds
  layers: { key: MapLayerKey; weight: number }[]
  minZoom?: number
  maxZoom?: number
  onProgress: (progress: AreaPackProgress) => void
}): Promise<AreaPacksResult> {
  const { areaId, bounds, layers, onProgress } = input
  const states = layers.map(() => ({ percentage: 0, tiles: 0 }))
  const snapshot = (currentLayer: MapLayerKey | null, complete: boolean): AreaPackProgress => ({
    percentage: weightedPercentage(
      layers.map((layer, index) => ({
        weight: layer.weight,
        percentage: states[index].percentage,
      })),
    ),
    completedTileCount: states.reduce((sum, state) => sum + state.tiles, 0),
    currentLayer,
    complete,
  })

  const results: AreaPacksResult["layers"] = []
  const failedLayers: MapLayerKey[] = []

  for (let index = 0; index < layers.length; index += 1) {
    const { key } = layers[index]
    const isBase = LAYER_CATALOGUE[key].tier === "base"
    let run: PackRun | null
    try {
      const styleFileUri = await writeOfflineStyle(input.documentDirectory, key)
      run = await runPack(
        {
          mapStyle: packStyleFor(input.os, input.apiUrl, key, styleFileUri),
          bounds: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat],
          minZoom: input.minZoom ?? OFFLINE_MIN_ZOOM,
          maxZoom: input.maxZoom ?? OFFLINE_MAX_ZOOM,
          metadata: { areaId, layer: key } satisfies PackMetadata,
        },
        (status) => {
          states[index] = { percentage: status.percentage, tiles: status.completedTileCount }
          onProgress(snapshot(key, false))
        },
      )
    } catch (error) {
      if (isBase) throw toError(error)
      run = null
    }

    if (run !== null && run.outcome !== "failed") {
      states[index] = { percentage: 100, tiles: states[index].tiles }
      results.push({ key, outcome: run.outcome, completedResourceSize: run.completedResourceSize })
      continue
    }
    if (isBase) throw new Error((run as PackRun).error)
    // A failed extra never fails the area: its pack is deleted and the layer is listed.
    if (run !== null) await OfflineManager.deletePack(run.pack.id).catch(() => undefined)
    states[index] = { percentage: 100, tiles: 0 }
    failedLayers.push(key)
    results.push({ key, outcome: "failed", completedResourceSize: 0 })
  }

  const final = snapshot(layers.length > 0 ? layers[layers.length - 1].key : null, true)
  onProgress(final)
  return {
    percentage: final.percentage,
    layers: results,
    failedLayers,
    totalBytes: results.reduce((sum, result) => sum + result.completedResourceSize, 0),
  }
}
