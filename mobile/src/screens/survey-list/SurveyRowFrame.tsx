import { ReactNode, useMemo } from "react"
import { PressableProps, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { AppText as Text } from "../../ui/AppText"
import { RipplePressable } from "../../ui/RipplePressable"
import { RECENT_LAYOUT } from "../home/layout-budget"
import { createRowStyles, SURVEY_CARD_INNER_RADIUS } from "./row-styles"

export type SurveyRowTone = "neutral" | "success" | "warning" | "danger"

export type SurveyRowFrameProps = Omit<PressableProps, "style" | "children"> & {
  /** Colour of the 4 pt accent bar on the left (transparent for neutral, N-06). */
  tone?: SurveyRowTone
  /**
   * "regular" (default): the glass card of Mes Relevés and the search page. "compact": a flat 52 pt
   * row without a card of its own, for the one glass card of "Mes relevés récents" (Accueil); it
   * takes no `selected` and no `support`, shows a one-line title and draws the wave square.
   */
  density?: "regular" | "compact"
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
 * The one box of a survey row (D-23). Variants: `density` "regular" (the glass card) and "compact"
 * (a flat slim row inside a shared card, 12.2-14). The regular box is: the glass card, the accent bar, the title, the status line and the
 * trailing ring column. "Mes relevés" rows and community rows (search) both render it, so they have the
 * same outer size, padding, ring size, text roles and minimum height by construction; each row
 * only supplies its own content.
 */
export function SurveyRowFrame({
  density = "regular",
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
  const compactStyles = useMemo(() => createCompactStyles(theme), [theme])
  const accentStyle = {
    success: styles.surveyCardAccentSuccess,
    warning: styles.surveyCardAccentWarning,
    danger: styles.surveyCardAccentDanger,
    neutral: styles.surveyCardAccentNeutral,
  }[tone]

  if (density === "compact") {
    // The wave is clipped by the shared card, so the rows draw it square.
    return (
      <RipplePressable
        accessibilityRole="button"
        {...pressableProps}
        rippleRadius={0}
        style={compactStyles.row}
      >
        <View style={[styles.surveyCardAccent, accentStyle]} />
        <View style={compactStyles.content}>
          <Text numberOfLines={1} style={compactStyles.title}>
            {title}
          </Text>
          <View style={compactStyles.statusRow}>{status}</View>
        </View>
        {/* D-27: the ring is on the trailing side, like the rows of Mes Relevés. */}
        <View style={compactStyles.indicator}>{indicator}</View>
      </RipplePressable>
    )
  }

  return (
    // The press feedback is the green wave of `RipplePressable` (D-21), not a pressed fill.
    <RipplePressable
      accessibilityRole="button"
      rippleRadius={SURVEY_CARD_INNER_RADIUS}
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
              name="checkmark-circle-outline"
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

const LINE_HEIGHT = brandTypography.input.lineHeight

function createCompactStyles(theme: BrandTheme) {
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
      flexShrink: 0,
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
