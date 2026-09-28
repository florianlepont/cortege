import { useMemo } from "react"
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"

type AppSettingsRowProps = {
  label: string
  value?: string
  onPress: () => void
  accessibilityLabel?: string
  loading?: boolean
  disabled?: boolean
}

export function AppSettingsRow({
  label,
  value,
  onPress,
  accessibilityLabel,
  loading = false,
  disabled = false,
}: AppSettingsRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      android_ripple={{ color: theme.colors.panelMuted }}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {value ? (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
      )}
    </Pressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 48,
      backgroundColor: theme.colors.inputFill,
      borderRadius: brandRadius.field - 6,
      paddingHorizontal: brandSpacing.md - 2,
      paddingVertical: brandSpacing.sm,
      gap: brandSpacing.xs + 2,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowDisabled: {
      opacity: 0.4,
    },
    content: {
      flex: 1,
      gap: 1,
    },
    label: {
      ...brandTypography.label,
      color: theme.semanticColors.textStrong,
    },
    value: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
  })
}
