// Why custom: a selectable card with an explanation under its title (the IBP cas, the survey
// visibility); no native card radio exists, and a choice chip has no room for a caption.
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppText as Text } from "./AppText"
import { AppPressable } from "./AppPressable"

export type RadioCardProps = {
  selected: boolean
  onPress: () => void
  title: string
  caption: string
  /** The spoken label of the whole card: it has to stand alone, there is no native group trait. */
  accessibilityLabel: string
  /** A decorative outline glyph before the title (hidden from a screen reader). */
  icon?: keyof typeof Ionicons.glyphMap
  /** Blocks the press without dimming the card: the observer still sees what was chosen. */
  disabled?: boolean
  testID?: string
}

/**
 * One card of a radio group: a filled radio with a checkmark when selected, a 2 pt accent border,
 * a title and a caption. The selected state is carried by the border, the checkmark and the
 * accessibility state, never by colour alone. Extracted from CasPicker (phase 29) so the cas cards
 * and the visibility cards read the same.
 */
export function RadioCard({
  selected,
  onPress,
  title,
  caption,
  accessibilityLabel,
  icon,
  disabled,
  testID,
}: RadioCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <AppPressable
      style={[styles.card, selected ? styles.cardSelected : null]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      testID={testID}
    >
      <View style={[styles.radio, selected ? styles.radioSelected : null]}>
        {selected ? (
          // The ink of the filled radio (12.2-21 dark pass): white on the forest, dark on the
          // dark scheme's light green, where white was 2:1.
          <Ionicons name="checkmark-outline" size={14} color={theme.semanticColors.onCtaPrimary} />
        ) : null}
      </View>
      <View style={styles.copy}>
        {icon ? (
          <View style={styles.titleRow}>
            <Ionicons
              name={icon}
              size={18}
              color={selected ? theme.semanticColors.textStrong : theme.colors.textSecondary}
              accessible={false}
              importantForAccessibility="no"
            />
            <Text style={[styles.title, styles.titleInRow]}>{title}</Text>
          </View>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </AppPressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.smd,
      minHeight: 64,
      padding: 14,
      borderRadius: brandRadius.field,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
    cardSelected: {
      borderWidth: 2,
      borderColor: theme.semanticColors.ctaPrimary,
    },
    radio: {
      width: 22,
      height: 22,
      marginTop: brandSpacing4.xxs,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.textSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: theme.semanticColors.ctaPrimary,
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    copy: {
      flex: 1,
      gap: brandSpacing4.xxs,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    title: {
      ...brandTypography.sectionBody,
      fontFamily: brandTypography.meta.fontFamily,
      color: theme.colors.textPrimary,
    },
    titleInRow: {
      flex: 1,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
