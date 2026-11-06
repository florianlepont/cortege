import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { allowedScoresFor } from "@cortege/ibp-domain"
import { AppText as Text } from "../../ui/AppText"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { FACTOR_TITLES } from "../../app/constants"
import type { FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { CountingModeChip } from "../factor-detail/CountingModeStrip"

const t = fr.factorPager

// D-05 (follow-up 32-26, owner variant B): the score capsule is 40 pt high; the title row keeps it.
export const TOTAL_CHIP_HEIGHT = 40

type FactorPagerHeaderProps = {
  factor: FactorKey
  /** The survey's running total, out of 50. */
  total: number
  /** The active factor's retained score (the package's evaluation); null until it has one. */
  factorScore: number | null
  /** Phase 30 (D-07): the factor is counted in full, the badge goes under the title row. */
  countedInFull: boolean
}

/**
 * OA-98: the slim title row of the factor pager, under the transparent native header: the factor's
 * name on the left; on the right one capsule in two halves (follow-up 32-26, for every factor A to
 * J): the factor's score out of its highest allowed score on forest green, then the survey's
 * running total on a card. Without a score yet only the total half shows. With both, one element
 * for a screen reader ("Score du facteur 5 sur 5, total du relevé 27 sur 50").
 */
export function FactorPagerHeader({
  factor,
  total,
  factorScore,
  countedInFull,
}: FactorPagerHeaderProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  // Read from the package, never a literal: each factor is scored up to its highest allowed score.
  const max = Math.max(...allowedScoresFor(factor))
  const group =
    factorScore === null
      ? {}
      : {
          accessible: true,
          accessibilityLabel: t.scoreWithTotalA11y({ score: factorScore, max, points: total }),
        }
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {/* OA-35: a long name ("Milieux ouverts florifères") shrinks to fit a narrow phone
         * instead of ending in an ellipsis; the capsule never shrinks, the title does first. */}
        <Text
          style={styles.title}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          accessibilityRole="header"
          accessibilityLabel={FACTOR_TITLES[factor]}
        >
          {t.pageTitles[factor]}
        </Text>
        <View style={styles.capsule} testID="pager-score-group" {...group}>
          {factorScore === null ? null : (
            <View style={styles.factorHalf} testID="pager-factor-score">
              <Text style={styles.factorValue}>{t.factorScore({ score: factorScore, max })}</Text>
              <Text style={styles.factorCaption}>{t.factorCaption}</Text>
            </View>
          )}
          <View
            style={styles.totalHalf}
            accessible={factorScore === null}
            accessibilityLabel={t.totalA11y(total)}
            testID="pager-total"
          >
            <Text style={styles.totalValue}>{t.total(total)}</Text>
            <Text style={styles.totalCaption}>{t.totalCaption}</Text>
          </View>
        </View>
      </View>
      {countedInFull ? <CountingModeChip /> : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  const value = {
    fontSize: brandTypeScale.subhead.fontSize,
    lineHeight: 18,
    fontFamily: brandTypography.button.fontFamily,
    fontVariant: ["tabular-nums" as const],
  }
  // 12 pt is the floor of the type scale; the line is tight so the two lines fit the 40 pt.
  const caption = {
    fontSize: brandTypeScale.caption.fontSize,
    lineHeight: 13,
    fontFamily: brandTypography.meta.fontFamily,
  }
  const half = {
    height: TOTAL_CHIP_HEIGHT,
    paddingHorizontal: brandSpacing4.smd,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  }
  return StyleSheet.create({
    // D-19: the route's ScreenFrame already starts the pager below the transparent header (OA-20).
    header: {
      paddingTop: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.md,
      paddingBottom: brandSpacing4.smd,
      gap: brandSpacing4.smd,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    // The screen title role (Sora SemiBold 24 on 28): its line is shorter than the 40 pt capsule,
    // so the row keeps its height (D-05).
    title: {
      flex: 1,
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    // Two halves, one outer radius: the capsule clips them, they touch with no gap.
    capsule: {
      flexDirection: "row",
      height: TOTAL_CHIP_HEIGHT,
      borderRadius: brandRadius.pill,
      overflow: "hidden",
      flexShrink: 0,
    },
    // The factor's score is the forest half (variant I): gradient over its flat fallback, white
    // figures. A gradient view carries no border (12.2-17); the hairline is a ring, not a border.
    factorHalf: {
      ...half,
      backgroundColor: theme.visual.forest.fallback,
      experimental_backgroundImage: theme.visual.forest.image,
      boxShadow: theme.visual.forest.ring,
    },
    factorValue: { ...value, color: theme.visual.forest.title },
    factorCaption: { ...caption, color: theme.visual.forest.titleAccent },
    // The running total is the card half: the glass fill and its hairline, dark ink.
    totalHalf: {
      ...half,
      backgroundColor: theme.visual.glass.cardFill,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
    },
    totalValue: { ...value, color: theme.colors.textPrimary },
    totalCaption: { ...caption, color: theme.colors.textSecondary },
  })
}
