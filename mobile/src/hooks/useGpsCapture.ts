import * as Location from "expo-location"
import { GpsCaptureResult } from "../app/types"
import { fr, logStatusDetail, type StatusMessage } from "../i18n"
import { useSurveyForm } from "./useSurveyForm"

type UseGpsCaptureParams = {
  surveyForm: ReturnType<typeof useSurveyForm>
  onStatusChange: (message: StatusMessage) => void
  onAlert: (title: string, message: string) => void
}

const text = fr.status.gps

export function useGpsCapture({ surveyForm, onStatusChange, onAlert }: UseGpsCaptureParams) {
  /** `silent`: a capture the app asks for by itself (a map opening on the phone's position) never
   * raises an alert; only the user's own tap does. */
  const handleCaptureGpsLocation = async (options?: {
    silent?: boolean
  }): Promise<GpsCaptureResult | null> => {
    const alert = (title: string, message: string): void => {
      if (!options?.silent) onAlert(title, message)
    }
    try {
      const locationServicesEnabled = await Location.hasServicesEnabledAsync()
      if (!locationServicesEnabled) {
        onStatusChange(text.servicesDisabled())
        alert(text.alerts.servicesDisabled.title, text.alerts.servicesDisabled.message)
        return null
      }

      onStatusChange(text.requestingPermission())
      const existingPermission = await Location.getForegroundPermissionsAsync()
      const permission = existingPermission.granted
        ? existingPermission
        : await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) {
        onStatusChange(text.permissionDenied())
        alert(text.alerts.permissionDenied.title, text.alerts.permissionDenied.message)
        return null
      }

      let fallbackLocation: GpsCaptureResult | null = null
      const lastKnownPosition = await Location.getLastKnownPositionAsync()
      if (lastKnownPosition) {
        fallbackLocation = {
          lat: lastKnownPosition.coords.latitude,
          lng: lastKnownPosition.coords.longitude,
          collected_at: new Date(lastKnownPosition.timestamp).toISOString(),
        }
        surveyForm.applyGpsLocation(fallbackLocation)
        onStatusChange(text.approximateRefining())
      } else {
        onStatusChange(text.capturing())
      }

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        const currentLocation: GpsCaptureResult = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          collected_at: new Date(position.timestamp).toISOString(),
        }
        surveyForm.applyGpsLocation(currentLocation)
        onStatusChange(text.captured())
        return currentLocation
      } catch (error) {
        if (fallbackLocation) {
          onStatusChange(text.approximateCaptured())
          return fallbackLocation
        }
        throw error
      }
    } catch (error) {
      logStatusDetail("gps.capture", error)
      onStatusChange(text.failed())
      alert(text.alerts.unavailable.title, text.alerts.unavailable.message)
      return null
    }
  }

  return { handleCaptureGpsLocation }
}
