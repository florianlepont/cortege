import { StyleSheet } from "react-native"
import {
  brandSpacing,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"
import { FINISH_BAR } from "../survey-detail/finish-bar-layout"

/** Hit area of the round top buttons, kept from the 12.2-16 refinement (D-05). */
export const WIZARD_ICON_BUTTON = 44

/**
 * Styles of the new survey wizard (OA-25): the top bar, the progress, one question, the floating
 * call to action. D-19: the page colour and the halo are the `ScreenFrame` of the route, so no
 * element here paints a canvas. D-27c: the footer is a transparent bar, only the glass button is
 * drawn; the scroll content ends above it (`bodyBottomPadding`).
 */
export function createWizardStyles(theme: BrandTheme) {
  const { glass, score, chip } = theme.visual
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    topBar: {
      paddingHorizontal: brandSpacing.md,
      gap: brandSpacing4.md,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    // A glass disc: it reads as a control over the halo without a heavy fill.
    iconButton: {
      width: WIZARD_ICON_BUTTON,
      height: WIZARD_ICON_BUTTON,
      borderRadius: WIZARD_ICON_BUTTON / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.glass.cardFill,
      borderWidth: 1,
      borderColor: glass.cardBorder,
    },
    stepLabel: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    topSpacer: {
      width: WIZARD_ICON_BUTTON,
    },
    progress: {
      flexDirection: "row",
      gap: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.xs,
    },
    progressSegment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    progressDone: {
      backgroundColor: score.high,
    },
    progressTodo: {
      backgroundColor: score.track,
    },
    body: {
      flexGrow: 1,
      paddingHorizontal: brandSpacing4.lg,
      paddingTop: brandSpacing4.xl + brandSpacing4.xs,
      gap: brandSpacing4.md,
    },
    // The question keeps its 30 on 35 size so the step layout does not move (D-05); only the
    // family follows the screen title role.
    title: {
      ...brandTypography.heroTitle,
      fontFamily: brandTypography.screenTitle.fontFamily,
      letterSpacing: brandTypography.screenTitle.letterSpacing,
      fontSize: 30,
      lineHeight: 35,
      color: theme.semanticColors.textStrong,
    },
    lead: {
      ...brandTypography.sectionBody,
      fontSize: brandTypeScale.headline.fontSize,
      lineHeight: 25,
      color: theme.colors.textSecondary,
    },
    answer: {
      marginTop: brandSpacing4.smd,
      gap: brandSpacing4.smd,
    },
    hint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    // The method cards: glass with a hairline, a 2 pt accent border when selected. The selected
    // card takes 1 pt less padding so both states have exactly the same size.
    choiceCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.md,
      padding: brandSpacing4.md,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: glass.cardBorder,
      backgroundColor: glass.cardFill,
      boxShadow: glass.cardShadow,
    },
    choiceCardSelected: {
      padding: brandSpacing4.md - 1,
      borderWidth: 2,
      borderColor: theme.visual.accentText,
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
    // The selected radio is the inverted neutral dot (direction principle 7).
    radioSelected: {
      borderColor: chip.activeBg,
      backgroundColor: chip.activeBg,
    },
    choiceCopy: {
      flex: 1,
      gap: brandSpacing4.sm,
    },
    choiceTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
    choiceTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 18,
      color: theme.colors.textPrimary,
    },
    // A plain accent word next to the title, not a tag pill.
    recommended: {
      ...brandTypography.meta,
      color: theme.visual.accentText,
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
      gap: brandSpacing4.sm,
    },
    // D-27c: the bar floats over the bottom of the page and has no fill; the bottom padding (the
    // tab bar clearance) is set where the bar is drawn. Its empty areas let touches through.
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: brandSpacing.md,
      paddingTop: FINISH_BAR.paddingTop,
    },
  })
}
