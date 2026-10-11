import { useReducer } from "react"
import type { BasemapKey } from "../../map/basemaps"
import type { BaseLayerKey, MapLayerKey } from "../../map/layers"
import type { ParcelsMode } from "../../map/parcels-visibility"
import { useStableActions } from "../../state/useLatestCallback"
import {
  INITIAL_MAP_LAYERS_STATE,
  displayedBase,
  globeDot,
  isSavedKind,
  layerOfSide,
  mapLayersReducer,
  overlayDot,
  secondMapLayer,
  secondSideFor,
  shownBases,
} from "./map-layers-state"
import type { MapLayersState } from "./map-layers-state"

/**
 * The only signatures the Explorer plans call (through `layers.actions`). The object keeps its
 * identity across renders.
 */
export type MapLayersActions = {
  enterSwipe: () => void
  exitSwipe: () => void
  toggleSwipe: () => void
  /** A base committed by the swipe; Plan and Satellite are also the saved preference. */
  commitBase: (key: BaseLayerKey) => void
  /** The second map's side is derived: the side whose layer the Explorer map does not show. */
  startCompare: (compare: { sideA: BaseLayerKey; sideB: BaseLayerKey; x: number }) => void
  setSide: (side: "A" | "B", key: BaseLayerKey) => void
  moveLine: (x: number) => void
  /** Ends the comparison; the kept side becomes the base (and the saved preference when it can). */
  quitCompare: (keep: "A" | "B") => void
  toggleOverlay: () => void
  setParcels: (mode: ParcelsMode) => void
  styleLoaded: () => void
  styleFailed: (layer: MapLayerKey) => void
}

export type MapLayers = {
  state: MapLayersState
  displayedBase: BaseLayerKey
  secondMapLayer: BaseLayerKey | null
  shownBases: BaseLayerKey[]
  globeDot: boolean
  overlayDot: boolean
  layerOfSide: (side: "left" | "right") => BaseLayerKey
  actions: MapLayersActions
}

/**
 * The Explorer's layers state (UI-SPEC "Scope of the contract"). A committed Plan or Satellite, or
 * a comparison quit on one of them, is written through `saveBasemap` (the `map_basemap`
 * preference, T-28-22: an old base never reaches it); a side change never writes. Everything else
 * is session-only.
 */
export function useMapLayersState({
  savedBasemap,
  saveBasemap,
}: {
  savedBasemap: BasemapKey
  saveBasemap: (basemap: BasemapKey) => void
}): MapLayers {
  const [state, dispatch] = useReducer(mapLayersReducer, INITIAL_MAP_LAYERS_STATE)
  const displayed = displayedBase(state, savedBasemap)

  const actions = useStableActions<MapLayersActions>({
    enterSwipe: () => dispatch({ type: "enterSwipe" }),
    exitSwipe: () => dispatch({ type: "exitSwipe" }),
    toggleSwipe: () => dispatch({ type: "toggleSwipe" }),
    commitBase: (key) => {
      dispatch({ type: "commitBase", key })
      if (isSavedKind(key)) saveBasemap(key)
    },
    startCompare: ({ sideA, sideB, x }) =>
      dispatch({
        type: "startCompare",
        sideA,
        sideB,
        x,
        secondSide: secondSideFor(sideA, sideB, displayed),
      }),
    setSide: (side, key) => dispatch({ type: "setSide", side, key }),
    moveLine: (x) => dispatch({ type: "moveLine", x }),
    quitCompare: (keep) => {
      if (!state.compare) return
      const kept = keep === "A" ? state.compare.sideA : state.compare.sideB
      dispatch({ type: "quitCompare", keep })
      if (isSavedKind(kept)) saveBasemap(kept)
    },
    toggleOverlay: () => dispatch({ type: "toggleOverlay" }),
    setParcels: (mode) => dispatch({ type: "setParcels", mode }),
    styleLoaded: () => dispatch({ type: "styleLoaded" }),
    styleFailed: (layer) => dispatch({ type: "styleFailed", layer }),
  })

  return {
    state,
    displayedBase: displayed,
    secondMapLayer: secondMapLayer(state),
    shownBases: shownBases(state, savedBasemap),
    globeDot: globeDot(state, savedBasemap),
    overlayDot: overlayDot(state),
    layerOfSide: (side) => layerOfSide(state, savedBasemap, side),
    actions,
  }
}
