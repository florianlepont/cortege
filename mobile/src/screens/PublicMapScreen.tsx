import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Alert, View } from "react-native"
import type { CameraRef } from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { buildFocusedMapRegion, type MapRegion } from "../app/map-viewport"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { useBrandTheme } from "../app/theme"
import type { PublicMapItem, PublicParcelStatusItem } from "../app/types"
import type { PublicMapFocus } from "../navigation/types"
import type { LoadPublicMapOptions } from "../hooks/usePublicMapExplorer"
import { fr } from "../i18n"
import type { BasemapKey } from "../map/basemaps"
import { boundsFromRegion } from "../map/maplibre/regions"
import { useOfflineAreas } from "../hooks/useOfflineAreas"
import { useLatestCallback } from "../state/useLatestCallback"
import { ClusterListSheet } from "./public-map/ClusterListSheet"
import { ExplorerSheet } from "./public-map/ExplorerSheet"
import { MapCanvas } from "./public-map/MapCanvas"
import { MapBottomDock, MapTopControls } from "./public-map/MapControls"
import { OfflineAreasSheet } from "./public-map/OfflineAreasSheet"
import { ParcelHistoryCard } from "./public-map/ParcelHistoryCard"
import { ScoreLegend } from "./public-map/ScoreLegend"
import { SelectedSurveyCard } from "./public-map/SelectedSurveyCard"
import { createScreenContainerStyle } from "./public-map/styles"
import { useMapViewport } from "./public-map/useMapViewport"

const t = fr.publicMap
const offlineT = fr.offlineMap.areas
const LOCATE_SPAN = 0.012
const NO_DRAFTS: PublicMapItem[] = []

/** The region that shows a survey, centred a little north of it so its marker clears the sheet. */
function focusRegion(focus: PublicMapFocus): MapRegion {
  const target = buildFocusedMapRegion(focus)
  return { ...target, latitude: target.latitude - target.latitudeDelta * 0.22 }
}

type PublicMapScreenProps = {
  apiUrl: string
  accessToken: string | null
  items: PublicMapItem[]
  parcelStatuses: PublicParcelStatusItem[]
  ownSurveyIds: string[]
  /** OA-59: the author's drafts, drawn beside the public surveys and visible to them alone. */
  draftItems?: PublicMapItem[]
  /** OA-59: a survey page asked to see its survey here; centres the map on it and selects it. */
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
  onQueueParcelDownload: (parcelId: string) => void
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
  ownSurveyIds,
  draftItems = NO_DRAFTS,
  focus,
  loading,
  onLoad,
  onLoadParcels,
  onViewportBboxChange,
  isOffline,
  basemap,
  onChangeBasemap,
  onQueueParcelDownload,
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
  const [selectedItem, setSelectedItem] = useState<PublicMapItem | null>(null)
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null)
  const [clusterItems, setClusterItems] = useState<PublicMapItem[] | null>(null)
  const [locating, setLocating] = useState(false)
  const [showOfflineAreas, setShowOfflineAreas] = useState(false)
  const offlineEnabled = isOfflineMapsEnabled()
  const offlineAreas = useOfflineAreas(apiUrl, accessToken, offlineEnabled)
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

  const ownSurveyIdSet = useMemo(() => new Set(ownSurveyIds), [ownSurveyIds])
  const draftIdSet = useMemo(() => new Set(draftItems.map((item) => item.survey_id)), [draftItems])
  const mapItems = useMemo(
    () => (draftItems.length > 0 ? [...items, ...draftItems] : items),
    [items, draftItems],
  )
  const itemsById = useMemo(
    () => new Map(mapItems.map((item) => [item.survey_id, item])),
    [mapItems],
  )
  const parcelStatusById = useMemo(
    () => new Map(parcelStatuses.map((status) => [status.parcel_id, status])),
    [parcelStatuses],
  )
  const handleSelectSurvey = useLatestCallback((id: string) => {
    const item = itemsById.get(id) ?? clusterItems?.find((entry) => entry.survey_id === id)
    if (item) {
      setSelectedParcelId(null)
      setSelectedItem(item)
      setClusterItems(null)
    }
  })
  const handleSelectParcel = useLatestCallback((parcelId: string) => {
    const status = parcelStatusById.get(parcelId)
    if (status?.study_status === "studied") {
      setSelectedItem(null)
      setClusterItems(null)
      setSelectedParcelId(parcelId)
    }
  })
  const handleOpenClusterList = useCallback((leaves: PublicMapItem[]) => {
    setSelectedItem(null)
    setSelectedParcelId(null)
    setClusterItems(leaves)
  }, [])
  const { moveTo, focusTo } = viewport

  // OA-59: "Voir sur la carte" lands here with a survey to show. A screen opened for it starts the
  // camera there; one already open moves there. The survey is selected as soon as it is among the
  // markers (a public one arrives with the viewport load that the move triggers).
  const initialRegion = useRef(focus ? focusRegion(focus) : undefined).current
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null)
  const focusNonce = focus?.nonce
  useEffect(() => {
    if (!focus) return
    setPendingFocusId(focus.surveyId)
    focusTo(focusRegion(focus), 0)
    // The nonce identifies one request; the focus object itself is rebuilt by the navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce, focusTo])
  useEffect(() => {
    if (!pendingFocusId) return
    const item = itemsById.get(pendingFocusId)
    if (!item) return
    setSelectedParcelId(null)
    setClusterItems(null)
    setSelectedItem(item)
    setPendingFocusId(null)
  }, [pendingFocusId, itemsById])

  const handleZoomTo = useCallback((target: MapRegion) => moveTo(target, 450), [moveTo])
  // MAP-01: the sheet reports a dismissal (drag-down or the content's own close button) without
  // saying which panel was open — closing all three is safe since they're already mutually
  // exclusive (selecting one clears the others, see handleSelectSurvey/handleSelectParcel/
  // handleOpenClusterList above).
  const closeSheet = useCallback(() => {
    setShowOfflineAreas(false)
    setPendingFocusId(null)
    setSelectedItem(null)
    setSelectedParcelId(null)
    setClusterItems(null)
  }, [])
  const openOfflineAreas = useCallback(() => {
    setSelectedItem(null)
    setSelectedParcelId(null)
    setClusterItems(null)
    setShowOfflineAreas(true)
  }, [])
  const closeOfflineAreas = useCallback(() => setShowOfflineAreas(false), [])
  const { startDownload } = offlineAreas
  const handleDownloadArea = useCallback(
    (name: string) => {
      void startDownload(viewport.region, name).then((outcome) => {
        if (!outcome.ok) {
          Alert.alert(outcome.reason === "too_large" ? offlineT.tooLarge : offlineT.downloadFailed)
        }
      })
    },
    [startDownload, viewport.region],
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

  // One sheet for whichever panel is open, the offline areas included (OA-66): the same drag
  // handle and height as every other fiche of the Explorer.
  const sheetContent = showOfflineAreas ? (
    <OfflineAreasSheet
      areas={offlineAreas.areas}
      downloadingAreaId={offlineAreas.downloadingAreaId}
      estimate={offlineAreas.estimateForRegion(viewport.region)}
      onDownload={handleDownloadArea}
      onDelete={(id) => void offlineAreas.deleteArea(id)}
      onClose={closeOfflineAreas}
    />
  ) : selectedParcelId ? (
    <ParcelHistoryCard
      key={selectedParcelId}
      parcelId={selectedParcelId}
      apiUrl={apiUrl}
      accessToken={accessToken}
      isOffline={isOffline}
      onQueueDownload={onQueueParcelDownload}
      onOpenSurvey={onOpenSurvey}
      onClose={closeSheet}
    />
  ) : clusterItems ? (
    <ClusterListSheet items={clusterItems} onSelect={handleSelectSurvey} onClose={closeSheet} />
  ) : selectedItem ? (
    <SelectedSurveyCard
      key={selectedItem.survey_id}
      item={selectedItem}
      isOwnSurvey={ownSurveyIdSet.has(selectedItem.survey_id)}
      isDraft={draftIdSet.has(selectedItem.survey_id)}
      onOpenSurvey={onOpenSurvey}
      onClose={closeSheet}
    />
  ) : null

  return (
    <View ref={rootRef} onLayout={handleRootLayout} style={screenStyles.container}>
      <MapCanvas
        cameraRef={cameraRef}
        items={mapItems}
        draftIds={draftIdSet}
        initialRegion={initialRegion}
        region={viewport.region}
        selectedId={selectedItem?.survey_id ?? null}
        parcelStatuses={parcelStatuses}
        parcelLayerRenderable={viewport.parcelLayerRenderable}
        onRegionChangeComplete={viewport.onRegionChangeComplete}
        onSelectSurvey={handleSelectSurvey}
        onSelectParcel={handleSelectParcel}
        onZoomTo={handleZoomTo}
        onOpenClusterList={handleOpenClusterList}
        basemap={basemap}
        styleRefreshKey={readyAreaCount}
      />

      <MapTopControls
        top={Math.max(0, insets.top + 10 - originY)}
        basemap={basemap}
        onToggleBasemap={toggleBasemap}
        onOpenOfflineAreas={offlineEnabled ? openOfflineAreas : undefined}
      />

      <MapBottomDock
        bottom={Math.max(12, dockBottom + 10)}
        locating={locating}
        onLocate={onLocate}
      />

      <ScoreLegend
        bottom={Math.max(12, dockBottom + 10)}
        count={mapItems.length}
        loading={loading}
        isOffline={isOffline}
      />

      {/* MAP-01: one tiered sheet for whichever map-content panel is active, replacing the three
        absolutely-positioned AppCards this screen used to stack independently. */}
      <ExplorerSheet
        visible={sheetContent !== null}
        onDismiss={closeSheet}
        bottomInset={Math.max(tabBarHeight, insets.bottom)}
      >
        {sheetContent}
      </ExplorerSheet>
    </View>
  )
}
