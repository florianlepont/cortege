import { useCallback, useMemo, useRef, useState } from "react"
import { Alert, View, useWindowDimensions } from "react-native"
import type { CameraRef } from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { MapRegion } from "../app/map-viewport"
import { isOfflineMapsEnabled, swipeSpikeLeftView } from "../app/feature-flags"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { useBrandTheme } from "../app/theme"
import type { PublicMapItem, PublicParcelStatusItem } from "../app/types"
import { DownloadEdgeGlow } from "../navigation/download-edge-glow"
import type { PublicMapFocus } from "../navigation/types"
import type { LoadPublicMapOptions } from "../hooks/usePublicMapExplorer"
import { fr } from "../i18n"
import type { BasemapKey } from "../map/basemaps"
import { boundsFromRegion } from "../map/maplibre/regions"
import { useOfflineAreas } from "../hooks/useOfflineAreas"
import { useLatestCallback } from "../state/useLatestCallback"
import { defaultAreaName } from "./public-map/area-name"
import { ClusterListSheet } from "./public-map/ClusterListSheet"
import { ExplorerPanelsView } from "./public-map/ExplorerPanelsView"
import { ExplorerSheet } from "./public-map/ExplorerSheet"
import { MapCanvas } from "./public-map/MapCanvas"
import { MapBottomDock, MapTopControls } from "./public-map/MapControls"
import { useAreaDownloadAction } from "./public-map/useAreaDownloadAction"
import { ScoreLegend } from "./public-map/ScoreLegend"
import { createScreenContainerStyle } from "./public-map/styles"
import { useExplorerFocus } from "./public-map/useExplorerFocus"
import { useExplorerLayers } from "./public-map/useExplorerLayers"
import { useExplorerPanels } from "./public-map/useExplorerPanels"
import { useMapViewport } from "./public-map/useMapViewport"
import { useSwipeSpike } from "./public-map/useSwipeSpike"

const t = fr.publicMap
const LOCATE_SPAN = 0.012
const NO_DRAFTS: PublicMapItem[] = []
const NO_SURVEY_PARCELS: ReadonlySet<string> = new Set()
const noop = () => undefined
// The card sits one margin above the tab bar (UI-SPEC section 6); the locate arrow above the card.
const CARD_MARGIN = 14
const DOCK_GAP = 10
// A second tap within this window (a double tap, or a tap during the push) opens nothing more.
const OPEN_SURVEY_GUARD_MS = 800

type PublicMapScreenProps = {
  apiUrl: string
  accessToken: string | null
  items: PublicMapItem[]
  parcelStatuses: PublicParcelStatusItem[]
  /** OA-59: the author's drafts, drawn beside the public surveys and visible to them alone. */
  draftItems?: PublicMapItem[]
  /**
   * D-01: the author's own non-draft surveys from local data (not already returned by the API),
   * drawn with the normal marker and counted by the pill.
   */
  ownItems?: PublicMapItem[]
  /**
   * Phase 28 ("Avec IBP"): the parcels of the author's own surveys, drafts included, trimmed and
   * upper case. Assumption to confirm with the owner (UI-SPEC open item 7).
   */
  surveyParcelIds?: ReadonlySet<string>
  /** OA-59: a survey page asked to see its survey here; centres the map on it and highlights it. */
  focus?: PublicMapFocus
  loading: boolean
  onLoad: (options?: LoadPublicMapOptions) => Promise<void>
  onLoadParcels: (input: { bbox: string; zoom: number }) => Promise<void>
  /** Told the bbox of each viewport load, so the Explorer tab reload can reuse it. */
  onViewportBboxChange?: (bbox: string) => void
  /** REQ-D-offline-map / REQ-D-basemap-switch (08-CONTEXT). Area downloads are suspended (Explorer on MapLibre). */
  isOffline: boolean
  basemap: BasemapKey
  onChangeBasemap: (basemap: BasemapKey) => void
  /** Opens the read-only page of a finished survey (OA-59), the same page as the search's. */
  onOpenSurvey: (surveyId: string) => void
}

/**
 * Public map (D-05): items load by viewport after the region settles, markers
 * are clustered and memoised, and the camera fits the items only on the first
 * load or after a filter apply. The parts live in screens/public-map/.
 */
export function PublicMapScreen({
  apiUrl,
  accessToken,
  items,
  parcelStatuses,
  draftItems = NO_DRAFTS,
  ownItems = NO_DRAFTS,
  surveyParcelIds = NO_SURVEY_PARCELS,
  focus,
  loading,
  onLoad,
  onLoadParcels,
  onViewportBboxChange,
  isOffline,
  basemap,
  onChangeBasemap,
  onOpenSurvey,
}: PublicMapScreenProps) {
  const theme = useBrandTheme()
  const screenStyles = useMemo(() => createScreenContainerStyle(theme), [theme])
  const cameraRef = useRef<CameraRef | null>(null)
  // The route pulls this screen up under the status bar (marginTop: -insets.top), and the native
  // tabs already start at the top: where the container really begins on screen varies, so it is
  // measured. The capsule is then placed under the status bar whatever the origin (OA-103).
  const rootRef = useRef<View | null>(null)
  const [originY, setOriginY] = useState(0)
  const handleRootLayout = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y) => setOriginY(y))
  }, [])
  // The survey whose marker is drawn selected: the last one opened from the map or shown from its
  // page (OA-59). No panel goes with it (12.2-19).
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [cardHeight, setCardHeight] = useState(0)
  // Bumped by "Réessayer" of the error notice: the style is asked again.
  const [styleRetryKey, setStyleRetryKey] = useState(0)
  const offlineEnabled = isOfflineMapsEnabled()
  const offlineAreas = useOfflineAreas(apiUrl, accessToken, offlineEnabled)
  const { startDownload, clearDownloadStatus, downloadStatus, estimateForRegion } = offlineAreas
  const readyAreaCount = offlineAreas.areas.filter((area) => area.status === "ready").length
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight()

  const animateToRegion = useCallback((target: MapRegion, durationMs: number) => {
    cameraRef.current?.fitBounds(boundsFromRegion(target), { duration: durationMs })
  }, [])

  const viewport = useMapViewport({
    items,
    showParcelLayer: true,
    loadPublicMap: onLoad,
    loadParcels: onLoadParcels,
    animateToRegion,
    onViewportBboxChange,
  })

  // Hook order (no cycle, kept by plan 28-17): the swipe hook runs after the layers hook and fills
  // this ref; the panels hook already gets the stable callback, so opening the bubble or the card
  // ends the swipe mode.
  const swipePanelExitRef = useRef<() => void>(noop)
  const handlePanelOpen = useLatestCallback(() => swipePanelExitRef.current())
  const panels = useExplorerPanels({ clearDownloadStatus, onPanelOpen: handlePanelOpen })
  const capsuleTop = Math.max(0, insets.top + 10 - originY)
  const layers = useExplorerLayers({
    savedBasemap: basemap,
    saveBasemap: onChangeBasemap,
    region: viewport.region,
    areas: offlineAreas.areas,
    isOffline,
    surveyParcelIds,
    downloadStatus,
    cardOpen: panels.panel === "card",
    capsuleTop,
    capsuleButtons: offlineEnabled ? 2 : 1,
    hiddenSurveys: false,
    showSkipped: false,
  })
  const { styleLoaded, styleFailed } = layers.layers.actions
  const handleStyleFailed = useCallback(
    () => styleFailed(layers.layers.displayedBase),
    [styleFailed, layers.layers.displayedBase],
  )
  const retryStyle = useCallback(() => setStyleRetryKey((key) => key + 1), [])

  const draftIdSet = useMemo(() => new Set(draftItems.map((item) => item.survey_id)), [draftItems])
  const mapItems = useMemo(
    () =>
      draftItems.length > 0 || ownItems.length > 0 ? [...items, ...draftItems, ...ownItems] : items,
    [items, draftItems, ownItems],
  )
  const parcelStatusById = useMemo(
    () => new Map(parcelStatuses.map((status) => [status.parcel_id, status])),
    [parcelStatuses],
  )
  // 12.2-19 (owner: "pourquoi un clic n'ouvre pas direct le relevé ?"): a survey opens its page at
  // once, from its marker or from a row of a panel, with no summary card in between. Back returns
  // to the map as it was left (the stack keeps this screen mounted).
  const lastOpenAtRef = useRef(-OPEN_SURVEY_GUARD_MS)
  const openSurvey = useLatestCallback((id: string) => {
    const now = Date.now()
    if (now - lastOpenAtRef.current < OPEN_SURVEY_GUARD_MS) return
    lastOpenAtRef.current = now
    setHighlightedId(id)
    onOpenSurvey(id)
  })
  // A marker belongs to another place than an open cluster list: the list closes.
  const handleSelectSurvey = useLatestCallback((id: string) => {
    panels.closeCluster()
    openSurvey(id)
  })
  // A studied parcel opens the page of its latest survey directly, like its marker did at lower
  // zoom (Phase 24 owner check): the parcel history is a row of that page, not a panel of the map.
  const handleSelectParcel = useLatestCallback((parcelId: string) => {
    const status = parcelStatusById.get(parcelId)
    const surveyId = status?.study_status === "studied" ? status.latest_submitted_survey_id : null
    if (surveyId) handleSelectSurvey(surveyId)
  })
  const { moveTo, focusTo } = viewport

  // OA-59 / D-05 / D-06: "Voir sur la carte" and the search land here with something to show; the
  // hook moves the camera once per request and says what to draw (survey marker, parcel, place pin).
  const { initialRegion, highlightedParcelIds, placePin } = useExplorerFocus({
    focus,
    focusTo,
    setHighlightedId,
  })

  // Phase 28 device spike (temporary, plan 28-17 deletes it): inert unless the build sets
  // EXPO_PUBLIC_SWIPE_SPIKE; then the globe button enters a measurement swipe mode.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const spike = useSwipeSpike({
    width: windowWidth,
    height: windowHeight,
    initialRegion,
    basemap,
  })

  const handleZoomTo = useCallback((target: MapRegion) => moveTo(target, 450), [moveTo])
  const handleDownloadArea = useAreaDownloadAction({
    startDownload,
    region: viewport.region,
    panelOpen: panels.panel === "card",
    onStart: panels.chooseArea,
    onFailure: panels.unchooseArea,
    // The chip tells a failure after the card closed, and a tap on it reopens the card.
    alertOnClosedFailure: false,
  })
  const handleRetryDownload = () => handleDownloadArea(downloadStatus?.name || defaultAreaName())
  const estimate = useMemo(
    () => estimateForRegion(viewport.region),
    [estimateForRegion, viewport.region],
  )
  const toggleBasemap = useCallback(
    () => onChangeBasemap(basemap === "map" ? "satellite" : "map"),
    [basemap, onChangeBasemap],
  )

  const handleLocate = useLatestCallback(async (): Promise<void> => {
    if (locating) {
      return
    }
    try {
      setLocating(true)
      const permission = await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(t.alerts.locationDisabled.title, t.alerts.locationDisabled.message)
        return
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const { latitude, longitude } = position.coords
      moveTo({ latitude, longitude, latitudeDelta: LOCATE_SPAN, longitudeDelta: LOCATE_SPAN }, 450)
    } catch (_error) {
      Alert.alert(t.alerts.locationUnavailable.title, t.alerts.locationUnavailable.message)
    } finally {
      setLocating(false)
    }
  })
  const onLocate = useCallback(() => void handleLocate(), [handleLocate])

  const dockBottom = Math.max(tabBarHeight, insets.bottom)
  const cardOpen = panels.panel === "card"
  // 12.2-19: download mode is the open download card before a download starts. The screen's edge
  // glows green then, since the area shown is the one the download takes. The glow goes round the
  // whole screen, above the card and the tab bar, so the navigation layer draws it.
  const choosingArea =
    cardOpen &&
    panels.cardView === "form" &&
    !panels.areaChosen &&
    offlineAreas.downloadingAreaId === null
  // The locate arrow rises above the open card (UI-SPEC section 1).
  const cardBottom = dockBottom + CARD_MARGIN
  const controlsBottom = Math.max(12, dockBottom + DOCK_GAP)
  const dockLift = cardOpen ? cardBottom + cardHeight + DOCK_GAP : controlsBottom

  // The cluster list keeps the tiered sheet; it stays open under the survey page, so back returns
  // to it and its other surveys.
  const sheetContent = panels.clusterItems ? (
    <ClusterListSheet items={panels.clusterItems} onSelect={openSurvey} onClose={panels.closeAll} />
  ) : null

  return (
    <View ref={rootRef} onLayout={handleRootLayout} style={screenStyles.container}>
      <MapCanvas
        cameraRef={cameraRef}
        items={mapItems}
        draftIds={draftIdSet}
        initialRegion={initialRegion}
        highlightedParcelIds={highlightedParcelIds}
        placePin={placePin}
        region={viewport.region}
        selectedId={highlightedId}
        parcelStatuses={parcelStatuses}
        parcelLayerRenderable={viewport.parcelLayerRenderable}
        studiedParcelsRenderable={viewport.studiedParcelsRenderable}
        onRegionChangeComplete={viewport.onRegionChangeComplete}
        onSelectSurvey={handleSelectSurvey}
        onSelectParcel={handleSelectParcel}
        onZoomTo={handleZoomTo}
        onOpenClusterList={panels.openClusterList}
        basemap={layers.layers.displayedBase}
        forestOverlay={layers.layers.state.overlay}
        parcelsMode={layers.layers.state.parcels}
        surveyParcelIds={layers.surveyParcelIds}
        styleRetryKey={styleRetryKey}
        onStyleLoaded={styleLoaded}
        onStyleFailed={handleStyleFailed}
        styleRefreshKey={readyAreaCount}
        {...spike.mapCanvasProps}
        androidView={spike.active ? swipeSpikeLeftView() : undefined}
      />
      {spike.overlay}

      {choosingArea ? <DownloadEdgeGlow /> : null}

      <ExplorerPanelsView
        panels={panels}
        layers={layers}
        downloadStatus={downloadStatus}
        estimate={estimate}
        downloading={offlineAreas.downloadingAreaId !== null}
        onDownload={handleDownloadArea}
        onRetry={handleRetryDownload}
        onClearStatus={clearDownloadStatus}
        onRetryStyle={retryStyle}
        onCardHeight={setCardHeight}
        forestAvailable={layers.isAvailable("types-foret")}
        cardBottom={cardBottom}
      >
        <MapTopControls
          top={capsuleTop}
          basemap={basemap}
          onToggleBasemap={spike.active ? spike.toggleSwipe : toggleBasemap}
          onOpenOfflineAreas={offlineEnabled ? panels.openCard : undefined}
        />
        <MapBottomDock bottom={dockLift} locating={locating} onLocate={onLocate} />
        <ScoreLegend
          bottom={controlsBottom}
          count={mapItems.length}
          loading={loading}
          isOffline={isOffline}
          attributionLines={layers.legendLines ?? undefined}
        />
      </ExplorerPanelsView>

      {/* MAP-01: the tiered sheet of the cluster list. The download card is no sheet any more. */}
      <ExplorerSheet
        visible={sheetContent !== null}
        onDismiss={panels.closeAll}
        bottomInset={Math.max(tabBarHeight, insets.bottom)}
      >
        {sheetContent}
      </ExplorerSheet>
    </View>
  )
}
