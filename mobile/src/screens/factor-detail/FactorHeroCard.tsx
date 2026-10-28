import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppGroupedContainer } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"

const t = fr.factorDetail.dmhList

const NUMERAL_SIZE = 44
const NUMERAL_LINE = 50
const PILL_GLYPH_SIZE = 16

type DmhHeroCardProps = {
  /** F's stored trees per hectare as text ("" while nothing is derived). */
  treesPerHaText: string
  /** At least one group has a count: an empty figure then reads "À calculer", not 0. */
  counted: boolean
  /** Counted in full: the figure comes from the described surface, not from the sum alone. */
  countedInFull: boolean
  /** The evaluation retains F's highest score: the quiet "Maximum" pill shows. */
  topScoreReached: boolean
}

/**
 * Factor F's "Arbres par hectare" (follow-up 32-27, owner mockup "Proposition 1"): a read-only hero
 * card right under the intro paragraph. The big figure and its label hug each other on the left,
 * the quiet "Maximum" pill with a check closes the row once the top score is reached (the max-score
 * toast is the pager's). It is never an input: the figure is only the sum of the counted trees. One
 * container level (`AppGroupedContainer`, the glass card tokens of the redesign) and one spoken
 * element, "Arbres par hectare, N", with "Score maximal atteint" as its hint at the top.
 */
export function DmhHeroCard({
  treesPerHaText,
  counted,
  countedInFull,
  topScoreReached,
}: DmhHeroCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  // The stored figure shows (an older typed number stays until a counter replaces it); with nothing
  // stored it is 0, or "À calculer" once a count exists but no figure can be derived (counted in
  // full without a surface).
  const empty = treesPerHaText.trim() === ""
  const pending = empty && counted
  const shown = empty ? (counted ? t.treesPerHaPending : "0") : treesPerHaText

  return (
    <AppGroupedContainer>
      <View
        style={styles.card}
        accessible
        accessibilityRole="text"
        accessibilityLabel={t.treesPerHaA11y({ value: shown })}
        accessibilityHint={topScoreReached ? t.topScoreHint : undefined}
        testID="trees-per-ha-value"
      >
        <Text style={pending ? styles.pending : styles.numeral} numberOfLines={1}>
          {shown}
        </Text>
        <View style={styles.labels}>
          <Text style={styles.label}>{t.hero.label}</Text>
          <Text style={styles.sub}>{countedInFull ? t.hero.subFull : t.hero.subCapped}</Text>
        </View>
        {topScoreReached ? (
          <View style={styles.pill} testID="trees-top-score-trace">
            <Ionicons
              name="checkmark-circle-outline"
              size={PILL_GLYPH_SIZE}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.pillText}>{t.topScoreTrace}</Text>
          </View>
        ) : null}
      </View>
    </AppGroupedContainer>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: brandSpacing4.smd,
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
    },
    // The forest ink of the theme (forest in light, the primary ink in dark), tabular figures.
    numeral: {
      fontFamily: brandTypography.screenTitle.fontFamily,
      fontSize: NUMERAL_SIZE,
      lineHeight: NUMERAL_LINE,
      letterSpacing: -1,
      fontVariant: ["tabular-nums"],
      color: theme.semanticColors.textStrong,
    },
    // No figure to show yet: the words stand in the figure's place, at the title size.
    pending: {
      ...brandTypeScale.title2,
      fontFamily: brandTypography.screenTitle.fontFamily,
      color: theme.semanticColors.textStrong,
    },
    labels: {
      flexShrink: 1,
    },
    label: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.input.fontFamily,
      color: theme.colors.textPrimary,
    },
    sub: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    // The quiet trace of the top score: a check and the word on the soft control fill.
    pill: {
      marginLeft: "auto",
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
      paddingVertical: brandSpacing4.xs,
      paddingHorizontal: brandSpacing4.sm,
      borderRadius: brandRadius.pill,
      backgroundColor: theme.visual.control.fill,
    },
    pillText: {
      ...brandTypeScale.footnote,
      fontFamily: brandTypography.input.fontFamily,
      color: theme.colors.textSecondary,
    },
  })
}
