import { ReactNode, useEffect, useMemo, useRef } from "react"
import { StyleProp, View, ViewStyle } from "react-native"
import {
  areRegionsNearlyEqual,
  computeRegionZoom,
  DEFAULT_FRANCE_CENTER,
  type MapRegion as Region,
} from "../../app/map-viewport"
import {
  boundsCentre,
  mergeBounds,
  parcelBoundsFrom,
  parcelFrameRegion,
  windowRegion,
} from "../../app/parcel-frame"
import { useBrandTheme } from "../../app/theme"
import type { SurveyDetailResponse } from "../../app/types"
import { useParcelStatuses } from "../../hooks/useParcelStatuses"
import { fr } from "../../i18n"
import { ParcelMap, type ParcelMapHandle } from "../../map/maplibre/ParcelMap"
import { ContourLines } from "../../ui/ContourLines"
import { MapInfoPill, MapOverlayCorners } from "../public-map/MapChips"
import { SeeOnMapAction } from "./SeeOnMapAction"
import { resolveDisplayCoordinates } from "../survey-screen-helpers"
import { createSummaryScreenStyles } from "./summary-screen.styles"
import { useLocalParcelGeometry } from "./useLocalParcelGeometry"
import { AppPressable } from "../../ui/AppPressable"

const t = fr.surveyDetail.map
const a11y = fr.surveyDetail.a11y

/** A survey with no parcel at all shows the whole country, as the card always did. */
const FRANCE_DELTA = 3.8

/** The camera moves to a better frame (the parcels' geometry arrived) in this time. */
const REFRAME_DURATION_MS = 350

type ParcelMapCardProps = {
  apiUrl: string
  accessToken: string | null
  siteName: string
  displayLocation: SurveyDetailResponse["display_location"] | undefined
  parcelIds: string[]
  style?: StyleProp<ViewStyle>
  /** Opens the survey's context and parcels; absent, the card is a plain picture. */
  onPress?: () => void
  /** OA-59: the survey whose position the "Voir sur la carte" action opens in Explorer. */
  surveyId?: string
  /** The survey row's `updated_at`: the local position is read again when it moves (D-36). */
  refreshKey?: string
  /** Other actions drawn on the map, under "Voir sur la carte" (bottom right). */
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
  style,
  onPress,
  surveyId,
  refreshKey,
  children,
}: ParcelMapCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const coordinates = useMemo(() => resolveDisplayCoordinates(displayLocation), [displayLocation])
  // D-36: a draft that never synced has no server position. The point kept at the parcel
  // selection and the cached geometry of the downloaded areas stand in for it.
  const local = useLocalParcelGeometry(surveyId, parcelIds, refreshKey)
  const centre = useMemo(
    () => coordinates ?? local.point ?? (local.bounds ? boundsCentre(local.bounds) : null),
    [coordinates, local],
  )
  // The parcels are asked around the centre, in a fixed window: the camera framing below never
  // feeds back into this request.
  const fetchRegion = useMemo<Region>(() => windowRegion(centre ?? DEFAULT_FRANCE_CENTER), [centre])
  const { items: parcelStatuses } = useParcelStatuses({
    apiUrl,
    accessToken,
    region: fetchRegion,
    enabled: centre !== null,
    year: new Date().getFullYear(),
  })
  const bounds = useMemo(
    () => mergeBounds(local.bounds, parcelBoundsFrom(parcelStatuses, parcelIds)),
    [local.bounds, parcelStatuses, parcelIds],
  )
  // The parcels' bounding box with a small margin, else the 0.01 degree window on the centre; null
  // when nothing is known (no live map, never France for a survey that has parcels).
  const region = useMemo(
    () =>
      parcelFrameRegion({ bounds, centre }) ??
      (parcelIds.length === 0 ? windowRegion(DEFAULT_FRANCE_CENTER, FRANCE_DELTA) : null),
    [bounds, centre, parcelIds.length],
  )
  const zoom = useMemo(() => (region ? computeRegionZoom(region) : 0), [region])
  const marker = coordinates ? { latitude: coordinates.lat, longitude: coordinates.lng } : null

  // The map keeps the region it started on: a better frame (the geometry arrived after the
  // window) is applied through the camera.
  const mapRef = useRef<ParcelMapHandle>(null)
  const framed = useRef<Region | null>(null)
  useEffect(() => {
    if (!region) return
    if (framed.current === null) {
      framed.current = region
      return
    }
    if (areRegionsNearlyEqual(framed.current, region)) return
    framed.current = region
    mapRef.current?.animateToRegion(region, REFRAME_DURATION_MS)
  }, [region])

  const map = region ? (
    <ParcelMap
      ref={mapRef}
      style={styles.map}
      initialRegion={region}
      cadastreEnabled={zoom >= 15}
      parcels={parcelStatuses}
      selectedParcelIds={parcelIds}
      marker={marker}
      interactive={false}
    />
  ) : null
  // Static contours beneath the live map: seen only where it has not drawn (loading, offline
  // without tiles), never over it (D-13).
  const placeholder = <ContourLines animated={false} />
  // The corners are the Explorer's: the fact on the left, the actions on the right.
  const overlays = (
    <MapOverlayCorners
      info={
        <MapInfoPill label={parcelIds.length > 0 ? t.parcelCount(parcelIds.length) : t.noParcel} />
      }
      actions={
        <>
          {surveyId && coordinates ? (
            <SeeOnMapAction
              surveyId={surveyId}
              siteName={siteName}
              coordinates={coordinates}
              parcelIds={parcelIds}
            />
          ) : null}
          {children}
        </>
      }
    />
  )

  if (onPress) {
    return (
      <AppPressable
        style={[styles.mapCard, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y.editParcels(siteName)}
      >
        {placeholder}
        {map}
        {overlays}
      </AppPressable>
    )
  }
  return (
    <View
      style={[styles.mapCard, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11y.mapPreview(siteName)}
    >
      {placeholder}
      {map}
      {overlays}
    </View>
  )
}
