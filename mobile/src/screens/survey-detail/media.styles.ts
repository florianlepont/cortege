import { StyleSheet } from "react-native"
import {
  brandMediaBackdrop,
  brandOnDarkColors,
  brandOnDarkStatus,
  brandRadius,
  brandShadow,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createMediaStyles(theme: BrandTheme) {
  return StyleSheet.create({
    detailHeroShell: {
      position: "relative",
      minHeight: 320,
      borderRadius: 30,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: brandMediaBackdrop,
      ...brandShadow.card,
    },
    detailHeroMain: {
      width: "100%",
      height: 320,
      backgroundColor: brandMediaBackdrop,
    },
    detailHeroMap: {
      width: "100%",
      height: "100%",
      backgroundColor: brandMediaBackdrop,
    },
    detailHeroPhotoCarousel: {
      width: "100%",
      height: "100%",
    },
    detailHeroPhotoSlide: {
      height: "100%",
    },
    detailHeroPhotoImage: {
      width: "100%",
      height: "100%",
      backgroundColor: brandMediaBackdrop,
    },
    detailHeroOverlayBadge: {
      position: "absolute",
      left: 14,
      bottom: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: brandRadius.pill,
      backgroundColor: brandOnDarkColors.heroScrimOnDark,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    detailHeroOverlayBadgeText: {
      ...brandTypography.meta,
      color: theme.colors.white,
    },
    detailHeroSwitchThumb: {
      position: "absolute",
      left: 14,
      top: 14,
      width: 78,
      height: 78,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: brandOnDarkColors.heroBorderStrongOnDark,
      backgroundColor: brandMediaBackdrop,
    },
    detailHeroSwitchThumbImage: {
      width: "100%",
      height: "100%",
    },
    detailHeroSwitchThumbMap: {
      width: "100%",
      height: "100%",
    },
    detailHeroSwitchThumbLabel: {
      position: "absolute",
      left: 6,
      right: 6,
      bottom: 6,
      borderRadius: brandRadius.pill,
      backgroundColor: brandOnDarkColors.heroScrimOnDark,
      paddingVertical: 4,
    },
    detailHeroSwitchThumbLabelText: {
      ...brandTypography.meta,
      color: theme.colors.white,
      textAlign: "center",
    },
    detailHeroActions: {
      position: "absolute",
      top: 14,
      right: 14,
      gap: 8,
    },
    detailHeroActionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: brandOnDarkColors.heroBorderStrongOnDark,
      backgroundColor: brandOnDarkColors.heroScrimOnDark,
    },
    detailHeroActionButtonDanger: {
      backgroundColor: brandOnDarkStatus.dangerScrimBackground,
      borderColor: brandOnDarkStatus.dangerScrimBorder,
    },
  })
}
