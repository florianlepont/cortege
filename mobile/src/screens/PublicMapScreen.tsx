import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Alert, View } from "react-native"
import type MapView from "react-native-maps"
import type { LatLng, Region } from "react-native-maps"
import * as Location from "expo-location"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import type { PublicMapItem, PublicParcelStatusItem } from "../app/types"
import type { LoadPublicMapOptions } from "../hooks/usePublicMapExplorer"
import type { StartDownloadResult } from "../hooks/useOfflineAreas"
import { fr } from "../i18n"
import type { BasemapKey } from "../map/basemaps"
import type { AreaDownloadEstimate } from "../map/tile-math"
import type { OfflineAreaSummary } from "../storage/offline-map"
import { useLatestCallback } from "../state/useLatestCallback"
import { ClusterListSheet } from "./public-map/ClusterListSheet"
import type { ExplorerFilterBarProps, RegionKey } from "./public-map/ExplorerFilterBar"
import { MapCanvas } from "./public-map/MapCanvas"
import { MapBottomDock, MapTopControls } from "./public-map/MapControls"
import { OfflineAreasSheet } from "./public-map/OfflineAreasSheet"
import { ParcelHistoryCard } from "./public-map/ParcelHistoryCard"
import { computePeriodRange, type PeriodKey } from "./public-map/period-filter"
import { SelectedSurveyCard } from "./public-map/SelectedSurveyCard"
import { screenStyles } from "./public-map/styles"
import { PARCEL_MIN_ZOOM, useMapViewport } from "./public-map/useMapViewport"

const t = fr.publicMap
const LOCATE_SPAN = 0.012

type PublicMapScreenProps = {
  apiUrl: string
  accessToken: string | null
  items: PublicMapItem[]
  parcelStatuses: PublicParcelStatusItem[]
  ownSurveyIds: string[]
  loading: boolean
  parcelsLoading: boolean
  fromDate: string
  toDate: string
  region: string
  onChangeFromDate: (value: string) => void
  onChangeToDate: (value: string) => void
  onChangeRegion: (value: string) => void
  onLoad: (options?: LoadPublicMapOptions) => Promise<void>
  onLoadParcels: (input: { bbox: string; zoom: number }) => Promise<void>
  /** Told the bbox of each viewport load, so the Explorer tab reload can reuse it. */
  onViewportBboxChange?: (bbox: string) => void
  /** REQ-D-offline-map / REQ-D-basemap-switch / REQ-D-area-download (08-CONTEXT). */
  isOffline: boolean
  basemap: BasemapKey
  onChangeBasemap: (basemap: BasemapKey) => void
  offlineAreas: OfflineAreaSummary[]
  downloadingAreaId: string | null
  estimateOfflineArea: (region: Region) => AreaDownloadEstimate
  onDownloadOfflineArea: (region: Region, name: string) => Promise<StartDownloadResult>
  onDeleteOfflineArea: (id: string) => Promise<void>
  onQueueParcelDownload: (parcelId: string) => void
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
  parcelsLoading,
  fromDate,
  toDate,
  region,
  onChangeFromDate,
  onChangeToDate,
  onChangeRegion,
  onLoad,
  onLoadParcels,
  onViewportBboxChange,
  isOffline,
  basemap,
  onChangeBasemap,
  offlineAreas,
  downloadingAreaId,
  estimateOfflineArea,
  onDownloadOfflineArea,
  onDeleteOfflineArea,
  onQueueParcelDownload,
}: PublicMapScreenProps) {
  const mapRef = useRef<MapView | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showParcelLayer, setShowParcelLayer] = useState(true)
  const [showOfflineAreas, setShowOfflineAreas] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PublicMapItem | null>(null)
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null)
  const [clusterItems, setClusterItems] = useState<PublicMapItem[] | null>(null)
  const [locating, setLocating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null)
  // MAP-02: period/region are chips applied immediately; "mes relevés" is a pure client-side
  // filter over the already-loaded items (no API parameter for it).
  const [period, setPeriod] = useState<PeriodKey>("all")
  const [mineOnly, setMineOnly] = useState(false)
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight()

  const animateToRegion = useCallback((target: Region, durationMs: number) => {
    mapRef.current?.animateToRegion(target, durationMs)
  }, [])

  const viewport = useMapViewport({
    items,
    showParcelLayer,
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
  const visibleItems = useMemo(
    () => (mineOnly ? items.filter((item) => ownSurveyIdSet.has(item.survey_id)) : items),
    [items, mineOnly, ownSurveyIdSet],
  )
  const regionFilter: RegionKey = region === "ACA" || region === "M" ? region : ""
  const activeFilterCount =
    (period !== "all" ? 1 : 0) + (regionFilter !== "" ? 1 : 0) + (mineOnly ? 1 : 0)

  // MAP-02: filters apply immediately — no "Appliquer" button. A period/region chip updates the
  // underlying date/region state; this effect re-fires the (unbounded, whole-dataset) load and
  // re-arms the camera fit once that state actually changes, skipping the initial mount (already
  // handled by the viewport's own bbox-driven first load).
  const isFirstFilterApply = useRef(true)
  useEffect(() => {
    if (isFirstFilterApply.current) {
      isFirstFilterApply.current = false
      return
    }
    viewport.applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, region])

  const handleChangePeriod = useCallback(
    (nextPeriod: PeriodKey) => {
      setPeriod(nextPeriod)
      const range = computePeriodRange(nextPeriod)
      onChangeFromDate(range.from)
      onChangeToDate(range.to)
    },
    [onChangeFromDate, onChangeToDate],
  )
  const handleChangeRegion = useCallback(
    (nextRegion: RegionKey) => onChangeRegion(nextRegion),
    [onChangeRegion],
  )
  const handleToggleMine = useCallback(() => setMineOnly((current) => !current), [])
  const handleResetFilters = useCallback(() => {
    setPeriod("all")
    setMineOnly(false)
    onChangeFromDate("")
    onChangeToDate("")
    onChangeRegion("")
  }, [onChangeFromDate, onChangeRegion, onChangeToDate])

  const filterBarProps: ExplorerFilterBarProps = {
    period,
    onChangePeriod: handleChangePeriod,
    region: regionFilter,
    onChangeRegion: handleChangeRegion,
    mineOnly,
    onToggleMine: handleToggleMine,
    activeCount: activeFilterCount,
    onReset: handleResetFilters,
  }

  const layerStatusLabel = !showParcelLayer
    ? t.layer.hidden
    : parcelsLoading
      ? t.layer.loading
      : viewport.zoom >= PARCEL_MIN_ZOOM
        ? t.layer.active
        : t.layer.zoomIn

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
  const handleZoomTo = useCallback((target: Region) => moveTo(target, 450), [moveTo])
  const closeSelection = useCallback(() => setSelectedItem(null), [])
  const closeParcelHistory = useCallback(() => setSelectedParcelId(null), [])
  const closeClusterList = useCallback(() => setClusterItems(null), [])
  const toggleFilters = useCallback(() => setShowFilters((current) => !current), [])
  const toggleParcelLayer = useCallback(() => setShowParcelLayer((current) => !current), [])
  const toggleOfflineAreas = useCallback(() => setShowOfflineAreas((current) => !current), [])
  const closeOfflineAreas = useCallback(() => setShowOfflineAreas(false), [])
  const offlineAreaEstimate = useMemo(
    () => estimateOfflineArea(viewport.region),
    [estimateOfflineArea, viewport.region],
  )
  const handleDownloadOfflineArea = useLatestCallback((name: string) => {
    void onDownloadOfflineArea(viewport.region, name)
  })

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
      setCurrentLocation({ latitude, longitude })
      moveTo({ latitude, longitude, latitudeDelta: LOCATE_SPAN, longitudeDelta: LOCATE_SPAN }, 450)
    } catch (_error) {
      Alert.alert(t.alerts.locationUnavailable.title, t.alerts.locationUnavailable.message)
    } finally {
      setLocating(false)
    }
  })
  const onLocate = useCallback(() => void handleLocate(), [handleLocate])

  const dockBottom = Math.max(tabBarHeight, insets.bottom)

  return (
    <View style={screenStyles.container}>
      <MapCanvas
        mapRef={mapRef}
        items={visibleItems}
        region={viewport.region}
        selectedId={selectedItem?.survey_id ?? null}
        parcelStatuses={parcelStatuses}
        parcelLayerRenderable={viewport.parcelLayerRenderable}
        currentLocation={currentLocation}
        onRegionChangeComplete={viewport.onRegionChangeComplete}
        onSelectSurvey={handleSelectSurvey}
        onSelectParcel={handleSelectParcel}
        onZoomTo={handleZoomTo}
        onOpenClusterList={handleOpenClusterList}
        basemap={basemap}
        isOffline={isOffline}
        offlineAreas={offlineAreas}
      />

      <MapTopControls
        top={insets.top + 40}
        count={visibleItems.length}
        loading={loading}
        showFilters={showFilters}
        showParcelLayer={showParcelLayer}
        layerStatusLabel={layerStatusLabel}
        filters={filterBarProps}
        onToggleFilters={toggleFilters}
        onToggleParcelLayer={toggleParcelLayer}
        onRefresh={viewport.reload}
        isOffline={isOffline}
        basemap={basemap}
        onChangeBasemap={onChangeBasemap}
        onOpenOfflineAreas={toggleOfflineAreas}
      />

      <MapBottomDock
        bottom={Math.max(12, dockBottom + 10)}
        showEmpty={!loading && visibleItems.length === 0}
        locating={locating}
        onLocate={onLocate}
      />

      {showOfflineAreas ? (
        <OfflineAreasSheet
          bottom={Math.max(84, dockBottom + 62)}
          areas={offlineAreas}
          downloadingAreaId={downloadingAreaId}
          estimate={offlineAreaEstimate}
          onDownload={handleDownloadOfflineArea}
          onDelete={onDeleteOfflineArea}
          onClose={closeOfflineAreas}
        />
      ) : null}

      {clusterItems ? (
        <ClusterListSheet
          items={clusterItems}
          bottom={Math.max(84, dockBottom + 62)}
          onSelect={handleSelectSurvey}
          onClose={closeClusterList}
        />
      ) : null}

      {selectedItem ? (
        <SelectedSurveyCard
          key={selectedItem.survey_id}
          item={selectedItem}
          isOwnSurvey={ownSurveyIdSet.has(selectedItem.survey_id)}
          bottom={Math.max(84, dockBottom + 62)}
          onClose={closeSelection}
        />
      ) : null}

      {selectedParcelId ? (
        <ParcelHistoryCard
          key={selectedParcelId}
          parcelId={selectedParcelId}
          apiUrl={apiUrl}
          accessToken={accessToken}
          isOffline={isOffline}
          onQueueDownload={onQueueParcelDownload}
          bottom={Math.max(84, dockBottom + 62)}
          onClose={closeParcelHistory}
        />
      ) : null}
    </View>
  )
}
