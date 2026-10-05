import { useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { useHeaderHeight } from "@react-navigation/elements"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import { brandColors, brandMediaBackdrop, brandShadow, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import {
  DEFAULT_FRANCE_CENTER,
  areRegionsNearlyEqual,
  buildFocusedMapRegion,
  parseGpsCoordinate,
  computeRegionZoom,
  type MapRegion as Region,
} from "../app/map-viewport"
import { GpsCaptureResult } from "../app/types"
import { useOfflineMapPrompt } from "../hooks/useOfflineMapPrompt"
import { useParcelStatuses } from "../hooks/useParcelStatuses"
import { ParcelMap, type ParcelMapHandle } from "../map/maplibre/ParcelMap"
import { AppButton } from "../ui/AppButton"
import { AppCard } from "../ui/AppCard"
import { AppNotice } from "../ui/AppNotice"
import { OfflineMapPrompt } from "../ui/OfflineMapPrompt"
import { fr } from "../i18n"

const t = fr.parcelSelection

type SurveyParcelSelectionScreenProps = {
  apiUrl: string
  accessToken: string | null
  gpsLocation: {
    lat: string
    lng: string
    collected_at: string
  }
  siteName: string
  selectedParcelIds: string[]
  onToggleParcelSelection: (parcelId: string) => void
  onCaptureGpsLocation: () => Promise<GpsCaptureResult | null>
  onSave: () => Promise<void>
  /** New-survey flow (step 4 of 4): the button reads "Continuer" and needs a parcel. */
  wizard?: boolean
}

export function SurveyParcelSelectionScreen({
  apiUrl,
  accessToken,
  gpsLocation,
  siteName,
  selectedParcelIds,
  onToggleParcelSelection,
  onCaptureGpsLocation,
  onSave,
  wizard = false,
}: SurveyParcelSelectionScreenProps) {
  const theme = useBrandTheme()
  const screenStyles = useMemo(() => createScreenStyles(theme), [theme])
  const mapRef = useRef<ParcelMapHandle | null>(null)
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight()
  const [saving, setSaving] = useState(false)
  const [offlineDismissed, setOfflineDismissed] = useState(false)
  const parsedLat = parseGpsCoordinate(gpsLocation.lat)
  const parsedLng = parseGpsCoordinate(gpsLocation.lng)
  const hasGpsCoordinates = Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
  const mapCenter = hasGpsCoordinates ? { lat: parsedLat, lng: parsedLng } : DEFAULT_FRANCE_CENTER
  const initialRegion: Region = hasGpsCoordinates
    ? buildFocusedMapRegion(mapCenter)
    : {
        latitude: mapCenter.lat,
        longitude: mapCenter.lng,
        latitudeDelta: 3.8,
        longitudeDelta: 3.8,
      }
  const [mapRegion, setMapRegion] = useState<Region>(initialRegion)
  const mapZoom = useMemo(() => computeRegionZoom(mapRegion), [mapRegion])
  const { items: parcelStatuses, loading: parcelsLoading } = useParcelStatuses({
    apiUrl,
    accessToken,
    region: mapRegion,
    enabled: true,
    year: new Date().getFullYear(),
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
  const parcelSelectionLabel = t.selectedCount({ count: selectedParcelIds.length })
  const parcelHelperText =
    mapZoom >= 15
      ? parcelsLoading
        ? t.loadingOverlay
        : t.visibleCount({ count: parcelStatuses.length })
      : t.zoomToSelect

  return (
    <View
      style={[
        screenStyles.fullscreen,
        {
          marginTop: -headerHeight,
        },
      ]}
    >
      <ParcelMap
        ref={mapRef}
        style={screenStyles.map}
        initialRegion={mapRegion}
        cadastreEnabled={mapZoom >= 15}
        parcels={parcelStatuses}
        selectedParcelIds={selectedParcelIds}
        onParcelPress={onToggleParcelSelection}
        marker={hasGpsCoordinates ? { latitude: parsedLat, longitude: parsedLng } : null}
        onRegionChange={handleMapRegionChange}
      />

      {offlinePrompt.state !== "hidden" && !offlineDismissed ? (
        <View
          pointerEvents="box-none"
          style={[screenStyles.promptLayer, { top: headerHeight + 8 }]}
        >
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
            paddingBottom: Math.max(Math.max(tabBarHeight, insets.bottom), 12) + 12,
          },
        ]}
      >
        <View style={screenStyles.bottomArea}>
          <View style={screenStyles.floatingActions}>
            <AppButton
              label={t.currentPosition}
              leadingIcon="locate-outline"
              size="sm"
              style={screenStyles.locateButton}
              onPress={() => {
                void onCaptureGpsLocation().then((capturedLocation) => {
                  if (!capturedLocation) {
                    return
                  }
                  const nextRegion = buildFocusedMapRegion(capturedLocation)
                  setMapRegion((current) =>
                    areRegionsNearlyEqual(current, nextRegion) ? current : nextRegion,
                  )
                  syncMapRegion(nextRegion, 420)
                })
              }}
            />
          </View>

          <AppCard glass style={screenStyles.bottomSheet}>
            <Text style={screenStyles.bottomTitle}>
              {hasParcelSelection ? parcelSelectionLabel : t.noSelection}
            </Text>
            <Text style={screenStyles.bottomMeta}>{parcelHelperText}</Text>
            {!hasParcelSelection ? (
              <AppNotice tone="danger" icon="alert-circle-outline" message={t.selectionRequired} />
            ) : null}
            <Text style={screenStyles.bottomHint}>{t.tapHint}</Text>
            <AppButton
              label={saving ? t.saving : wizard ? t.continue : t.done}
              leadingIcon={saving ? "hourglass-outline" : wizard ? "arrow-forward" : "checkmark"}
              size="lg"
              style={screenStyles.doneButton}
              onPress={() => {
                if (saving) {
                  return
                }
                setSaving(true)
                void onSave().finally(() => setSaving(false))
              }}
              disabled={saving || (wizard && !hasParcelSelection)}
            />
          </AppCard>
        </View>
      </View>
    </View>
  )
}

function createScreenStyles(theme: BrandTheme) {
  return StyleSheet.create({
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
      paddingHorizontal: 16,
    },
    promptLayer: {
      position: "absolute",
      left: 16,
      right: 16,
    },
    bottomArea: {
      gap: 12,
    },
    floatingActions: {
      alignSelf: "flex-end",
    },
    locateButton: {
      borderWidth: 1,
      borderColor: brandColors.sage,
      ...brandShadow.card,
    },
    // DS-15 (Phase 12): a real blurred glass panel (`AppCard glass`) instead of a flat
    // `brandTranslucentPanel` fill.
    bottomSheet: {
      gap: 8,
    },
    bottomTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 20,
      lineHeight: 24,
      color: theme.colors.textPrimary,
    },
    bottomMeta: {
      ...brandTypography.sectionBody,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    bottomHint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    doneButton: {
      marginTop: 4,
      ...brandShadow.card,
    },
  })
}
