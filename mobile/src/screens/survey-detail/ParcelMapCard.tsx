import { ReactNode, useMemo } from "react"
import { Pressable, StyleProp, View, ViewStyle } from "react-native"
import { computeRegionZoom, type MapRegion as Region } from "../../app/map-viewport"
import { useBrandTheme } from "../../app/theme"
import type { SurveyDetailResponse } from "../../app/types"
import { useParcelStatuses } from "../../hooks/useParcelStatuses"
import { fr } from "../../i18n"
import { ParcelMap } from "../../map/maplibre/ParcelMap"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"
import { resolveDisplayCoordinates } from "../survey-screen-helpers"
import { createSummaryScreenStyles } from "./summary-screen.styles"

const t = fr.surveyDetail.map
const a11y = fr.surveyDetail.a11y

const DEFAULT_FRANCE_REGION: Region = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 3.8,
  longitudeDelta: 3.8,
}

type ParcelMapCardProps = {
  apiUrl: string
  accessToken: string | null
  siteName: string
  displayLocation: SurveyDetailResponse["display_location"] | undefined
  parcelIds: string[]
  /** Replaces the parcel count in the chip (a community survey shows an approximate position). */
  chipLabel?: string
  style?: StyleProp<ViewStyle>
  /** Opens the survey's context and parcels; absent, the card is a plain picture. */
  onPress?: () => void
  /** Overlays drawn on the map (a floating action). */
  children?: ReactNode
}

/**
 * The survey's parcels on a still map: the card of the summary (OA-43) and the head of the
 * context page. Zoomed on the survey's position, its parcels highlighted.
 */
export function ParcelMapCard({
  apiUrl,
  accessToken,
  siteName,
  displayLocation,
  parcelIds,
  chipLabel,
  style,
  onPress,
  children,
}: ParcelMapCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const coordinates = useMemo(() => resolveDisplayCoordinates(displayLocation), [displayLocation])
  const region = useMemo<Region>(() => {
    if (!coordinates) return DEFAULT_FRANCE_REGION
    return {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
  }, [coordinates])
  const zoom = useMemo(() => computeRegionZoom(region), [region])
  const { items: parcelStatuses } = useParcelStatuses({
    apiUrl,
    accessToken,
    region,
    enabled: coordinates !== null,
    year: new Date().getFullYear(),
  })
  const marker = coordinates ? { latitude: coordinates.lat, longitude: coordinates.lng } : null

  const map = (
    <ParcelMap
      style={styles.map}
      initialRegion={region}
      cadastreEnabled={zoom >= 15}
      parcels={parcelStatuses}
      selectedParcelIds={parcelIds}
      marker={marker}
      interactive={false}
    />
  )
  const chip = (
    <GlassSurface style={styles.mapChip} pointerEvents="none">
      <Text style={styles.mapChipText}>
        {chipLabel ?? (parcelIds.length > 0 ? t.parcelCount(parcelIds.length) : t.noParcel)}
      </Text>
    </GlassSurface>
  )

  if (onPress) {
    return (
      <Pressable
        style={[styles.mapCard, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y.editParcels(siteName)}
      >
        {map}
        {chip}
        {children}
      </Pressable>
    )
  }
  return (
    <View
      style={[styles.mapCard, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11y.mapPreview(siteName)}
    >
      {map}
      {chip}
      {children}
    </View>
  )
}
