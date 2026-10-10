import { StaticMapImageManager } from "@maplibre/maplibre-react-native"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import { logStatusDetail } from "../../i18n"
import { PLAN_IGN_STYLE_URL } from "../../map/maplibre/styles"
import { offlineStyleExists, offlineStyleUri } from "../../map/offline-styles"
import {
  findReadyOfflineAreaForPoint,
  tryGetOfflineDocumentDirectory,
} from "../../storage/offline-map"
import type { MapFrame } from "./map-projection"

// D-06: the basemap of the PDF map is one native MapLibre snapshot. It is chosen before any
// snapshot is taken, from what the phone can serve: a downloaded area first, the network only when
// the phone is online, otherwise no basemap at all (the SVG outline alone). On Android the native
// snapshotter never settles its promise on an error (RESEARCH Pitfall 6), hence the timeout.

// Offline style (a pack on the phone): 8 s, so a hang on a broken pack does not cost more. Online
// style: 12 s, because a cold first snapshot took 8 s on the iOS simulator (spike of plan 25.1-07).
export const SNAPSHOT_TIMEOUT_MS = 8000
export const SNAPSHOT_TIMEOUT_ONLINE_MS = 12000
export const SNAPSHOT_JPEG_WIDTH_PX = 1100
export const SNAPSHOT_JPEG_QUALITY = 0.8

export type BasemapChoice =
  | { kind: "offline"; mapStyle: string }
  | { kind: "online"; mapStyle: string }
  | { kind: "none" }

/** The snapshot timeout of a basemap choice: 12 s for the online style, 8 s otherwise. */
export function snapshotTimeoutFor(kind: BasemapChoice["kind"] | undefined): number {
  return kind === "online" ? SNAPSHOT_TIMEOUT_ONLINE_MS : SNAPSHOT_TIMEOUT_MS
}

export type BasemapDeps = {
  isOnline: boolean
  documentDirectory: string | null
  findReadyOfflineAreaForPoint: (lat: number, lng: number) => Promise<unknown | null>
  offlineStyleExists: (
    documentDirectory: string,
    basemap: "map" | "satellite",
    dark?: boolean,
  ) => Promise<boolean>
  offlineStyleUri: (
    documentDirectory: string,
    basemap: "map" | "satellite",
    dark?: boolean,
  ) => string
  onlineStyle: string
}

/**
 * Offline pack first (the light Plan IGN style file written with the pack, which carries the
 * cadastre), then the Plan IGN style when online, then nothing. Print is always light and the
 * satellite basemap costs ink and size, so neither the dark nor the satellite file is ever chosen.
 * A lookup that throws counts as "no area".
 */
export async function decideBasemap(
  center: { lat: number; lng: number },
  deps: BasemapDeps,
): Promise<BasemapChoice> {
  const directory = deps.documentDirectory
  if (directory) {
    try {
      const area = await deps.findReadyOfflineAreaForPoint(center.lat, center.lng)
      if (area && (await deps.offlineStyleExists(directory, "map", false))) {
        return { kind: "offline", mapStyle: deps.offlineStyleUri(directory, "map", false) }
      }
    } catch (error) {
      logStatusDetail("surveyExport.snapshot", error)
    }
  }
  return deps.isOnline ? { kind: "online", mapStyle: deps.onlineStyle } : { kind: "none" }
}

export function defaultBasemapDeps(isOnline: boolean): BasemapDeps {
  return {
    isOnline,
    documentDirectory: tryGetOfflineDocumentDirectory(),
    findReadyOfflineAreaForPoint,
    offlineStyleExists,
    offlineStyleUri,
    onlineStyle: PLAN_IGN_STYLE_URL,
  }
}

type SnapshotDeps = {
  StaticMapImageManager: Pick<typeof StaticMapImageManager, "createImage">
  ImageManipulator: Pick<typeof ImageManipulator, "manipulate">
}

/**
 * One snapshot of `frame` with `mapStyle`, as a JPEG data URI (no `file://` URL reaches the print
 * HTML). Any failure, a rejection or the timeout, gives null and never throws: the export goes on
 * without a basemap.
 */
export async function takeBasemapJpeg(
  input: {
    mapStyle: string
    frame: MapFrame
    /** The kind of the basemap choice, which sets the default timeout (offline when omitted). */
    kind?: BasemapChoice["kind"]
    timeoutMs?: number
  },
  deps: SnapshotDeps = { StaticMapImageManager, ImageManipulator },
): Promise<{ dataUri: string; frame: MapFrame } | null> {
  const { mapStyle, frame } = input
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const file = await Promise.race([
      deps.StaticMapImageManager.createImage({
        mapStyle,
        center: [frame.centerLng, frame.centerLat],
        zoom: frame.zoom,
        width: frame.width,
        height: frame.height,
        output: "file",
        logo: false,
      }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), input.timeoutMs ?? snapshotTimeoutFor(input.kind))
      }),
    ])
    if (file === null) {
      logStatusDetail("surveyExport.snapshot", "timeout")
      return null
    }
    // The PNG is at device pixel ratio (up to 3x): resize to the print size and compress.
    const image = await deps.ImageManipulator.manipulate(file)
      .resize({ width: SNAPSHOT_JPEG_WIDTH_PX })
      .renderAsync()
    const saved = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: SNAPSHOT_JPEG_QUALITY,
      base64: true,
    })
    if (!saved.base64) {
      throw new Error("snapshot: no base64 in the saved image")
    }
    return { dataUri: `data:image/jpeg;base64,${saved.base64}`, frame }
  } catch (error) {
    logStatusDetail("surveyExport.snapshot", error)
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
