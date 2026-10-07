import { ReactNode, useMemo } from "react"
import { PressableProps, StyleSheet, View } from "react-native"
import { brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { AppText as Text } from "../../ui/AppText"
import { RipplePressable } from "../../ui/RipplePressable"
import { createRowStyles } from "../survey-list/row-styles"
import type { SurveyRowTone } from "../survey-list/SurveyRowFrame"
import { RECENT_LAYOUT } from "./layout-budget"

export type RecentSurveyRowProps = Omit<PressableProps, "style" | "children"> & {
  /** Colour of the 4 pt accent bar on the left (transparent for neutral, like Mes Relevés). */
  tone?: SurveyRowTone
  /** The score ring, at `RECENT_LAYOUT.ringSize`. */
  indicator: ReactNode
  title: string
  /** The second line: a compact status chip and the date. */
  status: ReactNode
}

/**
 * One slim row of "Mes relevés récents" (12.2-14): a flat row, not a card of its own, so the three
 * rows share the one glass card of the section and are told apart by hairlines. It carries the same
 * parts as a row of Mes Relevés (accent bar, ring, title, status and date, the green wave of
 * `RipplePressable`) in 52 pt instead of about 78; Mes Relevés and the search page keep
 * `SurveyRowFrame` at its size (D-23). The wave is clipped by the card, so the rows draw it square.
 */
export function RecentSurveyRow({
  tone = "neutral",
  indicator,
  title,
  status,
  ...pressableProps
}: RecentSurveyRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const rowStyles = useMemo(() => createRowStyles(theme), [theme])
  const accentStyle = {
    success: rowStyles.surveyCardAccentSuccess,
    warning: rowStyles.surveyCardAccentWarning,
    danger: rowStyles.surveyCardAccentDanger,
    neutral: rowStyles.surveyCardAccentNeutral,
  }[tone]

  return (
    <RipplePressable
      accessibilityRole="button"
      {...pressableProps}
      rippleRadius={0}
      style={styles.row}
    >
      <View style={[rowStyles.surveyCardAccent, accentStyle]} />
      <View style={styles.indicator}>{indicator}</View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.statusRow}>{status}</View>
      </View>
    </RipplePressable>
  )
}

const LINE_HEIGHT = brandTypography.input.lineHeight

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: RECENT_LAYOUT.rowHeight,
      paddingVertical: RECENT_LAYOUT.rowPaddingY,
      paddingHorizontal: brandSpacing4.md,
    },
    indicator: {
      width: RECENT_LAYOUT.ringSize,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...brandTypography.input,
      lineHeight: LINE_HEIGHT,
      color: theme.colors.textPrimary,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      minHeight: LINE_HEIGHT,
    },
  })
}
