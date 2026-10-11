// What each state of the Parcelles control draws (UI-SPEC "Color", U-11), and the old-base rules
// for the parcel fill and casing. Pure: type-only imports.
//
// - "all" (Toutes): today's rendering, cadastre lines and every polygon.
// - "withIbp" (Avec IBP): no cadastre lines, only the polygons of parcels with an IBP survey.
// - "none" (Aucune): neither, and the parcels are not tappable (markers and clusters still are).
// A parcel focus coming from the search carries the `selected` feature property and is drawn in
// every state, so a result never lands on an empty map.

import type { FilterSpecification } from "@maplibre/maplibre-react-native"
import type { PublicParcelStatusItem } from "../app/types"
import { OLD_BASE_KEYS } from "./layers"
import type { BaseLayerKey } from "./layers"

export type ParcelsMode = "all" | "withIbp" | "none"

/** The control's order. */
export const PARCELS_MODES: readonly ParcelsMode[] = ["all", "withIbp", "none"]

export type ParcelsRendering = {
  /** Whether the cadastre raster lines are mounted. */
  cadastre: boolean
  /** The filter of the parcel fill and outline layers, null to draw every polygon. */
  polygonFilter: FilterSpecification | null
  /** Whether a parcel polygon answers a tap. */
  tappable: boolean
}

const SELECTED: FilterSpecification = ["==", ["get", "selected"], true]
const WITH_SURVEY: FilterSpecification = [
  "any",
  ["==", ["get", "hasSurvey"], true],
  ["==", ["get", "selected"], true],
]

export function parcelsRendering(mode: ParcelsMode): ParcelsRendering {
  if (mode === "all") return { cadastre: true, polygonFilter: null, tappable: true }
  if (mode === "withIbp") return { cadastre: false, polygonFilter: WITH_SURVEY, tappable: true }
  return { cadastre: false, polygonFilter: SELECTED, tappable: false }
}

const normaliseId = (id: string) => id.trim().toUpperCase()

/**
 * Whether the parcel has at least one IBP survey: the Explorer data says it is studied, or the
 * author has a survey of their own on it (drafts included, UI-SPEC open item 7). The ids of the
 * set are trimmed and upper case, as `parcel-features.ts` compares them.
 */
export function hasIbpSurvey(
  item: Pick<PublicParcelStatusItem, "parcel_id" | "study_status">,
  surveyParcelIds: ReadonlySet<string>,
): boolean {
  return item.study_status === "studied" || surveyParcelIds.has(normaliseId(item.parcel_id))
}

/** The three old bases: washed out under today's fill and a white casing. */
export function isOldBase(base: BaseLayerKey): boolean {
  return OLD_BASE_KEYS.includes(base)
}

/** The factor applied to the parcel fill alpha: `factor` on the old bases, 1 elsewhere. */
export function parcelFillFactor(base: BaseLayerKey, factor: number): number {
  return isOldBase(base) ? factor : 1
}

/** The casing under the parcel outline: on the old bases and with the Types de forêt overlay. */
export function parcelCasingVisible(base: BaseLayerKey, forestOverlay: boolean): boolean {
  return isOldBase(base) || forestOverlay
}
