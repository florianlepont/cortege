import { useEffect, useRef, type ReactElement } from "react"
import { fr } from "../../i18n"
import { useSurveys, type SurveysState } from "../../state/surveys-context"
import { useSyncActions } from "../../state/sync-actions-context"
import { CenteredState } from "../../ui/CenteredState"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"

/** How long a survey page waits for its survey to be selected before it goes back. */
export const SELECTION_GRACE_MS = 600

export type SelectedSurvey = NonNullable<SurveysState["selectedSurvey"]>

/** What the gate needs of a survey-stack screen's `navigation` prop. */
export type SelectedSurveyGateNavigation = {
  canGoBack: () => boolean
  goBack: () => void
  navigate: (name: "surveysHome") => void
}

type SelectedSurveyGateProps = {
  navigation: SelectedSurveyGateNavigation
  children: (survey: SelectedSurvey) => ReactElement
}

/**
 * The shared guard of the survey pages (summary, context, parcels, score, history, journal): they
 * all show "the selected survey", and rendering nothing when none is selected left a blank page
 * that nothing woke up (the blank page after the new-survey wizard, D-45). While the survey is
 * missing the gate shows a loading state inside the usual frame, so the page is never blank. If
 * the selection is set but the survey is not in the list yet, the list is refreshed once. If
 * nothing is selected after `SELECTION_GRACE_MS` the page goes back, to the survey list when it
 * is the first screen of the stack. The timer is cleared as soon as the survey appears and on
 * unmount.
 */
export function SelectedSurveyGate({ navigation, children }: SelectedSurveyGateProps) {
  const { state } = useSurveys()
  const { refreshLocalSurveys } = useSyncActions()
  const survey = state.selectedSurvey
  const missing = survey === null
  const selectedSurveyId = state.selectedSurveyId
  const navigationRef = useRef(navigation)
  navigationRef.current = navigation
  const refreshedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!missing) return undefined
    const timer = setTimeout(() => {
      const current = navigationRef.current
      if (current.canGoBack()) current.goBack()
      else current.navigate("surveysHome")
    }, SELECTION_GRACE_MS)
    return () => clearTimeout(timer)
  }, [missing])

  useEffect(() => {
    // A selected id the list does not hold yet: ask for the list once per id.
    if (!missing || selectedSurveyId === null) return
    if (refreshedForRef.current === selectedSurveyId) return
    refreshedForRef.current = selectedSurveyId
    void refreshLocalSurveys()
  }, [missing, selectedSurveyId, refreshLocalSurveys])

  if (survey === null) {
    return (
      <ScreenFrame largeTitle={usesNativeLargeTitle()}>
        <CenteredState busy message={fr.navigation.surveyLoading} testID="survey-loading" />
      </ScreenFrame>
    )
  }
  return children(survey)
}
