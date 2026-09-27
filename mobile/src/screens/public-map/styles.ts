import { StyleSheet } from "react-native"
import {
  brandColors,
  brandMapTokens,
  brandRadius,
  brandShadow,
  brandTranslucentPanel,
  brandTypography,
} from "../../app/brand-tokens"

const PANEL_BACKGROUND = brandTranslucentPanel.default

const roundButton = {
  width: 42,
  height: 42,
  borderRadius: 21,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
  ...brandShadow.card,
} as const

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

export const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.canvas,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
})

export const controlStyles = StyleSheet.create({
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
    borderColor: brandColors.divider,
    backgroundColor: brandTranslucentPanel.subtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...brandShadow.card,
  },
  exploreBadgeText: {
    ...brandTypography.label,
    color: brandColors.forest,
  },
  countBadge: {
    borderRadius: brandRadius.pill,
    borderWidth: 1,
    borderColor: brandColors.divider,
    backgroundColor: brandTranslucentPanel.muted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  countBadgeText: {
    ...brandTypography.meta,
    color: brandColors.textPrimary,
  },
  iconButton: {
    ...roundButton,
    borderColor: brandColors.divider,
    backgroundColor: brandTranslucentPanel.subtle,
  },
  iconButtonPrimary: {
    ...roundButton,
    borderColor: brandColors.forest,
    backgroundColor: brandColors.forest,
  },
  iconButtonDisabled: {
    ...roundButton,
    borderColor: brandColors.divider,
    backgroundColor: brandColors.disabledMuted,
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
    backgroundColor: PANEL_BACKGROUND,
    gap: 12,
  },
  filtersTitle: {
    ...brandTypography.label,
    color: brandColors.forest,
  },
  filtersMeta: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
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
    backgroundColor: brandColors.forest,
  },
  layerTogglePillOff: {
    borderColor: brandColors.divider,
    backgroundColor: brandColors.panelMuted,
  },
  layerTogglePillText: {
    ...brandTypography.meta,
    color: brandColors.forest,
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
    backgroundColor: PANEL_BACKGROUND,
  },
  emptyDockText: {
    ...brandTypography.meta,
    fontSize: 15,
    lineHeight: 18,
    color: brandColors.textPrimary,
  },
  locateButton: {
    ...roundButton,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderColor: brandColors.forest,
    backgroundColor: brandColors.forest,
  },
})

// MAP-02: the chip-based filter bar (period / region / mes relevés), replacing the old free-text
// fields + Apply button.
export const filterBarStyles = StyleSheet.create({
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
    color: brandColors.textSecondary,
  },
  resetLink: {
    ...brandTypography.meta,
    color: brandColors.forest,
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
    color: brandColors.textSecondary,
  },
})

export const offlineAreasStyles = StyleSheet.create({
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
    borderTopColor: brandColors.divider,
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

export const offlineIndicatorStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: brandRadius.pill,
    borderWidth: 1,
    borderColor: brandColors.terracotta,
    backgroundColor: brandColors.errorSoft,
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
    borderColor: brandColors.divider,
    backgroundColor: brandTranslucentPanel.subtle,
    padding: 3,
    ...brandShadow.card,
  },
  basemapOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: brandRadius.pill,
  },
  basemapOptionActive: {
    backgroundColor: brandColors.forest,
  },
  basemapOptionText: {
    ...brandTypography.meta,
    color: brandColors.forest,
  },
  basemapOptionTextActive: {
    color: brandColors.white,
  },
})

export const panelStyles = StyleSheet.create({
  card: {
    gap: 10,
  },
  title: {
    ...brandTypography.label,
    color: brandColors.forest,
  },
  meta: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
  },
  clusterRow: {
    borderTopWidth: 1,
    borderTopColor: brandColors.divider,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  clusterRowText: {
    ...brandTypography.meta,
    color: brandColors.textPrimary,
  },
})
