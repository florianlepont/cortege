import { Platform, StyleSheet } from "react-native"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"

// UI-SPEC A.7 (D-20): the sheet's horizontal padding, a multiple of 4 (was 20).
const SHEET_PADDING_X = 24
// UI-SPEC U-04: a plain static opacity on the whole disabled card.
const DIMMED_OPACITY = 0.55

type Insets = { top: number; bottom: number }

/**
 * Phase 33: styles of the export choice sheet. Spacing on the 4-grid (UI-SPEC A.2 and A.7): 24 on
 * the sides and above the title row (D-20), 16 between the title row and the picker, 12 between the
 * two cards and above the draft sentence, 24 above the one button. Colours only through the theme.
 */
export function createExportChoiceStyles(theme: BrandTheme, insets: Insets, windowHeight: number) {
  return StyleSheet.create({
    // D-22: the sheet is fitted to its content on iOS, so the scroll view must not stretch (a
    // `flex: 1` child collapses in a sheet positioned with no bottom edge). The content gives the
    // sheet its height; at a large text size it scrolls inside the tallest sheet instead of running
    // past its bottom (the bound may exceed the sheet's real top by a few units: only bottom
    // padding can hide).
    sheet: {
      flexGrow: 0,
      maxHeight: windowHeight - insets.top,
      backgroundColor: theme.semanticColors.backgroundCanvas,
    },
    content: {
      paddingHorizontal: SHEET_PADDING_X,
      // The Android modal has no header: the title sits under the status bar.
      paddingTop: brandSpacing4.lg + (Platform.OS === "android" ? insets.top : 0),
      paddingBottom: brandSpacing4.lg + insets.bottom,
    },
    // D-21: the title and the close cross share one row; the title wraps beside the cross.
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    title: {
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
      flex: 1,
    },
    // The close button of the factor help sheet (`sheetClose` in factor-detail.styles.ts).
    close: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
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
    },
  })
}

export type ExportChoiceStyles = ReturnType<typeof createExportChoiceStyles>
