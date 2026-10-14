import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { brandInteraction } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { ABBREVIATION_INFO_ICON_SIZE } from "./AbbreviationInfo"
import { AppPressable } from "./AppPressable"
import { InfoSheet } from "./InfoSheet"

export type GlossaryTermId = keyof typeof fr.routeGuide.glossary.terms

export type GlossaryInfoProps = {
  term: GlossaryTermId
  /**
   * The glyph's ink, for a glyph on a dark surface (the suggestion's forest card, `forest.titleAccent`);
   * the accent of the theme by default, which is for the glass cards.
   */
  color?: string
  testID?: string
}

/**
 * Phase 30, spec section 3 and O-12: next to a word of the official method ("parcours en plein",
 * "relevé plafonné", "peuplement"...), a 20 pt information glyph in the accent, with a 44 pt hit
 * area, opens the shared `InfoSheet` with the term and its plain-French sentence from
 * `fr.routeGuide.glossary.terms`. Same glyph size and hit slop as `AbbreviationInfo`. The sheet is
 * mounted only while open.
 */
export function GlossaryInfo({ term, color, testID }: GlossaryInfoProps) {
  const theme = useBrandTheme()
  const [open, setOpen] = useState(false)
  const entry = fr.routeGuide.glossary.terms[term]
  const slop = (brandInteraction.hitTarget.min - ABBREVIATION_INFO_ICON_SIZE) / 2

  return (
    <>
      <AppPressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={fr.routeGuide.a11y.glossaryInfo(entry.term)}
        testID={testID ?? `glossary-info-${term}`}
        disableScale
        hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      >
        <Ionicons
          name="information-circle-outline"
          size={ABBREVIATION_INFO_ICON_SIZE}
          color={color ?? theme.semanticColors.accent}
        />
      </AppPressable>
      <InfoSheet
        open={open}
        title={entry.term}
        body={entry.text}
        closeLabel={fr.routeGuide.glossary.close}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
