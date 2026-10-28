import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"

const t = fr.factorDetail
const intro = fr.factorDetail.dmhList.intro

// The help row keeps its 44 pt target (D-05).
export const HELP_LINK_MIN_HEIGHT = 44
const ROW_GLYPH_SIZE = 20
const INLINE_GLYPH_SIZE = 16
const NBSP = "\u00A0"

// The words of the link are glued with no-break spaces (U+00A0), so the link never splits across
// two lines (follow-up 32-28: the chevron fell alone on the next line). The accessibility label
// keeps the catalogue string with its normal spaces.
const GLUED_LINK_LABEL = t.helpLink.replace(/ /g, NBSP)

type FactorIntroProps = {
  factor: FactorKey
  /** Factor F counted in full: its paragraph names the cap that only the score applies. */
  countedInFull: boolean
  /** Opens the factor's help sheet. */
  onOpenHelp: () => void
}

/**
 * The top of every factor page (follow-up 32-27): the "Aide au relevé" link, which opens the factor
 * help sheet. Factor F has an intro paragraph, one paragraph on the canvas with no card, and the
 * link ends it inline ("ⓘ Aide au relevé ›", one unbreakable unit); the other factors have no paragraph, so the link is a
 * slim row of its own. The paragraph is built per counting mode through the catalogue.
 */
export function FactorIntro({ factor, countedInFull, onOpenHelp }: FactorIntroProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (factor !== "F") {
    return (
      <AppPressable
        style={styles.row}
        onPress={onOpenHelp}
        accessibilityRole="button"
        accessibilityLabel={t.helpLink}
        testID="factor-help-link"
      >
        <Ionicons
          name="information-circle-outline"
          size={ROW_GLYPH_SIZE}
          color={theme.visual.accentText}
        />
        <Text style={styles.linkText}>{GLUED_LINK_LABEL}</Text>
        <Ionicons
          name="chevron-forward-outline"
          size={INLINE_GLYPH_SIZE}
          color={theme.visual.accentText}
        />
      </AppPressable>
    )
  }

  const parts = countedInFull ? intro.full : intro.capped
  return (
    <Text style={styles.paragraph} testID="factor-intro">
      {parts.lead}
      <Text style={styles.strong}>{parts.strong}</Text>
      {parts.tail}{" "}
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
    </Text>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      alignSelf: "flex-start",
      minHeight: HELP_LINK_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
    },
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
