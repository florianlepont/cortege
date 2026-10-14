import { Platform, StyleSheet } from "react-native"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"

// UI-SPEC Surface 1: the sheet's horizontal padding, a multiple of 4 like the factor help sheet.
const SHEET_PADDING_X = 20

type Insets = { top: number; bottom: number }

/**
 * Phase 29: styles of the finish sheet. Spacing on the 4-grid (UI-SPEC): 16 between the title, the
 * picker and the footnote, 12 above the notice slot, 24 above the buttons, 8 between the buttons.
 * Colours only through the theme.
 */
export function createFinishSheetStyles(theme: BrandTheme, insets: Insets) {
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
    footnote: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      marginTop: brandSpacing4.md,
    },
    // The slot itself has no margin so an empty one adds no space; each notice carries it.
    notice: {
      marginTop: brandSpacing4.smd,
    },
    buttons: {
      marginTop: brandSpacing4.lg,
      gap: brandSpacing4.sm,
    },
  })
}
