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
 * inner view that carries the gradient, hairline and inset highlight. The solid fallback colour is
 * always set because an invalid gradient string draws nothing. No `elevation` (it smears grey on
 * Android); below API 28 the card simply has no glow. The card is a container: accessibility
 * labels belong to the caller.
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
      borderCurve: "continuous",
    },
    shellResume: { borderRadius: brandRadius.forestCard },
    shellHero: { borderRadius: brandRadius.forestHero },
    clip: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.visual.forest.hairline,
      backgroundColor: theme.visual.forest.fallback,
      boxShadow: theme.visual.forest.highlight,
      borderCurve: "continuous",
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
