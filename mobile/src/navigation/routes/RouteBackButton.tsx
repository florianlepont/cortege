import { memo, useMemo } from "react"
import { Platform, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../../app/theme"
import type { BrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"

const SIZE = 44

type RouteBackButtonProps = {
  onPress: () => void
}

/**
 * The route step's own back button (44 pt, round, like the wizard's disc). The step turns the
 * native back off (no swipe, no system arrow), because going back is one question at a time and a
 * native pop cannot be held back without desynchronising the native stack.
 */
export const RouteBackButton = memo(function RouteBackButton({ onPress }: RouteBackButtonProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <AppPressable
      style={[styles.button, Platform.OS === "ios" ? styles.buttonOnSystemGlass : null]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={fr.surveyForm.a11y.back}
      testID="route-back"
    >
      <Ionicons name="chevron-back-outline" size={22} color={theme.semanticColors.textStrong} />
    </AppPressable>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // iOS 26 draws every header button in its own glass capsule: a disc of ours inside it showed as
    // a ring in a ring (found on the simulator), so only the glyph is ours there.
    buttonOnSystemGlass: {
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    button: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.glass.cardFill,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
    },
  })
}
