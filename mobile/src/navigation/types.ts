import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import type { FactorKey } from "../app/types"

/**
 * Navigation param lists (phase 01.9-18) and the global RootParamList
 * (phase 01.9-24, D-04), so `useNavigation()` and `navigation.navigate(...)`
 * are checked against the root tabs without a cast.
 */
/**
 * OA-13 (owner decision, 2026-09-28): Compte is no longer a tab. Its two screens are pushed onto
 * whichever tab's stack the avatar was tapped in, so every tab stack carries them.
 */
export type AccountStackParamList = {
  accountHome: undefined
  settings: undefined
}

export type HomeStackParamList = AccountStackParamList & {
  homeRoot: undefined
}

export type SurveysStackParamList = AccountStackParamList & {
  surveysHome: undefined
  surveySearch: undefined
  communitySurvey: { surveyId: string }
  surveyDetail: undefined
  surveyContext: undefined
  surveyScore: undefined
  surveyHistory: undefined
  surveyForm: undefined
  surveyFactorDetail: { factor: FactorKey }
  surveyParcels: { surveyId: string; mode: "wizard" | "edit" }
}

export type PublicMapStackParamList = AccountStackParamList & {
  publicMapHome: undefined
}

/** The search tab (iOS 26 shows it as its own round button next to the bar, OA-52). */
export type SearchStackParamList = {
  searchHome: undefined
}

export type RootTabParamList = {
  home: NavigatorScreenParams<HomeStackParamList> | undefined
  surveys: NavigatorScreenParams<SurveysStackParamList> | undefined
  publicMap: NavigatorScreenParams<PublicMapStackParamList> | undefined
  search: NavigatorScreenParams<SearchStackParamList> | undefined
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- the React Navigation augmentation point
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}

export type FormMode = "create" | "edit"

/** Props of a stack screen whose navigation can also reach the other tabs. */
type StackRouteProps<
  ParamList extends Record<string, object | undefined>,
  RouteName extends keyof ParamList & string,
> = CompositeScreenProps<
  NativeStackScreenProps<ParamList, RouteName>,
  BottomTabScreenProps<RootTabParamList>
>

export type HomeRouteProps = StackRouteProps<HomeStackParamList, "homeRoot">
export type SurveyListRouteProps = StackRouteProps<SurveysStackParamList, "surveysHome">
export type SurveyDetailRouteProps = StackRouteProps<SurveysStackParamList, "surveyDetail">
export type CommunitySurveyRouteProps = StackRouteProps<SurveysStackParamList, "communitySurvey">
export type SurveyContextRouteProps = StackRouteProps<SurveysStackParamList, "surveyContext">
export type SurveyScoreRouteProps = StackRouteProps<SurveysStackParamList, "surveyScore">
export type SurveyHistoryRouteProps = StackRouteProps<SurveysStackParamList, "surveyHistory">
export type SurveyFormRouteProps = StackRouteProps<SurveysStackParamList, "surveyForm">
export type FactorDetailRouteProps = StackRouteProps<SurveysStackParamList, "surveyFactorDetail">
export type ParcelSelectionRouteProps = StackRouteProps<SurveysStackParamList, "surveyParcels">
export type PublicMapRouteProps = StackRouteProps<PublicMapStackParamList, "publicMapHome">
export type AccountRouteProps = StackRouteProps<AccountStackParamList, "accountHome">
export type SettingsRouteProps = StackRouteProps<AccountStackParamList, "settings">
