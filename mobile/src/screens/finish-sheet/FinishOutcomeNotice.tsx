import { useState } from "react"
import type { StyleProp, ViewStyle } from "react-native"
import { useStatus } from "../../state/status-context"
import { AppNotice } from "../../ui/AppNotice"

/**
 * The status message at the moment a finish ended without submitting, kept as it was: a later
 * status (a background sync) does not replace it. Mounted only after such a finish (keyed by the
 * attempt), so the status context keeps a single standing reader. Nothing is drawn for an empty
 * message.
 */
export function FinishOutcomeNotice({ style }: { style?: StyleProp<ViewStyle> }) {
  const { status } = useStatus()
  const [message] = useState(status)
  if (message.trim() === "") return null
  return <AppNotice tone="warning" icon="alert-circle-outline" message={message} style={style} />
}
