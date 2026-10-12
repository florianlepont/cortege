import * as FileSystem from "expo-file-system/legacy"
import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { rasterStyleFor } from "./layer-styles"
import type { MapLayerKey } from "./layers"
import { darkenPlanIgnStyle } from "./maplibre/dark-style"
import { CADASTRE_TILES, PLAN_IGN_STYLE_URL } from "./maplibre/styles"

/** The cadastre raster is part of the downloaded styles, so it is cached with the pack. */
export const CADASTRE_SOURCE_ID = "ign-cadastre"

/** Cadastre tiles exist from this zoom up; the packs therefore go no lower for that layer. */
export const CADASTRE_MIN_ZOOM = 15

/**
 * Adds the IGN cadastre raster (source and layer) on top of a style. Pure. `opacity` is the line
 * opacity: 0.9 by default, 0.7 on the two old maps (applied by `useMapStyle`, 28-11).
 */
export function withCadastre(style: StyleSpecification, opacity = 0.9): StyleSpecification {
  return {
    ...style,
    sources: {
      ...style.sources,
      [CADASTRE_SOURCE_ID]: {
        type: "raster",
        tiles: [CADASTRE_TILES],
        tileSize: 256,
        minzoom: CADASTRE_MIN_ZOOM,
        maxzoom: 20,
        attribution: "Source : IGN",
      },
    },
    layers: [
      ...style.layers,
      {
        id: CADASTRE_SOURCE_ID,
        type: "raster",
        source: CADASTRE_SOURCE_ID,
        paint: { "raster-opacity": opacity },
      },
    ],
  }
}

export function offlineStylesDir(documentDirectory: string): string {
  return `${documentDirectory}offline-styles/`
}

/**
 * `file://` URL of the pack style of a layer (the native pack reads it). The dark variant is the
 * legacy `map-dark.json` path, no longer written: the displayed Plan styles are
 * `offlineDisplayStyleUri`.
 */
export function offlineStyleUri(
  documentDirectory: string,
  layer: MapLayerKey,
  dark = false,
): string {
  return `${offlineStylesDir(documentDirectory)}${layer}${dark ? "-dark" : ""}.json`
}

/**
 * `file://` URL of the Plan style the map displays offline, without the cadastre (the dark one is
 * the recoloured Plan). MapLibre React Native cannot hide a layer baked into a style, so the
 * cadastre is a child layer of every displayed map (mounted for Parcelles = Toutes, 28-11); offline
 * its tiles come from the Plan pack by URL.
 */
export function offlineDisplayStyleUri(documentDirectory: string, dark: boolean): string {
  return `${offlineStylesDir(documentDirectory)}map-display${dark ? "-dark" : ""}.json`
}

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

/**
 * Writes the pack style of a layer to the document directory and returns its `file://` URL (iOS
 * creates a pack from a file URL, so every raster style is a file too; the offline display of the
 * rasters is built inline by `useMapStyle`, 28-11). The Plan IGN vector style is fetched (online),
 * kept as published, and written with the cadastre as the pack style `map.json` (the Plan pack
 * downloads the cadastre tiles; the PDF snapshot reads it too), next to the two display styles
 * without the cadastre. Every other layer is built from the catalogue, capped for offline, with no
 * fetch and no cadastre (the satellite pack lost its duplicate cadastre: tiles are stored once by
 * URL).
 */
export async function writeOfflineStyle(
  documentDirectory: string,
  layer: MapLayerKey,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> {
  const uri = offlineStyleUri(documentDirectory, layer)
  if (layer !== "map") {
    await FileSystem.makeDirectoryAsync(offlineStylesDir(documentDirectory), {
      intermediates: true,
    })
    await FileSystem.writeAsStringAsync(
      uri,
      JSON.stringify(rasterStyleFor(layer, { offline: true })),
    )
    return uri
  }
  const response = await fetchImpl(PLAN_IGN_STYLE_URL)
  if (!response.ok) {
    throw new Error("offline-styles: the Plan IGN style could not be fetched")
  }
  const base = (await response.json()) as StyleSpecification
  await FileSystem.makeDirectoryAsync(offlineStylesDir(documentDirectory), {
    intermediates: true,
  })
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(withCadastre(base)))
  await FileSystem.writeAsStringAsync(
    offlineDisplayStyleUri(documentDirectory, false),
    JSON.stringify(base),
  )
  await FileSystem.writeAsStringAsync(
    offlineDisplayStyleUri(documentDirectory, true),
    JSON.stringify(darkenPlanIgnStyle(base)),
  )
  return uri
}

export async function offlineStyleExists(
  documentDirectory: string,
  layer: MapLayerKey,
  dark = false,
): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(offlineStyleUri(documentDirectory, layer, dark))
  return info.exists
}

/** Whether the display style of the Plan exists (an area downloaded before Phase 28 has none). */
export async function offlineDisplayStyleExists(
  documentDirectory: string,
  dark: boolean,
): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(offlineDisplayStyleUri(documentDirectory, dark))
  return info.exists
}
