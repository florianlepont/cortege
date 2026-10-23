import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import type { RouteReasonCode } from "@cortege/ibp-domain"
import { brandInteraction } from "../../app/brand-tokens"
import { ROUTE_REASON_TEXT } from "../../app/route-text"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { ABBREVIATION_INFO_ICON_SIZE } from "../../ui/AbbreviationInfo"
import { AppPressable } from "../../ui/AppPressable"
import { InfoSheet } from "../../ui/InfoSheet"

/** The most reasons shown (spec section 5: the package returns at most four). */
const MAX_REASONS = 4

export type ReasonsInfoProps = {
  /** The package's reason codes, in its order. */
  reasons: readonly RouteReasonCode[]
  /** The glyph's ink on the forest card. */
  color?: string
}

/**
 * "Pourquoi ce conseil ?" (ROADMAP criterion 2), behind an information glyph on the suggestion
 * instead of a card of its own (owner check, Phase 30: too much text on the screen). The sheet
 * lists one plain-French sentence per reason code of the package, in its order. The sentences are
 * static catalogue text keyed by the code (`ROUTE_REASON_TEXT`), so nothing here explains a rule of
 * its own.
 */
export function ReasonsInfo({ reasons, color }: ReasonsInfoProps) {
  const theme = useBrandTheme()
  const [open, setOpen] = useState(false)
  const slop = (brandInteraction.hitTarget.min - ABBREVIATION_INFO_ICON_SIZE) / 2
  if (reasons.length === 0) return null

  return (
    <>
      <AppPressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={fr.routeGuide.suggestion.reasonsTitle}
        testID="route-reasons-info"
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
        title={fr.routeGuide.suggestion.reasonsTitle}
        body={reasons
          .slice(0, MAX_REASONS)
          .map((code) => ROUTE_REASON_TEXT[code])
          .join("\n\n")}
        closeLabel={fr.routeGuide.glossary.close}
        onClose={() => setOpen(false)}
        testID="route-reasons"
      />
    </>
  )
}
