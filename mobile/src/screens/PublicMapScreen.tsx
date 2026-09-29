import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Alert, View } from "react-native"
import type { CameraRef } from "@maplibre/maplibre-react-native"
import * as Location from "expo-location"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { MapRegion } from "../app/map-viewport"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { useBrandTheme } from "../app/theme"
import type { PublicMapItem, PublicParcelStatusItem } from "../app/types"
import type { LoadPublicMapOptions } from "../hooks/usePublicMapExplorer"
import { fr } from "../i18n"
import type { BasemapKey } from "../map/basemaps"
import { boundsFromRegion } from "../map/maplibre/regions"
import { useLatestCallback } from "../state/useLatestCallback"
import { ClusterListSheet } from "./public-map/ClusterListSheet"
import type { ExplorerFilterBarProps, RegionKey } from "./public-map/ExplorerFilterBar"
import { ExplorerSheet } from "./public-map/ExplorerSheet"
import { MapCanvas } from "./public-map/MapCanvas"
import { MapBottomDock, MapTopControls } from "./public-map/MapControls"
import { ParcelHistoryCard } from "./public-map/ParcelHistoryCard"
import { computePeriodRange, type PeriodKey } from "./public-map/period-filter"
import { ScoreLegend } from "./public-map/ScoreLegend"
import { SelectedSurveyCard } from "./public-map/SelectedSurveyCard"
import { createScreenContainerStyle } from "./public-map/styles"
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
  /** REQ-D-offline-map / REQ-D-basemap-switch (08-CONTEXT). Area downloads are suspended (Explorer on MapLibre). */
  isOffline: boolean
  basemap: BasemapKey
  onChangeBasemap: (basemap: BasemapKey) => void
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
  onQueueParcelDownload,
}: PublicMapScreenProps) {
  const theme = useBrandTheme()
  const screenStyles = useMemo(() => createScreenContainerStyle(theme), [theme])
  const cameraRef = useRef<CameraRef | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showParcelLayer, setShowParcelLayer] = useState(true)
  const [selectedItem, setSelectedItem] = useState<PublicMapItem | null>(null)
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null)
  const [clusterItems, setClusterItems] = useState<PublicMapItem[] | null>(null)
  const [locating, setLocating] = useState(false)
  // MAP-02: period/region are chips applied immediately; "mes relevés" is a pure client-side
  // filter over the already-loaded items (no API parameter for it).
  const [period, setPeriod] = useState<PeriodKey>("all")
  const [mineOnly, setMineOnly] = useState(false)
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight()

  const animateToRegion = useCallback((target: MapRegion, durationMs: number) => {
    cameraRef.current?.fitBounds(boundsFromRegion(target), { duration: durationMs })
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
  const toggleFilters = useCallback(() => setShowFilters((current) => !current), [])
  const toggleParcelLayer = useCallback(() => setShowParcelLayer((current) => !current), [])

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
      onClose={closeSheet}
    />
  ) : clusterItems ? (
    <ClusterListSheet items={clusterItems} onSelect={handleSelectSurvey} onClose={closeSheet} />
  ) : selectedItem ? (
    <SelectedSurveyCard
      key={selectedItem.survey_id}
      item={selectedItem}
      isOwnSurvey={ownSurveyIdSet.has(selectedItem.survey_id)}
      onClose={closeSheet}
    />
  ) : null

  return (
    <View style={screenStyles.container}>
      <MapCanvas
        cameraRef={cameraRef}
        items={visibleItems}
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
      />

      <MapBottomDock
        bottom={Math.max(12, dockBottom + 10)}
        showEmpty={!loading && visibleItems.length === 0}
        locating={locating}
        onLocate={onLocate}
      />

      <ScoreLegend bottom={Math.max(84, dockBottom + 74)} />

      {/* MAP-01: one tiered sheet for whichever map-content panel is active, replacing the three
        absolutely-positioned AppCards this screen used to stack independently. */}
      <ExplorerSheet visible={sheetContent !== null} onDismiss={closeSheet}>
        {sheetContent}
      </ExplorerSheet>
    </View>
  )
}
