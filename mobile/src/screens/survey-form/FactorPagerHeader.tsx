import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { FACTOR_TITLES } from "../../app/constants"
import type { FactorClass } from "@cortege/ibp-domain"
import type { FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { CountingModeChip } from "../factor-detail/CountingModeStrip"

const t = fr.factorPager

// D-05: the running total pill is 36 pt high; the title row keeps that height.
export const TOTAL_CHIP_HEIGHT = 36

type FactorPagerHeaderProps = {
  factor: FactorKey
  /** The survey's running total, out of 50. */
  total: number
  /** The active factor's retained class (the package's evaluation); null until it has one. */
  retainedClass: FactorClass | null
  /** Phase 30 (D-07): the factor is counted in full, the badge goes under the title row. */
  countedInFull: boolean
}

/**
 * OA-98: the slim title row of the factor pager, under the transparent native header: the factor's
 * name on the left; on the right the class of the active factor (follow-up 32-24, for every factor
 * A to J, a small neutral pill) and the survey's running total. With a class the two are one
 * element for a screen reader ("Classe 5, total du relevé 27 sur 50"); without one only the total
 * shows, as before.
 */
export function FactorPagerHeader({
  factor,
  total,
  retainedClass,
  countedInFull,
}: FactorPagerHeaderProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const scoreGroup =
    retainedClass === null
      ? {}
      : {
          accessible: true,
          accessibilityLabel: t.classWithTotalA11y({ retainedClass, points: total }),
        }
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {/* OA-35: a long name ("Milieux ouverts florifères") shrinks to fit a narrow phone
         * instead of ending in an ellipsis. */}
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
        <View style={styles.scoreGroup} testID="pager-score-group" {...scoreGroup}>
          {retainedClass === null ? null : (
            <View testID="pager-class">
              <AppChoiceChip
                variant="status"
                tone="neutral"
                label={t.classLabel({ retainedClass })}
                labelStyle={styles.classText}
              />
            </View>
          )}
          <View
            style={styles.totalChip}
            accessible={retainedClass === null}
            accessibilityLabel={t.totalA11y(total)}
            testID="pager-total"
          >
            <Text style={styles.totalChipText}>{t.total(total)}</Text>
          </View>
        </View>
      </View>
      {countedInFull ? <CountingModeChip /> : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
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
    // The screen title role (Sora SemiBold 24 on 28): its line is shorter than the 36 pt total
    // pill, so the row keeps its height (D-05).
    title: {
      flex: 1,
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    // The class and the total sit together at the end of the row, the class first.
    scoreGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    // Tabular figures so the pill does not jiggle when the class changes from 2 to 5.
    classText: {
      fontVariant: ["tabular-nums"],
    },
    // The running total is a small forest pill (variant I): forest gradient over its flat
    // fallback, white figures, a light hairline, no drop shadow. Same 36 pt height and padding.
    // The hairline is an inset ring, never a border on the gradient view (12.2-17, see ForestCard).
    totalChip: {
      height: TOTAL_CHIP_HEIGHT,
      borderRadius: brandRadius.pill,
      paddingHorizontal: brandSpacing4.smd,
      justifyContent: "center",
      backgroundColor: theme.visual.forest.fallback,
      experimental_backgroundImage: theme.visual.forest.image,
      boxShadow: theme.visual.forest.ring,
    },
    totalChipText: {
      fontSize: brandTypeScale.subhead.fontSize,
      lineHeight: 20,
      fontFamily: brandTypography.button.fontFamily,
      fontVariant: ["tabular-nums"],
      color: theme.visual.forest.title,
    },
  })
}
