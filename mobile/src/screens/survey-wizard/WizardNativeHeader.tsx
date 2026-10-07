import { useLayoutEffect } from "react"
import { useNavigation, usePreventRemove } from "@react-navigation/native"

type WizardNativeHeaderProps = {
  /** The step counter ("Étape 2 sur 4"), shown as the small centred title of the native bar. */
  title: string
  /** Past the first question: the system back button returns to the previous question. */
  canStepBack: boolean
  onStepBack: () => void
}

const BACK_ACTIONS = new Set(["GO_BACK", "POP"])

/**
 * 12.2-17 (owner: "Oui je préfère l'en-tête natif"): on iOS the wizard shows the stack's native
 * header with the system back button instead of its own glass disc. Renders nothing; it puts the
 * step counter in the bar and makes the system back keep the wizard's rule:
 *
 * - on the first question, back leaves the wizard (as the disc's "Fermer" did);
 * - past it, back, the swipe from the edge and any `goBack` return to the previous question. The
 *   native back press is cancelled by react-native-screens (`preventNativeDismiss`) and handed to
 *   this callback. Any other action that removes the wizard (the parcel step's `reset` once the
 *   draft is created) goes through: it is dispatched again, and React Navigation skips the routes
 *   it has already asked.
 */
export function WizardNativeHeader({ title, canStepBack, onStepBack }: WizardNativeHeaderProps) {
  const navigation = useNavigation()

  useLayoutEffect(() => {
    navigation.setOptions({ title })
  }, [navigation, title])

  usePreventRemove(canStepBack, ({ data }) => {
    if (BACK_ACTIONS.has(data.action.type)) onStepBack()
    else navigation.dispatch(data.action)
  })

  return null
}
