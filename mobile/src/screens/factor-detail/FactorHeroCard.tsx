import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppGroupedContainer } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"

// The quiet pill and its hint are the single copy of the catalogue's top-score strings.
const t = fr.factorDetail.dmhList

const NUMERAL_SIZE = 44
const NUMERAL_LINE = 50
const PILL_GLYPH_SIZE = 16

export type FactorHeroCardProps = {
  /** The figure as shown ("6", "1,5", "3 %"); null while it cannot be given: `pendingText` shows. */
  value: string | null
  /** The word that stands in the figure's place while `value` is null ("À calculer"). */
  pendingText: string
  /** What the figure counts ("genres autochtones"). */
  label: string
  /** Where the figure comes from ("d'après la liste ci-dessous"). */
  subLabel: string
  /** The one spoken element's label ("Arbres par hectare, 6"). */
  accessibilityLabel: string
  /** The factor's retained score is its highest: the quiet "Maximum" pill shows. */
  topScore: boolean
  /** The figure is a word (H's class), set at the title size instead of the 44 pt numeral. */
  textual?: boolean
  testID?: string
  topScoreTestID?: string
}

/**
 * The hero card of a factor page (follow-up 32-27, generalised in 32-29 from factor F's "Arbres par
 * hectare"): a read-only card right under the intro paragraph. The big figure and its label hug each
 * other on the left, the quiet "Maximum" pill with a check closes the row once the top score is
 * reached (the max-score toast is the pager's, and F's only). It is never an input. One container
 * level (`AppGroupedContainer`, the glass card tokens of the redesign) and one spoken element,
 * "label, value", with "Score maximal atteint" as its hint at the top.
 */
export function FactorHeroCard({
  value,
  pendingText,
  label,
  subLabel,
  accessibilityLabel,
  topScore,
  textual = false,
  testID = "factor-hero-value",
  topScoreTestID = "factor-hero-top-score",
}: FactorHeroCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const words = value === null || textual

  return (
    <AppGroupedContainer>
      <View
        style={styles.card}
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={topScore ? t.topScoreHint : undefined}
        testID={testID}
      >
        <Text style={words ? styles.words : styles.numeral} numberOfLines={1}>
          {value ?? pendingText}
        </Text>
        <View style={styles.labels}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.sub}>{subLabel}</Text>
        </View>
        {topScore ? (
          <View style={styles.pill} testID={topScoreTestID}>
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
    // A word stands in the figure's place (no figure yet, or H's class), at the title size.
    words: {
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
