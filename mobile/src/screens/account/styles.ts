import { StyleSheet } from "react-native"
import { brandSpacing, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

const AVATAR_SIZE = 104

export function createAccountStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.canvas,
    },
    // ACC-N02 : gap inter-sections avec brandSpacing.md pour une meilleure respiration
    content: {
      gap: brandSpacing.md,
      paddingBottom: brandSpacing.xl,
    },
  })
}

export function createIdentityStyles(theme: BrandTheme) {
  return StyleSheet.create({
    identity: {
      alignItems: "center",
      gap: 2,
      paddingVertical: brandSpacing.sm,
    },
    avatarButton: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      marginBottom: brandSpacing.sm,
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
      backgroundColor: theme.colors.panelMuted,
    },
    avatarFallbackText: {
      fontSize: 38,
      lineHeight: 44,
      fontWeight: "800",
      color: theme.semanticColors.textStrong,
    },
    // OA-85 family: a round Liquid Glass badge, like the header buttons.
    avatarEditBadge: {
      position: "absolute",
      right: -4,
      bottom: -2,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    identityName: {
      ...brandTypography.sectionTitle,
      fontSize: 24,
      lineHeight: 30,
      color: theme.semanticColors.textStrong,
    },
    identityMeta: {
      ...brandTypography.sectionBody,
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
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing.sm,
    },
    label: {
      ...brandTypography.sectionBody,
      fontSize: 17,
      color: theme.colors.textPrimary,
    },
    input: {
      flex: 1,
      textAlign: "right",
      paddingVertical: 12,
      fontSize: 17,
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
  },
  emailEditActions: {
    flexDirection: "row",
    gap: brandSpacing.xs + 2,
    justifyContent: "flex-end",
  },
})
