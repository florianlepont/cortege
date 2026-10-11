import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { mapControlIconSize } from "../../app/visual-tokens"
import { AppPressable } from "../../ui/AppPressable"
import { GlassSurface } from "../../ui/GlassSurface"

const t = fr.mapLayers.overlays

const BUTTON_SIZE = 50
// The dot's offset from the button's top-right corner, copied from the sketch's `.ovbtn .dot`.
const DOT_SIZE = 8
const DOT_OFFSET = 11

export type OverlayButtonProps = {
  /** The top of the button: 8 pt under the capsule (the screen computes it). */
  top: number
  /** Types de forêt is on or Parcelles is not Toutes (`overlayDot`). */
  active: boolean
  /** Whether the bubble is open. */
  expanded: boolean
  onPress: () => void
}

/**
 * The round overlay button under the Explorer's capsule (UI-SPEC section 2): the same map control
 * glass as the capsule, the `layers-outline` glyph, and a dot while the overlays are not at their
 * default. It opens the overlay bubble. Always rendered: it does not depend on offline maps.
 */
export const OverlayButton = memo(function OverlayButton({
  top,
  active,
  expanded,
  onPress,
}: OverlayButtonProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <AppPressable
      testID="map-overlay-button"
      disableScale
      disableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.buttonA11y}
      accessibilityHint={t.buttonHint}
      accessibilityState={{ expanded }}
      accessibilityValue={active ? { text: t.buttonActiveValue } : undefined}
      style={[styles.button, { top }]}
    >
      <GlassSurface
        tone="auto"
        interactive
        surface={theme.visual.mapControl.glass}
        style={styles.circle}
      >
        <View style={styles.glyph}>
          <Ionicons
            name="layers-outline"
            size={mapControlIconSize}
            color={theme.visual.mapControl.icon}
          />
        </View>
      </GlassSurface>
      {active ? (
        <View
          testID="map-overlay-dot"
          style={styles.dot}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
    </AppPressable>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    button: {
      position: "absolute",
      right: 14,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
    },
    circle: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
    },
    glyph: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    dot: {
      position: "absolute",
      top: DOT_OFFSET,
      right: DOT_OFFSET,
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      backgroundColor: theme.visual.tab.dot,
    },
  })
}
