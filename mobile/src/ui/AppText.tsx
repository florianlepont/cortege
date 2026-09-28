import { forwardRef } from "react"
import { StyleSheet, Text, TextProps } from "react-native"
import { brandDefaultFontFamily, brandFontScaleCaps } from "../app/brand-tokens"

/**
 * The app-wide default `<Text>`. React Native's `Text` has no `defaultProps` to patch (it is a
 * plain function component since RN's Flow/`component` syntax migration), so this wrapper is the
 * only way to guarantee every screen renders in a branded face instead of the OS default (DS-03) —
 * every other `Text` import in `mobile/src` is aliased to this one. A caller that spreads a
 * `brandTypography` role's own `fontFamily` still wins: RN merges style arrays left to right, and
 * the default is placed first.
 *
 * Phase 9 (DS-05): `maxFontSizeMultiplier` defaults to `brandFontScaleCaps.default` so no text in
 * the app scales unbounded under Larger Accessibility Sizes; a caller on a fixed-width layout
 * (a badge, a pill) passes a tighter `brandFontScaleCaps` role explicitly.
 */
export const AppText = forwardRef<Text, TextProps>(function AppText(
  { style, maxFontSizeMultiplier, ...rest },
  ref,
) {
  return (
    <Text
      ref={ref}
      style={[styles.defaultFont, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? brandFontScaleCaps.default}
      {...rest}
    />
  )
})

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: brandDefaultFontFamily,
  },
})
