import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import type { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native"
import type { NativeStackScreenProps } from "@react-navigation/native-stack"
import type {
  CountingMode,
  RouteMethod,
  SearchPlaceKind,
  UncappableFactor,
} from "@cortege/ibp-domain"
import type { ExportMode } from "../app/survey-pdf-export"
import type { FactorKey } from "../app/types"
import type { RouteDetailsValue } from "../screens/route-guide/RouteDetailsCard"
import type { WeatherPoint } from "../storage/weather"

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

/**
 * Phase 30: a parcours the observer chose in the chooser, handed back to the route step in the
 * `picked` param of `surveyRouteGuide` (with a fresh `pickNonce`), or offered to the chooser as
 * `preselect`. The details are the typed zone and complement of `RouteDetailsCard`.
 */
export type RoutePick = {
  method: RouteMethod
  counting: CountingMode
  uncapped_factors: UncappableFactor[]
  details?: RouteDetailsValue
}

/**
 * Phase 33, D-14: the PDF the member chose in the export sheet, handed back to the summary screen
 * (the sheet never exports). The `nonce` is new at each confirm, so the summary applies a request
 * once and the same choice made twice is applied twice.
 */
export type SurveyExportRequest = { mode: ExportMode; nonce: number }

export type SurveysStackParamList = AccountStackParamList & {
  surveysHome: undefined
  communitySurvey: { surveyId: string }
  communityHistory: { surveyId: string }
  surveyDetail: { exportRequest?: SurveyExportRequest } | undefined
  // `section` opens the page scrolled to its weather section (summary card, D-15).
  surveyContext: { section?: "conditions" } | undefined
  // D-32: the parcels of the survey (map, list, offline map), opened from the summary's map card.
  surveyParcelsPage: undefined
  surveyScore: undefined
  surveyHistory: undefined
  surveyJournal: undefined
  surveyForm: undefined
  surveyFactorDetail: { factor: FactorKey }
  surveyFactorHelp: { help: string; hints: string[] }
  // Phase 29, D-04: the submission step (a native form sheet: who can see the survey, then finish).
  surveyFinish: { surveyId: string }
  // Phase 33, D-14: the export choice sheet (a native form sheet: complete or summary PDF).
  surveyExportChoice: { surveyId: string }
  surveyParcels: {
    surveyId: string
    mode: "wizard" | "edit"
    /** Edit: the survey's own position, where the map starts (the form holds none). */
    startPoint?: { lat: number; lng: number }
  }
  /**
   * Phase 30 (O-19): "Choix du parcours", the mandatory fifth step of a new survey (`create`: the
   * draft is finalised only when the route is accepted) and the guided choice from the chooser
   * (`edit`: saves the recorded route and goes back). `surveyId` is the wizard's open draft, null
   * when it has none yet. `surfaceHa` is the stand surface estimated from the chosen parcels, null
   * when it could not be computed; `weatherPoint` is kept for the weather lookup of the new survey.
   */
  surveyRouteGuide: {
    surveyId: string | null
    mode: "create" | "edit"
    surfaceHa: number | null
    weatherPoint?: WeatherPoint | null
    /** The chooser's pick, applied once per `pickNonce`. */
    picked?: RoutePick
    pickNonce?: number
  }
  /**
   * Phase 30: "Choisir le parcours" (registered by plan 30-21). `pick` returns the choice to the
   * route step; `edit` saves it on the draft. `section` opens it at the counting.
   */
  surveyRouteChoose: {
    surveyId: string | null
    mode: "pick" | "edit"
    surfaceHa?: number | null
    preselect?: RoutePick
    section?: "counting"
    /** What the guide advised, to mark that parcours "Conseillé" (pick mode). */
    suggested?: { method: RouteMethod; counting: CountingMode }
  }
}

/**
 * Where Explorer is sent to show something (the `nonce` makes the same request re-focus).
 * - `survey` (OA-59): a survey page asks to see its survey, centred and selected.
 * - `place` (D-05): a search result for a place or an address, centred with one static pin.
 * - `parcel` (D-06): a search result for a cadastral parcel, framed and drawn selected.
 */
export type PublicMapFocus =
  | {
      kind: "survey"
      surveyId: string
      lat: number
      lng: number
      /** The survey's parcels, drawn highlighted on the Explorer map (OA-116). */
      parcelIds: string[]
      nonce: number
    }
  | { kind: "place"; lat: number; lng: number; placeKind: SearchPlaceKind; nonce: number }
  | {
      kind: "parcel"
      parcelId: string
      lat: number
      lng: number
      /** West, south, east, north; null when the geometry is unknown. */
      bbox: [number, number, number, number] | null
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
/** The full list of one search group (25-12): it reads its own params only. */
export type SearchGroupRouteProps = { route: { params: SearchStackParamList["searchGroup"] } }
export type SurveyContextRouteProps = StackRouteProps<SurveysStackParamList, "surveyContext">
export type SurveyParcelsPageRouteProps = StackRouteProps<
  SurveysStackParamList,
  "surveyParcelsPage"
>
export type SurveyScoreRouteProps = StackRouteProps<SurveysStackParamList, "surveyScore">
export type SurveyHistoryRouteProps = StackRouteProps<SurveysStackParamList, "surveyHistory">
export type SurveyJournalRouteProps = StackRouteProps<SurveysStackParamList, "surveyJournal">
export type SurveyFormRouteProps = StackRouteProps<SurveysStackParamList, "surveyForm">
export type FactorDetailRouteProps = StackRouteProps<SurveysStackParamList, "surveyFactorDetail">
export type FactorHelpRouteProps = StackRouteProps<SurveysStackParamList, "surveyFactorHelp">
export type FinishSheetRouteProps = StackRouteProps<SurveysStackParamList, "surveyFinish">
export type ExportChoiceRouteProps = StackRouteProps<SurveysStackParamList, "surveyExportChoice">
export type ParcelSelectionRouteProps = StackRouteProps<SurveysStackParamList, "surveyParcels">
export type RouteGuideRouteProps = StackRouteProps<SurveysStackParamList, "surveyRouteGuide">
export type RouteChooseRouteProps = StackRouteProps<SurveysStackParamList, "surveyRouteChoose">
export type PublicMapRouteProps = StackRouteProps<PublicMapStackParamList, "publicMapHome">
export type AccountRouteProps = StackRouteProps<AccountStackParamList, "accountHome">
export type SettingsRouteProps = StackRouteProps<AccountStackParamList, "settings">
export type OfflineAreasRouteProps = StackRouteProps<AccountStackParamList, "offlineAreas">
