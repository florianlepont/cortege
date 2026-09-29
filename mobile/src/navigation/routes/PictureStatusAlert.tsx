import { useEffect, useRef } from "react"
import { Alert } from "react-native"
import { fr } from "../../i18n"
import { useStatus } from "../../state/status-context"

const profile = fr.status.profile

// OA-76: the picture handlers report through the status line, which only Paramètres shows, so a
// failed upload was silent on Compte. The outcomes worth an alert; cancelling the picker is not one.
const PICTURE_OUTCOMES: ReadonlySet<string> = new Set<string>([
  profile.pictureUploaded(),
  profile.pictureUploadedRefreshNeedsLogin(),
  profile.pictureUploadLoginRequired(),
  profile.pictureUploadFailed(),
  profile.mediaLibraryPermissionRequired(),
  profile.pictureLibraryFailed(),
  profile.cameraPermissionRequired(),
  profile.pictureCameraFailed(),
  profile.pictureRemoved(),
  profile.pictureRemoveFailed(),
  profile.pictureRemoveLoginRequired(),
])

/**
 * Renders nothing. Lives beside the Compte screen so that only this component, not the screen,
 * re-renders on a status update (the status context has one reader by design).
 */
export function PictureStatusAlert() {
  const { status } = useStatus()
  const previous = useRef(status)

  useEffect(() => {
    if (status !== previous.current && PICTURE_OUTCOMES.has(status)) {
      Alert.alert(fr.account.alerts.photo.title, status)
    }
    previous.current = status
  }, [status])

  return null
}
