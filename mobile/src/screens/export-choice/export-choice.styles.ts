import { Platform, StyleSheet } from "react-native"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"

// UI-SPEC A.2: the sheet's horizontal padding, a multiple of 4 like the finish sheet.
const SHEET_PADDING_X = 20
// UI-SPEC U-04: a plain static opacity on the whole disabled card.
const DIMMED_OPACITY = 0.55

type Insets = { top: number; bottom: number }

/**
 * Phase 33: styles of the export choice sheet. Spacing on the 4-grid (UI-SPEC A.2): 16 between the
 * title and the picker, 12 between the two cards and above the draft sentence, 24 above the
 * buttons, 8 between the buttons. Colours only through the theme.
 */
export function createExportChoiceStyles(theme: BrandTheme, insets: Insets) {
  return StyleSheet.create({
    sheet: {
      flex: 1,
      backgroundColor: theme.semanticColors.backgroundCanvas,
    },
    content: {
      paddingHorizontal: SHEET_PADDING_X,
      // The Android modal has no header: the title sits under the status bar.
      paddingTop: brandSpacing4.md + (Platform.OS === "android" ? insets.top : 0),
      paddingBottom: brandSpacing4.lg + insets.bottom,
    },
    title: {
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    picker: {
      marginTop: brandSpacing4.md,
    },
    group: {
      gap: brandSpacing4.smd,
    },
    dimmed: {
      opacity: DIMMED_OPACITY,
    },
    // The slot itself is empty on a submitted survey: the margin lives on the row.
    draftNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.sm,
      marginTop: brandSpacing4.smd,
    },
    draftText: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    buttons: {
      marginTop: brandSpacing4.lg,
      gap: brandSpacing4.sm,
    },
  })
}

export type ExportChoiceStyles = ReturnType<typeof createExportChoiceStyles>
