import { useId } from "react"
import { StyleSheet, View } from "react-native"
import { Defs, LinearGradient, Stop, Svg, TSpan, Text as SvgText } from "react-native-svg"
import { brandTypography } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { numeralGeometry } from "../app/visual-tokens"
import { AppText } from "./AppText"

export type NumeralRenderMode = "gradient" | "solid"

/**
 * The single switch for every score numeral. "gradient" draws the white to light-sage gradient
 * through SVG text; if the device spike shows the gradient text misrenders, set "solid" and every
 * numeral falls back to the plain light-sage colour (RESEARCH A3, Pitfall 5).
 */
export const NUMERAL_RENDER_MODE: NumeralRenderMode = "gradient"

const UNIT_GAP = 6

type GradientNumeralProps = {
  value: number | null
  /** Catalogue text such as the "out of 50" unit; this file holds no literal text. */
  unit: string
  mode?: NumeralRenderMode
  testID?: string
}

/**
 * The score numeral of the forest card (Sora Light 68, white to #C8DDA0 gradient, sage unit).
 * Decoration for assistive tech: the parent card owns the one accessibility label. SVG text does
 * not follow Dynamic Type (UI-SPEC Typography exception).
 */
export function GradientNumeral({
  value,
  unit,
  mode = NUMERAL_RENDER_MODE,
  testID,
}: GradientNumeralProps) {
  const theme = useBrandTheme()
  const rawId = useId()

  if (value === null) return null

  if (mode === "solid") {
    return (
      <View style={styles.row} testID={testID}>
        <AppText
          accessible={false}
          style={[brandTypography.numeral, { color: theme.visual.forest.numeralFallback }]}
        >
          {value}
        </AppText>
        <AppText
          accessible={false}
          style={[brandTypography.numeralUnit, styles.unit, { color: theme.visual.forest.sage }]}
        >
          {unit}
        </AppText>
      </View>
    )
  }

  const gradientId = `numeral-${rawId.replace(/[^A-Za-z0-9_-]/g, "")}`
  const width = String(value).length * numeralGeometry.digitWidth + numeralGeometry.unitWidth

  return (
    <Svg
      width={width}
      height={numeralGeometry.height}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.visual.forest.numeralTop} />
          <Stop offset="1" stopColor={theme.visual.forest.numeralBottom} />
        </LinearGradient>
      </Defs>
      <SvgText
        x={0}
        y={numeralGeometry.baseline}
        fontFamily={brandTypography.numeral.fontFamily}
        fontSize={brandTypography.numeral.fontSize}
        letterSpacing={brandTypography.numeral.letterSpacing}
        fill={`url(#${gradientId})`}
      >
        {value}
        <TSpan
          dx={UNIT_GAP}
          fontFamily={brandTypography.numeralUnit.fontFamily}
          fontSize={brandTypography.numeralUnit.fontSize}
          letterSpacing={0}
          fill={theme.visual.forest.sage}
        >
          {unit}
        </TSpan>
      </SvgText>
    </Svg>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end" },
  unit: { marginLeft: UNIT_GAP },
})
