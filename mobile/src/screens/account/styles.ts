import { StyleSheet } from "react-native"
import {
  brandRadius,
  brandSpacing,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

const AVATAR_SIZE = 56

// No colour since D-19: the route's ScreenFrame is the page (canvas and halo).
export const accountStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // D-05: compact, blocks 16 apart on the 4-grid
  content: {
    gap: brandSpacing4.md,
    paddingBottom: brandSpacing4.xl,
  },
})

// D-05, sketch 009: a horizontal glass card, the avatar on the left, name and email on the right.
export function createIdentityStyles(theme: BrandTheme) {
  return StyleSheet.create({
    identity: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      padding: brandSpacing4.md,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
    },
    avatarButton: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
    },
    avatarImage: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: theme.colors.panelMuted,
    },
    avatarFallback: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.glass.iconTile,
    },
    avatarFallbackText: {
      ...brandTypography.screenTitle,
      letterSpacing: 0,
      color: theme.visual.glass.iconTint,
    },
    // OA-85 family: a round Liquid Glass badge, like the header buttons (a floating control).
    avatarEditBadge: {
      position: "absolute",
      right: -brandSpacing4.xs,
      bottom: -brandSpacing4.xs,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    identityTexts: {
      flex: 1,
      gap: brandSpacing4.xxs,
    },
    identityName: {
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    identityMeta: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
  })
}

// The big page titles ("Compte", "Paramètres", "Cartes hors ligne") sit in the content under the
// transparent header, like the other tabs' large titles.
// The profile fields, as rows of the grouped list (label left, editable value right).
export function createProfileRowStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    label: {
      ...brandTypography.sectionBody,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    input: {
      flex: 1,
      textAlign: "right",
      minHeight: 44,
      paddingVertical: brandSpacing4.sm,
      fontSize: 16,
      color: theme.semanticColors.textStrong,
    },
    saveBar: {
      position: "absolute",
      left: brandSpacing.md,
      right: brandSpacing.md,
      minHeight: 62,
      borderRadius: 31,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 20,
      paddingRight: 10,
    },
    saveBarText: {
      flex: 1,
      ...brandTypography.meta,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    saveBarCancel: {
      minHeight: 42,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBarCancelText: {
      ...brandTypography.button,
      color: theme.semanticColors.textStrong,
    },
    saveBarSave: {
      minHeight: 42,
      paddingHorizontal: 18,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    saveBarSaveDisabled: {
      opacity: 0.6,
    },
    saveBarSaveText: {
      ...brandTypography.button,
      color: theme.semanticColors.onCtaPrimary,
    },
  })
}

export const profileStyles = StyleSheet.create({
  // ACC-12 : styles de champ directement sur AppField
  fieldGroup: {
    gap: 4,
  },
  // The label colour comes from AppField's themed label style (OA-82: a static forest vanished in
  // dark mode).
  fieldLabel: {
    ...brandTypography.label,
  },
  fieldInput: {
    paddingHorizontal: 14,
    paddingVertical: brandSpacing.sm,
  },
  emailEditBlock: {
    gap: brandSpacing.xs + 2,
    paddingVertical: brandSpacing4.sm,
  },
  emailEditActions: {
    flexDirection: "row",
    gap: brandSpacing.xs + 2,
    justifyContent: "flex-end",
  },
})
