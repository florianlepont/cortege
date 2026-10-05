import { StyleSheet } from "react-native"
import { brandRadius, brandSpacing, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

/** Styles of the new survey wizard (OA-25): the top bar, the progress, one question, the button. */
export function createWizardStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    topBar: {
      paddingHorizontal: brandSpacing.md,
      gap: 14,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.componentColors.card.panelBorder,
    },
    stepLabel: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    topSpacer: {
      width: 44,
    },
    progress: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 4,
    },
    progressSegment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    progressDone: {
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    progressTodo: {
      backgroundColor: theme.colors.divider,
    },
    body: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 36,
      gap: 14,
    },
    title: {
      ...brandTypography.heroTitle,
      fontSize: 30,
      lineHeight: 35,
      color: theme.semanticColors.textStrong,
    },
    lead: {
      ...brandTypography.sectionBody,
      fontSize: 17,
      lineHeight: 25,
      color: theme.colors.textSecondary,
    },
    answer: {
      marginTop: 12,
      gap: 10,
    },
    hint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    // The method cards.
    choiceCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
    choiceCardSelected: {
      borderWidth: 2,
      borderColor: theme.semanticColors.ctaPrimary,
    },
    radio: {
      width: 24,
      height: 24,
      marginTop: 2,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.textSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    radioSelected: {
      borderColor: theme.semanticColors.ctaPrimary,
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    choiceCopy: {
      flex: 1,
      gap: 6,
    },
    choiceTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },
    choiceTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 18,
      color: theme.colors.textPrimary,
    },
    badge: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: theme.colors.successSoft,
    },
    badgeText: {
      ...brandTypography.meta,
      fontFamily: "Jost_600SemiBold",
      color: theme.semanticColors.textStrong,
    },
    choiceHint: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    // Region and stage chips (v3.0).
    chipGroupLabel: {
      ...brandTypography.label,
      color: theme.colors.textPrimary,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    footer: {
      paddingHorizontal: brandSpacing.md,
      paddingTop: 10,
    },
    cta: {
      borderRadius: brandRadius.pill,
    },
  })
}
