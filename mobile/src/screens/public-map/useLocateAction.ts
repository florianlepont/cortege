import { useCallback, useState } from "react"
import { Alert } from "react-native"
import * as Location from "expo-location"
import type { MapRegion } from "../../app/map-viewport"
import { fr } from "../../i18n"
import { useLatestCallback } from "../../state/useLatestCallback"

const t = fr.publicMap
const LOCATE_SPAN = 0.012
const LOCATE_DURATION_MS = 450

type Input = {
  /** Moves the camera to a region over a duration in milliseconds. */
  moveTo: (region: MapRegion, durationMs: number) => void
}

export type LocateAction = {
  /** The position request is running (the arrow shows it is busy). */
  locating: boolean
  onLocate: () => void
}

/**
 * The locate arrow's action: asks the foreground permission, then moves to the device position. A
 * refusal and a failure each show their alert; a press while a request runs is ignored.
 */
export function useLocateAction({ moveTo }: Input): LocateAction {
  const [locating, setLocating] = useState(false)
  const locate = useLatestCallback(async (): Promise<void> => {
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
      moveTo(
        { latitude, longitude, latitudeDelta: LOCATE_SPAN, longitudeDelta: LOCATE_SPAN },
        LOCATE_DURATION_MS,
      )
    } catch (_error) {
      Alert.alert(t.alerts.locationUnavailable.title, t.alerts.locationUnavailable.message)
    } finally {
      setLocating(false)
    }
  })
  const onLocate = useCallback(() => void locate(), [locate])
  return { locating, onLocate }
}
