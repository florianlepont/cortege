import { StyleSheet } from "react-native"
import {
  brandColors,
  brandInteraction,
  brandMapTokens,
  brandRadius,
  brandShadow,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"
import { SURVEY_ROW_RING_COLUMN } from "../survey-list/row-styles"

/** Width of the accent outline of the selected survey in the Explorer sheet. */
export const SELECTED_OUTLINE_WIDTH = 2

// Theme-invariant: every color here is a static brand hue, not a neutral that inverts with the
// theme, so this stays a plain export (no `useBrandTheme()` needed at its call sites).
export const markerStyles = StyleSheet.create({
  clusterBubble: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: brandColors.white,
    backgroundColor: brandColors.forest,
    alignItems: "center",
    justifyContent: "center",
    ...brandShadow.card,
  },
  clusterText: {
    ...brandTypography.label,
    color: brandColors.white,
  },
  // MAP-03: the score-band pastille that replaces the system pin color.
  scorePastille: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: brandColors.white,
    ...brandShadow.card,
  },
  // OA-59: an own draft, white with a dashed forest outline (the legend shows the same swatch).
  scorePastilleDraft: {
    backgroundColor: brandColors.white,
    borderStyle: "dashed",
    borderColor: brandColors.forest,
  },
  scorePastille_low: {
    backgroundColor: brandMapTokens.scoreMarker.low,
  },
  scorePastille_mid: {
    backgroundColor: brandMapTokens.scoreMarker.mid,
  },
  scorePastille_high: {
    backgroundColor: brandMapTokens.scoreMarker.high,
  },
  scorePastilleSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: brandMapTokens.scoreMarkerSelectedBorder,
  },
})

// Theme-invariant: the map fill itself has no color (it's the native MapView underneath).
export const screenStyles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFill,
  },
})

export function createScreenContainerStyle(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
  })
}

// DS-15 (Phase 12): `iconButton`/`iconButtonDisabled`/`filtersPanel`/`emptyDockBubble`/
// `basemapToggle` used to carry a flat `brandTranslucentPanel`/`PANEL_BACKGROUND` fill — they now
// carry NO `backgroundColor`, wrapped in a `<GlassSurface>` (or `<AppCard glass>`) at the call site
// (`MapControls.tsx`, `OfflineControls.tsx`) instead. `iconButtonPrimary`/`locateButton`/
// `layerTogglePillOn` stay solid brand-colored CTAs, not glass.
export function createControlStyles(theme: BrandTheme) {
  return StyleSheet.create({
    capsule: {
      position: "absolute",
      right: 14,
      width: 50,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    capsuleButton: {
      width: 50,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    capsuleSeparator: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 10,
      backgroundColor: theme.colors.divider,
    },
    locateGlass: {
      position: "absolute",
      right: 14,
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
  })
}

export function createOfflineAreasStyles(theme: BrandTheme) {
  return StyleSheet.create({
    nameField: {
      gap: 5,
    },
    warning: {
      ...brandTypography.meta,
      color: brandColors.terracotta,
    },
    list: {
      marginTop: 4,
    },
    row: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    rowInfo: {
      flex: 1,
      gap: 2,
    },
    deleteButton: {
      padding: 6,
    },
  })
}

export function createOfflineIndicatorStyles(theme: BrandTheme) {
  return StyleSheet.create({
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: brandColors.terracotta,
      backgroundColor: theme.colors.errorSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    badgeText: {
      ...brandTypography.label,
      color: brandColors.terracotta,
    },
  })
}

// The panels of the Explorer sheet (selected survey, cluster list, parcel history, offline areas),
// 12.2-18: 4 grid spacing, the sheet title one step up from the section header, and the selected
// survey drawn as a glass row with the accent outline (UI-SPEC accent list item 4) and its ring on
// the trailing side (D-27a). No gradient here, so the 2 pt outline is a plain border (12.2-17).
export function createPanelStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      gap: brandSpacing4.smd,
    },
    title: {
      ...brandTypography.sectionHeader,
      ...brandTypeScale.headline,
      color: theme.semanticColors.textStrong,
    },
    meta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    selectedSummary: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      minHeight: brandInteraction.hitTarget.min,
      borderRadius: brandRadius.card,
      borderWidth: SELECTED_OUTLINE_WIDTH,
      borderColor: theme.visual.accentText,
      backgroundColor: theme.visual.glass.cardFill,
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
    },
    selectedText: {
      flex: 1,
      minWidth: 0,
      gap: brandSpacing4.xs,
    },
    selectedPlace: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.input.fontFamily,
      color: theme.colors.textPrimary,
    },
    ringColumn: {
      width: SURVEY_ROW_RING_COLUMN,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    rows: {
      gap: brandSpacing4.sm,
    },
    clusterRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    clusterRowText: {
      ...brandTypography.meta,
      color: theme.colors.textPrimary,
    },
  })
}
