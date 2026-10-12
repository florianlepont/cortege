import { StyleSheet } from "react-native"
import {
  brandColors,
  brandMapTokens,
  brandRadius,
  brandShadow,
  brandSpacing,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// Theme-invariant: every color here is a static brand hue, not a neutral that inverts with the
// theme, so this stays a plain export (no `useBrandTheme()` needed at its call sites).
export const markerStyles = StyleSheet.create({
  clusterBubble: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: brandSpacing4.sm,
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

/**
 * The top-right capsule: button size, distance from the right edge, border. In the Explorer it
 * holds the globe and the overlay button (UI-SPEC section 1); the parcel picker's holds the globe
 * and its own download button.
 */
export const CAPSULE_BUTTON_SIZE = 50
export const CAPSULE_RIGHT = 14
const CAPSULE_BORDER = 1
/** The gap between the capsule and the round download button under it, and under the chip's row. */
export const MAP_BUTTON_GAP = 8

/**
 * The vertical centre of the capsule's button number `index` (0 is the globe, 1 the second button:
 * the overlay button in the Explorer, the download button in the parcel picker) for a capsule
 * whose top is `top`: the border, the buttons above and the hairlines between them.
 */
export function capsuleButtonCenterY(top: number, index: number): number {
  return (
    top +
    CAPSULE_BORDER +
    index * (CAPSULE_BUTTON_SIZE + StyleSheet.hairlineWidth) +
    CAPSULE_BUTTON_SIZE / 2
  )
}

/** The capsule's height with `buttonCount` buttons: buttons, hairlines between them and border. */
export function capsuleHeight(buttonCount: number): number {
  return (
    buttonCount * CAPSULE_BUTTON_SIZE +
    Math.max(0, buttonCount - 1) * StyleSheet.hairlineWidth +
    2 * CAPSULE_BORDER
  )
}

/** The top of the Explorer's overlay button (the capsule's second button) for a capsule at `top`. */
export function overlaySlotTopOf(capsuleTop: number): number {
  return capsuleButtonCenterY(capsuleTop, 1) - CAPSULE_BUTTON_SIZE / 2
}

/** The top of the round download button: `MAP_BUTTON_GAP` under the two button capsule. */
export function downloadButtonTopOf(capsuleTop: number): number {
  return capsuleTop + capsuleHeight(2) + MAP_BUTTON_GAP
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
      right: CAPSULE_RIGHT,
      width: CAPSULE_BUTTON_SIZE,
      borderRadius: CAPSULE_BUTTON_SIZE / 2,
      borderWidth: CAPSULE_BORDER,
      borderColor: theme.visual.mapControl.hairline,
    },
    capsuleButton: {
      width: CAPSULE_BUTTON_SIZE,
      height: CAPSULE_BUTTON_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    // The Explorer's download button, alone under the capsule (UI-SPEC section 1): a round glass
    // button of the capsule's size and hairline, at the same right edge.
    downloadButton: {
      position: "absolute",
      right: CAPSULE_RIGHT,
      width: CAPSULE_BUTTON_SIZE,
      height: CAPSULE_BUTTON_SIZE,
    },
    downloadCircle: {
      width: CAPSULE_BUTTON_SIZE,
      height: CAPSULE_BUTTON_SIZE,
      borderRadius: CAPSULE_BUTTON_SIZE / 2,
      borderWidth: CAPSULE_BORDER,
      borderColor: theme.visual.mapControl.hairline,
    },
    capsuleSeparator: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: brandSpacing.sm,
      backgroundColor: theme.visual.mapControl.hairline,
    },
  })
}

// The offline areas panel (12.2-18): its list of areas moved to Paramètres (OA-123), so only the
// name field and the button are styled here; theme-invariant. The size warning is the panel's
// `warning` (theme-aware, 12.2-19 fix round).
export const offlineAreasStyles = StyleSheet.create({
  form: {
    gap: brandSpacing4.smd,
  },
  // The form under a download's progress or outcome: laid out, so it keeps the panel's height,
  // but not seen.
  hidden: {
    opacity: 0,
  },
  statusLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  nameField: {
    gap: brandSpacing4.xs,
  },
  downloadButton: {
    alignSelf: "stretch",
  },
})

export function createOfflineIndicatorStyles(theme: BrandTheme) {
  return StyleSheet.create({
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing.xs,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: brandColors.terracotta,
      backgroundColor: theme.colors.errorSoft,
      paddingHorizontal: brandSpacing4.smd,
      paddingVertical: brandSpacing.sm,
    },
    badgeText: {
      ...brandTypography.label,
      color: brandColors.terracotta,
    },
  })
}

// The panels of the Explorer sheet (cluster list, parcel history, offline areas), 12.2-18: 4 grid
// spacing and the sheet title one step up from the section header. The selected survey card went
// in 12.2-19: a survey marker opens the survey's page directly.
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
    // 12.2-19 fix round: the danger text of the theme (light on the dark sheet), not the brand
    // terracotta, which stayed under 4.5:1 on the dark sheet.
    warning: {
      ...brandTypography.meta,
      color: theme.onSurface.danger,
    },
    rows: {
      gap: brandSpacing4.sm,
    },
  })
}
