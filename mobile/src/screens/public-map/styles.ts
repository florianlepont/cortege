import { StyleSheet } from "react-native"
import {
  brandColors,
  brandMapTokens,
  brandRadius,
  brandShadow,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

const roundButton = {
  width: 42,
  height: 42,
  borderRadius: 21,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
} as const

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
    overlayShell: {
      position: "absolute",
      left: 12,
      right: 12,
      gap: 10,
    },
    topDock: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    topDockLeft: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      flex: 1,
    },
    topDockActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    exploreBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    exploreBadgeText: {
      ...brandTypography.label,
      color: theme.semanticColors.textStrong,
    },
    countBadge: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    countBadgeText: {
      ...brandTypography.meta,
      color: theme.colors.textPrimary,
    },
    iconButton: {
      ...roundButton,
      borderColor: theme.colors.divider,
    },
    iconButtonPrimary: {
      ...roundButton,
      borderColor: brandColors.forest,
      backgroundColor: theme.semanticColors.ctaPrimary,
      ...brandShadow.card,
    },
    iconButtonDisabled: {
      ...roundButton,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.disabledMuted,
    },
    // MAP-02: the active-filter count, overlaid on the filters toggle button.
    filterCountBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 3,
      backgroundColor: brandColors.terracotta,
      alignItems: "center",
      justifyContent: "center",
    },
    filterCountBadgeText: {
      ...brandTypography.meta,
      fontSize: 12,
      lineHeight: 14,
      color: brandColors.white,
    },
    filtersPanel: {
      gap: 12,
    },
    filtersTitle: {
      ...brandTypography.label,
      color: theme.semanticColors.textStrong,
    },
    filtersMeta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    layerTogglePill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    layerTogglePillOn: {
      borderColor: brandColors.forest,
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    layerTogglePillOff: {
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panelMuted,
    },
    layerTogglePillText: {
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
    },
    layerTogglePillTextOn: {
      color: brandColors.white,
    },
    bottomDock: {
      position: "absolute",
      left: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    emptyDockBubble: {
      flex: 1,
    },
    emptyDockText: {
      ...brandTypography.meta,
      fontSize: 15,
      lineHeight: 18,
      color: theme.colors.textPrimary,
    },
    locateButton: {
      ...roundButton,
      width: 56,
      height: 56,
      borderRadius: 28,
      borderColor: brandColors.forest,
      backgroundColor: theme.semanticColors.ctaPrimary,
      ...brandShadow.card,
    },
  })
}

// MAP-02: the chip-based filter bar (period / region / mes relevés), replacing the old free-text
// fields + Apply button.
export function createFilterBarStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryText: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    resetLink: {
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
      textDecorationLine: "underline",
    },
    row: {
      flexDirection: "row",
    },
    chip: {
      marginRight: 8,
    },
    hint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
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
      maxHeight: 220,
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
    basemapToggle: {
      flexDirection: "row",
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: 3,
    },
    basemapOption: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: brandRadius.pill,
    },
    basemapOptionActive: {
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    basemapOptionText: {
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
    },
    basemapOptionTextActive: {
      color: brandColors.white,
    },
  })
}

export function createPanelStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      gap: 10,
    },
    title: {
      ...brandTypography.label,
      color: theme.semanticColors.textStrong,
    },
    meta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
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
