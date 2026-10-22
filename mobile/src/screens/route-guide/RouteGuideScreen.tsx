import { useEffect, useMemo, useRef } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native"
import { brandSpacing4, brandTypeScale } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { fr } from "../../i18n"
import { AppNotice } from "../../ui/AppNotice"
import { AppText as Text } from "../../ui/AppText"
import { GlassButton } from "../../ui/GlassButton"
import { AppPressable } from "../../ui/AppPressable"
import { finishBarBottomPadding } from "../survey-detail/finish-bar-layout"
import { WizardHeading, WizardTopBar } from "../survey-wizard/WizardChrome"
import { WIZARD_FOOTER_PADDING, createWizardStyles } from "../survey-wizard/wizard.styles"
import { QuestionStep } from "./QuestionStep"
import { ResultBody } from "./ResultBody"
import { SuggestionEntrance } from "./SuggestionEntrance"
import type { RouteGuideState } from "./useRouteGuideState"

const screen = fr.routeGuide.screen

/** Where the chooser opens: its parcours list, or its counting section (the "Modifier" link). */
export type RouteChooserSection = "counting"

/** The creation counts five steps; the route step is the fifth (O-19). */
const CREATION_TOTAL = 5

export type RouteGuideScreenProps = {
  state: RouteGuideState
  /** No estimate of the stand surface could be made: the surface card opens empty (spec section 1). */
  surfaceUnknown: boolean
  /** The route could not be recorded: the danger notice with "Réessayer" shows above the button. */
  saveError: boolean
  /** The record is being written: the button is busy and ignores presses. */
  saving?: boolean
  /**
   * The creation step shown ("Étape 5 sur 5" in the header, the fifth segment of the progress):
   * absent when editing a recorded route, which has neither.
   */
  creationStep?: number
  /** "Utiliser ce parcours": the one way forward, enabled once the package has a usable route. */
  onUse: () => void
  onRetry: () => void
  onOpenChooser: (mode: "pick" | "edit", section?: RouteChooserSection) => void
}

/**
 * The route step, "Choix du parcours" (phase 30, O-19: mandatory from creation, so there is no skip
 * control and no optional tag; the only way forward is "Utiliser ce parcours"). One screen at a
 * time, like the other creation steps (owner's review 2026-10-14): while questions are open the
 * page shows the title, the step and the one open question with its pinned "Suivant"; when none is
 * left it shows the result: the suggestion, its reasons, details, warnings, the folded "Pour
 * affiner", the text link "Je connais déjà mon parcours" (the chooser, also under the first
 * question) and the footer "Utiliser ce parcours" once a route is ready. Back is the route's: one
 * question back through `actions.back`. The page shows what the model derives from the package
 * (`RouteGuideState`) and decides nothing itself; it needs no network, an unknown surface only
 * opens the surface card empty (spec section 1).
 */
export function RouteGuideScreen({
  state,
  saveError,
  saving = false,
  creationStep,
  onUse,
  onRetry,
  onOpenChooser,
}: RouteGuideScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const wizardStyles = useMemo(() => createWizardStyles(theme), [theme])
  const clearance = useTabBarClearance()
  const scrollRef = useRef<ScrollView>(null)
  const { view, actions } = state
  const { selection, recommendation, open } = view

  // A new screen starts at the top (the page itself stays mounted).
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [view.screen])

  // The footer is the one primary action of the screen: "Suivant" on a question, "Utiliser ce
  // parcours" on the result once a route is ready (no disabled button there).
  const suggested = (view.chosenBy ?? "observer") === "guide"
  const resultText = fr.routeGuide.screen.result
  const cta =
    open !== null
      ? {
          label: screen.next,
          onPress: actions.next,
          disabled: !view.canNext || (open.id === "surface" && open.error !== null),
          testID: "route-next",
        }
      : view.canUse
        ? { label: screen.use, onPress: onUse, disabled: false, testID: "route-use" }
        : null

  const know = (
    <AppPressable
      onPress={() => onOpenChooser("pick")}
      accessibilityRole="button"
      accessibilityLabel={screen.know}
      style={styles.know}
      testID="route-know-link"
    >
      <Text style={styles.knowText}>{screen.know}</Text>
    </AppPressable>
  )

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      testID="route-guide-screen"
    >
      {creationStep === undefined ? null : (
        // The same top of the page as the first three steps: the header carries "Étape 5 sur 5",
        // the progress shows the fifth segment.
        <WizardTopBar
          paddingTop={brandSpacing4.sm}
          total={CREATION_TOTAL}
          index={creationStep - 1}
        />
      )}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[wizardStyles.body, styles.content]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        testID="route-guide-scroll"
      >
        {open !== null ? (
          <>
            <QuestionStep state={state} />
            {open.id === "surface" && !view.canStepBack ? know : null}
          </>
        ) : (
          <SuggestionEntrance trigger="result">
            <View style={styles.result} testID="route-result">
              <WizardHeading
                title={suggested ? resultText.suggestedTitle : resultText.chosenTitle}
                lead={suggested ? resultText.suggestedLead : resultText.chosenLead}
              />
              {selection === null ? null : (
                <ResultBody
                  view={view}
                  actions={actions}
                  onOpenChooser={onOpenChooser}
                  recommendation={recommendation}
                />
              )}
              {know}
            </View>
          </SuggestionEntrance>
        )}
      </ScrollView>

      {cta !== null || saveError ? (
        <View
          style={[styles.footer, { paddingBottom: finishBarBottomPadding(clearance) }]}
          testID="route-guide-footer"
        >
          {saveError && open === null ? (
            <AppNotice
              tone="danger"
              icon="alert-circle-outline"
              message={screen.saveError}
              action={{ label: screen.retry, onPress: onRetry }}
            />
          ) : null}
          {cta !== null ? (
            <GlassButton
              label={cta.label}
              size="lg"
              loading={saving}
              disabled={cta.disabled}
              onPress={cta.onPress}
              testID={cta.testID}
            />
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    // On top of the wizard's body: the footer takes its own row, so only a small end padding.
    content: {
      paddingBottom: brandSpacing4.lg,
    },
    result: {
      gap: brandSpacing4.md,
    },
    // A tertiary text link at the very end of the page: no outline, no icon, a 44 pt hit area.
    know: {
      alignSelf: "center",
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: brandSpacing4.md,
    },
    knowText: {
      ...brandTypeScale.subhead,
      color: theme.semanticColors.accent,
      textDecorationLine: "underline",
    },
    // The footer takes its own row under the scroll area (never over the content), so the last
    // element can never sit under it; with the keyboard up it stays above it (the page resizes on
    // Android, the container pads on iOS) and the scroll area keeps the focused field in view.
    footer: {
      paddingHorizontal: WIZARD_FOOTER_PADDING.horizontal,
      paddingTop: WIZARD_FOOTER_PADDING.top,
      gap: brandSpacing4.sm,
    },
  })
}
