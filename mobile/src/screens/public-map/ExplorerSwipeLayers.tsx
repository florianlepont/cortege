import { useMemo, type ReactNode } from "react"
import type { PublicParcelStatusItem } from "../../app/types"
import { fr } from "../../i18n"
import { layerEntry } from "../../map/layers"
import type { BaseLayerKey } from "../../map/layers"
import { BasemapSwipeOverlay } from "./BasemapSwipeOverlay"
import { CompareGrabber, grabberCenterY } from "./CompareGrabber"
import { CompareLine } from "./CompareLine"
import { CompareSideTag } from "./CompareSideTag"
import { ImmersiveWindow } from "./ImmersiveWindow"
import { MapContentLayers, shownParcelsFor } from "./MapContentLayers"
import { QuitComparePill } from "./QuitComparePill"
import { SwipeSurface } from "./SwipeSurface"
import { swipeLabel } from "./swipe-labels"
import { WipeLayer } from "./WipeLayer"
import type { ExplorerSwipe, StackedMapView } from "./useExplorerSwipe"
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
  /** Distance of the swipe hint from the bottom edge: just above the tab bar. */
  hintBottom: number
  /** The Explorer map: it sits in the receding window with the stacked maps and the line. */
  children?: ReactNode
}

/** The short name of a layer on a tag and in the grabber's value ("Plan", "Photos 1950"). */
function shortName(key: BaseLayerKey): string {
  return fr.mapLayers.layers[layerEntry(key).i18nKey as ShortTextKey].short
}

/**
 * Everything of the swipe mode and the comparison that is drawn, in z-order (UI-SPEC sections 3 to
 * 5). In the receding window (3c, swipe mode only): the Explorer map, the second stacked map
 * (stable key, so a wipe released in the middle becomes the curtain without reloading a tile), the
 * third one, and the line, grabber and side tags while comparing. Above the window, in screen
 * coordinates: the gesture surface while the swipe mode is on (it maps its touches onto the window,
 * see `useBasemapSwipe`), the top stack of the swipe mode and the quit pill of the comparison. The
 * two modes never coexist. It renders only; `useExplorerSwipe` owns the state and the haptics.
 */
export function ExplorerSwipeLayers({
  swipe,
  layers,
  contentProps,
  capsuleTop,
  hintBottom,
  children,
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
          bare={view.swipeMode}
        />
      )
    }
  }
  const { controller } = view
  // A stacked map (the second one, or the third one of a side change), kept under a stable key.
  function stackedMap(
    key: string,
    map: StackedMapView,
    which: "second" | "third",
    onRevealed: () => void,
  ) {
    return (
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
        onReady={() => swipe.onStackedReady(which)}
        onRevealed={onRevealed}
        onStyleFailed={() => actions.styleFailed(map.layer)}
      />
    )
  }
  const leftName = view.leftLayer ? shortName(view.leftLayer) : ""
  const rightName = view.rightLayer ? shortName(view.rightLayer) : ""
  // One side tag: the short name on the tag, the long name and the era for a screen reader.
  function sideTag(side: "left" | "right", layer: BaseLayerKey) {
    const { name: label, era } = swipeLabel(layer)
    return (
      <CompareSideTag
        side={side}
        name={shortName(layer)}
        label={label}
        era={era}
        lineX={view.lineX}
        width={view.width}
        centerY={grabberCenterY(view.height)}
        unavailable={!layers.isAvailable(layer)}
        canStep={view.canStep(side)}
        disabled={view.lineDragging}
        onStep={(direction) => view.onStep(side, direction)}
      />
    )
  }
  return (
    <>
      <ImmersiveWindow
        progress={swipe.immersive.window}
        applied={swipe.immersive.applied}
        target={swipe.immersive.target}
      >
        {children}
        {view.second
          ? stackedMap("second-map", view.second, "second", swipe.onSecondStyleLoaded)
          : null}
        {view.third ? stackedMap("third-map", view.third, "third", swipe.onThirdReady) : null}
        {view.comparing && view.leftLayer && view.rightLayer ? (
          <>
            <CompareLine lineX={view.lineX} top={capsuleTop} />
            <CompareGrabber
              lineX={view.lineX}
              width={view.width}
              height={view.height}
              leftName={leftName}
              rightName={rightName}
              onExitZone={view.onExitZone}
              onEdgeExit={view.onEdgeExit}
              onDragging={view.onLineDragging}
            />
            {sideTag("left", view.leftLayer)}
            {sideTag("right", view.rightLayer)}
          </>
        ) : null}
      </ImmersiveWindow>
      {view.swipeMode ? <SwipeSurface gesture={controller.gesture} /> : null}
      {view.swipeMode ? (
        <BasemapSwipeOverlay
          top={capsuleTop}
          hintBottom={hintBottom}
          layer={controller.indicatorLayer}
          isAvailable={layers.isAvailable}
          hintText={controller.hintText}
          fingerDown={controller.fingerDown}
          introHintVisible={controller.introHintVisible}
          compareAvailable={controller.compareAvailable}
          onDone={controller.done}
          onNext={controller.next}
          onPrevious={controller.previous}
          onCompareNext={controller.compareNext}
        />
      ) : null}
      {swipe.quitPillVisible ? (
        <QuitComparePill bottom={hintBottom} onQuit={swipe.quit} hint={view.quitHint} />
      ) : null}
    </>
  )
}
