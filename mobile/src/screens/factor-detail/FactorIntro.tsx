import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandDefaultFontFamily, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"

const t = fr.factorDetail
const intro = fr.factorDetail.dmhList.intro

const INLINE_GLYPH_SIZE = 16
const NBSP = "\u00A0"

// The words of the link are glued with no-break spaces (U+00A0), so the link never splits across
// two lines (follow-up 32-28: the chevron fell alone on the next line). The accessibility label
// keeps the catalogue string with its normal spaces.
const GLUED_LINK_LABEL = t.helpLink.replace(/ /g, NBSP)

type FactorIntroProps = {
  factor: FactorKey
  /** The factor is counted in full: its paragraph says so and names what the cap no longer limits. */
  countedInFull: boolean
  /** Opens the factor's help sheet. */
  onOpenHelp: () => void
}

/** The plain-text sentence of a factor other than F: counted in full, the counting-mode sentence. */
function paragraphFor(factor: Exclude<FactorKey, "F">, countedInFull: boolean): string {
  return countedInFull && factor !== "H" ? t.countingMode[factor] : t.intro[factor]
}

/**
 * The top of every factor page (follow-ups 32-27 and 32-29): one short paragraph on the canvas with
 * no card, saying what to record, and the "Aide au relevé" link ending it inline ("ⓘ Aide au
 * relevé ›", one unbreakable unit) that opens the factor help sheet. Factor F's paragraph is built
 * per counting mode with its cap in semibold; every other factor has one sentence (its
 * counting-mode sentence when it is counted in full, so no caption box stacks above the inputs).
 */
export function FactorIntro({ factor, countedInFull, onOpenHelp }: FactorIntroProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const link = (
    <Text
      style={styles.linkText}
      onPress={onOpenHelp}
      accessibilityRole="link"
      accessibilityLabel={t.helpLink}
      testID="factor-help-link"
    >
      <Ionicons
        name="information-circle-outline"
        size={INLINE_GLYPH_SIZE}
        color={theme.visual.accentText}
      />
      {NBSP}
      {GLUED_LINK_LABEL}
      {NBSP}
      <Ionicons
        name="chevron-forward-outline"
        size={INLINE_GLYPH_SIZE}
        color={theme.visual.accentText}
      />
    </Text>
  )

  if (factor !== "F") {
    return (
      <Text style={styles.paragraph} testID="factor-intro">
        {paragraphFor(factor, countedInFull)} {link}
      </Text>
    )
  }

  const parts = countedInFull ? intro.full : intro.capped
  return (
    <Text style={styles.paragraph} testID="factor-intro">
      {parts.lead}
      <Text style={styles.strong}>{parts.strong}</Text>
      {parts.tail} {link}
    </Text>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    paragraph: {
      ...brandTypeScale.subhead,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textPrimary,
    },
    strong: {
      fontFamily: brandTypography.meta.fontFamily,
    },
    linkText: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.sectionHeader.fontFamily,
      color: theme.visual.accentText,
    },
  })
}
