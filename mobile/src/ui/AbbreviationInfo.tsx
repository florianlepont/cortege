import { Ionicons } from "@expo/vector-icons"
import { useMemo, useState } from "react"
import { StyleSheet } from "react-native"
import { brandInteraction, brandSpacing4, brandTypeScale } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import type { AbbreviationTerm } from "../i18n/fr/abbreviations"
import { AppPressable } from "./AppPressable"
import { AppText as Text } from "./AppText"
import { InfoSheet } from "./InfoSheet"

/** Glyph size of the info control; the hit slop brings the touch target up to 44 pt around it. */
export const ABBREVIATION_INFO_ICON_SIZE = 20

export type AbbreviationInfoProps = {
  term: AbbreviationTerm
  /** `icon`: the glyph alone, beside a title. `row`: the glyph and a visible label, under a title. */
  variant?: "icon" | "row"
  /** Glyph colour, for a control over a map (map-control ink); the accent by default. */
  iconColor?: string
  testID?: string
}

/**
 * D-04: where an abbreviation cannot be written out, a tappable info control opens a small native
 * sheet (`InfoSheet`) with the long form and a short explanation, both read from the shared catalogue entry
 * `fr.abbreviations.terms[term]`. The sheet is mounted only while open, so a screen that renders
 * the control mounts no Modal until it is pressed.
 */
export function AbbreviationInfo({
  term,
  variant = "icon",
  iconColor,
  testID,
}: AbbreviationInfoProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [open, setOpen] = useState(false)
  const entry = fr.abbreviations.terms[term]
  const label = fr.abbreviations.sheet.open({ term })
  const glyph = (
    <Ionicons
      name="information-circle-outline"
      size={ABBREVIATION_INFO_ICON_SIZE}
      color={iconColor ?? theme.semanticColors.accent}
    />
  )
  const close = () => setOpen(false)
  const slop = (brandInteraction.hitTarget.min - ABBREVIATION_INFO_ICON_SIZE) / 2

  return (
    <>
      {variant === "row" ? (
        <AppPressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID={testID ?? `abbreviation-info-${term}`}
          disableScale
          style={styles.row}
        >
          {glyph}
          <Text style={styles.rowLabel}>{label}</Text>
        </AppPressable>
      ) : (
        <AppPressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={label}
          testID={testID ?? `abbreviation-info-${term}`}
          disableScale
          hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
        >
          {glyph}
        </AppPressable>
      )}
      <InfoSheet
        open={open}
        title={entry.long}
        eyebrow={term}
        body={entry.explanation}
        closeLabel={fr.abbreviations.sheet.close}
        onClose={close}
      />
    </>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: brandSpacing4.xs,
      minHeight: brandInteraction.hitTarget.min,
    },
    rowLabel: { ...brandTypeScale.subhead, color: theme.semanticColors.accent },
  })
}
