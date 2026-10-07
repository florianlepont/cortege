import { ReactNode, useMemo } from "react"
import { PressableProps, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../../app/theme"
import { AppText as Text } from "../../ui/AppText"
import { RipplePressable } from "../../ui/RipplePressable"
import { createRowStyles } from "./row-styles"

export type SurveyRowTone = "neutral" | "success" | "warning" | "danger"

export type SurveyRowFrameProps = Omit<PressableProps, "style" | "children"> & {
  /** Colour of the 4 pt accent bar on the left (transparent for neutral, N-06). */
  tone?: SurveyRowTone
  selected?: boolean
  /** The ring, drawn in a 40 pt column on the trailing side of the row, vertically centred. */
  indicator: ReactNode
  title: string
  /** The line under the title: at least as tall as a status chip, so every row has the same height. */
  status: ReactNode
  /** An optional error or support line under the status. */
  support?: string | null
}

/**
 * The one box of a survey row (D-23): the glass card, the accent bar, the title, the status line and the
 * trailing ring column. "Mes relevés" rows and community rows (search) both render it, so they have the
 * same outer size, padding, ring size, text roles and minimum height by construction; each row
 * only supplies its own content.
 */
export function SurveyRowFrame({
  tone = "neutral",
  selected = false,
  indicator,
  title,
  status,
  support,
  ...pressableProps
}: SurveyRowFrameProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createRowStyles(theme), [theme])
  const accentStyle = {
    success: styles.surveyCardAccentSuccess,
    warning: styles.surveyCardAccentWarning,
    danger: styles.surveyCardAccentDanger,
    neutral: styles.surveyCardAccentNeutral,
  }[tone]

  return (
    // The press feedback is the green wave of `RipplePressable` (D-21), not a pressed fill.
    <RipplePressable
      accessibilityRole="button"
      {...pressableProps}
      style={[styles.surveyCard, selected ? styles.surveyCardSelected : null]}
    >
      {/* Accent bar: transparent for neutral (N-06) */}
      <View style={[styles.surveyCardAccent, accentStyle]} />

      <View style={styles.surveyCardContent}>
        <View style={styles.surveyCardHeader}>
          <Text numberOfLines={2} style={styles.surveyCardTitle}>
            {title}
          </Text>
          {selected ? (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={theme.colors.forest}
              style={styles.surveyCardSelectedIcon}
            />
          ) : null}
        </View>

        <View style={styles.surveyCardStatusRow}>{status}</View>

        {support ? (
          <Text numberOfLines={2} style={styles.surveyCardSupport}>
            {support}
          </Text>
        ) : null}
      </View>

      {/* D-27: the ring sits on the trailing side, centred on the row, one end margin from the edge. */}
      <View style={styles.surveyCardIndicator}>{indicator}</View>
    </RipplePressable>
  )
}
