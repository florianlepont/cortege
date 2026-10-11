import { useMemo } from "react"
import type { PublicParcelStatusItem } from "../../app/types"
import { fr } from "../../i18n"
import { layerEntry } from "../../map/layers"
import type { BaseLayerKey } from "../../map/layers"
import { BasemapSwipeOverlay } from "./BasemapSwipeOverlay"
import { CurtainHandle, knobCenterY } from "./CurtainHandle"
import { CurtainSideTags } from "./CurtainSideTags"
import { MapContentLayers, shownParcelsFor } from "./MapContentLayers"
import { QuitComparePill } from "./QuitComparePill"
import { SwipeSurface } from "./SwipeSurface"
import { WipeLayer } from "./WipeLayer"
import type { StackedMapView, ExplorerSwipe } from "./useExplorerSwipe"
import type { ExplorerLayers } from "./useExplorerLayers"

type ShortTextKey = Exclude<ReturnType<typeof layerEntry>["i18nKey"], "forestTypes">

/** What the stacked maps draw over their base, the same as the Explorer map. */
export type StackedContentProps = {
  parcelStatuses: PublicParcelStatusItem[]
  parcelLayerRenderable: boolean
  studiedParcelsRenderable: boolean
  selectedParcelIds?: string[]
  /** Bumped by a "Réessayer" and by a finished download, like the Explorer map's. */
  styleRetryKey: number
  styleRefreshKey: number
}

export type ExplorerSwipeLayersProps = {
  swipe: ExplorerSwipe
  layers: ExplorerLayers
  contentProps: StackedContentProps
  /** The top of the capsule: the top controls and the line start there. */
  capsuleTop: number
}

/** The short name of a layer on a tag and in the handle's value ("Plan", "Photos 1950"). */
function shortName(key: BaseLayerKey): string {
  return fr.mapLayers.layers[layerEntry(key).i18nKey as ShortTextKey].short
}

/**
 * Everything of the swipe mode and the comparison that is drawn, in z-order (UI-SPEC sections 3 to
 * 5): the second and third stacked maps (stable keys, so a wipe released in the middle becomes the
 * curtain without reloading a tile), the gesture surface while the swipe mode is on, the line and
 * its tags while comparing, the top stack of the swipe mode and the quit pill of a free
 * comparison. It renders only; `useExplorerSwipe` owns the state and the haptics.
 */
export function ExplorerSwipeLayers({
  swipe,
  layers,
  contentProps,
  capsuleTop,
}: ExplorerSwipeLayersProps) {
  const view = swipe.layersView
  const { actions, state } = layers.layers
  const { parcelStatuses, parcelLayerRenderable, studiedParcelsRenderable } = contentProps
  const parcels = useMemo(
    () => shownParcelsFor(parcelStatuses, parcelLayerRenderable, studiedParcelsRenderable),
    [parcelStatuses, parcelLayerRenderable, studiedParcelsRenderable],
  )
  // Called by `WipeLayer` as a plain function, once its style says where the cadastre comes from.
  function contentFor(layer: BaseLayerKey) {
    return function stackedContent(style: { cadastreInStyle: boolean; cadastreOpacity: number }) {
      return (
        <MapContentLayers
          base={layer}
          forestOverlay={state.overlay}
          parcelsMode={state.parcels}
          cadastreEnabled={parcelLayerRenderable}
          cadastreInStyle={style.cadastreInStyle}
          cadastreOpacity={style.cadastreOpacity}
          parcels={parcels}
          selectedParcelIds={contentProps.selectedParcelIds}
          surveyParcelIds={layers.surveyParcelIds}
          interactive={false}
        />
      )
    }
  }
  const stackedMap = (
    key: "second-map" | "third-map",
    map: StackedMapView,
    onStyleLoaded?: () => void,
  ) => (
    <WipeLayer
      key={key}
      layer={map.layer}
      clipLeft={map.clipLeft}
      clipRight={map.clipRight}
      width={view.width}
      initialRegion={view.initialRegion}
      cameraRef={map.cameraRef}
      content={contentFor(map.layer)}
      styleRefreshKey={contentProps.styleRefreshKey}
      styleRetryKey={contentProps.styleRetryKey}
      onStyleLoaded={onStyleLoaded}
      onStyleFailed={() => actions.styleFailed(map.layer)}
    />
  )

  const { controller } = view
  const leftName = view.leftLayer ? shortName(view.leftLayer) : ""
  const rightName = view.rightLayer ? shortName(view.rightLayer) : ""
  return (
    <>
      {view.second ? stackedMap("second-map", view.second, swipe.onSecondStyleLoaded) : null}
      {view.third ? stackedMap("third-map", view.third) : null}
      {view.swipeMode ? <SwipeSurface gesture={controller.gesture} /> : null}
      {view.comparing && view.leftLayer && view.rightLayer ? (
        <>
          <CurtainHandle
            lineX={view.lineX}
            width={view.width}
            height={view.height}
            lineTop={capsuleTop}
            leftName={leftName}
            rightName={rightName}
            onMoveLine={view.onMoveLine}
            onEdgeExit={view.onEdgeExit}
            onSideAction={view.onSideAction}
            onQuit={swipe.quit}
          />
          <CurtainSideTags
            lineX={view.lineX}
            width={view.width}
            knobTop={knobCenterY(view.height)}
            leftName={leftName}
            rightName={rightName}
            swipeMode={view.swipeMode}
            leftUnavailable={!layers.isAvailable(view.leftLayer)}
            rightUnavailable={!layers.isAvailable(view.rightLayer)}
          />
        </>
      ) : null}
      {view.swipeMode ? (
        <BasemapSwipeOverlay
          top={capsuleTop}
          layer={controller.indicatorLayer}
          comparing={view.comparing}
          isAvailable={layers.isAvailable}
          hintText={controller.hintText}
          fingerDown={controller.fingerDown}
          introHintVisible={controller.introHintVisible}
          compareAvailable={controller.compareAvailable}
          onDone={controller.done}
          onNext={controller.next}
          onPrevious={controller.previous}
          onCompareNext={controller.compareNext}
          onHeight={view.onTopControlHeight}
        />
      ) : null}
      {swipe.quitPillVisible ? <QuitComparePill top={capsuleTop} onQuit={swipe.quit} /> : null}
    </>
  )
}
