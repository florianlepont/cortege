import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated from "react-native-reanimated"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { fr } from "../../i18n"
import { AppNotice } from "../../ui/AppNotice"
import { AppText as Text } from "../../ui/AppText"
import { GlassButton } from "../../ui/GlassButton"
import { AppPressable } from "../../ui/AppPressable"
import { PageTitle } from "../../ui/PageTitle"
import { TitledScrollView } from "../../ui/TitledScrollView"
import { useFrameInsetBehavior } from "../../ui/frame-large-title"
import { finishBarBottomPadding } from "../survey-detail/finish-bar-layout"
import { usePagerChromeStyle, usePagerKeyboard } from "../survey-form/usePagerKeyboard"
import { termsOfSelection } from "./glossary-terms"
import { GlossarySection } from "./GlossarySection"
import { LargeStandOptions } from "./LargeStandOptions"
import { QuestionStack } from "./QuestionStack"
import { ReasonsCard } from "./ReasonsCard"
import { RefineSection } from "./RefineSection"
import { RouteDetailsCard, type RouteDetailsValue } from "./RouteDetailsCard"
import { RouteAdvice, RouteNotices } from "./RouteNotices"
import { SuggestionCard } from "./SuggestionCard"
import type { RouteGuideState } from "./useRouteGuideState"

const screen = fr.routeGuide.screen

/** Where the chooser opens: its parcours list, or its counting section (the "Modifier" link). */
export type RouteChooserSection = "counting"

export type RouteGuideScreenProps = {
  state: RouteGuideState
  /** No estimate of the stand surface could be made: the surface card opens empty (spec section 1). */
  surfaceUnknown: boolean
  /** The route could not be recorded: the danger notice with "Réessayer" shows above the button. */
  saveError: boolean
  /** The record is being written: the button is busy and ignores presses. */
  saving?: boolean
  /** "Étape 5 sur 5" while the survey is being created; absent when editing a recorded route. */
  stepLabel?: string
  /** "Utiliser ce parcours": the one way forward, enabled once the package has a usable route. */
  onUse: () => void
  onRetry: () => void
  onOpenChooser: (mode: "pick" | "edit", section?: RouteChooserSection) => void
}

/**
 * The route step, "Choix du parcours" (phase 30, O-19: mandatory from creation, so there is no skip
 * control and no optional tag; the only way forward is "Utiliser ce parcours"). One scrolling page
 * (simplified 2026-10-14 after the owner's review): the title, the step, the lead and the one open
 * question, then once a route exists the suggestion, its reasons, details, warnings and the folded
 * "Pour affiner", or the two options above the subdivision bound, the glossary, the text link
 * "Je connais déjà mon parcours" (the chooser) and, only when a route is ready, the footer row. The page shows
 * what the model derives from the package (`RouteGuideState`) and decides nothing itself; it needs no
 * network, an unknown surface only opens the surface card empty (spec section 1).
 */
export function RouteGuideScreen({
  state,
  surfaceUnknown,
  saveError,
  saving = false,
  stepLabel,
  onUse,
  onRetry,
  onOpenChooser,
}: RouteGuideScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insetBehavior = useFrameInsetBehavior()
  const clearance = useTabBarClearance()
  const keyboardUp = usePagerKeyboard()
  const chromeStyle = usePagerChromeStyle(keyboardUp)
  const { view, actions } = state
  const { selection, recommendation, open } = view

  // The two options of a large stand are drawn below, in the result zone: the stack leaves that card.
  const showLargeStand = open?.id === "largeStand" && selection?.source !== "pick"
  const stackState = useMemo<RouteGuideState>(
    () => (open?.id === "largeStand" ? { ...state, view: { ...state.view, open: null } } : state),
    [state, open],
  )
  const choosingLargeStand = recommendation.status === "options" && selection === null

  const standRow = view.rows.find((row) => row.id === "surface")
  const standHa = standRow?.id === "surface" ? standRow.hectares : null

  const details: RouteDetailsValue = {
    zoneText: view.zoneFieldText,
    complementDone: selection?.complement?.done ?? false,
    totalText: view.totalFieldText,
  }
  const changeDetails = (next: RouteDetailsValue): void => {
    if (next.zoneText !== details.zoneText) actions.setZoneText(next.zoneText)
    if (next.complementDone !== details.complementDone)
      actions.setComplementDone(next.complementDone)
    if (next.totalText !== details.totalText) actions.setTotalText(next.totalText)
  }

  const suggested = selection?.source === "suggestion"
  const warnings =
    recommendation.status === "route" && suggested
      ? // The details card raises this one live from the surface typed in its field.
        recommendation.warnings.filter((code) => code !== "partial_over_half")
      : []

  // The footer exists only when something can be done with it: no disabled button while questions are open.
  const cta = choosingLargeStand
    ? {
        label: fr.routeGuide.largeStand.subdivideCta,
        onPress: () => actions.chooseLargeStandOption("subdivide"),
      }
    : view.canUse
      ? { label: screen.use, onPress: onUse }
      : null

  return (
    <View style={styles.root} testID="route-guide-screen">
      <TitledScrollView
        collapsingTitle={fr.routeGuide.screen.title}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior={insetBehavior}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        testID="route-guide-scroll"
      >
        <PageTitle>{screen.title}</PageTitle>
        {stepLabel ? <Text style={styles.step}>{stepLabel}</Text> : null}
        <Text style={styles.leadText}>{screen.lead}</Text>
        <QuestionStack state={stackState} />

        {showLargeStand && open?.id === "largeStand" ? (
          <LargeStandOptions
            options={open.options}
            preselected={open.preselected}
            selected={open.selected}
            onChoose={actions.chooseLargeStandOption}
          />
        ) : null}

        {selection === null ? null : (
          <>
            <SuggestionCard
              method={selection.method}
              counting={selection.counting}
              uncappedFactors={selection.uncappedFactors}
              zoneHa={selection.zoneHa}
              chosenBy={view.chosenBy ?? "observer"}
              onChange={() => onOpenChooser("pick")}
              onRestore={recommendation.status === "route" ? actions.restoreSuggestion : undefined}
            />
            {recommendation.status === "route" && suggested ? (
              <ReasonsCard reasons={recommendation.reasons} />
            ) : null}
            <RouteDetailsCard
              method={selection.method}
              counting={selection.counting}
              uncappedFactors={selection.uncappedFactors}
              standHa={standHa}
              value={details}
              onChange={changeDetails}
              onEditCounting={() => onOpenChooser("pick", "counting")}
            />
            <RouteNotices warnings={warnings} />
            <RefineSection
              refine={view.refine}
              actions={actions}
              footer={view.advice === null ? null : <RouteAdvice advice={view.advice} />}
            />
          </>
        )}

        <View style={styles.glossary}>
          <GlossarySection
            highlight={
              selection === null ? [] : termsOfSelection(selection.method, selection.counting)
            }
          />
        </View>
        <AppPressable
          onPress={() => onOpenChooser("pick")}
          accessibilityRole="button"
          accessibilityLabel={screen.know}
          style={styles.know}
          testID="route-know-link"
        >
          <Text style={styles.knowText}>{screen.know}</Text>
        </AppPressable>
      </TitledScrollView>

      {cta !== null || saveError ? (
        <Animated.View
          pointerEvents={keyboardUp ? "none" : "box-none"}
          style={[
            styles.footer,
            { paddingBottom: finishBarBottomPadding(clearance) },
            keyboardUp ? styles.footerHidden : null,
            chromeStyle,
          ]}
          testID="route-guide-footer"
        >
          {saveError ? (
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
              onPress={cta.onPress}
              testID="route-use"
            />
          ) : null}
        </Animated.View>
      ) : null}
    </View>
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
    content: {
      paddingHorizontal: brandSpacing4.lg,
      paddingTop: brandSpacing4.sm,
      paddingBottom: brandSpacing4.lg,
      gap: brandSpacing4.md,
    },
    step: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    leadText: {
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
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
    glossary: {
      marginTop: brandSpacing4.lg,
    },
    // The footer takes its own row under the scroll area (never over the content), so the last
    // element and the open question's "Suivant" can never sit under it. While the keyboard is up it
    // leaves the layout (absolute, faded) so the freed height goes to the focused field.
    footer: {
      paddingHorizontal: brandSpacing4.lg,
      paddingTop: brandSpacing4.sm,
      gap: brandSpacing4.sm,
    },
    footerHidden: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
    },
  })
}
