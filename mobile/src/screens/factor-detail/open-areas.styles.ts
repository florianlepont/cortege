import { StyleSheet } from "react-native"
import { brandInteraction, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"

// Follow-up 32-35: the faces of G's zone rows, the same as the other grouped rows (56 pt, the 15/21
// medium label) with a 44 pt remove button, the accent "Ajouter une zone" row and the tick row.
// Colours come from the theme only.
const ROW_MIN_HEIGHT = 56
const REMOVE_SIZE = brandInteraction.hitTarget.min

export function createOpenAreasStyles(theme: BrandTheme) {
  return StyleSheet.create({
    zoneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      minHeight: ROW_MIN_HEIGHT,
      paddingVertical: brandSpacing4.sm,
      paddingLeft: brandSpacing4.md,
      paddingRight: brandSpacing4.xs,
    },
    removeButton: {
      width: REMOVE_SIZE,
      height: REMOVE_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    actionZone: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: ROW_MIN_HEIGHT,
      paddingLeft: brandSpacing4.md,
    },
    actionLabel: {
      ...brandTypography.heroBody,
      flex: 1,
      color: theme.semanticColors.ctaPrimary,
    },
    // The pressed look of an AppGroupedList row.
    zonePressed: {
      backgroundColor: theme.colors.surfaceSoft,
    },
    label: {
      ...brandTypography.heroBody,
      flex: 1,
      color: theme.colors.textPrimary,
    },
    locked: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      marginBottom: brandSpacing4.sm,
      marginHorizontal: brandSpacing4.md,
    },
  })
}

export type OpenAreasStyles = ReturnType<typeof createOpenAreasStyles>
