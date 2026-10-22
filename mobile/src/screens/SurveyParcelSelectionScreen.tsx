import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useHeaderHeight } from "@react-navigation/elements"
import { Platform, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { brandMapTokens, brandMediaBackdrop, brandSpacing4 } from "../app/brand-tokens"
import {
  DEFAULT_FRANCE_CENTER,
  areRegionsNearlyEqual,
  buildFocusedMapRegion,
  parseGpsCoordinate,
  computeRegionZoom,
  type MapRegion as Region,
} from "../app/map-viewport"
import { GpsCaptureResult } from "../app/types"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import { useOfflineAreas } from "../hooks/useOfflineAreas"
import { useOfflineMapPrompt } from "../hooks/useOfflineMapPrompt"
import { useParcelStatuses } from "../hooks/useParcelStatuses"
import { useChosenParcelGeometry } from "./parcel-selection/useChosenParcelGeometry"
import type { BasemapKey } from "../map/basemaps"
import { cachedParcelCentre } from "../map/own-surveys"
import { parcelAreaHa } from "../map/parcel-area"
import { ParcelMap, type ParcelMapHandle } from "../map/maplibre/ParcelMap"
import { MapTitlePill } from "./public-map/MapChips"
import { MapBottomDock, MapTopControls } from "./public-map/MapControls"
import { ExplorerSheet } from "./public-map/ExplorerSheet"
import { OfflineAreasSheet } from "./public-map/OfflineAreasSheet"
import { useAreaDownloadAction } from "./public-map/useAreaDownloadAction"
import { MapLegend, type MapLegendRow } from "./public-map/ScoreLegend"
import { ParcelSelectionCard } from "./parcel-selection/ParcelSelectionCard"
import { OfflineMapPrompt } from "../ui/OfflineMapPrompt"
import { fr } from "../i18n"
import type { WeatherPoint } from "../storage/weather"

const t = fr.parcelSelection
const headers = fr.navigation.headers

// The colours of the parcel layer (ParcelPolygonsLayer), for the legend the Explorer's look gets.
const PARCEL_LEGEND_ROWS: MapLegendRow[] = [
  { color: brandMapTokens.parcelSelected, label: t.legend.selected },
  { color: brandMapTokens.parcelStudied, label: t.legend.studied },
  { color: brandMapTokens.parcelNeutral, label: t.legend.neutral },
]

type SurveyParcelSelectionScreenProps = {
  apiUrl: string
  accessToken: string | null
  gpsLocation: {
    lat: string
    lng: string
    collected_at: string
  }
  /**
   * Where the map starts when the form holds no position: the survey's own, from its page. Without
   * it (a new survey) the map opens on the phone's position (OA-117).
   */
  startPoint?: { lat: number; lng: number } | null
  siteName: string
  selectedParcelIds: string[]
  onToggleParcelSelection: (parcelId: string) => void
  onCaptureGpsLocation: (options?: { silent?: boolean }) => Promise<GpsCaptureResult | null>
  /**
   * Phase 27, D-10: `weatherPoint` is the centre of the parcels the observer tapped (null when
   * their geometry is not loaded), the place the weather is looked up for. Phase 30: `surfaceHa`
   * is the surface of the chosen parcels, prefilling the surface question of the route step (null
   * when no geometry is cached).
   */
  onSave: (weatherPoint: WeatherPoint | null, surfaceHa: number | null) => Promise<void>
  /** New-survey flow (step 4 of 4): the button reads "Continuer" and needs a parcel. */
  wizard?: boolean
}

export function SurveyParcelSelectionScreen({
  apiUrl,
  accessToken,
  gpsLocation,
  startPoint = null,
  siteName,
  selectedParcelIds,
  onToggleParcelSelection,
  onCaptureGpsLocation,
  onSave,
  wizard = false,
}: SurveyParcelSelectionScreenProps) {
  const mapRef = useRef<ParcelMapHandle | null>(null)
  const [basemap, setBasemap] = useState<BasemapKey>("map")
  const [locating, setLocating] = useState(false)
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useAppBottomTabBarHeight()
  const [saving, setSaving] = useState(false)
  // The bottom card's height: the map controls sit just above it, bottom right and left like the
  // Explorer's, whatever the card holds (a line of help appears when no parcel is chosen).
  const [cardHeight, setCardHeight] = useState(0)
  const [offlineDismissed, setOfflineDismissed] = useState(false)
  // The same download button and panel as the Explorer's: the capsule is one component everywhere.
  const offlineEnabled = isOfflineMapsEnabled()
  const offlineAreas = useOfflineAreas(apiUrl, accessToken, offlineEnabled)
  const [showOfflineAreas, setShowOfflineAreas] = useState(false)
  const parsedLat = parseGpsCoordinate(gpsLocation.lat)
  const parsedLng = parseGpsCoordinate(gpsLocation.lng)
  const hasGpsCoordinates = Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
  // The form's position, else the survey's own: either one is a place to start from.
  const start = hasGpsCoordinates ? { lat: parsedLat, lng: parsedLng } : startPoint
  const mapCenter = start ?? DEFAULT_FRANCE_CENTER
  const initialRegion: Region = start
    ? buildFocusedMapRegion(mapCenter)
    : {
        latitude: mapCenter.lat,
        longitude: mapCenter.lng,
        latitudeDelta: 3.8,
        longitudeDelta: 3.8,
      }
  const [mapRegion, setMapRegion] = useState<Region>(initialRegion)
  const mapZoom = useMemo(() => computeRegionZoom(mapRegion), [mapRegion])
  const {
    items: listedParcels,
    loading: parcelsLoading,
    settled: parcelsSettled,
  } = useParcelStatuses({
    apiUrl,
    accessToken,
    region: mapRegion,
    enabled: true,
    year: new Date().getFullYear(),
  })
  // The list for the visible region plus the geometry of the parcels seen before (RC-01).
  const { waitForGeometry } = useChosenParcelGeometry({
    items: listedParcels,
    settled: parcelsSettled,
    selectedParcelIds,
  })

  // ParcelMap holds a move until its map has loaded.
  const syncMapRegion = (nextRegion: Region, duration = 420): void => {
    mapRef.current?.animateToRegion(nextRegion, duration)
  }

  useEffect(() => {
    if (!hasGpsCoordinates) {
      return
    }
    const nextRegion = buildFocusedMapRegion({ lat: parsedLat, lng: parsedLng })
    setMapRegion((current) => (areRegionsNearlyEqual(current, nextRegion) ? current : nextRegion))
    syncMapRegion(nextRegion, 420)
  }, [hasGpsCoordinates, parsedLat, parsedLng, gpsLocation.collected_at])

  const handleMapRegionChange = (nextRegion: Region): void => {
    setMapRegion((current) => (areRegionsNearlyEqual(current, nextRegion) ? current : nextRegion))
  }

  const hasParcelSelection = selectedParcelIds.length > 0
  // The map to offer is the one around the survey's position, once a parcel is chosen.
  const offlinePoint = useMemo(
    () =>
      hasParcelSelection
        ? hasGpsCoordinates
          ? { lat: parsedLat, lng: parsedLng }
          : { lat: mapRegion.latitude, lng: mapRegion.longitude }
        : null,
    [hasParcelSelection, hasGpsCoordinates, parsedLat, parsedLng, mapRegion],
  )
  const offlinePrompt = useOfflineMapPrompt({ apiUrl, accessToken, point: offlinePoint })
  const offlineBannerVisible = offlinePrompt.state !== "hidden" && !offlineDismissed
  const parcelSelectionLabel = t.selectedCount({ count: selectedParcelIds.length })

  // The iOS header is transparent over the map (the native back button is the glass one), so the
  // controls start under the status bar; on Android the opaque header already sits above the map.
  const controlsTop = Platform.OS === "ios" ? insets.top + 6 : 12
  // The basemap capsule sits under the header bar: the transparent native header takes the touches
  // of everything drawn in its band, so a button there never received a tap (OA-118).
  const capsuleTop = Platform.OS === "ios" ? headerHeight + 8 : 12

  const cardBottomInset = Math.max(Math.max(tabBarHeight, insets.bottom), 12) + 12
  const controlsBottom = cardBottomInset + cardHeight + 12

  const handleDone = (): void => {
    if (saving) {
      return
    }
    setSaving(true)
    // RC-01: wait (at most 2 s, and only while a read for the region is pending) for the geometry of
    // the chosen parcels, so the route step starts with its surface estimate. Offline it answers at once.
    void waitForGeometry()
      .then((items) =>
        onSave(
          cachedParcelCentre(items, selectedParcelIds),
          parcelAreaHa(items, selectedParcelIds),
        ),
      )
      .finally(() => setSaving(false))
  }

  const handleLocate = async (silent = false): Promise<void> => {
    if (locating) {
      return
    }
    setLocating(true)
    try {
      const capturedLocation = await onCaptureGpsLocation({ silent })
      if (!capturedLocation) {
        return
      }
      const nextRegion = buildFocusedMapRegion(capturedLocation)
      setMapRegion((current) => (areRegionsNearlyEqual(current, nextRegion) ? current : nextRegion))
      syncMapRegion(nextRegion, 420)
    } finally {
      setLocating(false)
    }
  }

  // OA-117: a survey without a captured position opens on the phone's, not on France. A survey
  // that has a position of its own (its page shows its parcels there) starts on it instead.
  const autoLocatedRef = useRef(false)
  useEffect(() => {
    if (hasGpsCoordinates || startPoint || autoLocatedRef.current) return
    autoLocatedRef.current = true
    void handleLocate(true)
    // Once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { startDownload, clearDownloadStatus } = offlineAreas
  const handleDownloadArea = useAreaDownloadAction({
    startDownload,
    region: mapRegion,
    panelOpen: showOfflineAreas,
  })
  // A finished download's outcome is not shown again; a running one keeps its bar.
  const toggleOfflineAreas = useCallback(
    (open: boolean) => {
      clearDownloadStatus()
      setShowOfflineAreas(open)
    },
    [clearDownloadStatus],
  )

  return (
    <View style={screenStyles.fullscreen}>
      <ParcelMap
        ref={mapRef}
        style={screenStyles.map}
        initialRegion={mapRegion}
        basemap={basemap}
        cadastreEnabled={mapZoom >= 15}
        parcels={listedParcels}
        selectedParcelIds={selectedParcelIds}
        onParcelPress={onToggleParcelSelection}
        marker={hasGpsCoordinates ? { latitude: parsedLat, longitude: parsedLng } : null}
        onRegionChange={handleMapRegionChange}
      />

      {Platform.OS === "ios" ? (
        <MapTitlePill label={wizard ? headers.parcelsWizard : headers.parcels} top={controlsTop} />
      ) : null}

      <MapTopControls
        // While the offline proposal (or its progress) is on screen, the capsule's own download
        // button would say the same thing twice: it comes back once the proposal is closed.
        onOpenOfflineAreas={
          offlineEnabled && !offlineBannerVisible ? () => toggleOfflineAreas(true) : undefined
        }
        top={capsuleTop}
        basemap={basemap}
        onToggleBasemap={() => setBasemap((current) => (current === "map" ? "satellite" : "map"))}
      />
      <MapBottomDock
        bottom={controlsBottom}
        locating={locating}
        onLocate={() => void handleLocate()}
      />
      <MapLegend
        bottom={controlsBottom}
        countLabel={
          mapZoom >= 15
            ? parcelsLoading
              ? t.loadingOverlay
              : t.visibleCount({ count: listedParcels.length })
            : t.legend.zoomIn
        }
        title={t.legend.title}
        subtitle={t.legend.subtitle}
        rows={PARCEL_LEGEND_ROWS}
        loading={parcelsLoading}
      />

      {offlineBannerVisible ? (
        <View pointerEvents="box-none" style={[screenStyles.topArea, { top: capsuleTop }]}>
          <OfflineMapPrompt
            prompt={offlinePrompt}
            siteName={siteName.trim() || t.areaSiteFallback}
            variant="banner"
            onDismiss={() => setOfflineDismissed(true)}
          />
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          screenStyles.overlayLayer,
          {
            paddingBottom: cardBottomInset,
          },
        ]}
      >
        <View
          style={screenStyles.bottomArea}
          onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        >
          <ParcelSelectionCard
            hasSelection={hasParcelSelection}
            selectionLabel={parcelSelectionLabel}
            saving={saving}
            wizard={wizard}
            onDone={handleDone}
          />
        </View>
      </View>

      <ExplorerSheet
        visible={showOfflineAreas}
        onDismiss={() => toggleOfflineAreas(false)}
        bottomInset={Math.max(tabBarHeight, insets.bottom)}
      >
        <OfflineAreasSheet
          downloadingAreaId={offlineAreas.downloadingAreaId}
          downloadStatus={offlineAreas.downloadStatus}
          estimate={offlineAreas.estimateForRegion(mapRegion)}
          onDownload={handleDownloadArea}
          onDone={() => toggleOfflineAreas(false)}
          onRetry={handleDownloadArea}
          onClose={() => toggleOfflineAreas(false)}
        />
      </ExplorerSheet>
    </View>
  )
}

const screenStyles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: brandMediaBackdrop,
  },
  map: {
    flex: 1,
    backgroundColor: brandMediaBackdrop,
  },
  overlayLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    paddingHorizontal: brandSpacing4.md,
  },
  // The offline-map proposal sits at the top, under the header (OA-105 follow-up).
  topArea: {
    position: "absolute",
    left: 16,
    right: 78,
  },
  bottomArea: {
    gap: brandSpacing4.smd,
  },
})
