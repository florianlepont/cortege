import { useMemo } from "react"
import { StyleSheet, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { AppPressable } from "../AppPressable"

const GLYPH_SIZE = 20
const CLEAR_GLYPH_SIZE = 18

type ChoiceSearchFieldProps = {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  a11yLabel: string
  clearLabel: string
  testID: string
}

/**
 * The filter field above a long choice list (follow-up 32-30): a leading magnifier, the text and a
 * clear cross once something is typed, on the quiet control fill (no border, no glass). It filters
 * as you type, so there is no submit.
 */
export function ChoiceSearchField({
  value,
  onChangeText,
  placeholder,
  a11yLabel,
  clearLabel,
  testID,
}: ChoiceSearchFieldProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.field}>
      <Ionicons name="search-outline" size={GLYPH_SIZE} color={theme.colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={100}
        accessibilityRole="search"
        accessibilityLabel={a11yLabel}
        testID={testID}
      />
      {value.length > 0 ? (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText("")}
          style={styles.clearButton}
          testID={`${testID}-clear`}
        >
          <Ionicons
            name="close-circle-outline"
            size={CLEAR_GLYPH_SIZE}
            color={theme.colors.textSecondary}
          />
        </AppPressable>
      ) : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      minHeight: brandInteraction.hitTarget.min,
      borderRadius: brandRadius.badgeSm,
      backgroundColor: theme.visual.control.fill,
      paddingLeft: brandSpacing4.smd,
      paddingRight: brandSpacing4.xs,
    },
    input: {
      flex: 1,
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
      paddingVertical: 0,
    },
    clearButton: {
      width: brandInteraction.hitTarget.min,
      height: brandInteraction.hitTarget.min,
      alignItems: "center",
      justifyContent: "center",
    },
  })
}
