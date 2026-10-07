import { ReactNode } from "react"
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { BlurView } from "expo-blur"
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect"
import { useBrandTheme } from "../app/theme"
import { brandGlassFills } from "../app/visual-tokens"

type GlassSurfaceTone = "auto" | "dark"

// iOS 26 and later only; evaluated once, the answer does not change while the app runs.
const LIQUID_GLASS = isLiquidGlassAvailable()

/** Whether `GlassSurface` draws real Liquid Glass here (iOS 26 and later); false on Android and older iOS. */
export const LIQUID_GLASS_AVAILABLE = LIQUID_GLASS

type GlassSurfaceProps = {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  tone?: GlassSurfaceTone
  intensity?: number
  pointerEvents?: "auto" | "none" | "box-none" | "box-only"
  /** Liquid Glass reacts to touch (press shimmer): for a surface that is itself a button. */
  interactive?: boolean
}

/**
 * DS-15 (UX audit, Phase 12): floating map and card controls get real Liquid-Glass blur
 * (`expo-blur`, already installed) instead of a flat translucent `rgba` fill
 * (`brandTranslucentPanel`, `heroScrimOnDark`). `tone="auto"` (default) follows the app's own
 * light/dark theme, for a panel floating over ordinary app chrome (a card, a bottom sheet).
 * `tone="dark"` stays dark glass regardless of the app theme, for a control floating over a map or
 * photo — that backdrop doesn't invert with the theme, so its glass shouldn't either; matches the
 * fixed dark treatment `brandOnDarkColors`/`brandMediaBackdrop` already use on those same surfaces.
 *
 * On iOS 26 and later the surface is real Liquid Glass (`expo-glass-effect`), which refracts the
 * map behind it and follows the system light/dark look; older iOS and Android keep the blur.
 *
 * `style` should carry layout/shape only (radius, border, padding, position) — this component owns
 * `backgroundColor` and `overflow` so the blur is actually visible and clipped to the shape.
 */
export function GlassSurface({
  children,
  style,
  tone = "auto",
  intensity = 46,
  pointerEvents,
  interactive = false,
}: GlassSurfaceProps) {
  const { scheme } = useBrandTheme()
  const isDark = tone === "dark" || scheme === "dark"

  if (LIQUID_GLASS) {
    // Real Liquid Glass draws its own edge: an outline from the caller breaks the effect.
    return (
      <GlassView
        style={[styles.container, withoutOutline(style)]}
        pointerEvents={pointerEvents}
        glassEffectStyle="regular"
        colorScheme={isDark ? "dark" : "light"}
        isInteractive={interactive}
      >
        {children}
      </GlassView>
    )
  }

  // Static keyed fills: `tone="dark"` overrides the app scheme. Android gets the higher-alpha flat
  // fill because expo-blur draws no real blur there (D-17).
  const fills = Platform.OS === "android" ? brandGlassFills.android : brandGlassFills.control
  const overlayFill = fills[isDark ? "dark" : "light"]

  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={intensity}
        tint={isDark ? "dark" : "light"}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayFill }]} />
      {children}
    </View>
  )
}

const OUTLINE_KEYS = [
  "borderWidth",
  "borderColor",
  "borderTopWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderRightWidth",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
] as const

/** The caller's style without its outline (width and colour), the rest kept. */
function withoutOutline(style: StyleProp<ViewStyle>): ViewStyle {
  const flat: Record<string, unknown> = { ...(StyleSheet.flatten(style) ?? {}) }
  for (const key of OUTLINE_KEYS) delete flat[key]
  return flat as ViewStyle
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
})
