import { ReactNode, useMemo } from "react"
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { brandRadius } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { ContourLines } from "./ContourLines"

type ForestCardVariant = "resume" | "hero"

type ForestCardProps = {
  children?: ReactNode
  /** "resume" is the Home resume card (radius 26), "hero" the survey detail score card (28). */
  variant?: ForestCardVariant
  /** Contour signature behind the content. */
  contours?: boolean
  /** Contour drift loop; false draws the static frame (Android, if frames drop). */
  animatedContours?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  testID?: string
}

/**
 * The variant I forest card (D-12): a coloured shadow on an unclipped outer shell and a clipped
 * inner view that carries the gradient, the fallback colour and the edge. The solid fallback colour
 * is always set, on the clipped view only, because an invalid gradient string draws nothing.
 *
 * Layering rules (12.2-17, owner: the flat layer showed past the gradient at the edges):
 * - No `borderWidth` on the gradient view: RN sizes the gradient to the padding box and tiles it
 *   (`background-repeat: repeat`), so a 1 pt border ring shows the opposite edge of the gradient
 *   under the hairline. The hairline is an inset 1 pt ring in `forest.edge` instead.
 * - Circular corners on both views (no `borderCurve`): RN on iOS draws box shadows and the
 *   overflow clip with circular arcs, only the background follows `borderCurve`.
 * - The shell has no background: an outset `boxShadow` is drawn outside the box, around the clip.
 *
 * No `elevation` (it smears grey on Android); below API 28 the card simply has no glow. The card is
 * a container: accessibility labels belong to the caller.
 */
export function ForestCard({
  children,
  variant = "resume",
  contours = true,
  animatedContours = true,
  style,
  contentStyle,
  testID,
}: ForestCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const hero = variant === "hero"

  return (
    <View
      style={[styles.shell, hero ? styles.shellHero : styles.shellResume, style]}
      testID={testID}
    >
      <View style={[styles.clip, hero ? styles.clipHero : styles.clipResume]}>
        {contours ? <ContourLines animated={animatedContours} /> : null}
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    shell: {
      boxShadow: theme.visual.forest.shadow,
    },
    shellResume: { borderRadius: brandRadius.forestCard },
    shellHero: { borderRadius: brandRadius.forestHero },
    clip: {
      overflow: "hidden",
      backgroundColor: theme.visual.forest.fallback,
      boxShadow: theme.visual.forest.edge,
    },
    clipResume: {
      borderRadius: brandRadius.forestCard,
      experimental_backgroundImage: theme.visual.forest.image,
    },
    clipHero: {
      borderRadius: brandRadius.forestHero,
      experimental_backgroundImage: theme.visual.forest.heroImage,
    },
  })
}
