import * as FileSystem from "expo-file-system/legacy"
import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import type { BasemapKey } from "./basemaps"
import { darkenPlanIgnStyle } from "./maplibre/dark-style"
import { CADASTRE_TILES, ORTHO_STYLE, PLAN_IGN_STYLE_URL } from "./maplibre/styles"

/** The cadastre raster is part of the downloaded styles, so it is cached with the pack. */
export const CADASTRE_SOURCE_ID = "ign-cadastre"

/** Cadastre tiles exist from this zoom up; the packs therefore go no lower for that layer. */
export const CADASTRE_MIN_ZOOM = 15

/** Adds the IGN cadastre raster (source and layer) on top of a style. Pure. */
export function withCadastre(style: StyleSpecification): StyleSpecification {
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
        paint: { "raster-opacity": 0.9 },
      },
    ],
  }
}

export function offlineStylesDir(documentDirectory: string): string {
  return `${documentDirectory}offline-styles/`
}

/**
 * `file://` URL of the composite style of a basemap (the native pack and the map read it). The dark
 * variant exists for the plan basemap only: it shares the vector tiles of the light one, so one
 * pack serves both themes.
 */
export function offlineStyleUri(
  documentDirectory: string,
  basemap: BasemapKey,
  dark = false,
): string {
  return `${offlineStylesDir(documentDirectory)}${basemap}${dark ? "-dark" : ""}.json`
}

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

/**
 * Writes the composite style of a basemap (basemap + cadastre) to the document directory and
 * returns its `file://` URL. The Plan IGN vector style is fetched (online) and kept as published
 * apart from the cadastre layer; the orthophoto style is built in the app. Native offline packs take
 * a style URL, not an inline style, hence the file. For the plan basemap the dark recolouring is
 * written next to it (`map-dark.json`); the returned URL is the light one, the one the pack uses.
 */
export async function writeOfflineStyle(
  documentDirectory: string,
  basemap: BasemapKey,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> {
  let base: StyleSpecification
  if (basemap === "satellite") {
    base = ORTHO_STYLE
  } else {
    const response = await fetchImpl(PLAN_IGN_STYLE_URL)
    if (!response.ok) {
      throw new Error("offline-styles: the Plan IGN style could not be fetched")
    }
    base = (await response.json()) as StyleSpecification
  }
  await FileSystem.makeDirectoryAsync(offlineStylesDir(documentDirectory), {
    intermediates: true,
  })
  const uri = offlineStyleUri(documentDirectory, basemap)
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(withCadastre(base)))
  if (basemap === "map") {
    await FileSystem.writeAsStringAsync(
      offlineStyleUri(documentDirectory, basemap, true),
      JSON.stringify(withCadastre(darkenPlanIgnStyle(base))),
    )
  }
  return uri
}

export async function offlineStyleExists(
  documentDirectory: string,
  basemap: BasemapKey,
  dark = false,
): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(offlineStyleUri(documentDirectory, basemap, dark))
  return info.exists
}
