import { StyleSheet, View } from "react-native"
import { useBrandTheme } from "../app/theme"

/**
 * The two-halo backdrop of the scheme (variant I, direction principle 9), a decorative layer
 * hidden from touch and from accessibility.
 *
 * Use it as the first child of a screen root, only where the header is transparent or absent
 * (Home). On screens with an opaque page-colour header keep the flat canvas if a seam shows
 * between the header and the halo (RESEARCH Pitfall 3).
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
