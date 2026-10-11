import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { AccessibilityInfo, useWindowDimensions, type NativeSyntheticEvent } from "react-native"
import type { SharedValue } from "react-native-reanimated"
import type { CameraRef, ViewStateChangeEvent } from "@maplibre/maplibre-react-native"
import type { MapRegion } from "../../app/map-viewport"
import { fr } from "../../i18n"
import { neighbourLayer, skippedCount } from "../../map/layer-cycle"
import type { BaseLayerKey } from "../../map/layers"
import { useLatestCallback } from "../../state/useLatestCallback"
import { feedback } from "../../ui/feedback"
import { useScreenFocus } from "../../ui/useScreenFocus"
import type { MapCanvasProps } from "./MapCanvas"
import { MAP_PILL_HEIGHT } from "./MapChips"
import { useMapSync } from "./MapStack"
import {
  COMPARISON_BUILT,
  LEFT_MAP_ANDROID_VIEW,
  SIDE_WIPE,
  WIPE_PRESENTATION,
} from "./map-stack-mode"
import { swipeLabel } from "./swipe-labels"
import { useBasemapSwipe, type BasemapSwipe } from "./useBasemapSwipe"
import { useCurtainClip, type CurtainPhase } from "./useCurtainClip"
import type { ExplorerLayers } from "./useExplorerLayers"
import type { MapLayers } from "./useMapLayersState"
import { useTransientFlag } from "./useTransientFlag"

// The swipe mode and the comparison of the Explorer (Phase 28, UI-SPEC sections 3 and 4): one
// lifecycle hook above the controller (`useBasemapSwipe`, which owns every zone, hint and zone
// haptic), the curtain clip (`useCurtainClip`) and the stacked maps. It plays only the haptics of
// the UI-SPEC "other actions" row, calls only the `layers.actions` signatures of the layers state,
// and decides which stacked maps are mounted, with which layer and strip.

/** How long the "surveys are hidden" pill stays after a comparison starts (UI-SPEC section 4). */
const HIDDEN_PILL_MS = 4000
/** A stacked map that covers a style swap is dropped after this long even if no load is reported. */
const COVER_MAX_MS = 8000
/** The gap between the top control and the notices column (UI-SPEC section 8). */
const NOTICES_GAP = 8
/** The swipe stack's height before it has been measured: indicator, dots, "Terminé" and gaps. */
const SWIPE_STACK_ESTIMATE = 100

const announce = (text: string) => AccessibilityInfo.announceForAccessibility(text)

/**
 * A stacked map kept over a style swap of the map under it, so no blank frame shows:
 * - `full`: a full-width wipe committed a base; the Explorer map is loading it.
 * - `side`: a side wipe committed that side's layer (`wait` says which map draws that side).
 * - `keep`: a comparison ended keeping the layer the second map draws.
 */
type Cover =
  | { kind: "full"; layer: BaseLayerKey; wait: "base" }
  | { kind: "side"; layer: BaseLayerKey; side: "left" | "right"; wait: "base" | "second" }
  | { kind: "keep"; layer: BaseLayerKey; wait: "base" }

type Wipe = NonNullable<BasemapSwipe["wipe"]>

export type StackedMapView = {
  layer: BaseLayerKey
  clipLeft: SharedValue<number>
  clipRight: SharedValue<number>
  cameraRef: RefObject<CameraRef | null>
}

/** Everything `ExplorerSwipeLayers` needs, so the screen holds one element for the whole feature. */
export type ExplorerSwipeView = {
  width: number
  height: number
  initialRegion: MapRegion
  /** The second map: the wipe's incoming layer, the curtain's second side, or a cover. */
  second: StackedMapView | null
  /** The third map, mounted only for a side wipe (or its cover). */
  third: StackedMapView | null
  swipeMode: boolean
  comparing: boolean
  /** The controller's outputs for the gesture surface and the top stack, passed as they are. */
  controller: Pick<
    BasemapSwipe,
    | "gesture"
    | "hintText"
    | "fingerDown"
    | "indicatorLayer"
    | "introHintVisible"
    | "compareAvailable"
    | "next"
    | "previous"
    | "compareNext"
    | "done"
  >
  /** The line's x (UI-thread value shared by the handle and the tags). */
  lineX: SharedValue<number>
  /** The layers on each side of the line, null without a comparison. */
  leftLayer: BaseLayerKey | null
  rightLayer: BaseLayerKey | null
  onMoveLine: (x: number) => void
  onEdgeExit: (keeps: "A" | "B") => void
  onSideAction: (side: "left" | "right", direction: 1 | -1) => void
  onTopControlHeight: (height: number) => void
}

export type ExplorerSwipe = {
  /** Props to spread on `MapCanvas`. */
  mapCanvasProps: Pick<
    MapCanvasProps,
    "frozen" | "onViewChange" | "rotationLocked" | "hideMarkers" | "androidView"
  >
  layersView: ExplorerSwipeView
  /** "Quitter la comparaison" shows: a comparison and the map free. */
  quitPillVisible: boolean
  /** The 4 s pill: the surveys are hidden while comparing. */
  hiddenSurveys: boolean
  /** The "N fonds non téléchargés sont ignorés" pill (entry of the swipe mode). */
  skippedVisible: boolean
  /** The notices column's top, below the swipe stack or the quit pill when one holds the top. */
  noticesTop: number
  /** The Explorer map finished loading a style: a cover over it can go. */
  onBaseStyleLoaded: () => void
  /** The second map finished loading a style (a side wipe cover can go). */
  onSecondStyleLoaded: () => void
  /** A panel (the bubble or the card) opened: the swipe mode ends, a comparison stays. */
  onPanelOpen: () => void
  /** The globe: closes the panels, then enters or leaves the swipe mode. */
  toggleSwipe: () => void
  /** "Quitter la comparaison": the line slides to the right edge, then side A stays. */
  quit: () => void
}

export type ExplorerSwipeInput = {
  /**
   * What the Explorer derives from the layers state: the layers state itself, the availability
   * at the view centre, the capsule's top and the notices column's own top.
   */
  layers: ExplorerLayers
  /** The Explorer map's camera, reset to north up and flat when a stacked map needs the same view. */
  cameraRef: RefObject<CameraRef | null>
  region: MapRegion
  /** Closes the bubble and the download card (entering the swipe mode). */
  closePanels: () => void
}

/** The cover a finished wipe leaves behind, or null when it cancelled or changed nothing. */
function coverAfter(wipe: Wipe, layers: MapLayers): Cover | null {
  if (wipe.side === "full") {
    const committed = layers.state.compare === null && layers.state.loadingBase === wipe.incoming
    return committed ? { kind: "full", layer: wipe.incoming, wait: "base" } : null
  }
  if (layers.layerOfSide(wipe.side) !== wipe.incoming) return null
  const wait = layers.state.compare?.secondSide === wipe.side ? "second" : "base"
  return { kind: "side", layer: wipe.incoming, side: wipe.side, wait }
}

export function useExplorerSwipe({
  layers: explorerLayers,
  cameraRef,
  region,
  closePanels,
}: ExplorerSwipeInput): ExplorerSwipe {
  // The stacked maps and the curtain cover the window: the map area is the whole screen.
  const { width, height } = useWindowDimensions()
  const { layers, isAvailable, capsuleTop, noticesTop: baseNoticesTop } = explorerLayers
  const { actions, state } = layers
  const swipeMode = state.swipeMode
  const compare = COMPARISON_BUILT ? state.compare : null
  const comparing = compare !== null

  const controller = useBasemapSwipe({
    layers,
    width,
    isAvailable,
    skippedCount: skippedCount(isAvailable),
  })
  const { wipe } = controller

  const [cover, setCover] = useState<Cover | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [topHeight, setTopHeight] = useState<number | null>(null)
  const [hiddenNonce, setHiddenNonce] = useState<number | null>(null)

  // A finished wipe may leave a cover (derived while rendering, so the stacked map is never
  // unmounted for a frame between the wipe and its cover). A new comparison drops every cover; the
  // end of one drops the slide that was under way.
  const [seen, setSeen] = useState({ wipe, comparing })
  if (seen.wipe !== wipe || seen.comparing !== comparing) {
    setSeen({ wipe, comparing })
    if (seen.comparing !== comparing) {
      if (comparing) setCover(null)
      else setLeaving(false)
    } else if (seen.wipe !== null && wipe === null) {
      const next = coverAfter(seen.wipe, layers)
      if (next) setCover(next)
    }
  }

  // The layers the stacked maps draw. A wipe takes the second map (full) or the third (side); a
  // comparison keeps the second map the wipe used; a cover keeps one over the style swap of the
  // map under it. A cover is valid only while what it covers is still true.
  const fullWipeLayer =
    wipe !== null && wipe.side === "full" && WIPE_PRESENTATION === "wipe" && !comparing
      ? wipe.incoming
      : null
  const sideWipeLayer =
    wipe !== null && wipe.side !== "full" && SIDE_WIPE === "wipe" && comparing
      ? wipe.incoming
      : null
  const fullCoverLayer =
    cover?.kind === "full" && !comparing && state.loadingBase === cover.layer ? cover.layer : null
  const sideCoverLayer =
    cover?.kind === "side" && comparing && layers.layerOfSide(cover.side) === cover.layer
      ? cover.layer
      : null
  const keepLayer = cover?.kind === "keep" && !comparing ? cover.layer : null

  // The curtain: the line follows the state; the quit slide and the keep cover come from here.
  const handleLeft = useLatestCallback(() => {
    setLeaving(false)
    if (compare?.secondSide === "left")
      setCover({ kind: "keep", layer: compare.sideA, wait: "base" })
    layers.actions.quitCompare("A")
  })
  const phase: CurtainPhase = leaving ? "leaving" : keepLayer !== null ? "covering" : "active"
  const curtain = useCurtainClip({ compare, width, phase, leaveTo: "right", onLeft: handleLeft })

  const secondSync = useMapSync()
  const thirdSync = useMapSync()
  const secondLayer = comparing
    ? layers.secondMapLayer
    : (fullWipeLayer ?? fullCoverLayer ?? keepLayer)
  // The wipe and its cover are cut by the controller's strip; the curtain and its keep cover by the line.
  const secondStrip = comparing || keepLayer !== null ? curtain : controller
  const thirdLayer = sideWipeLayer ?? sideCoverLayer
  const second: StackedMapView | null = secondLayer
    ? { layer: secondLayer, ...strip(secondStrip), cameraRef: secondSync.cameraRef }
    : null
  const third: StackedMapView | null = thirdLayer
    ? { layer: thirdLayer, ...strip(controller), cameraRef: thirdSync.cameraRef }
    : null
  const stacked = second !== null || third !== null

  const onViewChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      secondSync.syncFrom(event)
      thirdSync.syncFrom(event)
    },
    [secondSync, thirdSync],
  )

  // The stacked maps are north up and flat, so the Explorer map is too whenever one of them has to
  // match it: when the swipe mode starts (a wipe) and when a comparison starts.
  const regionRef = useRef(region)
  regionRef.current = region
  const northUp = useCallback(() => {
    const { latitude, longitude } = regionRef.current
    cameraRef.current?.jumpTo({ center: [longitude, latitude], bearing: 0, pitch: 0 })
  }, [cameraRef])
  useEffect(() => {
    if (swipeMode) northUp()
  }, [swipeMode, northUp])
  useEffect(() => {
    if (!comparing) return
    northUp()
    setHiddenNonce((nonce) => (nonce ?? 0) + 1)
  }, [comparing, northUp])
  const hiddenSurveys = useTransientFlag(hiddenNonce, HIDDEN_PILL_MS) && comparing

  // A cover is dropped when the map under it has loaded, or after a while if it never says so.
  useEffect(() => {
    if (cover === null) return undefined
    const timer = setTimeout(() => setCover(null), COVER_MAX_MS)
    return () => clearTimeout(timer)
  }, [cover])
  const onBaseStyleLoaded = useCallback(
    () => setCover((current) => (current?.wait === "base" ? null : current)),
    [],
  )
  const onSecondStyleLoaded = useCallback(
    () => setCover((current) => (current?.wait === "second" ? null : current)),
    [],
  )

  // Leaving the Explorer tab ends the swipe mode (a comparison stays).
  const focused = useScreenFocus()
  useEffect(() => {
    if (!focused) actions.exitSwipe()
  }, [focused, actions])
  const onPanelOpen = useLatestCallback(() => actions.exitSwipe())
  const toggleSwipe = useLatestCallback(() => {
    closePanels()
    actions.toggleSwipe()
  })

  // The actions of the curtain. The haptic is the UI-SPEC "other actions" tick, once each.
  const quit = useLatestCallback(() => {
    if (!compare) return
    feedback.selection()
    setLeaving(true)
  })
  const onMoveLine = useLatestCallback((x: number) => actions.moveLine(x))
  const onEdgeExit = useLatestCallback((keeps: "A" | "B") => {
    if (!compare) return
    feedback.selection()
    const keepsSecond = (keeps === "A") === (compare.secondSide === "left")
    if (keepsSecond) {
      const layer = keeps === "A" ? compare.sideA : compare.sideB
      setCover({ kind: "keep", layer, wait: "base" })
    }
    actions.quitCompare(keeps)
  })
  const onSideAction = useLatestCallback((side: "left" | "right", direction: 1 | -1) => {
    const other = layers.layerOfSide(side === "left" ? "right" : "left")
    const target = neighbourLayer(layers.layerOfSide(side), direction, {
      isAvailable,
      exclude: other,
    })
    if (target === null) return
    feedback.selection()
    actions.setSide(side === "left" ? "A" : "B", target)
    announce(fr.mapLayers.basemap.announceChanged(swipeLabel(target)))
  })

  const quitPillVisible = comparing && !swipeMode
  const topHeld = swipeMode || quitPillVisible
  const heldHeight = swipeMode ? (topHeight ?? SWIPE_STACK_ESTIMATE) : MAP_PILL_HEIGHT
  const noticesTop = topHeld
    ? Math.max(baseNoticesTop, capsuleTop + heldHeight + NOTICES_GAP)
    : baseNoticesTop

  const mapCanvasProps = useMemo<ExplorerSwipe["mapCanvasProps"]>(
    () => ({
      frozen: swipeMode,
      onViewChange: stacked ? onViewChange : undefined,
      rotationLocked: comparing,
      hideMarkers: comparing,
      androidView: LEFT_MAP_ANDROID_VIEW,
    }),
    [comparing, onViewChange, stacked, swipeMode],
  )

  const layersView: ExplorerSwipeView = {
    width,
    height,
    initialRegion: region,
    second,
    third,
    swipeMode,
    comparing,
    controller,
    lineX: curtain.lineX,
    leftLayer: comparing ? layers.layerOfSide("left") : null,
    rightLayer: comparing ? layers.layerOfSide("right") : null,
    onMoveLine,
    onEdgeExit,
    onSideAction,
    onTopControlHeight: setTopHeight,
  }

  return {
    mapCanvasProps,
    layersView,
    quitPillVisible,
    hiddenSurveys,
    skippedVisible: controller.skippedVisible,
    noticesTop,
    onBaseStyleLoaded,
    onSecondStyleLoaded,
    onPanelOpen,
    toggleSwipe,
    quit,
  }
}

function strip(source: { clipLeft: SharedValue<number>; clipRight: SharedValue<number> }) {
  return { clipLeft: source.clipLeft, clipRight: source.clipRight }
}
