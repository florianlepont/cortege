import { Ionicons } from "@expo/vector-icons"
import { useMemo, useState } from "react"
import { Modal, StyleSheet, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"
import {
  brandInteraction,
  brandSpacing,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import type { AbbreviationTerm } from "../i18n/fr/abbreviations"
import { AppPressable } from "./AppPressable"
import { AppText as Text } from "./AppText"

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
 * sheet with the long form and a short explanation, both read from the shared catalogue entry
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
  const reduced = useReducedMotion()
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
      {open ? (
        <Modal
          visible
          animationType={reduced ? "none" : "slide"}
          presentationStyle="pageSheet"
          onRequestClose={close}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                {entry.long}
              </Text>
              <AppPressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel={fr.abbreviations.sheet.close}
                hitSlop={10}
                disableScale
              >
                <Ionicons name="close-outline" size={24} color={theme.semanticColors.accent} />
              </AppPressable>
            </View>
            <View style={styles.body}>
              <Text style={styles.eyebrow}>{term}</Text>
              <Text style={styles.explanation}>{entry.explanation}</Text>
            </View>
          </View>
        </Modal>
      ) : null}
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
    sheet: { flex: 1, backgroundColor: theme.colors.canvas },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
      paddingHorizontal: 20,
      paddingTop: brandSpacing.lg,
      paddingBottom: brandSpacing4.smd,
    },
    title: { ...brandTypography.sectionTitle, flex: 1, color: theme.semanticColors.textStrong },
    body: { paddingHorizontal: 20, paddingBottom: brandSpacing.xl, gap: brandSpacing4.sm },
    eyebrow: { ...brandTypography.meta, color: theme.colors.textSecondary },
    explanation: { ...brandTypography.sectionBody, color: theme.colors.textPrimary },
  })
}
