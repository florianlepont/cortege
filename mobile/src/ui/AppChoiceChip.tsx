import { useMemo } from "react"
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import {
  brandColors,
  brandComponentTokens,
  brandRadius,
  brandSpacing,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { feedback } from "./feedback"
import { AppPressable } from "./AppPressable"

export type AppChoiceChipTone = "neutral" | "success" | "warning" | "danger"
export type AppStatusChipTone = AppChoiceChipTone | "onDark"

type AppChoiceChipProps = {
  /** "choice" (default): the selectable pill. */
  variant?: "choice"
  label: string
  active?: boolean
  tone?: AppChoiceChipTone
  onPress?: () => void
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
}

type AppStatusChipProps = {
  /** "status": a non-interactive status pill (a plain View, no role), with its own tones. */
  variant: "status"
  label: string
  tone?: AppStatusChipTone
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
}

/**
 * The one chip. Variants:
 * - "choice" (default): a selectable pill, 44 pt high, with a selection haptic. Without `onPress`
 *   it is a disabled, dimmed button.
 * - "status": a compact, non-interactive pill (padding 9 x 5, glass hairline) with the tones
 *   neutral, success, warning, danger and onDark; the success label is forest in light for AA.
 */
export function AppChoiceChip(props: AppChoiceChipProps | AppStatusChipProps) {
  if (props.variant === "status") return <StatusChip {...props} />
  return <ChoiceChip {...props} />
}

function StatusChip({ label, tone = "neutral", style, labelStyle }: AppStatusChipProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.statusBase, styles[`status_${tone}`], style]}>
      <Text
        style={[
          styles.statusLabel,
          tone === "success" && styles.statusLabelSuccess,
          tone === "onDark" && styles.statusLabelOnDark,
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

function ChoiceChip({
  label,
  active = false,
  tone = "neutral",
  onPress,
  accessibilityLabel,
  style,
  labelStyle,
}: Omit<AppChoiceChipProps, "variant">) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const isInteractive = typeof onPress === "function"
  // Principle 7: a selection tick on every interactive press, then the caller's handler.
  const handlePress = onPress
    ? () => {
        feedback.selection()
        onPress()
      }
    : undefined

  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !isInteractive, selected: active }}
      disabled={!isInteractive}
      onPress={handlePress}
      style={[
        styles.base,
        isInteractive ? null : styles.static,
        styles[tone],
        active ? styles.active : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          !isInteractive ? styles.labelStatic : null,
          active ? styles.labelActive : null,
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </AppPressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      minHeight: brandComponentTokens.choiceChip.minHeight,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.chip.border,
      backgroundColor: theme.visual.chip.fill,
      paddingHorizontal: brandSpacing.sm,
      paddingVertical: 7,
      alignItems: "center",
      justifyContent: "center",
    },
    neutral: {},
    success: {
      backgroundColor: theme.componentColors.choiceChip.successBackground,
    },
    warning: {
      backgroundColor: theme.componentColors.choiceChip.warningBackground,
    },
    danger: {
      backgroundColor: theme.componentColors.choiceChip.dangerBackground,
    },
    active: {
      borderColor: theme.visual.chip.activeBg,
      backgroundColor: theme.visual.chip.activeBg,
    },
    static: {
      opacity: 0.76,
    },
    label: {
      ...brandTypography.meta,
      color: theme.visual.chip.text,
    },
    labelStatic: {
      color: theme.componentColors.choiceChip.staticText,
    },
    labelActive: {
      color: theme.visual.chip.activeText,
    },
    // Status variant. Phase 12.2: a glass hairline on every tone; the tone only changes the fill.
    statusBase: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    status_neutral: {
      backgroundColor: theme.visual.chip.fill,
    },
    status_success: {
      backgroundColor: theme.componentColors.statusChip.successBackground,
    },
    status_warning: {
      backgroundColor: theme.componentColors.statusChip.warningBackground,
    },
    status_danger: {
      backgroundColor: theme.componentColors.statusChip.dangerBackground,
    },
    status_onDark: {
      borderColor: theme.componentColors.statusChip.onDarkBorder,
      backgroundColor: theme.componentColors.statusChip.onDarkBackground,
    },
    statusLabel: {
      ...brandTypography.meta,
      color: theme.componentColors.statusChip.textColor,
    },
    // The sketch's success green fails AA on the soft fill: forest in light (UI-SPEC forbidden list).
    statusLabelSuccess: {
      color:
        theme.scheme === "dark" ? theme.componentColors.statusChip.textColor : brandColors.forest,
    },
    statusLabelOnDark: {
      color: theme.componentColors.statusChip.onDarkTextColor,
    },
  })
}
