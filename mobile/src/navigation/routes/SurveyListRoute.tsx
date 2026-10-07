import { memo, useLayoutEffect } from "react"
import { Platform } from "react-native"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SurveyListScreen } from "../../screens/SurveyListScreen"
import { iconHeaderButton } from "../header-items"
import { useSurveys } from "../../state/surveys-context"
import { useSyncActions } from "../../state/sync-actions-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { useSurveysStackConfig } from "../stacks/surveys-stack-config"
import { ScreenFrame } from "../../ui/ScreenFrame"
import type { SurveyListRouteProps } from "../types"

/**
 * Survey list route (phase 01.9-18, D-01): the surveys context and the sync
 * actions. In the native iOS tree it also owns the native header's "+" (OA-85); the title is the
 * native large title set by the stack (12.2-17), which collapses into the bar as the list scrolls.
 * The surveys stack navigator does not subscribe to the surveys context.
 * The native-nav boolean is static navigator configuration read from
 * SurveysStackConfigContext, not data.
 *
 * Search (OA-52): on iOS it is its own tab, so the header has no search bar; on Android and in the
 * JS fallback the list draws its own title bar with a search button that opens the same page.
 */
export const SurveyListRoute = memo(function SurveyListRoute({ navigation }: SurveyListRouteProps) {
  const { useNativeNav } = useSurveysStackConfig()
  const { state, actions } = useSurveys()
  const syncActions = useSyncActions()
  const theme = useBrandTheme()

  const nativeHeader = useNativeNav && Platform.OS === "ios"

  const onOpenCreateSurvey = useLatestCallback(() => {
    actions.openCreateSurvey()
    navigation.navigate("surveyForm")
  })
  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    actions.openSurvey(surveyId)
    navigation.navigate("surveyDetail")
  })

  const onOpenSearch = useLatestCallback(() => navigation.navigate("surveySearch"))

  useLayoutEffect(() => {
    if (!nativeHeader) return
    navigation.setOptions({
      // OA-85: the "+" on the right of the bar. 12.2-17: no title item of our own any more, the
      // stack's native large title names the list (no headerTitle here, it would blank it).
      // D-19: no headerStyle here, the stack gives the transparent halo header.
      unstable_headerRightItems: () => [
        iconHeaderButton({
          label: fr.surveyList.a11y.createSurvey,
          sfSymbol: "plus",
          tintColor: theme.semanticColors.accent,
          onPress: onOpenCreateSurvey,
        }),
      ],
    })
  }, [nativeHeader, navigation, onOpenCreateSurvey, theme])

  return (
    <ScreenFrame largeTitle={nativeHeader}>
      <SurveyListScreen
        surveys={state.surveys}
        selectedSurveyId={state.selectedSurveyId}
        surveyDetails={state.surveyDetails}
        showTitleBar={!nativeHeader}
        onRefresh={syncActions.handlePullChanges}
        onDeleteSurvey={actions.confirmDeleteSurvey}
        onOpenCreateSurvey={onOpenCreateSurvey}
        onOpenSearch={onOpenSearch}
        onOpenSurvey={onOpenSurvey}
      />
    </ScreenFrame>
  )
})
