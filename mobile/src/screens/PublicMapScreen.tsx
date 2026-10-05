import { useCallback, useMemo, useRef, useState } from "react"
import { Alert, View } from "react-native"
import type { CameraRef } from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { MapRegion } from "../app/map-viewport"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { useBrandTheme } from "../app/theme"
import type { PublicMapItem, PublicParcelStatusItem } from "../app/types"
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

type PublicMapScreenProps = {
  apiUrl: string
  accessToken: string | null
  items: PublicMapItem[]
  parcelStatuses: PublicParcelStatusItem[]
  ownSurveyIds: string[]
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
  const itemsById = useMemo(() => new Map(items.map((item) => [item.survey_id, item])), [items])
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
  const { moveTo } = viewport
  const handleZoomTo = useCallback((target: MapRegion) => moveTo(target, 450), [moveTo])
  // MAP-01: the sheet reports a dismissal (drag-down or the content's own close button) without
  // saying which panel was open — closing all three is safe since they're already mutually
  // exclusive (selecting one clears the others, see handleSelectSurvey/handleSelectParcel/
  // handleOpenClusterList above).
  const closeSheet = useCallback(() => {
    setSelectedItem(null)
    setSelectedParcelId(null)
    setClusterItems(null)
  }, [])
  const openOfflineAreas = useCallback(() => setShowOfflineAreas(true), [])
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

  const sheetContent = selectedParcelId ? (
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
      onOpenSurvey={onOpenSurvey}
      onClose={closeSheet}
    />
  ) : null

  return (
    <View style={screenStyles.container}>
      <MapCanvas
        cameraRef={cameraRef}
        items={items}
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
        top={insets.top + 40}
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
        count={items.length}
        loading={loading}
        isOffline={isOffline}
      />

      {showOfflineAreas ? (
        <OfflineAreasSheet
          bottom={Math.max(12, dockBottom + 10)}
          areas={offlineAreas.areas}
          downloadingAreaId={offlineAreas.downloadingAreaId}
          estimate={offlineAreas.estimateForRegion(viewport.region)}
          onDownload={handleDownloadArea}
          onDelete={(id) => void offlineAreas.deleteArea(id)}
          onClose={closeOfflineAreas}
        />
      ) : null}

      {/* MAP-01: one tiered sheet for whichever map-content panel is active, replacing the three
        absolutely-positioned AppCards this screen used to stack independently. */}
      <ExplorerSheet visible={sheetContent !== null} onDismiss={closeSheet}>
        {sheetContent}
      </ExplorerSheet>
    </View>
  )
}
