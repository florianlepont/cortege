/**
 * The blank page after the new-survey wizard (D-45), on a REAL React Navigation core: the real
 * stack router and the real `beforeRemove` events, with the real `SurveysTabNavigator`, the real
 * summary and parcel routes and the real selection gate. Only the native screen layer is replaced
 * (a navigator that renders every route of the stack, like the native one) and the heavy screens
 * are probes.
 *
 * The bug: the wizard launched from Accueil, a search or Explorer keeps the survey stack, so an
 * older summary screen can still sit in it. The wizard's last step selects the new draft and resets
 * the stack to [surveysHome, surveyDetail]; removing the OLD summary fired its `beforeRemove`
 * listener, which cleared the selection the new summary was about to show, and the new summary
 * rendered nothing.
 */

import React, { useMemo, useState } from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => ({
  Platform: {
    OS: "android",
    Version: 34,
    select: (options: Record<string, unknown>) => options.android ?? options.default,
  },
  StyleSheet: { create: <T,>(value: T): T => value },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  View: "View",
  ScrollView: "ScrollView",
  Text: "Text",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({
  useTabBarClearance: () => 0,
  useAppBottomTabBarHeight: () => 0,
}))
jest.mock("./native-tabs-availability", () => ({
  getNativeTabsAvailability: () => ({ native: false }),
}))
jest.mock("../hooks/useIsOffline", () => ({ useIsOffline: () => false }))

// The real core and routers (ES modules, compiled by jest.unit.config.js); the native stack's
// screen layer is the only thing replaced: same router and same builder, every route rendered.
jest.mock("@react-navigation/native", () => jest.requireActual("@react-navigation/core"))
jest.mock("@react-navigation/native-stack", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  const core = jest.requireActual(
    "@react-navigation/core",
  ) as typeof import("@react-navigation/core")
  const routers = jest.requireActual(
    "@react-navigation/routers",
  ) as typeof import("@react-navigation/routers")
  function StackView(props: Record<string, unknown>) {
    const { state, descriptors, NavigationContent } = core.useNavigationBuilder(
      routers.StackRouter,
      props as never,
    )
    return ReactRef.createElement(
      NavigationContent,
      null,
      state.routes.map((route) =>
        ReactRef.createElement(
          ReactRef.Fragment,
          { key: route.key },
          descriptors[route.key].render(),
        ),
      ),
    )
  }
  return { createNativeStackNavigator: core.createNavigatorFactory(StackView as never) }
})

const mockScreenProps: Record<string, Record<string, unknown>> = {}
function mockScreen(name: string) {
  return function ScreenProbe(props: Record<string, unknown>) {
    mockScreenProps[name] = props
    return null
  }
}
jest.mock("../screens/SurveyDetailScreen", () => ({
  SurveyDetailScreen: mockScreen("surveyDetail"),
}))
jest.mock("../screens/SurveyParcelSelectionScreen", () => ({
  SurveyParcelSelectionScreen: mockScreen("parcelSelection"),
}))
// Routes that play no part in the flow: not rendered, and not loaded (camera, maps, native modules).
jest.mock("./routes/SurveyListRoute", () => ({ SurveyListRoute: () => null }))
jest.mock("./routes/SurveyFormRoute", () => ({ SurveyFormRoute: () => null }))
jest.mock("./routes/FactorDetailRoute", () => ({ FactorDetailRoute: () => null }))
jest.mock("./routes/FactorHelpRoute", () => ({ FactorHelpRoute: () => null }))
jest.mock("./routes/CommunityHistoryRoute", () => ({ CommunityHistoryRoute: () => null }))
jest.mock("./routes/CommunitySurveyRoute", () => ({ CommunitySurveyRoute: () => null }))
jest.mock("./routes/SurveyContextRoute", () => ({ SurveyContextRoute: () => null }))
jest.mock("./routes/SurveyParcelsPageRoute", () => ({ SurveyParcelsPageRoute: () => null }))
jest.mock("./routes/SurveyHistoryRoute", () => ({ SurveyHistoryRoute: () => null }))
jest.mock("./routes/SurveyJournalRoute", () => ({ SurveyJournalRoute: () => null }))
jest.mock("./stacks/AccountStack", () => ({
  ACCOUNT_SCREENS: {
    accountHome: function AccountHome() {
      return null
    },
    settings: function Settings() {
      return null
    },
    offlineAreas: function OfflineAreas() {
      return null
    },
  },
  makeAccountHomeOptions: () => ({}),
  makeSettingsScreenOptions: () => ({}),
  makeOfflineAreasScreenOptions: () => ({}),
}))

import {
  BaseNavigationContainer,
  createNavigationContainerRef,
  type ParamListBase,
} from "@react-navigation/core"
import { SessionProvider, AccessTokenProvider } from "../state/session-context"
import { SurveyActionsProvider, SurveysProvider } from "../state/surveys-context"
import type { SurveyActions, SurveysContextValue } from "../state/surveys-context"
import { SurveyFormProvider, type SurveyFormContextValue } from "../state/survey-form-context"
import { SyncActionsProvider, type SyncActions } from "../state/sync-actions-context"
import { WeatherPrefillProvider, type WeatherPrefillContextValue } from "../state/weather-context"
import type { SessionContextValue } from "../state/session-context"
import { SurveysTabNavigator } from "./stacks/SurveysStack"

type FakeSurvey = { id: string; site_name: string }

function survey(id: string): FakeSurvey {
  return { id, site_name: `Site ${id}` }
}

const OLD_ID = "survey-old"
const NEW_ID = "survey-new"

type Observed = {
  selectedSurveyId: string | null
  selectedSurvey: FakeSurvey | null
  refreshLocalSurveys: jest.Mock
}
const observed: Observed = {
  selectedSurveyId: null,
  selectedSurvey: null,
  refreshLocalSurveys: jest.fn(async () => undefined),
}

/**
 * The slice of `useSurveyList` and the form that matters here, with the same state semantics:
 * `selectedSurvey` is derived from the id and the list, `closeSurveyDetailSelection` clears the
 * id, `openSurvey` sets it, and `createDraft` adds the draft to the list, selects it and returns
 * its id (`handleCreateDraft`).
 */
function Harness({ children }: { children: React.ReactNode }) {
  const [surveys, setSurveys] = useState<FakeSurvey[]>([survey(OLD_ID)])
  const [selectedId, setSelectedId] = useState<string | null>(OLD_ID)
  const selectedSurvey = selectedId
    ? (surveys.find((item) => item.id === selectedId) ?? null)
    : null
  observed.selectedSurveyId = selectedId
  observed.selectedSurvey = selectedSurvey

  const surveyActions = useMemo(
    () =>
      ({
        openSurvey: (id: string) => setSelectedId(id),
        closeSurveyDetailSelection: () => setSelectedId(null),
      }) as unknown as SurveyActions,
    [],
  )
  const surveysValue = {
    state: {
      surveys,
      selectedSurveyId: selectedId,
      selectedSurvey,
      selectedSurveyAttachments: [],
      surveyDetails: {},
      detailsLoadingSurveyId: null,
      surveyEvents: {},
      eventsLoadingSurveyId: null,
    },
    actions: surveyActions,
  } as unknown as SurveysContextValue
  const form = useMemo(
    () =>
      ({
        state: {
          editingSurveyId: NEW_ID,
          gpsLocation: null,
          siteName: "Site",
          selectedParcelIds: ["p-1"],
        },
        actions: {
          createDraft: async () => {
            setSurveys((current) => [...current, survey(NEW_ID)])
            setSelectedId(NEW_ID)
            return NEW_ID
          },
        },
      }) as unknown as SurveyFormContextValue,
    [],
  )
  const session = useMemo(
    () =>
      ({
        state: { apiUrl: "http://api.test/v1", currentUser: null },
        actions: {},
      }) as unknown as SessionContextValue,
    [],
  )
  const syncActions = useMemo(
    () =>
      ({
        refreshLocalSurveys: observed.refreshLocalSurveys,
        handleEnsureAttachmentPreviews: jest.fn(),
        handleSimulateMissingAttachmentFile: jest.fn(),
      }) as unknown as SyncActions,
    [],
  )
  const weather = useMemo(
    () =>
      ({
        state: { inFlightIds: new Set<string>(), unavailableIds: new Set<string>() },
        actions: { rememberPoint: jest.fn(async () => undefined) },
      }) as unknown as WeatherPrefillContextValue,
    [],
  )

  return (
    <SessionProvider value={session}>
      <AccessTokenProvider value={{ accessToken: "token" }}>
        <SyncActionsProvider value={syncActions}>
          <SurveysProvider value={surveysValue}>
            <SurveyActionsProvider value={surveyActions}>
              <SurveyFormProvider value={form}>
                <WeatherPrefillProvider value={weather}>{children}</WeatherPrefillProvider>
              </SurveyFormProvider>
            </SurveyActionsProvider>
          </SurveysProvider>
        </SyncActionsProvider>
      </AccessTokenProvider>
    </SessionProvider>
  )
}

const WIZARD_PARAMS = { surveyId: NEW_ID, mode: "wizard" as const }

async function mountStack(routes: Array<{ name: string; params?: object }>) {
  const ref = createNavigationContainerRef<ParamListBase>()
  let tree: renderer.ReactTestRenderer | null = null
  await act(async () => {
    tree = renderer.create(
      <Harness>
        <BaseNavigationContainer
          ref={ref}
          initialState={{ index: routes.length - 1, routes } as never}
        >
          <SurveysTabNavigator />
        </BaseNavigationContainer>
      </Harness>,
    )
  })
  const routeNames = (): string[] => (ref.getRootState()?.routes ?? []).map((route) => route.name)
  return { tree: tree as unknown as renderer.ReactTestRenderer, ref, routeNames }
}

async function finishWizard() {
  const onSave = mockScreenProps.parcelSelection.onSave as (point: null) => Promise<void>
  await act(async () => {
    await onSave(null)
  })
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined)
  for (const key of Object.keys(mockScreenProps)) delete mockScreenProps[key]
  observed.refreshLocalSurveys.mockClear()
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe("finishing the new-survey wizard with an older summary still in the stack (D-45)", () => {
  test("the new summary opens on the new draft, not on a blank page", async () => {
    const { routeNames } = await mountStack([
      { name: "surveysHome" },
      { name: "surveyDetail" },
      { name: "surveyForm" },
      { name: "surveyParcels", params: WIZARD_PARAMS },
    ])
    // Before: the old summary shows the old survey.
    expect(mockScreenProps.surveyDetail.selectedSurvey).toMatchObject({ id: OLD_ID })

    await finishWizard()

    expect(routeNames()).toEqual(["surveysHome", "surveyDetail"])
    expect(observed.selectedSurveyId).toBe(NEW_ID)
    expect(observed.selectedSurvey?.id).toBe(NEW_ID)
    // The summary screen is mounted with the new survey (the gate is not stuck on its loader).
    expect(mockScreenProps.surveyDetail.selectedSurvey).toMatchObject({ id: NEW_ID })
  })

  test("the same flow with the older summary behind other screens", async () => {
    const { routeNames } = await mountStack([
      { name: "surveysHome" },
      { name: "surveyDetail" },
      { name: "surveyScore" },
      { name: "surveyForm" },
      { name: "surveyParcels", params: WIZARD_PARAMS },
    ])
    await finishWizard()
    expect(routeNames()).toEqual(["surveysHome", "surveyDetail"])
    expect(mockScreenProps.surveyDetail.selectedSurvey).toMatchObject({ id: NEW_ID })
  })

  test("launched from the survey list (no older summary) it still works", async () => {
    const { routeNames } = await mountStack([
      { name: "surveysHome" },
      { name: "surveyForm" },
      { name: "surveyParcels", params: WIZARD_PARAMS },
    ])
    await finishWizard()
    expect(routeNames()).toEqual(["surveysHome", "surveyDetail"])
    expect(mockScreenProps.surveyDetail.selectedSurvey).toMatchObject({ id: NEW_ID })
  })
})

describe("the summary's removal listener on the real router (D-45)", () => {
  test("a reset removes the old summary and emits beforeRemove, which keeps the selection", async () => {
    const { ref, routeNames } = await mountStack([
      { name: "surveysHome" },
      { name: "surveyDetail" },
    ])
    expect(observed.selectedSurveyId).toBe(OLD_ID)
    await act(async () => {
      ref.reset({ index: 1, routes: [{ name: "surveysHome" }, { name: "surveyDetail" }] })
    })
    expect(routeNames()).toEqual(["surveysHome", "surveyDetail"])
    expect(observed.selectedSurveyId).toBe(OLD_ID)
  })

  test("going back from the summary (a normal pop) still clears the selection", async () => {
    const { ref, routeNames } = await mountStack([
      { name: "surveysHome" },
      { name: "surveyDetail" },
    ])
    await act(async () => {
      ref.goBack()
    })
    expect(routeNames()).toEqual(["surveysHome"])
    expect(observed.selectedSurveyId).toBeNull()
  })
})
