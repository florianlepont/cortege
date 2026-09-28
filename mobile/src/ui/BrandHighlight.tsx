/**
 * BrandHighlight — the charter's "highlight" treatment for an editorial badge (§6.1: always
 * uppercase, padding around the word of 0.5x where x is the lowercase x-height). Used for short
 * eyebrow-style labels that call out a section, not for body copy.
 */
import { StyleProp, View, ViewStyle } from "react-native"
import { brandColors, brandFontScaleCaps, brandRadius, brandTypography } from "../app/brand-tokens"
import { AppText } from "./AppText"

type BrandHighlightProps = {
  children: string
  /** Highlight fill. Default: sage (works on both light and dark backgrounds). */
  color?: string
  textColor?: string
  fontSize?: number
  style?: StyleProp<ViewStyle>
}

export function BrandHighlight({
  children,
  color = brandColors.sage,
  textColor = brandColors.forest,
  fontSize = brandTypography.label.fontSize,
  style,
}: BrandHighlightProps) {
  // x-height is approximated at half the font size (no font-metrics API in RN); the charter's
  // "0.5x" padding is then a quarter of the font size on each axis.
  const halfXHeight = fontSize * 0.25

  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          backgroundColor: color,
          borderRadius: brandRadius.badgeSm,
          paddingHorizontal: halfXHeight * 2,
          paddingVertical: halfXHeight,
        },
        style,
      ]}
    >
      <AppText
        style={{
          ...brandTypography.label,
          fontSize,
          color: textColor,
          textTransform: "uppercase",
        }}
        maxFontSizeMultiplier={brandFontScaleCaps.label}
      >
        {children}
      </AppText>
    </View>
  )
}
