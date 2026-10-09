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
  offlineAreas: undefined
}

export type HomeStackParamList = AccountStackParamList & {
  homeRoot: undefined
}

export type SurveysStackParamList = AccountStackParamList & {
  surveysHome: undefined
  communitySurvey: { surveyId: string }
  communityHistory: { surveyId: string }
  surveyDetail: undefined
  surveyContext: undefined
  surveyScore: undefined
  surveyHistory: undefined
  surveyJournal: undefined
  surveyForm: undefined
  surveyFactorDetail: { factor: FactorKey }
  surveyFactorHelp: { help: string; hints: string[] }
  surveyParcels: {
    surveyId: string
    mode: "wizard" | "edit"
    /** Edit: the survey's own position, where the map starts (the form holds none). */
    startPoint?: { lat: number; lng: number }
  }
}

/** OA-59: where a survey page sends Explorer (the `nonce` makes the same survey re-focus). */
export type PublicMapFocus = {
  surveyId: string
  lat: number
  lng: number
  /** The survey's parcels, drawn highlighted on the Explorer map (OA-116). */
  parcelIds: string[]
  nonce: number
}

export type PublicMapStackParamList = AccountStackParamList & {
  publicMapHome: { focus?: PublicMapFocus } | undefined
  communitySurvey: { surveyId: string }
  communityHistory: { surveyId: string }
}

/**
 * The search tab on every platform (D-01): the native search tab on iOS (iOS 26 shows it as its
 * own round button next to the bar, OA-52), the fourth JS tab elsewhere.
 */
export type SearchStackParamList = {
  searchHome: undefined
  /**
   * "Voir les N": the full list of one result group. `memberName` narrows the community list to
   * one author (D-04, UI-SPEC U-11).
   */
  searchGroup: {
    group: "mine" | "community" | "places" | "parcels"
    query: string
    memberName?: string
  }
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
/** Mounted by the Mes Relevés stack and by the Explorer stack: it reads only its own params. */
export type CommunitySurveyRouteProps = { route: { params: { surveyId: string } } }
/** Same shape and stacks as `communitySurvey`: the parcel history of another member's survey. */
export type CommunityHistoryRouteProps = { route: { params: { surveyId: string } } }
export type SurveyContextRouteProps = StackRouteProps<SurveysStackParamList, "surveyContext">
export type SurveyScoreRouteProps = StackRouteProps<SurveysStackParamList, "surveyScore">
export type SurveyHistoryRouteProps = StackRouteProps<SurveysStackParamList, "surveyHistory">
export type SurveyJournalRouteProps = StackRouteProps<SurveysStackParamList, "surveyJournal">
export type SurveyFormRouteProps = StackRouteProps<SurveysStackParamList, "surveyForm">
export type FactorDetailRouteProps = StackRouteProps<SurveysStackParamList, "surveyFactorDetail">
export type FactorHelpRouteProps = StackRouteProps<SurveysStackParamList, "surveyFactorHelp">
export type ParcelSelectionRouteProps = StackRouteProps<SurveysStackParamList, "surveyParcels">
export type PublicMapRouteProps = StackRouteProps<PublicMapStackParamList, "publicMapHome">
export type AccountRouteProps = StackRouteProps<AccountStackParamList, "accountHome">
export type SettingsRouteProps = StackRouteProps<AccountStackParamList, "settings">
export type OfflineAreasRouteProps = StackRouteProps<AccountStackParamList, "offlineAreas">
