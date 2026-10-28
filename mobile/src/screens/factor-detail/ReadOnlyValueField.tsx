import { useMemo } from "react"
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native"
import {
  brandComponentTokens,
  brandRadius,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { AppText as Text } from "../../ui/AppText"

type ReadOnlyValueFieldProps = {
  label: string
  /** What the box shows. */
  value: string
  /** What a screen reader says for the whole block: "label, value". */
  accessibilityLabel: string
  /** The field's error, shown once the observer has been there (same rule as a typed field). */
  error?: string | null
  containerStyle?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
  testID?: string
}

/**
 * A figure the form derives and the observer cannot type (follow-up 32-24: F's trees per hectare,
 * the sum of the group counters). It is drawn as a value, not as an input: no text input, nothing
 * focusable, no keyboard. One accessible element reads "label, value".
 */
export function ReadOnlyValueField({
  label,
  value,
  accessibilityLabel,
  error,
  containerStyle,
  labelStyle,
  testID,
}: ReadOnlyValueFieldProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <View
      style={[styles.container, containerStyle]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <View style={styles.box}>
        <Text style={styles.value}>{value}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      gap: brandComponentTokens.field.gap,
    },
    label: {
      ...brandTypography.label,
      color: theme.colors.textPrimary,
    },
    // A quiet filled box, no hairline and no focus state: it reads as a value, not as an input.
    box: {
      borderRadius: brandRadius.field,
      minHeight: brandComponentTokens.field.minHeight,
      paddingHorizontal: brandComponentTokens.field.horizontalPadding,
      paddingVertical: brandComponentTokens.field.verticalPadding,
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    value: {
      ...brandTypography.input,
      fontSize: brandTypeScale.subhead.fontSize,
      lineHeight: 18,
      fontWeight: "500",
      fontVariant: ["tabular-nums"],
      color: theme.colors.textPrimary,
    },
    error: {
      ...brandTypography.meta,
      color: theme.componentColors.field.borderError,
    },
  })
}
