import { useEffect, useRef } from "react"
import * as Location from "expo-location"
import { lastPosition, rememberPosition } from "../../app/last-position"
import type { MapRegion } from "../../app/map-viewport"

/** About a 15 km view around the user (degrees), so every zoomed-out Explorer shows the same extent. */
export const INITIAL_CENTRE_SPAN = 0.15

/**
 * The region the Explorer starts in when a position was already read in this session and no focus
 * request holds the camera: the map opens on the user at once, with no jump from the default view.
 */
export function cachedStartRegion(hasFocus: boolean): MapRegion | undefined {
  const position = hasFocus ? null : lastPosition()
  if (!position) return undefined
  return {
    ...position,
    latitudeDelta: INITIAL_CENTRE_SPAN,
    longitudeDelta: INITIAL_CENTRE_SPAN,
  }
}

type Input = {
  /** A focus request (a survey, a parcel, a place) holds the camera: nothing is centred then. */
  hasFocus: boolean
  /** The map already started on a cached position (`cachedStartRegion`): nothing to read. */
  startedOnPosition?: boolean
  /** Moves the camera to a region over a duration in milliseconds; it must also stop the late first fit. */
  moveTo: (region: MapRegion, durationMs: number) => void
}

/**
 * Opens the Explorer on the user's position, once per mount, without ever prompting: only when the
 * foreground permission is already granted, from the last known position, else the current one.
 * A missing permission or any failure leaves the default view. The result is dropped when the
 * screen unmounted or a focus request arrived meanwhile.
 */
export function useInitialLocationCentre({
  hasFocus,
  startedOnPosition = false,
  moveTo,
}: Input): void {
  const hasFocusRef = useRef(hasFocus)
  const startedRef = useRef(startedOnPosition)
  hasFocusRef.current = hasFocus
  const moveToRef = useRef(moveTo)
  moveToRef.current = moveTo

  useEffect(() => {
    if (hasFocusRef.current || startedRef.current) return undefined
    let cancelled = false
    const run = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync()
        if (!permission.granted) return
        const position =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
        if (cancelled || hasFocusRef.current) return
        const { latitude, longitude } = position.coords
        rememberPosition(latitude, longitude)
        moveToRef.current(
          {
            latitude,
            longitude,
            latitudeDelta: INITIAL_CENTRE_SPAN,
            longitudeDelta: INITIAL_CENTRE_SPAN,
          },
          0,
        )
      } catch (_error) {
        // No position: the default view stays.
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])
}
