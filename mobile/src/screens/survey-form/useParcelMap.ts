import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as Location from "expo-location"
import {
  DEFAULT_FRANCE_CENTER,
  areRegionsNearlyEqual,
  buildFocusedMapRegion,
  parseGpsCoordinate,
  computeRegionZoom,
  type MapRegion as Region,
} from "../../app/map-viewport"
import { AppScreen, GpsCaptureResult } from "../../app/types"
import { useParcelStatuses } from "../../hooks/useParcelStatuses"
import type { ParcelMapHandle } from "../../map/maplibre/ParcelMap"
import { toAddressLabel } from "../survey-screen-helpers"
import type { WizardStep } from "./components"
import { fr } from "../../i18n"

type UseParcelMapInput = {
  apiUrl: string
  accessToken: string | null
  screen: AppScreen
  editingSurveyId: string | null
  gpsLocation: { lat: string; lng: string; collected_at: string }
  activeStep: WizardStep
  onCaptureGpsLocation: () => Promise<GpsCaptureResult | null>
}

const ADDRESS_UNAVAILABLE = fr.surveyForm.parcels.addressUnavailable
const AUTO_LOCATE_ERROR = fr.surveyForm.parcels.autoLocateError
const MANUAL_LOCATE_ERROR = fr.surveyForm.parcels.manualLocateError

// Map state of the parcels step: region, parcel overlay, GPS centring and the
// reverse-geocoded address. Shared by the inline map and the full-screen modal.
export function useParcelMap({
  apiUrl,
  accessToken,
  screen,
  editingSurveyId,
  gpsLocation,
  activeStep,
  onCaptureGpsLocation,
}: UseParcelMapInput) {
  const inlineMapRef = useRef<ParcelMapHandle | null>(null)
  const fullscreenMapRef = useRef<ParcelMapHandle | null>(null)
  const onCaptureGpsLocationRef = useRef(onCaptureGpsLocation)
  const parcelLocateRequestIdRef = useRef(0)
  const lastResolvedCoordinateKeyRef = useRef("")
  const [autoLocateRequested, setAutoLocateRequested] = useState(false)
  const [isAutoLocatingParcels, setIsAutoLocatingParcels] = useState(false)
  const [parcelAutoLocateError, setParcelAutoLocateError] = useState("")
  const [isParcelMapFullscreenVisible, setIsParcelMapFullscreenVisible] = useState(false)
  const [resolvedGpsAddress, setResolvedGpsAddress] = useState("")
  const [isResolvingGpsAddress, setIsResolvingGpsAddress] = useState(false)

  const parsedLat = parseGpsCoordinate(gpsLocation.lat)
  const parsedLng = parseGpsCoordinate(gpsLocation.lng)
  const hasGpsCoordinates = Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
  const mapCenter = hasGpsCoordinates ? { lat: parsedLat, lng: parsedLng } : DEFAULT_FRANCE_CENTER
  const computedMapRegion: Region = hasGpsCoordinates
    ? buildFocusedMapRegion(mapCenter)
    : {
        latitude: mapCenter.lat,
        longitude: mapCenter.lng,
        latitudeDelta: 3.8,
        longitudeDelta: 3.8,
      }
  const [mapRegion, setMapRegion] = useState<Region>(computedMapRegion)
  const mapZoom = useMemo(() => computeRegionZoom(mapRegion), [mapRegion])
  const { items: parcelStatuses, loading: parcelsLoading } = useParcelStatuses({
    apiUrl,
    accessToken,
    region: mapRegion,
    enabled: true,
    year: new Date().getFullYear(),
  })

  useEffect(() => {
    onCaptureGpsLocationRef.current = onCaptureGpsLocation
  }, [onCaptureGpsLocation])

  // ParcelMap holds a move until its map has loaded, so both maps are simply told where to go.
  const syncParcelMapsToRegion = useCallback((nextRegion: Region, duration = 420): void => {
    inlineMapRef.current?.animateToRegion(nextRegion, duration)
    fullscreenMapRef.current?.animateToRegion(nextRegion, duration)
  }, [])

  const centerParcelMapsOnLocation = useCallback(
    (location: GpsCaptureResult): void => {
      const nextRegion = buildFocusedMapRegion(location)
      setMapRegion((current) => (areRegionsNearlyEqual(current, nextRegion) ? current : nextRegion))
      syncParcelMapsToRegion(nextRegion, 420)
    },
    [syncParcelMapsToRegion],
  )

  const setInlineMapInstance = (instance: ParcelMapHandle | null): void => {
    inlineMapRef.current = instance
  }

  const setFullscreenMapInstance = (instance: ParcelMapHandle | null): void => {
    fullscreenMapRef.current = instance
  }

  useEffect(() => {
    if (!hasGpsCoordinates) {
      return
    }
    const nextRegion = buildFocusedMapRegion({ lat: parsedLat, lng: parsedLng })
    setMapRegion((current) => (areRegionsNearlyEqual(current, nextRegion) ? current : nextRegion))
    syncParcelMapsToRegion(nextRegion, 420)
  }, [gpsLocation.collected_at, hasGpsCoordinates, parsedLat, parsedLng, syncParcelMapsToRegion])

  const requestLocation = useCallback(
    (requestId: number, errorText: string): void => {
      void onCaptureGpsLocationRef
        .current()
        .then((capturedLocation) => {
          if (parcelLocateRequestIdRef.current !== requestId) {
            return
          }
          setIsAutoLocatingParcels(false)
          if (!capturedLocation) {
            setParcelAutoLocateError(errorText)
            return
          }
          centerParcelMapsOnLocation(capturedLocation)
        })
        .catch(() => {
          if (parcelLocateRequestIdRef.current !== requestId) {
            return
          }
          setIsAutoLocatingParcels(false)
          setParcelAutoLocateError(errorText)
        })
    },
    [centerParcelMapsOnLocation],
  )

  useEffect(() => {
    if (activeStep !== "parcels") {
      parcelLocateRequestIdRef.current += 1
      setAutoLocateRequested(false)
      setIsAutoLocatingParcels(false)
      setParcelAutoLocateError("")
      return
    }

    if (hasGpsCoordinates) {
      setIsAutoLocatingParcels(false)
      setParcelAutoLocateError("")
      return
    }

    if (autoLocateRequested) {
      return
    }

    const requestId = parcelLocateRequestIdRef.current + 1
    parcelLocateRequestIdRef.current = requestId
    setAutoLocateRequested(true)
    setIsAutoLocatingParcels(true)
    setParcelAutoLocateError("")
    requestLocation(requestId, AUTO_LOCATE_ERROR)
  }, [activeStep, autoLocateRequested, hasGpsCoordinates, requestLocation])

  useEffect(() => {
    if (!hasGpsCoordinates) {
      setResolvedGpsAddress("")
      setIsResolvingGpsAddress(false)
      return
    }

    const coordinateKey = `${parsedLat.toFixed(5)},${parsedLng.toFixed(5)}`
    if (lastResolvedCoordinateKeyRef.current === coordinateKey) {
      return
    }
    lastResolvedCoordinateKeyRef.current = coordinateKey

    let cancelled = false
    const run = async (): Promise<void> => {
      try {
        setIsResolvingGpsAddress(true)
        const matches = await Location.reverseGeocodeAsync({
          latitude: parsedLat,
          longitude: parsedLng,
        })
        if (cancelled) {
          return
        }
        const first = matches[0] as Record<string, unknown> | undefined
        if (!first) {
          setResolvedGpsAddress(ADDRESS_UNAVAILABLE)
          return
        }
        const label = toAddressLabel(first)
        setResolvedGpsAddress(label || ADDRESS_UNAVAILABLE)
      } catch (_error) {
        if (!cancelled) {
          setResolvedGpsAddress(ADDRESS_UNAVAILABLE)
        }
      } finally {
        if (!cancelled) {
          setIsResolvingGpsAddress(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [hasGpsCoordinates, parsedLat, parsedLng])

  useEffect(() => {
    setAutoLocateRequested(false)
  }, [screen, editingSurveyId])

  const handleLocateParcelsMap = (): void => {
    if (isAutoLocatingParcels) {
      return
    }

    const requestId = parcelLocateRequestIdRef.current + 1
    parcelLocateRequestIdRef.current = requestId
    setIsAutoLocatingParcels(true)
    setParcelAutoLocateError("")
    requestLocation(requestId, MANUAL_LOCATE_ERROR)
  }

  const handleMapRegionChange = (nextRegion: Region): void => {
    setMapRegion((current) => (areRegionsNearlyEqual(current, nextRegion) ? current : nextRegion))
  }

  useEffect(() => {
    if (hasGpsCoordinates) {
      return
    }
    const fallbackRegion: Region = {
      latitude: DEFAULT_FRANCE_CENTER.lat,
      longitude: DEFAULT_FRANCE_CENTER.lng,
      latitudeDelta: 3.8,
      longitudeDelta: 3.8,
    }
    setMapRegion((current) =>
      areRegionsNearlyEqual(current, fallbackRegion) ? current : fallbackRegion,
    )
  }, [hasGpsCoordinates, screen, editingSurveyId])

  useEffect(() => {
    if (isParcelMapFullscreenVisible) {
      return
    }
    syncParcelMapsToRegion(mapRegion, 0)
  }, [isParcelMapFullscreenVisible, mapRegion, syncParcelMapsToRegion])

  const helperText = useMemo(() => {
    if (isAutoLocatingParcels) {
      return fr.surveyForm.parcels.helperLocating
    }
    if (parcelAutoLocateError) {
      return parcelAutoLocateError
    }
    if (mapZoom >= 15) {
      return parcelsLoading
        ? fr.surveyForm.parcels.helperLoading
        : fr.surveyForm.parcels.helperVisible({ count: parcelStatuses.length })
    }
    return fr.surveyForm.parcels.helperZoomIn
  }, [isAutoLocatingParcels, mapZoom, parcelAutoLocateError, parcelStatuses.length, parcelsLoading])

  return {
    helperText,
    mapRegion,
    mapZoom,
    parcelStatuses,
    parcelsLoading,
    gpsMarker: hasGpsCoordinates ? { latitude: parsedLat, longitude: parsedLng } : null,
    isAutoLocatingParcels,
    parcelAutoLocateError,
    isParcelMapFullscreenVisible,
    closeFullscreenMap: () => setIsParcelMapFullscreenVisible(false),
    resolvedGpsAddress,
    isResolvingGpsAddress,
    setInlineMapInstance,
    setFullscreenMapInstance,
    handleMapRegionChange,
    handleLocateParcelsMap,
  }
}

export type ParcelMapState = ReturnType<typeof useParcelMap>
