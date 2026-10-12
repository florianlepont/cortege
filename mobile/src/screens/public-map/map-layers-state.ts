// The layers state of the Explorer (Phase 28, UI-SPEC "Scope of the contract"): the base the map
// shows, the Types de forêt overlay, the Parcelles mode, the comparison and the swipe mode.
//
// What persists: a committed Plan or Satellite is the saved basemap preference (`map_basemap`),
// written by `useMapLayersState`, never here (this module is pure). Everything else (the old
// bases, the overlay, Parcelles, the comparison, the swipe mode) is session-only and starts again
// at a cold start. There is no reset control: the user undoes a state in place (UI-SPEC section 2,
// last bullet).
//
// Comparison: the Explorer's own map keeps one side and a second map draws `secondSide`, so a
// comparison created by dragging right needs no style swap of the Explorer map (UI-SPEC section 4,
// "Created layers").
//
// One single comparison mode (owner feedback, CONTEXT item 13 d): the swipe mode and the comparison
// never coexist. `startCompare` ends the swipe mode in the same state change, and the swipe mode
// cannot start again until the comparison is quit.

import type { BaseLayerKey, MapLayerKey } from "../../map/layers"
import type { ParcelsMode } from "../../map/parcels-visibility"

export type CompareState = {
  sideA: BaseLayerKey
  sideB: BaseLayerKey
  /** The side drawn by the second map; the Explorer map draws the other one. */
  secondSide: "left" | "right"
  /** The line's x position, in points from the map's left edge. */
  x: number
}

export type MapLayersState = {
  /** The base chosen this session when it is not the saved one (an old base), else null. */
  baseOverride: BaseLayerKey | null
  overlay: boolean
  parcels: ParcelsMode
  compare: CompareState | null
  swipeMode: boolean
  /** The base whose style the Explorer map is still loading. */
  loadingBase: BaseLayerKey | null
  /** The layer whose style failed to load. */
  failedLayer: MapLayerKey | null
}

export type MapLayersAction =
  | { type: "enterSwipe" }
  | { type: "exitSwipe" }
  | { type: "toggleSwipe" }
  | { type: "commitBase"; key: BaseLayerKey }
  | {
      type: "startCompare"
      sideA: BaseLayerKey
      sideB: BaseLayerKey
      secondSide: "left" | "right"
      x: number
    }
  | { type: "setSide"; side: "A" | "B"; key: BaseLayerKey }
  | { type: "moveLine"; x: number }
  | { type: "quitCompare"; keep: "A" | "B" }
  | { type: "toggleOverlay" }
  | { type: "setParcels"; mode: ParcelsMode }
  | { type: "styleLoaded" }
  | { type: "styleFailed"; layer: MapLayerKey }

export const INITIAL_MAP_LAYERS_STATE: MapLayersState = {
  baseOverride: null,
  overlay: false,
  parcels: "all",
  compare: null,
  swipeMode: false,
  loadingBase: null,
  failedLayer: null,
}

/** Plan and Satellite are the two bases the saved preference can hold. */
export function isSavedKind(key: BaseLayerKey): key is "map" | "satellite" {
  return key === "map" || key === "satellite"
}

// A saved kind needs no override: the saved preference (written by the hook) is the base.
function overrideFor(key: BaseLayerKey): BaseLayerKey | null {
  return isSavedKind(key) ? null : key
}

export function mapLayersReducer(state: MapLayersState, action: MapLayersAction): MapLayersState {
  switch (action.type) {
    case "enterSwipe":
      // The swipe mode and the comparison never coexist (UI-SPEC "Scope of the contract").
      return state.compare ? state : { ...state, swipeMode: true }
    case "exitSwipe":
      return { ...state, swipeMode: false }
    case "toggleSwipe":
      return state.compare ? state : { ...state, swipeMode: !state.swipeMode }
    case "commitBase":
      return {
        ...state,
        baseOverride: overrideFor(action.key),
        loadingBase: action.key,
        failedLayer: null,
      }
    case "startCompare":
      return {
        ...state,
        swipeMode: false,
        compare: {
          sideA: action.sideA,
          sideB: action.sideB,
          secondSide: action.secondSide,
          x: action.x,
        },
      }
    case "setSide":
      if (!state.compare) return state
      return {
        ...state,
        compare:
          action.side === "A"
            ? { ...state.compare, sideA: action.key }
            : { ...state.compare, sideB: action.key },
      }
    case "moveLine":
      if (!state.compare) return state
      return { ...state, compare: { ...state.compare, x: action.x } }
    case "quitCompare": {
      if (!state.compare) return state
      const kept = action.keep === "A" ? state.compare.sideA : state.compare.sideB
      return { ...state, compare: null, baseOverride: overrideFor(kept) }
    }
    case "toggleOverlay":
      return { ...state, overlay: !state.overlay }
    case "setParcels":
      return { ...state, parcels: action.mode }
    case "styleLoaded":
      return { ...state, loadingBase: null, failedLayer: null }
    case "styleFailed":
      return { ...state, failedLayer: action.layer }
  }
}

/**
 * The side whose layer the Explorer map does not show: the one the second map must draw. The
 * Explorer map shows `displayed`; when neither side is the displayed base (not expected) the second
 * map takes the right side.
 */
export function secondSideFor(
  sideA: BaseLayerKey,
  sideB: BaseLayerKey,
  displayed: BaseLayerKey,
): "left" | "right" {
  return sideB === displayed && sideA !== displayed ? "left" : "right"
}

/** The base the Explorer map shows: during a comparison, the side the second map does not draw. */
export function displayedBase(state: MapLayersState, saved: BaseLayerKey): BaseLayerKey {
  const { compare } = state
  if (compare) return compare.secondSide === "right" ? compare.sideA : compare.sideB
  return state.baseOverride ?? saved
}

/** The layer of the second map, null without a comparison. */
export function secondMapLayer(state: MapLayersState): BaseLayerKey | null {
  const { compare } = state
  if (!compare) return null
  return compare.secondSide === "right" ? compare.sideB : compare.sideA
}

/** The base on the left or the right of the line (both are the displayed base without a comparison). */
export function layerOfSide(
  state: MapLayersState,
  saved: BaseLayerKey,
  side: "left" | "right",
): BaseLayerKey {
  const { compare } = state
  if (!compare) return displayedBase(state, saved)
  return side === "left" ? compare.sideA : compare.sideB
}

/** Every base on screen: both sides during a comparison, else the displayed one. */
export function shownBases(state: MapLayersState, saved: BaseLayerKey): BaseLayerKey[] {
  const { compare } = state
  return compare ? [compare.sideA, compare.sideB] : [displayedBase(state, saved)]
}

/** The globe's dot: the base differs from the saved one, or a comparison is on (UI-SPEC section 1). */
export function globeDot(state: MapLayersState, saved: BaseLayerKey): boolean {
  return state.compare !== null || displayedBase(state, saved) !== saved
}

/** The overlay button's dot: Types de forêt is on or Parcelles is not Toutes (UI-SPEC section 2). */
export function overlayDot(state: MapLayersState): boolean {
  return state.overlay || state.parcels !== "all"
}
