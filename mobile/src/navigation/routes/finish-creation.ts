import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { SurveysStackParamList } from "../types"

type ResettableNavigation = Pick<NativeStackNavigationProp<SurveysStackParamList>, "reset">

/**
 * The end of the creation of a survey (phase 30, O-19: it runs when the route is accepted, in the
 * route step): the whole creation flow (wizard, parcel map, route step) is replaced by the survey
 * page, so back returns to the list, and the new draft is selected so that page opens on it.
 *
 * The order is the D-45 one and must not change: the survey is selected AFTER the reset. The wizard
 * launched from Accueil, a search or Explorer keeps the survey stack, so an older summary screen can
 * still sit in it; removing that screen fires its `beforeRemove` listener while the reset runs, and a
 * selection made before the reset would be cleared by it, leaving the new summary on no survey.
 * (`wizard-reset-flow.test.tsx` proves it on the real router.)
 */
export function finishSurveyCreation(
  navigation: ResettableNavigation,
  openSurvey: (surveyId: string) => void,
  surveyId: string,
): void {
  navigation.reset({
    index: 1,
    routes: [{ name: "surveysHome" }, { name: "surveyDetail" }],
  })
  openSurvey(surveyId)
}
