import { StyleSheet, View } from "react-native"
import { useBrandTheme } from "../app/theme"

/**
 * The two-halo backdrop of the scheme (variant I, direction principle 9), a decorative layer
 * hidden from touch and from accessibility.
 *
 * D-19: every screen shows it. A stack screen gets it through `ScreenFrame` (the route wraps its
 * screen), which also insets the content below the transparent header (`backdropHeader`). Accueil
 * draws it directly as the first child of its root. Never under an opaque header: the header band
 * would cut the halo (RESEARCH Pitfall 3).
 */
export function ScreenBackdrop({ testID }: { testID?: string }) {
  const theme = useBrandTheme()
  return (
    <View
      style={[StyleSheet.absoluteFill, { experimental_backgroundImage: theme.visual.backdrop }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    />
  )
}
