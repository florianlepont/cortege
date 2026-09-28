import { Platform, StyleSheet } from "react-native"
import {
  brandColors,
  brandMediaBackdrop,
  brandOnDarkColors,
  brandRadius,
  brandShadow,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// DS-15 (Phase 12): every style below that used to carry a flat `rgba(...)` fill
// (`heroScrimOnDark`/`brandTranslucentPanel`) now carries NO `backgroundColor` — it's wrapped in a
// `<GlassSurface>` at the call site (ParcelsSection.tsx, ParcelMapModal.tsx), which supplies the
// blur and its own tint. `mapOverlayButton`/`fullscreenMapCloseButton` use `tone="dark"` (a control
// floating directly over the map, always dark glass); `fullscreenMapTopBar`/`fullscreenMapBottomSheet`
// use `tone="auto"` (a readable info card, follows the app's own theme) — their text below uses the
// theme's regular text tokens accordingly, not the fixed on-dark family.
export function createParcelStyles(theme: BrandTheme) {
  return StyleSheet.create({
    parcelHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    selectionCountPill: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: brandColors.forest,
      backgroundColor: theme.colors.successSoft,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    selectionCountPillText: {
      ...brandTypography.meta,
      color: brandColors.forest,
    },
    mapFrame: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.canvas,
    },
    mapOverlayActions: {
      ...StyleSheet.absoluteFill,
      justifyContent: "flex-start",
      alignItems: "flex-end",
      padding: 12,
    },
    mapOverlayButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: brandOnDarkColors.heroBorderStrongOnDark,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    mapOverlayButtonText: {
      ...brandTypography.meta,
      color: brandColors.white,
    },
    map: {
      width: "100%",
      height: 408,
    },
    mapHelperText: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    selectionSummaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    selectionPill: {
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.successSoft,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    selectionPillText: {
      ...brandTypography.meta,
      color: brandColors.forest,
    },
    fullscreenMapScreen: {
      flex: 1,
      backgroundColor: brandMediaBackdrop,
    },
    fullscreenMap: {
      flex: 1,
    },
    fullscreenMapOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 24,
    },
    fullscreenMapTopBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      paddingHorizontal: 12,
      paddingVertical: Platform.select({ ios: 6, default: 10 }),
    },
    fullscreenMapTopTitle: {
      flex: 1,
      textAlign: "center",
      ...brandTypography.label,
      color: theme.colors.textPrimary,
    },
    fullscreenMapCloseButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: brandOnDarkColors.heroBorderStrongOnDark,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    fullscreenMapCloseText: {
      ...brandTypography.meta,
      color: brandColors.white,
    },
    fullscreenMapFloatingActions: {
      alignSelf: "flex-end",
    },
    fullscreenMapActionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: brandColors.sage,
      backgroundColor: brandColors.forest,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: brandRadius.pill,
      ...brandShadow.card,
    },
    fullscreenMapActionButtonText: {
      ...brandTypography.meta,
      color: brandColors.white,
    },
    fullscreenMapBottomArea: {
      gap: 12,
    },
    fullscreenMapBottomSheet: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 8,
    },
    fullscreenMapBottomTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 20,
      lineHeight: 24,
      color: theme.colors.forest,
    },
    fullscreenMapBottomMeta: {
      ...brandTypography.sectionBody,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    fullscreenMapBottomHint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    fullscreenMapWarningCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.componentColors.notice.dangerBorder,
      backgroundColor: theme.colors.errorSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    fullscreenMapWarningText: {
      flex: 1,
      ...brandTypography.meta,
      color: theme.onSurface.danger,
    },
  })
}
