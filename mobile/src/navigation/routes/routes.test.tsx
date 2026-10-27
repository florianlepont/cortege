/**
 * Route component tests (phase 01.9-18, D-01).
 *
 * Each route is rendered inside hand-built context values, with its screen
 * replaced by a probe that records the props. The tests check that the route
 * passes the context data through, that its navigation callbacks call the
 * right action and then navigate, and that the map route reloads on the
 * Explorer tab signal.
 */

import React from "react"
import renderer, { act } from "react-test-renderer"

const mockPlatform = {
  OS: "android" as "android" | "ios",
  select: <T,>(options: { android?: T; ios?: T; default?: T }): T | undefined =>
    mockPlatform.OS === "android"
      ? (options.android ?? options.default)
      : (options.ios ?? options.default),
}

jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 44 }))
// The community routes read their navigation from the hook: they are mounted by two navigators.
const mockSearchNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  setOptions: jest.fn(),
}
jest.mock("@react-navigation/native", () => ({ useNavigation: () => mockSearchNavigation }))
jest.mock("../../screens/community-survey/CommunitySurveyScreen", () => ({
  CommunitySurveyScreen: mockScreen("communitySurvey"),
}))
jest.mock("../../screens/community-survey/CommunityHistoryScreen", () => ({
  CommunityHistoryScreen: mockScreen("communityHistory"),
}))
const mockCommunitySurvey = { detail: null, photos: [], status: "loading", photosFailed: false }
const mockCommunitySurveyArgs: {
  surveyId?: string
  accessToken?: string | null
  options?: { withPhotos?: boolean }
} = {}
jest.mock("../../hooks/useCommunitySurvey", () => ({
  useCommunitySurvey: (
    _apiUrl: string,
    accessToken: string | null,
    surveyId: string,
    options?: { withPhotos?: boolean },
  ) => {
    Object.assign(mockCommunitySurveyArgs, { accessToken, surveyId, options })
    return mockCommunitySurvey
  },
}))
jest.mock("react-native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  type PressableRenderProp<T> = T | ((state: { pressed: boolean }) => T)
  const resolvePressableProp = <T,>(prop: PressableRenderProp<T> | undefined): T | undefined =>
    typeof prop === "function"
      ? (prop as (state: { pressed: boolean }) => T)({ pressed: false })
      : prop
  // AppPressable renders Pressable's `children`/`style` in their function-of-pressed-state form.
  const Pressable = ({
    children,
    style,
    ...props
  }: {
    children?: PressableRenderProp<React.ReactNode>
    style?: PressableRenderProp<unknown>
  }) =>
    ReactRef.createElement(
      "Pressable",
      { ...props, style: resolvePressableProp(style) },
      resolvePressableProp(children),
    )

  return {
    Platform: mockPlatform,
    StyleSheet: { create: <T,>(value: T): T => value },
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
    View: "View",
    ScrollView: "ScrollView",
    KeyboardAvoidingView: "KeyboardAvoidingView",
    // Phase 27: the factor pager listens to the keyboard to step its chrome aside.
    Keyboard: { addListener: () => ({ remove: () => undefined }), dismiss: () => undefined },
    BackHandler: {
      addEventListener: (_event: string, handler: () => boolean) => {
        mockBackHandlers.add(handler)
        return { remove: () => mockBackHandlers.delete(handler) }
      },
    },
    Pressable,
    Text: "Text",
    ActivityIndicator: "ActivityIndicator",
  }
})

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}))

const mockBackHandlers = new Set<() => boolean>()
const mockScreenProps: Record<string, Record<string, unknown>> = {}

function mockScreen(name: string) {
  return function ScreenProbe(props: Record<string, unknown>) {
    mockScreenProps[name] = props
    return null
  }
}

jest.mock("../../app/useAppBottomTabBarHeight", () => ({
  useTabBarClearance: () => 68,
  useAppBottomTabBarHeight: () => 68,
}))
// D-26: the pager's finish pill (the button's own looks are tested in ui/GlassButton*.test.tsx).
jest.mock("../../ui/GlassButton", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return {
    GlassButton: (props: Record<string, unknown>) => ReactRef.createElement("GlassButton", props),
  }
})
jest.mock("../../screens/HomeScreen", () => ({ HomeScreen: mockScreen("home") }))
jest.mock("../../screens/SurveyListScreen", () => ({
  SurveyListScreen: mockScreen("surveyList"),
}))
jest.mock("../../screens/SurveyDetailScreen", () => ({
  SurveyDetailScreen: mockScreen("surveyDetail"),
}))
jest.mock("../../screens/SurveyContextScreen", () => ({
  SurveyContextScreen: mockScreen("surveyContext"),
}))
jest.mock("../../screens/SurveyParcelsScreen", () => ({
  SurveyParcelsScreen: mockScreen("surveyParcelsPage"),
}))
jest.mock("../../screens/SurveyScoreScreen", () => ({
  SurveyScoreScreen: mockScreen("surveyScore"),
}))
jest.mock("../../screens/SurveyHistoryScreen", () => ({
  SurveyHistoryScreen: mockScreen("surveyHistory"),
}))
jest.mock("../../screens/SurveyJournalScreen", () => ({
  SurveyJournalScreen: mockScreen("surveyJournal"),
}))
jest.mock("../../screens/survey-wizard/SurveyWizardScreen", () => ({
  SurveyWizardScreen: mockScreen("surveyForm"),
}))
jest.mock("../../screens/route-guide/RouteGuideScreen", () => ({
  RouteGuideScreen: mockScreen("routeGuide"),
}))
jest.mock("../../screens/route-guide/RouteChooseScreen", () => ({
  RouteChooseScreen: mockScreen("routeChoose"),
}))
jest.mock("../../screens/dmh-guide/DmhGuideScreen", () => ({
  DmhGuideScreen: mockScreen("dmhGuide"),
}))
jest.mock("../../screens/FactorHelpSheet", () => ({
  FactorHelpSheet: mockScreen("factorHelp"),
}))

jest.mock("../../screens/FactorDetailScreen", () => ({
  FactorDetailScreen: mockScreen("factorDetail"),
}))
jest.mock("../../screens/SurveyParcelSelectionScreen", () => ({
  SurveyParcelSelectionScreen: mockScreen("parcelSelection"),
}))
jest.mock("../../screens/PublicMapScreen", () => ({ PublicMapScreen: mockScreen("publicMap") }))
jest.mock("../../screens/AccountScreen", () => ({ AccountScreen: mockScreen("account") }))
jest.mock("../../screens/SettingsScreen", () => ({ SettingsScreen: mockScreen("settings") }))
jest.mock("../../screens/OfflineAreasScreen", () => ({
  OfflineAreasScreen: mockScreen("offlineAreas"),
}))

const mockExplorer = {
  items: [],
  parcelStatuses: [],
  loading: false,
  parcelsLoading: false,
  fromDate: "",
  toDate: "",
  region: "",
  setFromDate: jest.fn(),
  setToDate: jest.fn(),
  setRegion: jest.fn(),
  loadPublicMap: jest.fn(async () => undefined),
  loadPublicParcels: jest.fn(async () => undefined),
}
const mockExplorerArgs: { apiUrl?: string; accessToken?: string | null; onStatusChange?: unknown } =
  {}

jest.mock("../../hooks/usePublicMapExplorer", () => ({
  usePublicMapExplorer: (args: {
    apiUrl: string
    accessToken: string | null
    onStatusChange: unknown
  }) => {
    mockExplorerArgs.apiUrl = args.apiUrl
    mockExplorerArgs.accessToken = args.accessToken
    mockExplorerArgs.onStatusChange = args.onStatusChange
    return mockExplorer
  },
}))

// PublicMapRoute's offline hooks (Phase 8) touch SQLite and network state, neither of which this
// navigation-routing suite sets up; stubbed out like usePublicMapExplorer above.
const mockNativeTabs = { value: false }
jest.mock("../native-tabs-availability", () => ({
  getNativeTabsAvailability: () => ({ native: mockNativeTabs.value }),
}))
const mockIsOffline = { value: false }
jest.mock("../../hooks/useIsOffline", () => ({ useIsOffline: () => mockIsOffline.value }))
const mockLocalMapArgs: { value: unknown[] } = { value: [] }
const EMPTY_LOCAL_MAP = { sources: [], parcels: [] }
let mockLocalMapData: { sources: unknown[]; parcels: unknown[] } = EMPTY_LOCAL_MAP
jest.mock("../../hooks/useLocalSurveyMapData", () => ({
  useLocalSurveyMapData: (...args: unknown[]) => {
    mockLocalMapArgs.value = args
    return mockLocalMapData
  },
}))
jest.mock("../../hooks/useBasemapPreference", () => ({
  useBasemapPreference: () => ({ basemap: "map", setBasemap: jest.fn() }),
}))
jest.mock("../../hooks/useOfflineAreas", () => ({
  useOfflineAreas: () => ({
    areas: [],
    downloadingAreaId: null,
    estimateForRegion: jest.fn(() => ({
      tileCountPerBasemap: 0,
      totalTileCount: 0,
      estimatedBytes: 0,
      exceedsCap: false,
    })),
    startDownload: jest.fn(async () => ({ ok: true as const, areaId: "area-1" })),
    deleteArea: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined),
  }),
}))
const mockSetOfflineLayersPolicy = jest.fn()
jest.mock("../../hooks/useOfflineLayersPolicy", () => ({
  useOfflineLayersPolicy: () => ({
    policy: "all",
    setPolicy: mockSetOfflineLayersPolicy,
    reload: jest.fn(),
  }),
}))
jest.mock("../../hooks/useOfflinePendingParcelDrain", () => ({
  useOfflinePendingParcelDrain: jest.fn(),
}))
// Phase 30 (O-19): the pager's finish pill needs the draft's route; these route tests have a routed
// draft (the route gate itself is proved in usePagerFinish.test.ts).
const mockRoutedDraft = {
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 2.5,
  guide: { chosen_by: "observer" },
}
const mockRecordedRoute: { value: unknown } = { value: mockRoutedDraft }
jest.mock("../../hooks/useSurveyRoute", () => ({
  useSurveyRoute: () => ({ route: mockRecordedRoute.value, loaded: true }),
}))
// The chooser reads the draft once to know whether B cover or F counts are stored (U-O10).
const mockGetLocalSurveyDraft = jest.fn(async (_id: string): Promise<unknown> => null)
jest.mock("../../storage/surveys", () => ({
  ...jest.requireActual("../../storage/surveys"),
  getLocalSurveyDraft: (id: string) => mockGetLocalSurveyDraft(id),
}))
jest.mock("../../storage/offline-map", () => ({
  listOfflineAreas: jest.fn(async () => []),
}))

import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { AutosaveStatus } from "../../hooks/useEditingDraft"
import { fr, type StatusMessage } from "../../i18n"
import type { SurveyFormMethod } from "../../screens/survey-wizard/method"
import { AutosaveStatusProvider } from "../../state/autosave-status-context"
import { AccessTokenProvider, SessionProvider } from "../../state/session-context"
import type { SessionContextValue } from "../../state/session-context"
import { StatusProvider } from "../../state/status-context"
import { SyncStatusProvider } from "../../state/sync-status-context"
import { SyncActionsProvider, type SyncActions } from "../../state/sync-actions-context"
import {
  SurveyActionsProvider,
  SurveysProvider,
  type SurveysContextValue,
} from "../../state/surveys-context"
import { SurveyFormProvider, type SurveyFormContextValue } from "../../state/survey-form-context"
import {
  NearbyParcelsProvider,
  type NearbyParcelsContextValue,
} from "../../state/nearby-parcels-context"
import {
  WeatherPrefillProvider,
  type WeatherPrefillContextValue,
} from "../../state/weather-context"
import { PublicMapReloadContext, createPublicMapReloadSignal } from "../public-map-reload"
import { SurveysStackConfigContext } from "../stacks/surveys-stack-config"
import { SELECTION_GRACE_MS } from "./SelectedSurveyGate"
import { AccountRoute } from "./AccountRoute"
import { FactorDetailRoute } from "./FactorDetailRoute"
import { DmhGuideRoute } from "./DmhGuideRoute"
import { FactorHelpRoute } from "./FactorHelpRoute"
import { HomeRoute } from "./HomeRoute"
import { ParcelSelectionRoute } from "./ParcelSelectionRoute"
import { RouteBackButton } from "./RouteBackButton"
import { RouteChooseRoute } from "./RouteChooseRoute"
import { RouteGuideRoute } from "./RouteGuideRoute"
import { PublicMapRoute } from "./PublicMapRoute"
import { OfflineAreasRoute } from "./OfflineAreasRoute"
import { referenceAreaBytes } from "../../map/offline-estimate"
import { SettingsRoute } from "./SettingsRoute"
import type { SurveysStackParamList } from "../types"
import { SurveyContextRoute } from "./SurveyContextRoute"
import { SurveyParcelsPageRoute } from "./SurveyParcelsPageRoute"
import { SurveyDetailRoute } from "./SurveyDetailRoute"
import { SurveyHistoryRoute } from "./SurveyHistoryRoute"
import { SurveyJournalRoute } from "./SurveyJournalRoute"
import { SurveyScoreRoute } from "./SurveyScoreRoute"
import { SurveyFormRoute } from "./SurveyFormRoute"
import { SurveyListRoute } from "./SurveyListRoute"
import { CommunityHistoryRoute } from "./CommunityHistoryRoute"
import { CommunitySurveyRoute } from "./CommunitySurveyRoute"

/** An action object whose members are jest.fn()s created on first access. */
function actionsProxy<T extends object>(defaults: Record<string, unknown> = {}): T {
  const fns: Record<string, jest.Mock> = {}
  return new Proxy({} as T, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined
      if (!(prop in fns)) {
        const result = prop in defaults ? defaults[prop] : undefined
        fns[prop] = jest.fn(async () => result)
      }
      return fns[prop]
    },
  })
}

type Fixture = {
  session: SessionContextValue
  accessToken: string | null
  status: StatusMessage
  isOnline: boolean
  isSyncing: boolean
  syncActions: SyncActions
  surveys: SurveysContextValue
  form: SurveyFormContextValue
  nearby: NearbyParcelsContextValue
  weather: WeatherPrefillContextValue
  autosaveStatus: AutosaveStatus
}

const survey = {
  id: "s-01",
  site_name: "Site 01",
  status: "draft",
  visibility: "private",
  sync_version: 1,
  sync_state: "synced",
  last_sync_error: null,
  last_sync_error_code: null,
  last_sync_error_at: null,
  sync_blocked: 0,
  created_at: "2026-09-01T08:00:00.000Z",
  updated_at: "2026-09-01T09:00:00.000Z",
  completion_rate: 10,
}

function makeFixture(
  overrides: { startEdit?: boolean; saved?: boolean; editingSurveyId?: string | null } = {},
): Fixture {
  const startEdit = overrides.startEdit ?? true
  const saved = overrides.saved ?? true
  return {
    session: {
      state: {
        apiUrl: "http://api.test/v1",
        isAuthenticated: true,
        sessionRestoring: false,
        currentUser: null,
        profile: "p",
        profileUpdating: false,
        localDataOwnerStatus: "ok",
        foreignWork: { surveys: 0, attachments: 0 },
        foreignOwnerEmail: null,
      } as unknown as SessionContextValue["state"],
      actions: actionsProxy(),
    },
    accessToken: "token-1",
    status: fr.status.session.ready(),
    isOnline: true,
    isSyncing: false,
    syncActions: actionsProxy(),
    surveys: {
      state: {
        surveys: [survey],
        visibleSurveys: [],
        selectedSurveyId: null,
        selectedSurvey: null,
        selectedSurveyAttachments: [],
        surveyFromDate: "",
        surveyToDate: "",
        statusFilter: "all",
        syncFilter: "all",
        blockedFilter: "all",
        attachmentFilter: "all",
        sortMode: "updated_desc",
        surveyDetails: {},
        detailsLoadingSurveyId: null,
        surveyEvents: {},
        eventsLoadingSurveyId: null,
        surveyStats: {
          total: 1,
          draft: 1,
          submitted: 0,
          pending: 0,
          synced: 1,
          failed: 0,
          blocked: 0,
        },
        ownSurveyIds: ["s-01"],
        surveyDetailTab: "summary",
        editingSurveyId: null,
        formMode: "create",
      } as unknown as SurveysContextValue["state"],
      actions: actionsProxy({ startEditSurvey: startEdit }),
    },
    form: {
      state: {
        siteName: "Site",
        regionVersion: "ACA",
        vegetationStage: "",
        ibpMethodVersion: "cnpf_ibp_fr_v3_2_2026-02-02",
        ibpCas: 1,
        ibpCas3Scale: false,
        gpsLocation: { lat: "", lng: "", collected_at: "" },
        selectedParcelIds: ["p-1"],
        // FactorPager (phase 3) computes progress across every factor, so B-J need a valid
        // (empty) array too, even though this suite only exercises factor A.
        factorSections: {
          A: [
            {
              key: "a1",
              label: "a1",
              value: "",
              onChange: jest.fn(),
              error: null,
              touched: false,
              onTouch: jest.fn(),
            },
          ],
          B: [],
          C: [],
          D: [],
          E: [],
          F: [],
          G: [],
          H: [],
          I: [],
          J: [],
        },
        factorRetainedScores: {
          A: null,
          B: null,
          C: null,
          D: null,
          E: null,
          F: null,
          G: null,
          H: null,
          I: null,
          J: null,
        },
        factorAnnotations: {},
        formErrors: { siteName: null },
        draftInput: {},
        formMode: "create",
        editingSurveyId: overrides.editingSurveyId ?? null,
      } as unknown as SurveyFormContextValue["state"],
      actions: actionsProxy({ saveSurveyEdits: saved, createDraft: saved ? "s-new" : null }),
    },
    nearby: {
      state: {
        position: null,
        parcels: [],
        sectorAvgScore: null,
        loading: false,
        locationDenied: false,
        positionUnavailable: false,
        error: false,
      },
      load: jest.fn(async () => undefined),
    },
    weather: {
      state: { inFlightIds: new Set<string>(), unavailableIds: new Set<string>() },
      actions: {
        rememberPoint: jest.fn(async () => undefined),
        retry: jest.fn(async () => undefined),
      },
    },
    autosaveStatus: { state: "idle", savedAt: null },
  }
}

function Providers({ fixture, children }: { fixture: Fixture; children: React.ReactNode }) {
  return (
    <SessionProvider value={fixture.session}>
      <AccessTokenProvider value={{ accessToken: fixture.accessToken }}>
        <StatusProvider value={{ status: fixture.status }}>
          <SyncStatusProvider value={{ isOnline: fixture.isOnline, isSyncing: fixture.isSyncing }}>
            <SyncActionsProvider value={fixture.syncActions}>
              <SurveysProvider value={fixture.surveys}>
                <SurveyActionsProvider value={fixture.surveys.actions}>
                  <SurveyFormProvider value={fixture.form}>
                    <AutosaveStatusProvider value={fixture.autosaveStatus}>
                      <NearbyParcelsProvider value={fixture.nearby}>
                        <WeatherPrefillProvider value={fixture.weather}>
                          {children}
                        </WeatherPrefillProvider>
                      </NearbyParcelsProvider>
                    </AutosaveStatusProvider>
                  </SurveyFormProvider>
                </SurveyActionsProvider>
              </SurveysProvider>
            </SyncActionsProvider>
          </SyncStatusProvider>
        </StatusProvider>
      </AccessTokenProvider>
    </SessionProvider>
  )
}

function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    popTo: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    reset: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    addListener: jest.fn((_event: string, _handler: () => void) => jest.fn()),
  }
}

async function mount(element: React.ReactElement): Promise<renderer.ReactTestRenderer> {
  let tree: renderer.ReactTestRenderer | null = null
  await act(async () => {
    tree = renderer.create(element)
  })
  return tree as unknown as renderer.ReactTestRenderer
}

function props(name: string): Record<string, unknown> {
  const value = mockScreenProps[name]
  if (!value) throw new Error(`${name} did not render`)
  return value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any

function callback(name: string, key: string): AnyFn {
  return props(name)[key] as AnyFn
}

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  for (const key of Object.keys(mockScreenProps)) delete mockScreenProps[key]
  mockPlatform.OS = "android"
  mockIsOffline.value = false
  mockLocalMapData = EMPTY_LOCAL_MAP
  mockLocalMapArgs.value = []
  mockExplorer.loadPublicMap.mockClear()
  mockRecordedRoute.value = mockRoutedDraft
  mockGetLocalSurveyDraft.mockReset()
  mockGetLocalSurveyDraft.mockResolvedValue(null)
})

describe("SettingsRoute", () => {
  test("passes the session, the offline-areas summary and the account and debug actions", async () => {
    const fixture = makeFixture()
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SettingsRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    const settings = props("settings")
    expect(settings.apiUrl).toBe("http://api.test/v1")
    expect(settings.onApiUrlChange).toBe(fixture.session.actions.setApiUrl)
    expect(settings.onDeleteAccount).toBe(fixture.session.actions.handleDeleteAccount)
    expect(settings.onDebugResetIbpData).toBe(fixture.syncActions.handleDebugResetIbpData)
    expect(settings.offlineAreas).toEqual({ count: 0, bytes: 0 })
    // The status line is gone (OA-77) and so are the sync tools (OA-78).
    expect(settings.status).toBeUndefined()
    expect(settings.onSync).toBeUndefined()

    callback("settings", "onOpenOfflineAreas")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("offlineAreas")
  })

  test("wires the offline layers policy and the reference weights from the estimator (28-08)", async () => {
    mockSetOfflineLayersPolicy.mockClear()
    await mount(
      <Providers fixture={makeFixture()}>
        <SettingsRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    const settings = props("settings")
    expect(settings.offlineLayersPolicy).toBe("all")
    expect(settings.offlineLayersBytes).toEqual({
      all: referenceAreaBytes("all"),
      base: referenceAreaBytes("base"),
    })
    callback("settings", "onChangeOfflineLayersPolicy")("base")
    expect(mockSetOfflineLayersPolicy).toHaveBeenCalledWith("base")
  })

  test("reads the offline areas again each time it is shown", async () => {
    const listeners: Record<string, () => void> = {}
    const navigation = {
      ...makeNavigation(),
      addListener: jest.fn((event: string, handler: () => void) => {
        listeners[event] = handler
        return jest.fn()
      }),
    }
    await mount(
      <Providers fixture={makeFixture()}>
        <SettingsRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      listeners.focus()
    })
    expect(navigation.addListener).toHaveBeenCalledWith("focus", expect.any(Function))
  })
})

describe("OfflineAreasRoute", () => {
  test("shows the downloaded zones, deletes one and reads them again on focus", async () => {
    const listeners: Record<string, () => void> = {}
    const navigation = {
      ...makeNavigation(),
      addListener: jest.fn((event: string, handler: () => void) => {
        listeners[event] = handler
        return jest.fn()
      }),
    }
    await mount(
      <Providers fixture={makeFixture()}>
        <OfflineAreasRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("offlineAreas").areas).toEqual([])
    await act(async () => {
      listeners.focus()
      callback("offlineAreas", "onDeleteArea")("area-1")
    })
    expect(navigation.addListener).toHaveBeenCalledWith("focus", expect.any(Function))
  })
})

describe("AccountRoute", () => {
  test("passes the access token, or an empty string without one", async () => {
    const fixture = makeFixture()
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <AccountRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("account").accessToken).toBe("token-1")
    expect(props("account").onLogout).toBe(fixture.session.actions.handleLogout)
    expect(props("account").onOpenSyncAndData).toBeUndefined()

    await mount(
      <Providers fixture={{ ...fixture, accessToken: null }}>
        <AccountRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("account").accessToken).toBe("")
  })
})

describe("AccountRoute focus refresh (OA-13)", () => {
  function focusNavigation() {
    const listeners: Record<string, () => void> = {}
    const remove = jest.fn()
    const navigation = {
      ...makeNavigation(),
      addListener: jest.fn((event: string, handler: () => void) => {
        listeners[event] = handler
        return remove
      }),
    }
    return { navigation, listeners, remove }
  }

  test("focusing the screen reloads the profile when signed in", async () => {
    const fixture = makeFixture()
    const { navigation, listeners } = focusNavigation()
    await mount(
      <Providers fixture={fixture}>
        <AccountRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    listeners.focus()
    expect(fixture.session.actions.handleLoadMyProfile).toHaveBeenCalledWith({ silent: true })
  })

  test("focusing the screen does nothing when signed out", async () => {
    const fixture = makeFixture()
    fixture.session.state.isAuthenticated = false
    const { navigation, listeners } = focusNavigation()
    await mount(
      <Providers fixture={fixture}>
        <AccountRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    listeners.focus()
    expect(fixture.session.actions.handleLoadMyProfile).not.toHaveBeenCalled()
  })
})

describe("HomeRoute native header (OA-85)", () => {
  afterEach(() => {
    mockNativeTabs.value = false
  })

  test("outside the native tab tree the screen draws its own header", async () => {
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={makeFixture()}>
        <HomeRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("home").nativeHeader).toBe(false)
    expect(navigation.setOptions).not.toHaveBeenCalled()
  })

  test("in the native tab tree the header carries the greeting and the profile button", async () => {
    mockNativeTabs.value = true
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={makeFixture()}>
        <HomeRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("home").nativeHeader).toBe(true)
    const options = navigation.setOptions.mock.calls.at(-1)[0]
    expect(options.headerShown).toBe(true)
    expect(options.title).toBe("")
    // 12.2-10: the header is transparent so the backdrop halo is not cut by a canvas band.
    expect(options.headerTransparent).toBe(true)
    expect(options.headerBlurEffect).toBe("none")
    expect(options.headerShadowVisible).toBe(false)
    expect(options.headerStyle).toEqual({ backgroundColor: "transparent" })

    const [titleItem] = options.unstable_headerLeftItems()
    expect(titleItem.type).toBe("custom")
    expect(titleItem.hidesSharedBackground).toBe(true)
    const [profileItem] = options.unstable_headerRightItems()
    expect(profileItem.type).toBe("button")
    expect(profileItem.label).toBe(fr.home.avatar)
    profileItem.onPress()
    expect(navigation.navigate).toHaveBeenLastCalledWith("accountHome")
  })

  test("with a profile photo the right item is the bare photo, which opens Compte", async () => {
    mockNativeTabs.value = true
    const fixture = makeFixture()
    fixture.session.state.currentUser = {
      id: "u1",
      email: "marie@test.fr",
      role: "contributor",
      first_name: "Marie",
      last_name: "Lepont",
      display_name: "Marie Lepont",
      profile_picture_url: "/me/profile-picture?v=1",
    } as never
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <HomeRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    const options = navigation.setOptions.mock.calls.at(-1)[0]
    const [profileItem] = options.unstable_headerRightItems()
    expect(profileItem.type).toBe("custom")
    let photo: renderer.ReactTestRenderer | undefined
    act(() => {
      photo = renderer.create(profileItem.element)
    })
    act(() => {
      photo!.root.findByProps({ accessibilityLabel: fr.home.avatar }).props.onPress()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("accountHome")
    act(() => photo!.unmount())
  })
})

describe("HomeRoute native header greeting (OA-85)", () => {
  afterEach(() => {
    mockNativeTabs.value = false
  })

  test("the header title greets the user by first name", async () => {
    mockNativeTabs.value = true
    const fixture = makeFixture()
    fixture.session.state.currentUser = {
      id: "u1",
      email: "marie@test.fr",
      role: "contributor",
      first_name: "Marie",
      last_name: "Lepont",
      display_name: "Marie Lepont",
      profile_picture_url: "/me/profile-picture?v=1",
    } as never
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <HomeRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    const options = navigation.setOptions.mock.calls.at(-1)[0]
    let left: renderer.ReactTestRenderer | undefined
    act(() => {
      left = renderer.create(options.unstable_headerLeftItems()[0].element)
    })
    const text = left!.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    expect(text).toContain(fr.home.greetingWithName({ name: "Marie" }))
    act(() => left!.unmount())
  })
})

describe("HomeRoute", () => {
  test("opens the form, a survey and the explorer through the tab navigator", async () => {
    const fixture = makeFixture()
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <HomeRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("home").nearbyParcels).toBe(fixture.nearby.state)
    expect(props("home").onLoadNearbyParcels).toBe(fixture.nearby.load)
    expect(props("home").surveys).toBe(fixture.surveys.state.surveys)
    expect(props("home").surveyDetails).toBe(fixture.surveys.state.surveyDetails)
    expect(props("home").isOnline).toBe(fixture.isOnline)
    expect(props("home").isSyncing).toBe(fixture.isSyncing)
    expect(props("home").onRetrySurvey).toBe(fixture.surveys.actions.retrySurvey)

    callback("home", "onOpenSyncStatus")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("settings")

    callback("home", "onCreateSurvey")()
    expect(fixture.surveys.actions.openCreateSurvey).toHaveBeenCalled()
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveys", {
      screen: "surveyForm",
      initial: false,
    })

    // OA-107: the photo tool starts a survey with the genus, and adds one to a survey in progress.
    callback("home", "onCreateSurveyWithGenus")("Fagus")
    expect(fixture.surveys.actions.openCreateSurvey).toHaveBeenLastCalledWith({ genus: "Fagus" })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveys", {
      screen: "surveyForm",
      initial: false,
    })
    expect(props("home").onAddGenusToSurvey).toBe(fixture.surveys.actions.addGenusToSurvey)

    callback("home", "onOpenSurvey")("s-01")
    expect(fixture.surveys.actions.openSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveys", {
      screen: "surveyDetail",
      initial: false,
    })

    // D-20c: "Tout voir" of the recent surveys shows the list itself (not pushed on top of itself).
    callback("home", "onOpenSurveyList")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveys", { screen: "surveysHome" })

    callback("home", "onNavigateToExplorer")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("publicMap")

    // HOME-06: the avatar navigates to Compte.
    callback("home", "onNavigateToAccount")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("accountHome")
  })

  test("passes the access token and api url the avatar needs to build a signed photo url", async () => {
    const fixture = makeFixture()
    await mount(
      <Providers fixture={fixture}>
        <HomeRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("home").accessToken).toBe(fixture.accessToken)
    expect(props("home").apiUrl).toBe(fixture.session.state.apiUrl)
  })
})

describe("SurveyListRoute", () => {
  test("opens the form, a survey and the search, and draws its own title bar", async () => {
    const fixture = makeFixture()
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyListRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    const list = props("surveyList")
    expect(list.surveys).toBe(fixture.surveys.state.surveys)
    expect(list.showTitleBar).toBe(true)
    expect(list.surveyDetails).toBe(fixture.surveys.state.surveyDetails)
    expect(navigation.setOptions).not.toHaveBeenCalled()

    callback("surveyList", "onOpenCreateSurvey")()
    expect(fixture.surveys.actions.openCreateSurvey).toHaveBeenCalled()
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyForm")

    callback("surveyList", "onOpenSurvey")("s-01")
    expect(fixture.surveys.actions.openSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyDetail")

    // D-01: search is the tab, the list has no search callback any more.
    expect(Object.keys(props("surveyList")).filter((key) => /search/i.test(key))).toEqual([])
  })

  test("with the native tab bar outside iOS it keeps its own title bar", async () => {
    mockPlatform.OS = "android"
    const fixture = makeFixture()
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveysStackConfigContext.Provider value={{ useNativeNav: true }}>
          <SurveyListRoute navigation={navigation as never} route={{} as never} />
        </SurveysStackConfigContext.Provider>
      </Providers>,
    )
    expect(props("surveyList").showTitleBar).toBe(true)
    expect(navigation.setOptions).not.toHaveBeenCalled()
  })

  test("in the native iOS Mes Relevés tab it owns the header's +, the title is the native large title", async () => {
    mockPlatform.OS = "ios"
    const fixture = makeFixture()
    const navigation = makeNavigation()
    const tree = await mount(
      <Providers fixture={fixture}>
        <SurveysStackConfigContext.Provider value={{ useNativeNav: true }}>
          <SurveyListRoute navigation={navigation as never} route={{} as never} />
        </SurveysStackConfigContext.Provider>
      </Providers>,
    )
    expect(props("surveyList").showTitleBar).toBe(false)
    expect(navigation.setOptions).toHaveBeenCalledTimes(1)

    const setOptionsCall = navigation.setOptions.mock.calls[0][0]
    // Search is its own tab (OA-52): no header search bar.
    expect(setOptionsCall.headerSearchBarOptions).toBeUndefined()
    // D-19: no canvas band, the stack's transparent halo header is kept.
    expect(setOptionsCall.headerStyle).toBeUndefined()

    // 12.2-17: no title of our own in the bar (a headerTitle "" would blank the large title).
    expect(setOptionsCall).not.toHaveProperty("headerTitle")
    expect(setOptionsCall).not.toHaveProperty("unstable_headerLeftItems")

    // SYNC-02/HOME-01: the native header also carries the "+" create button.
    const [createButton] = setOptionsCall.unstable_headerRightItems()
    expect(createButton.label).toBe(fr.surveyList.a11y.createSurvey)
    createButton.onPress()
    expect(fixture.surveys.actions.openCreateSurvey).toHaveBeenCalled()

    // The frame leaves the insets to iOS (large title mode): no header padding, no halo child.
    const frame = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.testID === "screen-frame",
    )
    const style = Object.assign({}, ...[frame.props.style].flat()) as Record<string, unknown>
    expect(style.paddingTop).toBeUndefined()
    expect(style.experimental_backgroundImage).toBeDefined()
  })
})

describe("CommunitySurveyRoute", () => {
  test("loads the survey of the route and opens its parcel history", async () => {
    const navigation = mockSearchNavigation
    await mount(
      <Providers fixture={makeFixture()}>
        <CommunitySurveyRoute route={{ params: { surveyId: "c-1" } }} />
      </Providers>,
    )
    const screen = props("communitySurvey")
    expect(mockCommunitySurveyArgs.surveyId).toBe("c-1")
    expect(screen.apiUrl).toBe("http://api.test/v1")
    expect(screen.state).toBe(mockCommunitySurvey)
    expect(screen.offline).toBe(false)

    callback("communitySurvey", "onOpenHistory")()
    expect(navigation.push).toHaveBeenCalledWith("communityHistory", { surveyId: "c-1" })
  })

  test("passes the network state as offline (D-03)", async () => {
    mockIsOffline.value = true
    await mount(
      <Providers fixture={makeFixture()}>
        <CommunitySurveyRoute route={{ params: { surveyId: "c-1" } }} />
      </Providers>,
    )
    expect(props("communitySurvey").offline).toBe(true)
  })
})

describe("CommunityHistoryRoute", () => {
  test("loads the survey without its photos and opens another survey read-only", async () => {
    const navigation = mockSearchNavigation
    await mount(
      <Providers fixture={makeFixture()}>
        <CommunityHistoryRoute route={{ params: { surveyId: "c-1" } }} />
      </Providers>,
    )
    const screen = props("communityHistory")
    expect(mockCommunitySurveyArgs.surveyId).toBe("c-1")
    expect(mockCommunitySurveyArgs.options).toEqual({ withPhotos: false })
    expect(screen.state).toBe(mockCommunitySurvey)
    expect(screen.offline).toBe(false)

    callback("communityHistory", "onOpenSurvey")("c-2")
    expect(navigation.push).toHaveBeenCalledWith("communitySurvey", { surveyId: "c-2" })
  })

  test("passes the network state as offline (D-03)", async () => {
    mockIsOffline.value = true
    await mount(
      <Providers fixture={makeFixture()}>
        <CommunityHistoryRoute route={{ params: { surveyId: "c-1" } }} />
      </Providers>,
    )
    expect(props("communityHistory").offline).toBe(true)
  })
})

describe("CommunitySurveyRoute native large title (12.2-17)", () => {
  const loaded = mockCommunitySurvey as unknown as { detail: unknown; status: string }

  beforeEach(() => {
    mockNativeTabs.value = false
    mockSearchNavigation.setOptions.mockClear()
  })
  afterEach(() => {
    loaded.detail = null
    loaded.status = "loading"
  })

  async function render() {
    return mount(
      <Providers fixture={makeFixture()}>
        <CommunitySurveyRoute route={{ params: { surveyId: "c-1" } }} />
      </Providers>,
    )
  }

  test("the loaded survey's name becomes the native large title", async () => {
    mockNativeTabs.value = true
    loaded.detail = { site_name: "  Bois de la Cure  " }
    loaded.status = "ready"
    await render()
    expect(mockSearchNavigation.setOptions).toHaveBeenCalledWith({ title: "Bois de la Cure" })
  })

  test("a survey without a name gets the untitled label", async () => {
    mockNativeTabs.value = true
    loaded.detail = { site_name: "   " }
    loaded.status = "ready"
    await render()
    expect(mockSearchNavigation.setOptions).toHaveBeenCalledWith({
      title: fr.common.untitledSurvey,
    })
  })

  test("a survey from the API without a usable name leaves the stack's title", async () => {
    mockNativeTabs.value = true
    loaded.detail = { site_name: null }
    loaded.status = "ready"
    await render()
    expect(mockSearchNavigation.setOptions).not.toHaveBeenCalled()
  })

  test("while loading the stack's title stays", async () => {
    mockNativeTabs.value = true
    await render()
    expect(mockSearchNavigation.setOptions).not.toHaveBeenCalled()
  })

  test("outside the native iOS tab tree the page names the survey itself", async () => {
    loaded.detail = { site_name: "Bois de la Cure" }
    loaded.status = "ready"
    await render()
    expect(mockSearchNavigation.setOptions).not.toHaveBeenCalled()
  })
})

describe("SurveyDetailRoute", () => {
  function withSelection(fixture: Fixture): Fixture {
    return {
      ...fixture,
      surveys: {
        ...fixture.surveys,
        state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
      } as unknown as SurveysContextValue,
    }
  }

  test("passes the signed-in member's display name as the PDF observer (D-04)", async () => {
    const fixture = withSelection(makeFixture())
    fixture.session.state.currentUser = { display_name: "Marie Lepont" } as never
    await mount(
      <Providers fixture={fixture}>
        <SurveyDetailRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").observerName).toBe("Marie Lepont")
  })

  test("tells the summary whether a weather lookup runs for the selected survey (phase 27)", async () => {
    const idle = withSelection(makeFixture())
    await mount(
      <Providers fixture={idle}>
        <SurveyDetailRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").conditionsLoading).toBe(false)

    const busy = withSelection(makeFixture())
    busy.weather.state = { inFlightIds: new Set(["s-01"]), unavailableIds: new Set() }
    await mount(
      <Providers fixture={busy}>
        <SurveyDetailRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").conditionsLoading).toBe(true)

    const other = withSelection(makeFixture())
    other.weather.state = { inFlightIds: new Set(["another"]), unavailableIds: new Set() }
    await mount(
      <Providers fixture={other}>
        <SurveyDetailRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").conditionsLoading).toBe(false)
  })

  test("tells the summary whether the phone is offline, for the calm empty weather card (D-40)", async () => {
    const fixture = withSelection(makeFixture())
    await mount(
      <Providers fixture={fixture}>
        <SurveyDetailRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").conditionsOffline).toBe(false)

    mockIsOffline.value = true
    await mount(
      <Providers fixture={fixture}>
        <SurveyDetailRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").conditionsOffline).toBe(true)
  })

  test("hands the summary's note card the silent draft write of the note (D-33)", async () => {
    const fixture = withSelection(makeFixture())
    await mount(
      <Providers fixture={fixture}>
        <SurveyDetailRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").onChangeNote).toBe(fixture.surveys.actions.updateSurveyNote)
  })

  test("passes the survey and opens the sub-pages", async () => {
    const fixture = withSelection(makeFixture())
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyDetailRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").apiUrl).toBe("http://api.test/v1")
    expect(props("surveyDetail").navigation).toBe(navigation)
    expect(props("surveyDetail").observerName).toBeNull()
    expect(props("surveyDetail").onSimulateMissingAttachmentFile).toBe(
      fixture.syncActions.handleSimulateMissingAttachmentFile,
    )

    await act(async () => {
      callback("surveyDetail", "onOpenContext")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyContext")

    await act(async () => {
      callback("surveyDetail", "onOpenFinish")("survey-9")
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyFinish", { surveyId: "survey-9" })
    expect(fixture.surveys.actions.submitSurvey).not.toHaveBeenCalled()
    await act(async () => {
      callback("surveyDetail", "onOpenConditions")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyContext", {
      section: "conditions",
    })
    await act(async () => {
      callback("surveyDetail", "onOpenScore")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyScore")
    await act(async () => {
      callback("surveyDetail", "onOpenHistory")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyHistory")
    await act(async () => {
      callback("surveyDetail", "onOpenJournal")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyJournal")

    await act(async () => {
      await callback("surveyDetail", "onOpenFactor")("s-01", "C")
    })
    expect(fixture.surveys.actions.startEditSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyFactorDetail", { factor: "C" })

    // D-32: the map card and the Parcelles row open the Parcelles page, not the editor.
    await act(async () => {
      callback("surveyDetail", "onOpenParcelsPage")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyParcelsPage")
    expect(props("surveyDetail").onOpenParcels).toBeUndefined()
  })

  test("phase 33: Partager opens the export choice sheet, and the chosen request is handed over then cleared (D-05, D-14)", async () => {
    const fixture = withSelection(makeFixture())
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyDetailRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").exportRequest).toBeUndefined()

    await act(async () => {
      callback("surveyDetail", "onOpenExportChoice")("survey-9")
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyExportChoice", {
      surveyId: "survey-9",
    })

    await act(async () => {
      callback("surveyDetail", "onExportRequestHandled")()
    })
    expect(navigation.setParams).toHaveBeenLastCalledWith({ exportRequest: undefined })

    const exportRequest = { mode: "summary", nonce: 7 }
    await mount(
      <Providers fixture={fixture}>
        <SurveyDetailRoute
          navigation={navigation as never}
          route={{ params: { exportRequest } } as never}
        />
      </Providers>,
    )
    expect(props("surveyDetail").exportRequest).toBe(exportRequest)
  })

  test("the next-factor button stays on the page when the survey cannot be loaded", async () => {
    const base = withSelection(makeFixture({ startEdit: false }))
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={base}>
        <SurveyDetailRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      await callback("surveyDetail", "onOpenFactor")("s-01", "C")
    })
    expect(navigation.navigate).not.toHaveBeenCalled()
  })
})

describe("SurveyContextRoute", () => {
  test("the route takes no param or the optional section param (compile-time check)", () => {
    const plain: SurveysStackParamList["surveyContext"] = undefined
    const withSection: SurveysStackParamList["surveyContext"] = { section: "conditions" }
    const empty: SurveysStackParamList["surveyContext"] = {}
    expect([plain, withSection, empty]).toHaveLength(3)
  })

  function withSelection(fixture: Fixture): Fixture {
    return {
      ...fixture,
      surveys: {
        ...fixture.surveys,
        state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
      } as unknown as SurveysContextValue,
    }
  }

  test("hands the page the method updates and no parcel editing (D-32)", async () => {
    const fixture = withSelection(makeFixture())
    await mount(
      <Providers fixture={fixture}>
        <SurveyContextRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyContext").onUpdateIbpCas).toBe(fixture.surveys.actions.updateIbpCas)
    expect(props("surveyContext").onOpenParcels).toBeUndefined()
  })

  test("hands the weather section its silent draft write and the two weather links (phase 27)", async () => {
    const fixture = withSelection(makeFixture())
    await mount(
      <Providers fixture={fixture}>
        <SurveyContextRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyContext").onChangeNote).toBeUndefined()
    expect(props("surveyContext").onEditWeather).toBe(fixture.surveys.actions.updateSurveyWeather)
    expect(props("surveyContext").onRetryWeather).toBe(fixture.weather.actions.retry)
  })

  test("tells the page what the weather request of the survey is doing", async () => {
    const idle = withSelection(makeFixture())
    await mount(
      <Providers fixture={idle}>
        <SurveyContextRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyContext").weatherRequest).toEqual({
      online: true,
      inFlight: false,
      unavailable: false,
    })

    const busy = withSelection(makeFixture())
    busy.weather.state = {
      inFlightIds: new Set(["s-01"]),
      unavailableIds: new Set(["s-01", "other"]),
    }
    mockIsOffline.value = true
    await mount(
      <Providers fixture={busy}>
        <SurveyContextRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyContext").weatherRequest).toEqual({
      online: false,
      inFlight: true,
      unavailable: true,
    })

    const elsewhere = withSelection(makeFixture())
    elsewhere.weather.state = {
      inFlightIds: new Set(["another-survey"]),
      unavailableIds: new Set<string>(),
    }
    mockIsOffline.value = false
    await mount(
      <Providers fixture={elsewhere}>
        <SurveyContextRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyContext").weatherRequest).toEqual({
      online: true,
      inFlight: false,
      unavailable: false,
    })
  })

  test("opens at the top, or scrolled to the Conditions with the section param", async () => {
    await mount(
      <Providers fixture={withSelection(makeFixture())}>
        <SurveyContextRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyContext").section).toBeUndefined()

    await mount(
      <Providers fixture={withSelection(makeFixture())}>
        <SurveyContextRoute
          navigation={makeNavigation() as never}
          route={{ params: { section: "conditions" } } as never}
        />
      </Providers>,
    )
    expect(props("surveyContext").section).toBe("conditions")
  })
})

describe("SurveyParcelsPageRoute", () => {
  function withSelection(fixture: Fixture): Fixture {
    return {
      ...fixture,
      surveys: {
        ...fixture.surveys,
        state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
      } as unknown as SurveysContextValue,
    }
  }

  test("opens the parcel editing once the survey is loaded for editing", async () => {
    const fixture = withSelection(makeFixture())
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyParcelsPageRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyParcelsPage").apiUrl).toBe("http://api.test/v1")

    await act(async () => {
      await callback("surveyParcelsPage", "onOpenParcels")("s-01")
    })
    expect(fixture.surveys.actions.startEditSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyParcels", {
      surveyId: "s-01",
      mode: "edit",
    })
  })

  test("the route card opens the chooser in edit mode for the selected survey (phase 30, D-09, moved from Contexte on 2026-10-14)", async () => {
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={withSelection(makeFixture())}>
        <SurveyParcelsPageRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      callback("surveyParcelsPage", "onEditRoute")("s-01")
    })
    // The assistant reads the recorded answers itself: no surface and no preselection travel.
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyRouteGuide", {
      surveyId: "s-01",
      mode: "edit",
      surfaceHa: null,
    })
  })

  test("the editor starts on the survey's own position when its page knows it", async () => {
    const fixture = withSelection(makeFixture())
    fixture.surveys.state.surveyDetails = {
      "s-01": { display_location: { lat: 48.656, lng: 2.503 } },
    } as unknown as typeof fixture.surveys.state.surveyDetails
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyParcelsPageRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      await callback("surveyParcelsPage", "onOpenParcels")("s-01")
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyParcels", {
      surveyId: "s-01",
      mode: "edit",
      startPoint: { lat: 48.656, lng: 2.503 },
    })
  })

  test("does not navigate when the survey cannot be loaded for editing", async () => {
    const fixture = withSelection(makeFixture({ startEdit: false }))
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyParcelsPageRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      await callback("surveyParcelsPage", "onOpenParcels")("s-01")
    })
    expect(navigation.navigate).not.toHaveBeenCalled()
  })
})

describe("SurveyScoreRoute", () => {
  function withSelection(fixture: Fixture): Fixture {
    return {
      ...fixture,
      surveys: {
        ...fixture.surveys,
        state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
      } as unknown as SurveysContextValue,
    }
  }

  test("opens a factor once the survey is loaded for editing", async () => {
    const fixture = withSelection(makeFixture())
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyScoreRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      await callback("surveyScore", "onOpenFactor")("s-01", "B")
    })
    expect(fixture.surveys.actions.startEditSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyFactorDetail", { factor: "B" })
  })

  test("does not navigate when the survey cannot be loaded", async () => {
    const fixture = withSelection(makeFixture({ startEdit: false }))
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyScoreRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      await callback("surveyScore", "onOpenFactor")("s-01", "B")
    })
    expect(navigation.navigate).not.toHaveBeenCalled()
  })
})

describe("SurveyHistoryRoute", () => {
  function selected() {
    const fixture = makeFixture()
    fixture.surveys = {
      ...fixture.surveys,
      state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
    } as unknown as SurveysContextValue
    return fixture
  }

  test("passes the session, the selected survey and opens other surveys read-only", async () => {
    const fixture = selected()
    const navigation = { ...makeNavigation(), push: jest.fn() }
    await mount(
      <Providers fixture={fixture}>
        <SurveyHistoryRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    const historyProps = props("surveyHistory")
    expect(historyProps.apiUrl).toBe("http://api.test/v1")
    expect(historyProps.accessToken).toBe("token-1")
    expect(historyProps.selectedSurvey).toBe(survey)
    expect(historyProps.surveyDetails).toBe(fixture.surveys.state.surveyDetails)
    expect(historyProps.detailsLoadingSurveyId).toBe(fixture.surveys.state.detailsLoadingSurveyId)
    expect(historyProps).not.toHaveProperty("onLoadSurveyEvents")
    callback("surveyHistory", "onOpenSurvey")("s-02")
    expect(navigation.push).toHaveBeenCalledWith("communitySurvey", { surveyId: "s-02" })
  })
})

describe("SurveyJournalRoute", () => {
  test("passes the selected survey, its events and the loader", async () => {
    const fixture = {
      ...makeFixture(),
    }
    fixture.surveys = {
      ...fixture.surveys,
      state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
    } as unknown as SurveysContextValue
    await mount(
      <Providers fixture={fixture}>
        <SurveyJournalRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    const journalProps = props("surveyJournal")
    expect(journalProps.selectedSurvey).toBe(survey)
    expect(journalProps.surveyEvents).toBe(fixture.surveys.state.surveyEvents)
    expect(journalProps.eventsLoadingSurveyId).toBe(fixture.surveys.state.eventsLoadingSurveyId)
    expect(journalProps.onLoadSurveyEvents).toBe(fixture.surveys.actions.loadSurveyEvents)
  })
})

describe("SelectedSurveyGate on the survey pages (D-45)", () => {
  const pages: Array<{ name: string; element: (navigation: unknown) => React.ReactElement }> = [
    {
      name: "SurveyDetailRoute",
      element: (navigation) => (
        <SurveyDetailRoute navigation={navigation as never} route={{} as never} />
      ),
    },
    {
      name: "SurveyContextRoute",
      element: (navigation) => (
        <SurveyContextRoute navigation={navigation as never} route={{} as never} />
      ),
    },
    {
      name: "SurveyParcelsPageRoute",
      element: (navigation) => (
        <SurveyParcelsPageRoute navigation={navigation as never} route={{} as never} />
      ),
    },
    {
      name: "SurveyScoreRoute",
      element: (navigation) => (
        <SurveyScoreRoute navigation={navigation as never} route={{} as never} />
      ),
    },
    {
      name: "SurveyHistoryRoute",
      element: (navigation) => (
        <SurveyHistoryRoute navigation={navigation as never} route={{} as never} />
      ),
    },
    {
      name: "SurveyJournalRoute",
      element: (navigation) => (
        <SurveyJournalRoute navigation={navigation as never} route={{} as never} />
      ),
    },
  ]

  function withSurveys(
    fixture: Fixture,
    selection: { selectedSurveyId: string | null; selectedSurvey: unknown },
  ): Fixture {
    return {
      ...fixture,
      surveys: {
        ...fixture.surveys,
        state: { ...fixture.surveys.state, ...selection },
      } as unknown as SurveysContextValue,
    }
  }

  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  function placeholderText(tree: renderer.ReactTestRenderer): string[] {
    return tree.root
      .findAll((node) => node.props.testID === "survey-loading")
      .flatMap((node) => node.findAll((inner) => typeof inner.props.children === "string"))
      .map((node) => node.props.children as string)
  }

  describe.each(pages)("$name", ({ element }) => {
    test("shows the loading state, never a blank page, while no survey is selected", async () => {
      const fixture = withSurveys(makeFixture(), { selectedSurveyId: null, selectedSurvey: null })
      const tree = await mount(<Providers fixture={fixture}>{element(makeNavigation())}</Providers>)
      expect(tree.toJSON()).not.toBeNull()
      expect(placeholderText(tree)).toContain(fr.navigation.surveyLoading)
      expect(fixture.syncActions.refreshLocalSurveys).not.toHaveBeenCalled()
    })

    test("goes back after the grace delay when nothing gets selected", async () => {
      const navigation = makeNavigation()
      const fixture = withSurveys(makeFixture(), { selectedSurveyId: null, selectedSurvey: null })
      await mount(<Providers fixture={fixture}>{element(navigation)}</Providers>)
      act(() => {
        jest.advanceTimersByTime(SELECTION_GRACE_MS - 1)
      })
      expect(navigation.goBack).not.toHaveBeenCalled()
      act(() => {
        jest.advanceTimersByTime(700)
      })
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(navigation.navigate).not.toHaveBeenCalled()
    })

    test("falls back to the survey list when it is the first screen of the stack", async () => {
      const navigation = makeNavigation()
      navigation.canGoBack.mockReturnValue(false)
      const fixture = withSurveys(makeFixture(), { selectedSurveyId: null, selectedSurvey: null })
      await mount(<Providers fixture={fixture}>{element(navigation)}</Providers>)
      act(() => {
        jest.advanceTimersByTime(700)
      })
      expect(navigation.goBack).not.toHaveBeenCalled()
      expect(navigation.navigate).toHaveBeenCalledWith("surveysHome")
    })

    test("does nothing when the selection appears before the delay, and the page renders", async () => {
      const navigation = makeNavigation()
      const empty = withSurveys(makeFixture(), { selectedSurveyId: null, selectedSurvey: null })
      const selected = withSurveys(empty, { selectedSurveyId: "s-01", selectedSurvey: survey })
      const tree = await mount(<Providers fixture={empty}>{element(navigation)}</Providers>)
      act(() => {
        jest.advanceTimersByTime(300)
      })
      await act(async () => {
        tree.update(<Providers fixture={selected}>{element(navigation)}</Providers>)
      })
      expect(placeholderText(tree)).toEqual([])
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(navigation.goBack).not.toHaveBeenCalled()
      expect(navigation.navigate).not.toHaveBeenCalled()
    })

    test("clears its timer when the page unmounts", async () => {
      const navigation = makeNavigation()
      const fixture = withSurveys(makeFixture(), { selectedSurveyId: null, selectedSurvey: null })
      const tree = await mount(<Providers fixture={fixture}>{element(navigation)}</Providers>)
      await act(async () => {
        tree.unmount()
      })
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(navigation.goBack).not.toHaveBeenCalled()
    })
  })

  test("a selected id the list does not hold asks for one list refresh", async () => {
    const missing = withSurveys(makeFixture(), { selectedSurveyId: "s-gone", selectedSurvey: null })
    const present = withSurveys(missing, { selectedSurveyId: "s-gone", selectedSurvey: survey })
    const page = (fixture: Fixture) => (
      <Providers fixture={fixture}>
        <SurveyScoreRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>
    )
    const tree = await mount(page(missing))
    expect(missing.syncActions.refreshLocalSurveys).toHaveBeenCalledTimes(1)
    // The survey shows up, then the id is missing again: the list is not asked for a second time.
    await act(async () => {
      tree.update(page(present))
    })
    await act(async () => {
      tree.update(page(missing))
    })
    expect(missing.syncActions.refreshLocalSurveys).toHaveBeenCalledTimes(1)
  })
})

describe("SurveyFormRoute", () => {
  test("feeds the wizard, opens the parcel step and closes", async () => {
    const fixture = makeFixture()
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyFormRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )

    // The method state and setters travel in one prop (01.8-13); the form never holds a
    // submitted survey, so the version stays open.
    const method = props("surveyForm").method as SurveyFormMethod
    expect(method).toMatchObject({
      version: IBP_METHOD_V3_2,
      cas: 1,
      cas3Scale: false,
      locked: false,
    })
    method.setVersion(IBP_METHOD_V3_0)
    method.setCas(3)
    method.setCas3Scale(true)
    expect(fixture.form.actions.setIbpMethodVersion).toHaveBeenCalledWith(IBP_METHOD_V3_0)
    expect(fixture.form.actions.setIbpCas).toHaveBeenCalledWith(3)
    expect(fixture.form.actions.setIbpCas3Scale).toHaveBeenCalledWith(true)

    callback("surveyForm", "onOpenParcels")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyParcels", {
      surveyId: "draft",
      mode: "wizard",
    })
    callback("surveyForm", "onClose")()
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    // Android: the wizard draws its own top bar.
    expect(props("surveyForm").nativeHeader).toBe(false)
  })

  test("iOS: the wizard is told the stack shows the native header (12.2-17)", async () => {
    mockPlatform.OS = "ios"
    await mount(
      <Providers fixture={makeFixture()}>
        <SurveyFormRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyForm").nativeHeader).toBe(true)
  })

  test("uses the edited survey id when a draft is open", async () => {
    const base = makeFixture()
    const fixture: Fixture = {
      ...base,
      form: { ...base.form, state: { ...base.form.state, editingSurveyId: "s-01" } },
    }
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyFormRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    callback("surveyForm", "onOpenParcels")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyParcels", {
      surveyId: "s-01",
      mode: "wizard",
    })
  })
})

describe("SurveyFormRoute: the empty draft the wizard opened", () => {
  type FormOverrides = Partial<SurveyFormContextValue["state"]>

  /** Mounts the wizard route with the given form state, then removes the route like a back press. */
  async function leave(overrides: FormOverrides) {
    const base = makeFixture()
    const fixture: Fixture = {
      ...base,
      form: { ...base.form, state: { ...base.form.state, ...overrides } },
    }
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyFormRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    const call = navigation.addListener.mock.calls.find(([event]) => event === "beforeRemove")
    expect(call).toBeDefined()
    await act(async () => {
      call?.[1]()
    })
    return fixture.surveys.actions.discardEmptyDraft as unknown as jest.Mock
  }

  const EMPTY: FormOverrides = {
    formMode: "create",
    editingSurveyId: "s-new",
    siteName: "  ",
    selectedParcelIds: [],
    draftInput: { factors: {} } as unknown as FormOverrides["draftInput"],
  }

  test("is dropped when the route is left before the site is named", async () => {
    const discard = await leave(EMPTY)
    expect(discard).toHaveBeenCalledTimes(1)
    expect(discard).toHaveBeenCalledWith("s-new")
  })

  test("is kept once the site is named", async () => {
    expect(await leave({ ...EMPTY, siteName: "Forêt de Tronçais" })).not.toHaveBeenCalled()
  })

  test("is kept with a parcel chosen or a factor filled", async () => {
    expect(await leave({ ...EMPTY, selectedParcelIds: ["p-1"] })).not.toHaveBeenCalled()
    const withFactor = {
      factors: { A: { native_genus_count: 2 } },
    } as unknown as FormOverrides["draftInput"]
    expect(await leave({ ...EMPTY, draftInput: withFactor })).not.toHaveBeenCalled()
  })

  test("does nothing when no draft was opened or a survey is being edited", async () => {
    expect(await leave({ ...EMPTY, editingSurveyId: null })).not.toHaveBeenCalled()
    expect(await leave({ ...EMPTY, formMode: "edit" })).not.toHaveBeenCalled()
  })
})

describe("FactorDetailRoute: Terminer le relevé from the pager (D-26)", () => {
  // A complete v3.0 draft (ten scored factors and a parcel), the one of ibp-scoring.test.ts.
  const COMPLETE_DRAFT = {
    site_name: "Site 01",
    region_version: "ACA",
    vegetation_stage: "collineen",
    factors: {
      A: { native_genus_count: 2 },
      B: { strata_count: 2, covered_autochthonous_percent: 80 },
      C: { bmg_count: 0, bmm_count: 1, surface_ha: 1 },
      D: { bmg_count: 0, bmm_count: 1, surface_ha: 1 },
      E: { tgb_count: 0, gb_count: 1, surface_ha: 1 },
      F: { trees_per_ha: 2 },
      G: { open_flowering_percent: 2 },
      H: { class_score: 2 },
      I: { type_count: 1 },
      J: { type_count: 1 },
    },
    parcel_ids: ["75056000AB0001"],
  }

  function editing(
    fixture: Fixture,
    options: { draft?: unknown; surveyStatus?: string; status?: StatusMessage } = {},
  ): Fixture {
    return {
      ...fixture,
      status: options.status ?? fixture.status,
      surveys: {
        ...fixture.surveys,
        state: {
          ...fixture.surveys.state,
          surveys: [{ ...survey, status: options.surveyStatus ?? "draft" }],
        },
      } as unknown as SurveysContextValue,
      form: {
        state: {
          ...fixture.form.state,
          editingSurveyId: "s-01",
          draftInput: options.draft ?? COMPLETE_DRAFT,
        },
        actions: fixture.form.actions,
      } as unknown as SurveyFormContextValue,
    }
  }

  const pill = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAll((n) => (n.type as unknown) === "GlassButton")[0]

  function renderRoute(fixture: Fixture, navigation = makeNavigation()) {
    const element = (current: Fixture) => (
      <Providers fixture={current}>
        <FactorDetailRoute
          navigation={navigation as never}
          route={{ params: { factor: "J" } } as never}
        />
      </Providers>
    )
    return { element, navigation }
  }

  test("a complete, named survey on the last factor offers the labelled pill", async () => {
    const base = makeFixture()
    const fixture = editing({ ...base, form: { ...base.form, actions: actionsProxy() } })
    const { element } = renderRoute(fixture)
    const tree = await mount(element(fixture))
    expect(pill(tree).props.label).toBe(fr.surveyDetail.cta.finish)
    expect(pill(tree).props.accessibilityLabel).toBe(fr.surveyDetail.a11y.finishSurvey("Site 01"))
    expect(pill(tree).props.loading).toBe(false)
  })

  test("press: the submission step opens for the editing survey, success goes back to the summary", async () => {
    const base = makeFixture()
    const formActions = actionsProxy<SurveyFormContextValue["actions"]>({ flushDraft: true })
    const fixture = editing({ ...base, form: { ...base.form, actions: formActions } })
    const { element, navigation } = renderRoute(fixture)
    const tree = await mount(element(fixture))
    await act(async () => {
      pill(tree).props.onPress()
    })
    expect(navigation.navigate).toHaveBeenCalledTimes(1)
    expect(navigation.navigate).toHaveBeenCalledWith("surveyFinish", { surveyId: "s-01" })
    // The sheet owns the write and the send (D-04): nothing is written or submitted from the pager.
    expect(formActions.flushDraft).not.toHaveBeenCalled()
    expect(fixture.surveys.actions.submitSurvey).not.toHaveBeenCalled()
    expect(navigation.popTo).not.toHaveBeenCalled()

    // The sheet finished the survey: the list refresh reaches the route.
    await act(async () => {
      tree.update(element(editing(fixture, { surveyStatus: "submitted" })))
    })
    expect(navigation.popTo).toHaveBeenCalledTimes(1)
    expect(navigation.popTo).toHaveBeenCalledWith("surveyDetail")
    // No haptic here: the summary's useSubmitSuccessPulse plays it (D-25).
    expect(pill(tree)).toBeUndefined()
  })

  test("a sheet closed without finishing leaves the pager as it was, with no notice", async () => {
    const fixture = editing(makeFixture())
    const { element, navigation } = renderRoute(fixture)
    const tree = await mount(element(fixture))
    await act(async () => {
      pill(tree).props.onPress()
    })
    await act(async () => {
      tree.update(element(editing(fixture)))
    })
    expect(navigation.popTo).not.toHaveBeenCalled()
    expect(navigation.goBack).not.toHaveBeenCalled()
    expect(pill(tree).props.loading).toBe(false)
  })

  test("not complete: no pill, the last button is the plain Terminer that goes back", async () => {
    const fixture = editing(makeFixture(), { draft: {} })
    const { element, navigation } = renderRoute(fixture)
    const tree = await mount(element(fixture))
    expect(pill(tree)).toBeUndefined()
    const next = tree.root.findAll((n) => n.props.testID === "pager-next")[0]
    expect(next.props.accessibilityLabel).toBe(fr.factorPager.finish)
    await act(async () => {
      next.props.onPress()
    })
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    expect(fixture.surveys.actions.submitSurvey).not.toHaveBeenCalled()
  })
})

describe("FactorDetailRoute and ParcelSelectionRoute", () => {
  test("the factor detail shows the fields of the route's factor", async () => {
    const fixture = makeFixture()
    await mount(
      <Providers fixture={fixture}>
        <FactorDetailRoute
          navigation={makeNavigation() as never}
          route={{ params: { factor: "A" } } as never}
        />
      </Providers>,
    )
    expect(props("factorDetail").factor).toBe("A")
    // The help follows the survey's method version (01.8-13, D-09).
    expect(props("factorDetail").methodVersion).toBe(IBP_METHOD_V3_2)
    expect(props("factorDetail").fields).toBe(
      (fixture.form.state.factorSections as Record<string, unknown>).A,
    )
  })

  test("Que relever ? opens the help route with the texts, and the sheet closes by going back", async () => {
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={makeFixture()}>
        <FactorDetailRoute
          navigation={navigation as never}
          route={{ params: { factor: "A" } } as never}
        />
      </Providers>,
    )
    ;(props("factorDetail").onOpenHelp as (help: string, hints: readonly string[]) => void)(
      "Aide",
      ["Un", "Deux"],
    )
    expect(navigation.navigate).toHaveBeenCalledWith("surveyFactorHelp", {
      help: "Aide",
      hints: ["Un", "Deux"],
    })

    const helpNavigation = makeNavigation()
    await mount(
      <FactorHelpRoute
        navigation={helpNavigation as never}
        route={{ params: { help: "Aide", hints: ["Un"] } } as never}
      />,
    )
    expect(props("factorHelp").help).toBe("Aide")
    expect(props("factorHelp").hints).toEqual(["Un"])
    ;(props("factorHelp").onClose as () => void)()
    expect(helpNavigation.goBack).toHaveBeenCalledTimes(1)
  })

  test("the dendromicrohabitat guide opens the catalogue, a valid group, or the catalogue for an unknown one", async () => {
    const fixture = makeFixture()
    const navigation = makeNavigation()
    const open = async (params: unknown) => {
      await mount(
        <Providers fixture={fixture}>
          <DmhGuideRoute navigation={navigation as never} route={{ params } as never} />
        </Providers>,
      )
      return props("dmhGuide")
    }
    expect((await open(undefined)).initialGroup).toBeNull()
    expect((await open({})).initialGroup).toBeNull()
    expect((await open({ group: "dmh_12" })).initialGroup).toBe("dmh_12")
    expect((await open({ group: "dmh_99" })).initialGroup).toBeNull()
    expect((await open({ group: "dmh_12" })).methodVersion).toBe("cnpf_ibp_fr_v3_2_2026-02-02")
    ;(props("dmhGuide").onClose as () => void)()
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  test("the guide reads the method version of the form, null for version 3.0", async () => {
    const fixture = makeFixture()
    fixture.form.state = { ...fixture.form.state, ibpMethodVersion: null }
    await mount(
      <Providers fixture={fixture}>
        <DmhGuideRoute
          navigation={makeNavigation() as never}
          route={{ params: undefined } as never}
        />
      </Providers>,
    )
    expect(props("dmhGuide").methodVersion).toBeNull()
  })

  test("the native header names the factor on screen, and Terminer on the last one goes back", async () => {
    const navigation = makeNavigation()
    const tree = await mount(
      <Providers fixture={makeFixture()}>
        <FactorDetailRoute
          navigation={navigation as never}
          route={{ params: { factor: "J" } } as never}
        />
      </Providers>,
    )
    expect(navigation.setOptions).toHaveBeenLastCalledWith({
      title: fr.navigation.headers.factor("J"),
    })
    await act(async () => {
      tree.root.findAll((n) => n.props.testID === "pager-next")[0].props.onPress()
    })
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  test("the wizard parcel step hands over to the route step and finalises nothing (phase 30, O-19, P-1)", async () => {
    const point = { lat: 48.1, lng: 2.1 }
    const fixture = makeFixture({ editingSurveyId: "s-wiz" })
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <ParcelSelectionRoute
          navigation={navigation as never}
          route={{ params: { surveyId: "draft", mode: "wizard" } } as never}
        />
      </Providers>,
    )
    expect(props("parcelSelection").wizard).toBe(true)
    expect(props("parcelSelection").selectedParcelIds).toEqual(["p-1"])
    await act(async () => {
      await callback("parcelSelection", "onSave")(point, 2.4)
    })
    expect(navigation.navigate).toHaveBeenCalledWith("surveyRouteGuide", {
      surveyId: "s-wiz",
      mode: "create",
      surfaceHa: 2.4,
      weatherPoint: point,
    })
    // The draft stays open (editing session intact): the route step finalises it on acceptance.
    expect(fixture.form.actions.createDraft).not.toHaveBeenCalled()
    expect(fixture.form.actions.saveSurveyEdits).not.toHaveBeenCalled()
    expect(navigation.reset).not.toHaveBeenCalled()
    expect(fixture.surveys.actions.openSurvey).not.toHaveBeenCalled()
    expect(fixture.weather.actions.rememberPoint).not.toHaveBeenCalled()
  })

  test("the wizard parcel step passes no surface when none could be computed, and no draft id when it has none", async () => {
    const fixture = makeFixture({ editingSurveyId: null })
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <ParcelSelectionRoute
          navigation={navigation as never}
          route={{ params: { surveyId: "draft", mode: "wizard" } } as never}
        />
      </Providers>,
    )
    await act(async () => {
      await callback("parcelSelection", "onSave")(null, null)
    })
    expect(navigation.navigate).toHaveBeenCalledWith("surveyRouteGuide", {
      surveyId: null,
      mode: "create",
      surfaceHa: null,
      weatherPoint: null,
    })
  })

  test("a saved parcel choice of an existing survey hands the centre of the parcels to the weather hook (phase 27, D-10)", async () => {
    const point = { lat: 48.1, lng: 2.1 }
    const edit = makeFixture({ editingSurveyId: "s-01" })
    await mount(
      <Providers fixture={edit}>
        <ParcelSelectionRoute
          navigation={makeNavigation() as never}
          route={{ params: { surveyId: "s-01", mode: "edit" } } as never}
        />
      </Providers>,
    )
    await act(async () => {
      await callback("parcelSelection", "onSave")(point, 1.2)
    })
    expect(edit.weather.actions.rememberPoint).toHaveBeenCalledWith("s-01", point)
  })

  test("no point, no editing id or a failed save leaves the weather hook alone", async () => {
    const point = { lat: 48.1, lng: 2.1 }
    const cases = [
      { fixture: makeFixture({ editingSurveyId: "s-01" }), arg: null },
      { fixture: makeFixture({ editingSurveyId: null }), arg: point },
      { fixture: makeFixture({ editingSurveyId: "s-01", saved: false }), arg: point },
    ]
    for (const { fixture, arg } of cases) {
      await mount(
        <Providers fixture={fixture}>
          <ParcelSelectionRoute
            navigation={makeNavigation() as never}
            route={{ params: { surveyId: "s-01", mode: "edit" } } as never}
          />
        </Providers>,
      )
      await act(async () => {
        await callback("parcelSelection", "onSave")(arg)
      })
      expect(fixture.weather.actions.rememberPoint).not.toHaveBeenCalled()
    }
  })

  test("the map starts on the position the navigation hands over, null for a new survey", async () => {
    await mount(
      <Providers fixture={makeFixture()}>
        <ParcelSelectionRoute
          navigation={makeNavigation() as never}
          route={
            {
              params: {
                surveyId: "s-01",
                mode: "edit",
                startPoint: { lat: 48.656, lng: 2.503 },
              },
            } as never
          }
        />
      </Providers>,
    )
    expect(props("parcelSelection").startPoint).toEqual({ lat: 48.656, lng: 2.503 })

    // A new survey (wizard), or one without a known position: no start point, the phone's is used.
    await mount(
      <Providers fixture={makeFixture()}>
        <ParcelSelectionRoute
          navigation={makeNavigation() as never}
          route={{ params: { surveyId: "draft", mode: "wizard" } } as never}
        />
      </Providers>,
    )
    expect(props("parcelSelection").startPoint).toBeNull()
  })

  test("the edit parcel step saves and goes back", async () => {
    const fixture = makeFixture()
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <ParcelSelectionRoute
          navigation={navigation as never}
          route={{ params: { surveyId: "s-01", mode: "edit" } } as never}
        />
      </Providers>,
    )
    expect(props("parcelSelection").wizard).toBe(false)
    await act(async () => {
      await callback("parcelSelection", "onSave")()
    })
    expect(navigation.goBack).toHaveBeenCalledTimes(1)

    const failing = makeFixture({ saved: false })
    const stay = makeNavigation()
    await mount(
      <Providers fixture={failing}>
        <ParcelSelectionRoute
          navigation={stay as never}
          route={{ params: { surveyId: "s-01", mode: "edit" } } as never}
        />
      </Providers>,
    )
    await act(async () => {
      await callback("parcelSelection", "onSave")()
    })
    expect(stay.goBack).not.toHaveBeenCalled()
  })
})

describe("RouteGuideRoute (phase 30, O-19, P-1)", () => {
  const point = { lat: 48.1, lng: 2.1 }
  type GuideState = {
    view: { selection: Record<string, unknown> | null; canUse: boolean }
    record: Record<string, unknown> | null
    actions: Record<string, AnyFn>
  }
  const guideState = (): GuideState => props("routeGuide").state as GuideState

  function createRoute(extra: Record<string, unknown> = {}) {
    return {
      params: {
        surveyId: "s-wiz",
        mode: "create",
        surfaceHa: 2.4,
        weatherPoint: point,
        ...extra,
      },
    }
  }

  /** The fixture of the creation: the wizard's open draft, a route write and a finalisation that work. */
  function creationFixture(
    overrides: { routeWrites?: boolean[]; editingSurveyId?: string | null } = {},
  ) {
    const fixture = makeFixture({
      editingSurveyId: "editingSurveyId" in overrides ? overrides.editingSurveyId : "s-wiz",
    })
    const write = fixture.surveys.actions.updateSurveyRoute as unknown as jest.Mock
    for (const ok of overrides.routeWrites ?? [true]) write.mockResolvedValueOnce(ok)
    write.mockResolvedValue(true)
    return { fixture, write }
  }

  async function reachRoute(): Promise<void> {
    await act(async () => {
      const { actions } = guideState()
      actions.setSurfaceText("2,4")
      actions.commitSurface()
      actions.answerHomogeneity("heterogeneous")
      actions.next()
      actions.answerDifficulty(false)
      actions.next()
    })
  }

  async function mountGuide(
    fixture: Fixture,
    navigation = makeNavigation(),
    routeValue: { params: Record<string, unknown> } = createRoute(),
  ) {
    const tree = await mount(
      <Providers fixture={fixture}>
        <RouteGuideRoute navigation={navigation as never} route={routeValue as never} />
      </Providers>,
    )
    return { tree, navigation }
  }

  const use = () => callback("routeGuide", "onUse")()
  const order = (mock: jest.Mock) => mock.mock.invocationCallOrder[0]

  test("opens as step 5 of 5 with the computed surface, and with no tab bar change", async () => {
    const { fixture } = creationFixture()
    const { navigation } = await mountGuide(fixture)
    expect(props("routeGuide").creationStep).toBe(5)
    // The header is the one of steps 1 to 3: the small centred "Étape 5 sur 5".
    expect(navigation.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Étape 5 sur 5" }),
    )
    expect(props("routeGuide").surfaceUnknown).toBe(false)
    expect(props("routeGuide").saveError).toBe(false)
    expect(guideState().view.canUse).toBe(false)
    expect(guideState().record).toBeNull()
  })

  test("opens with an empty surface card when the surface could not be computed", async () => {
    const { fixture } = creationFixture()
    await mountGuide(fixture, makeNavigation(), createRoute({ surfaceHa: null }))
    expect(props("routeGuide").surfaceUnknown).toBe(true)
  })

  test("nothing is written or finalised before the route is accepted, and going back is a plain return", async () => {
    const { fixture, write } = creationFixture()
    const { navigation } = await mountGuide(fixture)
    await reachRoute()
    expect(write).not.toHaveBeenCalled()
    expect(fixture.form.actions.createDraft).not.toHaveBeenCalled()
    expect(navigation.reset).not.toHaveBeenCalled()
    expect(navigation.goBack).not.toHaveBeenCalled()
  })

  /** The route's own back button, as the stack header draws it (the last `headerLeft` set). */
  function backButton(navigation: ReturnType<typeof makeNavigation>) {
    const calls = navigation.setOptions.mock.calls as unknown as [
      { headerLeft?: () => { props: { onPress: () => void } } },
    ][]
    const withButton = calls.filter(([options]) => options.headerLeft !== undefined)
    expect(withButton.length).toBeGreaterThan(0)
    const element = withButton[withButton.length - 1][0].headerLeft!()
    return async () => {
      await act(async () => {
        element.props.onPress()
      })
    }
  }

  test("no native removal is ever held back: the route registers no beforeRemove listener", async () => {
    const { fixture } = creationFixture()
    const { navigation } = await mountGuide(fixture)
    expect(
      navigation.addListener.mock.calls.filter(([event]) => event === "beforeRemove"),
    ).toHaveLength(0)
  })

  test("the own back button goes one question back, and is a plain pop from the first question", async () => {
    const { fixture, write } = creationFixture()
    const { navigation } = await mountGuide(fixture)
    const back = backButton(navigation)
    // First question: the plain pop to the parcel map.
    await back()
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    await act(async () => {
      guideState().actions.commitSurface()
    })
    expect(guideState().view).toMatchObject({ screen: "homogeneity", canStepBack: true })
    // Second question: the previous question opens, answer kept, the screen is not left.
    await back()
    expect(guideState().view).toMatchObject({ screen: "surface", canStepBack: false })
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
    expect(write).not.toHaveBeenCalled()
    expect(fixture.form.actions.createDraft).not.toHaveBeenCalled()
    expect(navigation.reset).not.toHaveBeenCalled()
  })

  test("the own back button from the result goes to the last question", async () => {
    const { fixture } = creationFixture()
    const { navigation } = await mountGuide(fixture)
    const back = backButton(navigation)
    await reachRoute()
    expect(guideState().view).toMatchObject({ screen: "result" })
    await back()
    expect(guideState().view).toMatchObject({ screen: "difficulty" })
    expect(navigation.goBack).not.toHaveBeenCalled()
  })

  test("the edit mode has the same own back button, a goBack from the first question", async () => {
    const { fixture } = creationFixture()
    const { navigation } = await mountGuide(
      fixture,
      makeNavigation(),
      createRoute({ mode: "edit", weatherPoint: undefined }),
    )
    await backButton(navigation)()
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  test("Android back goes one question back and leaves the first question to the default pop", async () => {
    const { fixture } = creationFixture()
    const { navigation } = await mountGuide(fixture)
    const hardware = () => [...mockBackHandlers].pop() as () => boolean
    expect(hardware()()).toBe(false)
    await act(async () => {
      guideState().actions.commitSurface()
    })
    let handled = false
    await act(async () => {
      handled = hardware()()
    })
    expect(handled).toBe(true)
    expect(guideState().view).toMatchObject({ screen: "surface" })
    // Not the focused screen (the chooser is open above it): never handled.
    await act(async () => {
      guideState().actions.commitSurface()
    })
    navigation.isFocused.mockReturnValue(false)
    expect(hardware()()).toBe(false)
    expect(guideState().view).toMatchObject({ screen: "homogeneity" })
    expect(navigation.goBack).not.toHaveBeenCalled()
  })

  test("Utiliser ce parcours writes the route, finalises the draft, keeps the weather point and resets (D-45)", async () => {
    const { fixture, write } = creationFixture()
    const { navigation } = await mountGuide(fixture)
    await reachRoute()
    const record = guideState().record
    expect(record).toMatchObject({ method: "full", zone_surface_ha: 2.4 })

    await act(async () => {
      await use()
    })

    expect(write).toHaveBeenCalledWith("s-wiz", record)
    const create = fixture.form.actions.createDraft as unknown as jest.Mock
    expect(create).toHaveBeenCalledTimes(1)
    expect(order(write)).toBeLessThan(order(create))
    expect(fixture.weather.actions.rememberPoint).toHaveBeenCalledWith("s-new", point)
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [{ name: "surveysHome" }, { name: "surveyDetail" }],
    })
    const open = fixture.surveys.actions.openSurvey as unknown as jest.Mock
    expect(open).toHaveBeenCalledWith("s-new")
    expect(order(open)).toBeGreaterThan(order(navigation.reset))
    expect(order(create)).toBeLessThan(order(navigation.reset))
    expect(props("routeGuide").saveError).toBe(false)
  })

  test("without a weather point nothing is remembered", async () => {
    const { fixture } = creationFixture()
    await mountGuide(fixture, makeNavigation(), createRoute({ weatherPoint: null }))
    await reachRoute()
    await act(async () => {
      await use()
    })
    expect(fixture.weather.actions.rememberPoint).not.toHaveBeenCalled()
  })

  test("a route write that fails keeps the screen, shows the error and retries on the same draft", async () => {
    const { fixture, write } = creationFixture({ routeWrites: [false] })
    const { navigation } = await mountGuide(fixture)
    await reachRoute()
    await act(async () => {
      await use()
    })
    expect(props("routeGuide").saveError).toBe(true)
    expect(fixture.form.actions.createDraft).not.toHaveBeenCalled()
    expect(navigation.reset).not.toHaveBeenCalled()

    await act(async () => {
      await callback("routeGuide", "onRetry")()
    })
    expect(write).toHaveBeenCalledTimes(2)
    expect(props("routeGuide").saveError).toBe(false)
    expect(navigation.reset).toHaveBeenCalledTimes(1)
  })

  test("a route write that throws counts as a failure", async () => {
    const { fixture, write } = creationFixture()
    write.mockReset()
    write.mockRejectedValueOnce(new Error("disk"))
    write.mockResolvedValue(true)
    const { navigation } = await mountGuide(fixture)
    await reachRoute()
    await act(async () => {
      await use()
    })
    expect(props("routeGuide").saveError).toBe(true)
    expect(navigation.reset).not.toHaveBeenCalled()
  })

  test("a draft that cannot be finalised stays on the step with its existing status message", async () => {
    const fixture = makeFixture({ editingSurveyId: "s-wiz", saved: false })
    ;(fixture.surveys.actions.updateSurveyRoute as unknown as jest.Mock).mockResolvedValue(true)
    const { navigation } = await mountGuide(fixture)
    await reachRoute()
    await act(async () => {
      await use()
    })
    expect(fixture.form.actions.createDraft).toHaveBeenCalledTimes(1)
    expect(navigation.reset).not.toHaveBeenCalled()
    expect(fixture.surveys.actions.openSurvey).not.toHaveBeenCalled()
    expect(fixture.weather.actions.rememberPoint).not.toHaveBeenCalled()
  })

  test("the rare path: no wizard draft yet, so the draft is created first and the route written on it", async () => {
    const { fixture, write } = creationFixture({ editingSurveyId: null })
    const { navigation } = await mountGuide(
      fixture,
      makeNavigation(),
      createRoute({ surveyId: null }),
    )
    await reachRoute()
    await act(async () => {
      await use()
    })
    const create = fixture.form.actions.createDraft as unknown as jest.Mock
    expect(order(create)).toBeLessThan(order(write))
    expect(write).toHaveBeenCalledWith("s-new", guideState().record)
    expect(navigation.reset).toHaveBeenCalledTimes(1)
  })

  test("the rare path: a failed route write keeps the created draft and the retry writes on it", async () => {
    const { fixture, write } = creationFixture({ editingSurveyId: null, routeWrites: [false] })
    const { navigation } = await mountGuide(
      fixture,
      makeNavigation(),
      createRoute({ surveyId: null }),
    )
    await reachRoute()
    await act(async () => {
      await use()
    })
    expect(props("routeGuide").saveError).toBe(true)
    expect(navigation.reset).not.toHaveBeenCalled()
    await act(async () => {
      await callback("routeGuide", "onRetry")()
    })
    // One draft only: the retry does not create a second one.
    expect(fixture.form.actions.createDraft).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenNthCalledWith(2, "s-new", expect.anything())
    expect(navigation.reset).toHaveBeenCalledTimes(1)
  })

  test("with no usable route the button does nothing", async () => {
    const { fixture, write } = creationFixture()
    await mountGuide(fixture)
    await act(async () => {
      await use()
    })
    expect(write).not.toHaveBeenCalled()
    expect(fixture.form.actions.createDraft).not.toHaveBeenCalled()
  })

  test("a second press while the route is being saved is ignored", async () => {
    const { fixture, write } = creationFixture()
    let release: (ok: boolean) => void = () => undefined
    write.mockReset()
    write.mockImplementationOnce(() => new Promise<boolean>((resolve) => (release = resolve)))
    write.mockResolvedValue(true)
    await mountGuide(fixture)
    await reachRoute()
    let first!: Promise<void>
    await act(async () => {
      first = use()
      await use()
    })
    expect(props("routeGuide").saving).toBe(true)
    await act(async () => {
      release(true)
      await first
    })
    expect(write).toHaveBeenCalledTimes(1)
    expect(props("routeGuide").saving).toBe(false)
  })

  test("the chooser opens with the current choice, the stand surface and the section", async () => {
    const { fixture } = creationFixture()
    const { navigation } = await mountGuide(fixture)
    await act(async () => {
      callback("routeGuide", "onOpenChooser")("pick")
    })
    // Nothing chosen yet: no preselection; the stand surface is the estimate from the parcels.
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyRouteChoose", {
      surveyId: "s-wiz",
      mode: "pick",
      surfaceHa: 2.4,
    })
    await reachRoute()
    await act(async () => {
      callback("routeGuide", "onOpenChooser")("pick", "counting")
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyRouteChoose", {
      surveyId: "s-wiz",
      mode: "pick",
      surfaceHa: 2.4,
      section: "counting",
      preselect: {
        method: "full",
        counting: "capped",
        uncapped_factors: [],
        details: { zoneText: "2,4", complementDone: false, totalText: "" },
      },
      // What the guide advised, for the tag "Conseillé" of the chooser.
      suggested: { method: "full", counting: "capped" },
    })
  })

  test("a pick from the chooser is applied once per nonce", async () => {
    const { fixture } = creationFixture()
    const navigation = makeNavigation()
    const pick = {
      method: "partial_plot",
      counting: "uncapped",
      uncapped_factors: ["A", "B"],
      details: { zoneText: "1", complementDone: true, totalText: "10" },
    }
    const render = (extra: Record<string, unknown>) => (
      <Providers fixture={fixture}>
        <RouteGuideRoute
          navigation={navigation as never}
          route={createRoute({ surfaceHa: 10, ...extra }) as never}
        />
      </Providers>
    )
    const tree = await mount(render({}))
    expect(guideState().view.selection).toBeNull()

    await act(async () => {
      tree.update(render({ picked: pick, pickNonce: 1 }))
    })
    expect(guideState().view.selection).toMatchObject({
      method: "partial_plot",
      counting: "uncapped",
      uncappedFactors: ["A", "B"],
      zoneHa: 1,
      source: "pick",
    })
    expect(guideState().record).toMatchObject({ method: "partial_plot", zone_surface_ha: 1 })

    // The same nonce again does not replay the pick over the observer's later change.
    await act(async () => {
      guideState().actions.restoreSuggestion()
    })
    await act(async () => {
      tree.update(render({ picked: pick, pickNonce: 1 }))
    })
    expect(guideState().view.selection).toBeNull()

    // A fresh nonce applies it again.
    await act(async () => {
      tree.update(render({ picked: pick, pickNonce: 2 }))
    })
    expect(guideState().view.selection).toMatchObject({ method: "partial_plot" })
  })

  test("a pick with empty detail texts clears them, and the same pick without a nonce is not replayed", async () => {
    const { fixture } = creationFixture()
    const navigation = makeNavigation()
    const pick = {
      method: "partial_plot",
      counting: "capped",
      uncapped_factors: [],
      details: { zoneText: "", complementDone: false, totalText: "" },
    }
    const render = (extra: Record<string, unknown>) => (
      <Providers fixture={fixture}>
        <RouteGuideRoute
          navigation={navigation as never}
          route={createRoute({ surfaceHa: 10, ...extra }) as never}
        />
      </Providers>
    )
    const tree = await mount(render({ picked: pick }))
    expect(guideState().view.selection).toMatchObject({ method: "partial_plot", source: "pick" })
    await act(async () => {
      guideState().actions.restoreSuggestion()
    })
    await act(async () => {
      tree.update(render({ picked: { ...pick } }))
    })
    expect(guideState().view.selection).toBeNull()
  })

  test("leaving the step releases the Android back handler", async () => {
    const { fixture } = creationFixture()
    const { tree } = await mountGuide(fixture)
    await act(async () => {
      tree.unmount()
    })
  })

  test("a retry after a failed first write on the created draft can fail again", async () => {
    const { fixture } = creationFixture({ editingSurveyId: null, routeWrites: [false, false] })
    const { navigation } = await mountGuide(
      fixture,
      makeNavigation(),
      createRoute({ surveyId: null }),
    )
    await reachRoute()
    await act(async () => {
      await use()
    })
    await act(async () => {
      await callback("routeGuide", "onRetry")()
    })
    expect(props("routeGuide").saveError).toBe(true)
    expect(fixture.form.actions.createDraft).toHaveBeenCalledTimes(1)
    expect(navigation.reset).not.toHaveBeenCalled()
  })

  test("the rare path: a draft that cannot be created writes nothing", async () => {
    const fixture = makeFixture({ editingSurveyId: null, saved: false })
    const write = fixture.surveys.actions.updateSurveyRoute as unknown as jest.Mock
    write.mockResolvedValue(true)
    const { navigation } = await mountGuide(
      fixture,
      makeNavigation(),
      createRoute({ surveyId: null }),
    )
    await reachRoute()
    await act(async () => {
      await use()
    })
    expect(write).not.toHaveBeenCalled()
    expect(navigation.reset).not.toHaveBeenCalled()
  })

  test("a pick with no details only applies the parcours and the counting", async () => {
    const { fixture } = creationFixture()
    await mountGuide(
      fixture,
      makeNavigation(),
      createRoute({
        picked: { method: "full", counting: "capped", uncapped_factors: [] },
        pickNonce: 1,
      }),
    )
    expect(guideState().view.selection).toMatchObject({ method: "full", source: "pick" })
  })

  describe("edit mode (the guided choice from the chooser)", () => {
    const editRoute = (extra: Record<string, unknown> = {}) => ({
      params: { surveyId: "s-01", mode: "edit", surfaceHa: null, ...extra },
    })

    test("loads the recorded route, shows no step label, saves and goes back without a reset", async () => {
      const { fixture, write } = creationFixture()
      const { navigation } = await mountGuide(fixture, makeNavigation(), editRoute())
      expect(props("routeGuide").stepLabel).toBeUndefined()
      // The recorded route (the mocked reader returns a full capped route of 2.5 ha, chosen by the observer).
      expect(guideState().view.selection).toMatchObject({ method: "full", zoneHa: 2.5 })
      expect(guideState().view.canUse).toBe(true)

      await act(async () => {
        await use()
      })
      expect(write).toHaveBeenCalledWith("s-01", guideState().record)
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(navigation.reset).not.toHaveBeenCalled()
      expect(fixture.form.actions.createDraft).not.toHaveBeenCalled()
      expect(fixture.surveys.actions.openSurvey).not.toHaveBeenCalled()
    })

    test("a failed save stays with the error", async () => {
      const { fixture } = creationFixture({ routeWrites: [false] })
      const { navigation } = await mountGuide(fixture, makeNavigation(), editRoute())
      await act(async () => {
        await use()
      })
      expect(props("routeGuide").saveError).toBe(true)
      expect(navigation.goBack).not.toHaveBeenCalled()
    })

    test("without a survey id there is nothing to save", async () => {
      const { fixture, write } = creationFixture()
      const { navigation } = await mountGuide(
        fixture,
        makeNavigation(),
        editRoute({ surveyId: null }),
      )
      await reachRoute()
      await act(async () => {
        await use()
      })
      expect(write).not.toHaveBeenCalled()
      expect(props("routeGuide").saveError).toBe(true)
      expect(navigation.goBack).not.toHaveBeenCalled()
    })
  })
})

describe("RouteBackButton", () => {
  test("is a 44 pt disc on Android and a bare glyph on the system glass of iOS, and presses through", async () => {
    const onPress = jest.fn()
    for (const os of ["android", "ios"] as const) {
      mockPlatform.OS = os
      const tree = await mount(
        <Providers fixture={makeFixture()}>
          <RouteBackButton onPress={onPress} />
        </Providers>,
      )
      const button = tree.root.findByProps({ testID: "route-back" })
      await act(async () => {
        button.props.onPress()
      })
    }
    expect(onPress).toHaveBeenCalledTimes(2)
    mockPlatform.OS = "ios"
  })
})

describe("RouteChooseRoute (phase 30, O-19, O-14)", () => {
  type ChooseView = {
    method: string | null
    counting: string
    preset: string
    factors: string[]
    canUse: boolean
    suggested: unknown
    keptValuesNotice: boolean
    details: { zoneText: string; complementDone: boolean; totalText: string }
  }
  const view = (): ChooseView => props("routeChoose").view as ChooseView
  const act2 = async (fn: () => unknown) => {
    await act(async () => {
      await fn()
    })
  }
  const select = (method: string) => act2(() => callback("routeChoose", "onSelectMethod")(method))
  const counting = (mode: string) => act2(() => callback("routeChoose", "onSelectCounting")(mode))
  const use = () => act2(() => callback("routeChoose", "onUse")())

  function chooseRoute(
    mode: "pick" | "edit",
    extra: Record<string, unknown> = {},
  ): { params: Record<string, unknown> } {
    return { params: { surveyId: "s-01", mode, surfaceHa: 8, ...extra } }
  }

  async function mountChoose(
    fixture: Fixture,
    routeValue: { params: Record<string, unknown> },
    navigation = makeNavigation(),
  ) {
    const tree = await mount(
      <Providers fixture={fixture}>
        <RouteChooseRoute navigation={navigation as never} route={routeValue as never} />
      </Providers>,
    )
    return { tree, navigation }
  }

  const writer = (fixture: Fixture) =>
    fixture.surveys.actions.updateSurveyRoute as unknown as jest.Mock

  describe("pick mode (from the route step)", () => {
    const preselect = {
      method: "partial_strip",
      counting: "capped",
      uncapped_factors: [],
      details: { zoneText: "1,6", complementDone: true, totalText: "8" },
    }

    test("starts on the route step's selection and the guide's suggestion", async () => {
      await mountChoose(
        makeFixture(),
        chooseRoute("pick", {
          preselect,
          suggested: { method: "partial_strip", counting: "capped" },
        }),
      )
      expect(props("routeChoose").mode).toBe("pick")
      expect(view()).toMatchObject({
        method: "partial_strip",
        counting: "capped",
        canUse: true,
        suggested: { method: "partial_strip", counting: "capped" },
        details: { zoneText: "1,6", complementDone: true, totalText: "8" },
      })
    })

    test("sets the title, the Annuler item, and cancels without writing", async () => {
      const fixture = makeFixture()
      const { navigation } = await mountChoose(fixture, chooseRoute("pick", { preselect }))
      const options = navigation.setOptions.mock.calls.at(-1)?.[0] as {
        title: string
        headerLeft: () => React.ReactElement
      }
      expect(options.title).toBe("Choisir le parcours")
      const tree = await mount(options.headerLeft())
      const cancel = tree.root.findAll((node) => node.props.testID === "route-choose-cancel")[0]
      expect(cancel.props.accessibilityLabel).toBe("Annuler")
      act(() => cancel.props.onPress())
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(writer(fixture)).not.toHaveBeenCalled()
      expect(navigation.popTo).not.toHaveBeenCalled()
    })

    test("Utiliser ce parcours hands the pick back to the route step with a fresh nonce", async () => {
      const fixture = makeFixture()
      const now = jest.spyOn(Date, "now")
      now.mockReturnValueOnce(1000).mockReturnValueOnce(2000)
      const { navigation } = await mountChoose(fixture, chooseRoute("pick", { preselect }))
      await select("partial_plot")
      await counting("uncapped")
      await act2(() => callback("routeChoose", "onSelectPreset")("minimum"))
      await use()
      await use()
      now.mockRestore()

      const picked = {
        method: "partial_plot",
        counting: "uncapped",
        uncapped_factors: ["C", "D", "E"],
        details: { zoneText: "1,6", complementDone: true, totalText: "8" },
      }
      expect(navigation.popTo).toHaveBeenNthCalledWith(
        1,
        "surveyRouteGuide",
        { picked, pickNonce: 1000 },
        { merge: true },
      )
      expect(navigation.popTo).toHaveBeenNthCalledWith(
        2,
        "surveyRouteGuide",
        { picked, pickNonce: 2000 },
        { merge: true },
      )
      expect(writer(fixture)).not.toHaveBeenCalled()
    })

    test("a selection that cannot be used goes nowhere", async () => {
      const { navigation } = await mountChoose(makeFixture(), chooseRoute("pick"))
      expect(view().method).toBeNull()
      expect(view().canUse).toBe(false)
      await use()
      expect(navigation.popTo).not.toHaveBeenCalled()
    })

    test("the quick path from a blank route step starts with nothing chosen", async () => {
      await mountChoose(makeFixture(), chooseRoute("pick", { surfaceHa: null }))
      await select("full")
      expect(view().details.zoneText).toBe("")
      expect(view().canUse).toBe(false)
      await act2(() =>
        callback(
          "routeChoose",
          "onChangeDetails",
        )({
          zoneText: "3",
          complementDone: false,
          totalText: "",
        }),
      )
      expect(view().canUse).toBe(true)
    })

    test("the details of the draft say the values are kept when going back to plafonné", async () => {
      mockGetLocalSurveyDraft.mockResolvedValue({ factors: { B: { strata_cover: { low: 40 } } } })
      await mountChoose(makeFixture(), chooseRoute("pick", { preselect }))
      expect(mockGetLocalSurveyDraft).toHaveBeenCalledWith("s-01")
      await counting("uncapped")
      expect(view().keptValuesNotice).toBe(false)
      await counting("capped")
      expect(view().keptValuesNotice).toBe(true)
    })

    test("no draft read for a chooser without a survey, and a failed read is ignored", async () => {
      await mountChoose(makeFixture(), chooseRoute("pick", { surveyId: null }))
      expect(mockGetLocalSurveyDraft).not.toHaveBeenCalled()
      mockGetLocalSurveyDraft.mockRejectedValue(new Error("db"))
      await mountChoose(makeFixture(), chooseRoute("pick"))
      expect(view().keptValuesNotice).toBe(false)
    })

    test("a factor toggle reaches the choice, and the chooser can be left before the draft read ends", async () => {
      const { tree } = await mountChoose(
        makeFixture(),
        chooseRoute("pick", {
          preselect: { method: "full", counting: "uncapped", uncapped_factors: ["A"] },
        }),
      )
      await act2(() => callback("routeChoose", "onToggleFactor")("B"))
      expect(view().factors).toEqual(expect.arrayContaining(["A", "B"]))
      await act(async () => {
        tree.unmount()
      })
    })

    test("opens at the counting when asked", async () => {
      await mountChoose(makeFixture(), chooseRoute("pick", { preselect, section: "counting" }))
      expect(props("routeChoose").section).toBe("counting")
    })
  })

  describe("edit mode (a draft, from Contexte)", () => {
    test("loads the recorded route and titles the sheet Modifier le parcours", async () => {
      const { navigation } = await mountChoose(
        makeFixture(),
        chooseRoute("edit", { surfaceHa: null }),
      )
      expect(props("routeChoose").mode).toBe("edit")
      expect(view()).toMatchObject({
        method: "full",
        counting: "capped",
        canUse: true,
        details: { zoneText: "2,5" },
      })
      const options = navigation.setOptions.mock.calls.at(-1)?.[0] as { title: string }
      expect(options.title).toBe("Modifier le parcours")
    })

    test("saves the edited record on the draft, as the observer's choice, and closes", async () => {
      const fixture = makeFixture()
      writer(fixture).mockResolvedValue(true)
      const { navigation } = await mountChoose(fixture, chooseRoute("edit", { surfaceHa: null }))
      await counting("uncapped")
      await use()
      expect(writer(fixture)).toHaveBeenCalledWith("s-01", {
        version: 1,
        method: "full",
        counting: "uncapped",
        uncapped_factors: ["A", "B", "C", "D", "E", "F", "G", "I", "J"],
        zone_surface_ha: 2.5,
        guide: { chosen_by: "observer" },
      })
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(props("routeChoose").saveError).toBe(false)
    })

    test("keeps the guide's suggestion and answers of a recorded guide route", async () => {
      mockRecordedRoute.value = {
        version: 1,
        method: "partial_strip",
        counting: "capped",
        zone_surface_ha: 1.6,
        complement: { done: true, total_surface_ha: 8 },
        guide: {
          chosen_by: "guide",
          suggested: { method: "partial_strip", counting: "capped" },
          answers: { surface_ha: 8, homogeneity: "heterogeneous" },
        },
      }
      const fixture = makeFixture()
      writer(fixture).mockResolvedValue(true)
      await mountChoose(fixture, chooseRoute("edit", { surfaceHa: null }))
      expect(view().suggested).toEqual({ method: "partial_strip", counting: "capped" })
      await use()
      expect(writer(fixture)).toHaveBeenCalledWith("s-01", mockRecordedRoute.value)
      await select("partial_plot")
      await use()
      expect(writer(fixture).mock.calls.at(-1)?.[1]).toMatchObject({
        method: "partial_plot",
        guide: {
          chosen_by: "observer",
          suggested: { method: "partial_strip", counting: "capped" },
          answers: { surface_ha: 8, homogeneity: "heterogeneous" },
        },
      })
    })

    test("a save that says the survey is no longer a draft closes silently", async () => {
      const fixture = makeFixture()
      writer(fixture).mockResolvedValue(false)
      const { navigation } = await mountChoose(fixture, chooseRoute("edit"))
      await use()
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(props("routeChoose").saveError).toBe(false)
    })

    test("a failed save keeps the sheet open with the error, and a retry saves", async () => {
      const fixture = makeFixture()
      writer(fixture).mockRejectedValueOnce(new Error("disk")).mockResolvedValue(true)
      const { navigation } = await mountChoose(fixture, chooseRoute("edit"))
      await use()
      expect(props("routeChoose").saveError).toBe(true)
      expect(props("routeChoose").saving).toBe(false)
      expect(navigation.goBack).not.toHaveBeenCalled()
      await use()
      expect(props("routeChoose").saveError).toBe(false)
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    test("a double press saves once", async () => {
      const fixture = makeFixture()
      let release: (value: boolean) => void = () => undefined
      writer(fixture).mockReturnValue(new Promise<boolean>((resolve) => (release = resolve)))
      await mountChoose(fixture, chooseRoute("edit"))
      await act(async () => {
        void callback("routeChoose", "onUse")()
        void callback("routeChoose", "onUse")()
      })
      expect(props("routeChoose").saving).toBe(true)
      expect(writer(fixture)).toHaveBeenCalledTimes(1)
      await act(async () => release(true))
    })

    test("a draft without a route opens with nothing chosen: Choisir le parcours", async () => {
      mockRecordedRoute.value = null
      const fixture = makeFixture()
      writer(fixture).mockResolvedValue(true)
      const { navigation } = await mountChoose(fixture, chooseRoute("edit", { surfaceHa: null }))
      expect(view()).toMatchObject({ method: null, canUse: false })
      expect((navigation.setOptions.mock.calls.at(-1)?.[0] as { title: string }).title).toBe(
        "Choisir le parcours",
      )
      await use()
      expect(writer(fixture)).not.toHaveBeenCalled()

      await select("full")
      await act2(() =>
        callback(
          "routeChoose",
          "onChangeDetails",
        )({
          zoneText: "4",
          complementDone: false,
          totalText: "",
        }),
      )
      expect(view().canUse).toBe(true)
      await use()
      expect(writer(fixture)).toHaveBeenCalledWith("s-01", {
        version: 1,
        method: "full",
        counting: "capped",
        zone_surface_ha: 4,
        guide: { chosen_by: "observer" },
      })
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    test("a chooser without a survey id has nothing to save", async () => {
      const fixture = makeFixture()
      const { navigation } = await mountChoose(
        fixture,
        chooseRoute("edit", { surveyId: null, surfaceHa: 4 }),
      )
      await select("full")
      await use()
      expect(writer(fixture)).not.toHaveBeenCalled()
      expect(navigation.goBack).not.toHaveBeenCalled()
    })

    test("Être conseillé opens the guide in edit mode with the recorded surface", async () => {
      const { navigation } = await mountChoose(
        makeFixture(),
        chooseRoute("edit", { surfaceHa: null }),
      )
      callback("routeChoose", "onAdvise")()
      // The recorded full route's zone is the stand.
      expect(navigation.navigate).toHaveBeenCalledWith("surveyRouteGuide", {
        mode: "edit",
        surveyId: "s-01",
        surfaceHa: 2.5,
      })
    })

    test("Être conseillé passes the given surface, or null when nothing tells it", async () => {
      const given = await mountChoose(makeFixture(), chooseRoute("edit", { surfaceHa: 6 }))
      callback("routeChoose", "onAdvise")()
      expect(given.navigation.navigate).toHaveBeenCalledWith("surveyRouteGuide", {
        mode: "edit",
        surveyId: "s-01",
        surfaceHa: 6,
      })
      mockRecordedRoute.value = null
      const none = await mountChoose(makeFixture(), chooseRoute("edit", { surfaceHa: null }))
      callback("routeChoose", "onAdvise")()
      expect(none.navigation.navigate).toHaveBeenCalledWith("surveyRouteGuide", {
        mode: "edit",
        surveyId: "s-01",
        surfaceHa: null,
      })
    })
  })

  test("the guide opens the chooser with what it advised", async () => {
    const guideFixture = makeFixture({ editingSurveyId: "s-wiz" })
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={guideFixture}>
        <RouteGuideRoute
          navigation={navigation as never}
          route={
            {
              params: { surveyId: "s-wiz", mode: "create", surfaceHa: 2.4 },
            } as never
          }
        />
      </Providers>,
    )
    await act(async () => {
      const { actions } = props("routeGuide").state as { actions: Record<string, AnyFn> }
      actions.setSurfaceText("2,4")
      actions.commitSurface()
      actions.answerHomogeneity("heterogeneous")
      actions.answerDifficulty(false)
    })
    callback("routeGuide", "onOpenChooser")("pick")
    const params = navigation.navigate.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect(params.suggested).toEqual({ method: "full", counting: "capped" })
    expect(params.mode).toBe("pick")
  })
})

describe("PublicMapRoute", () => {
  test("owns the explorer and reloads on the Explorer tab signal, including a press before mount", async () => {
    const fixture = makeFixture()
    const signal = createPublicMapReloadSignal()
    // The tab press that mounts the route happens before the route exists.
    signal.request()

    const tree = await mount(
      <PublicMapReloadContext.Provider value={signal}>
        <Providers fixture={fixture}>
          <PublicMapRoute navigation={makeNavigation() as never} route={{} as never} />
        </Providers>
      </PublicMapReloadContext.Provider>,
    )
    expect(mockExplorerArgs.apiUrl).toBe("http://api.test/v1")
    expect(mockExplorerArgs.accessToken).toBe(fixture.accessToken)
    expect(mockExplorerArgs.onStatusChange).toBe(fixture.syncActions.setStatus)
    expect(props("publicMap").apiUrl).toBe("http://api.test/v1")
    expect(props("publicMap").accessToken).toBe(fixture.accessToken)
    expect(props("publicMap")).not.toHaveProperty("ownSurveyIds")
    expect(mockExplorer.loadPublicMap).toHaveBeenCalledTimes(1)
    // The press that mounted the route is not forced: the screen's first viewport load serves it.
    expect(mockExplorer.loadPublicMap).toHaveBeenLastCalledWith({ bbox: undefined, force: false })

    // Later presses force a reload of the last viewport the screen reported (01.9-28).
    act(() => {
      ;(props("publicMap").onViewportBboxChange as (bbox: string) => void)("1,2,3,4")
    })
    act(() => {
      signal.request()
    })
    expect(mockExplorer.loadPublicMap).toHaveBeenCalledTimes(2)
    expect(mockExplorer.loadPublicMap).toHaveBeenLastCalledWith({ bbox: "1,2,3,4", force: true })

    await act(async () => {
      tree.unmount()
    })
    signal.request()
    expect(mockExplorer.loadPublicMap).toHaveBeenCalledTimes(2)
  })

  test("renders without a reload signal (outside the navigation tree)", async () => {
    await mount(
      <Providers fixture={makeFixture()}>
        <PublicMapRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("publicMap").loading).toBe(false)
    expect(mockExplorer.loadPublicMap).not.toHaveBeenCalled()
  })

  test("opening a survey from the map pushes its page in the Explorer stack (OA-59)", async () => {
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={makeFixture()}>
        <PublicMapRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    act(() => {
      ;(props("publicMap").onOpenSurvey as (surveyId: string) => void)("c-9")
    })
    expect(navigation.navigate).toHaveBeenCalledWith("communitySurvey", { surveyId: "c-9" })
  })

  describe("the author's own surveys from local data (OA-59, D-01, D-09)", () => {
    const square = [
      [2.0, 46.0],
      [2.2, 46.0],
      [2.2, 46.4],
      [2.0, 46.4],
      [2.0, 46.0],
    ]
    const cachedParcel = {
      parcel_id: "P1",
      study_status: "not_studied",
      geometry: { type: "Polygon", coordinates: [square] },
    }
    const localSource = (id: string, status: string) => ({
      id,
      status,
      created_at: "2026-10-01T09:30:00.000Z",
      updated_at: "2026-10-03T10:00:00.000Z",
      payload: { id, sync_version: 1, site_name: "Site", parcel_ids: ["P1"], factors: {} },
    })
    const ids = (value: unknown) => (value as Array<{ survey_id: string }>).map((i) => i.survey_id)

    function fixtureWithLocalSurveys() {
      const fixture = makeFixture()
      fixture.surveys.state.surveys = [
        { ...survey, id: "s-01" },
        { ...survey, id: "s-02", status: "submitted" },
      ] as never
      return fixture
    }

    afterEach(() => {
      ;(mockExplorer as { items: unknown[] }).items = []
    })

    test("passes the survey list and the offline flag to the hook", async () => {
      const fixture = fixtureWithLocalSurveys()
      mockIsOffline.value = true
      await mount(
        <Providers fixture={fixture}>
          <PublicMapRoute navigation={makeNavigation() as never} route={{} as never} />
        </Providers>,
      )
      expect(mockLocalMapArgs.value).toEqual([fixture.surveys.state.surveys, true])
      expect(mockLocalMapArgs.value[0]).toBe(fixture.surveys.state.surveys)
    })

    test("draws a draft dashed and a submitted survey normally, and opens either as their own", async () => {
      const fixture = fixtureWithLocalSurveys()
      mockLocalMapData = {
        sources: [localSource("s-01", "draft"), localSource("s-02", "submitted")],
        parcels: [cachedParcel],
      }
      // A public survey is already on the map; the own ones are not among them.
      ;(mockExplorer as { items: unknown[] }).items = [{ survey_id: "pub-1" }]
      const navigation = makeNavigation()
      const focus = {
        kind: "survey" as const,
        surveyId: "s-01",
        lat: 46.5,
        lng: 2.1,
        parcelIds: [],
        nonce: 1,
      }
      await mount(
        <Providers fixture={fixture}>
          <PublicMapRoute navigation={navigation as never} route={{ params: { focus } } as never} />
        </Providers>,
      )
      expect(props("publicMap").focus).toBe(focus)
      expect(ids(props("publicMap").draftItems)).toEqual(["s-01"])
      expect(ids(props("publicMap").ownItems)).toEqual(["s-02"])

      for (const id of ["s-01", "s-02"]) {
        act(() => {
          ;(props("publicMap").onOpenSurvey as (surveyId: string) => void)(id)
        })
        expect(fixture.surveys.actions.openSurvey).toHaveBeenCalledWith(id)
      }
      expect(navigation.navigate).toHaveBeenCalledWith("surveys", { screen: "surveyDetail" })
      expect(navigation.navigate).not.toHaveBeenCalledWith("communitySurvey", expect.anything())
    })

    test("hands the screen the normalised parcels of every local survey, drafts included (Avec IBP)", async () => {
      const fixture = fixtureWithLocalSurveys()
      const source = (id: string, status: string, parcelIds: string[]) => ({
        ...localSource(id, status),
        payload: { ...localSource(id, status).payload, parcel_ids: parcelIds },
      })
      mockLocalMapData = {
        sources: [
          source("s-01", "draft", [" p1 ", "P2"]),
          source("s-02", "submitted", ["p2", "P3"]),
        ],
        parcels: [],
      }
      await mount(
        <Providers fixture={fixture}>
          <PublicMapRoute navigation={makeNavigation() as never} route={{} as never} />
        </Providers>,
      )
      const parcelIds = props("publicMap").surveyParcelIds as ReadonlySet<string>
      expect([...parcelIds].sort()).toEqual(["P1", "P2", "P3"])
    })

    test("hands an empty set when the phone holds no survey", async () => {
      mockLocalMapData = EMPTY_LOCAL_MAP
      await mount(
        <Providers fixture={makeFixture()}>
          <PublicMapRoute navigation={makeNavigation() as never} route={{} as never} />
        </Providers>,
      )
      expect((props("publicMap").surveyParcelIds as ReadonlySet<string>).size).toBe(0)
    })

    test("draws a survey the API already returned once, and still opens it as the owner's", async () => {
      const fixture = fixtureWithLocalSurveys()
      mockLocalMapData = {
        sources: [localSource("s-02", "submitted")],
        parcels: [cachedParcel],
      }
      ;(mockExplorer as { items: unknown[] }).items = [{ survey_id: "s-02" }]
      const navigation = makeNavigation()
      await mount(
        <Providers fixture={fixture}>
          <PublicMapRoute navigation={navigation as never} route={{} as never} />
        </Providers>,
      )
      expect(ids(props("publicMap").ownItems)).toEqual([])
      expect(ids(props("publicMap").draftItems)).toEqual([])

      act(() => {
        ;(props("publicMap").onOpenSurvey as (surveyId: string) => void)("s-02")
      })
      expect(fixture.surveys.actions.openSurvey).toHaveBeenCalledWith("s-02")
      expect(navigation.navigate).toHaveBeenCalledWith("surveys", { screen: "surveyDetail" })
      expect(navigation.navigate).not.toHaveBeenCalledWith("communitySurvey", expect.anything())
    })
  })
})

describe("the halo frame on every page (D-19)", () => {
  function withSelection(fixture: Fixture): Fixture {
    return {
      ...fixture,
      surveys: {
        ...fixture.surveys,
        state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
      } as unknown as SurveysContextValue,
    }
  }

  function hostViews(tree: renderer.ReactTestRenderer, testID: string) {
    return tree.root.findAll(
      (node) => (node.type as unknown) === "View" && node.props.testID === testID,
    )
  }

  const nav = () => makeNavigation() as never
  const framedRoutes: [string, () => React.ReactElement][] = [
    ["surveyList", () => <SurveyListRoute navigation={nav()} route={{} as never} />],
    ["surveyDetail", () => <SurveyDetailRoute navigation={nav()} route={{} as never} />],
    ["surveyScore", () => <SurveyScoreRoute navigation={nav()} route={{} as never} />],
    ["surveyHistory", () => <SurveyHistoryRoute navigation={nav()} route={{} as never} />],
    ["surveyJournal", () => <SurveyJournalRoute navigation={nav()} route={{} as never} />],
    ["surveyContext", () => <SurveyContextRoute navigation={nav()} route={{} as never} />],
    // 12.2-15: the factor pager, its page probe is the active factor's screen.
    [
      "factorDetail",
      () => <FactorDetailRoute navigation={nav()} route={{ params: { factor: "A" } } as never} />,
    ],
    [
      "communitySurvey",
      () => <CommunitySurveyRoute route={{ params: { surveyId: "c-1" } } as never} />,
    ],
    [
      "communityHistory",
      () => <CommunityHistoryRoute route={{ params: { surveyId: "c-1" } } as never} />,
    ],
    // 12.2-16: the wizard. The stack hides its header, so on a phone the inset is 0.
    ["surveyForm", () => <SurveyFormRoute navigation={nav()} route={{} as never} />],
    // Phase 30: the route step, the fifth step of the creation.
    [
      "routeGuide",
      () => (
        <RouteGuideRoute
          navigation={nav()}
          route={{ params: { surveyId: null, mode: "create", surfaceHa: null } } as never}
        />
      ),
    ],
    ["account", () => <AccountRoute navigation={nav()} route={{} as never} />],
    ["settings", () => <SettingsRoute navigation={nav()} route={{} as never} />],
    ["offlineAreas", () => <OfflineAreasRoute navigation={nav()} route={{} as never} />],
  ]

  test.each(framedRoutes)(
    "%s is drawn in one ScreenFrame: the halo behind, the page below the header",
    async (name, element) => {
      const tree = await mount(
        <Providers fixture={withSelection(makeFixture())}>{element()}</Providers>,
      )
      const frames = hostViews(tree, "screen-frame")
      expect(frames).toHaveLength(1)
      // useHeaderHeight() is 44 in this suite: the page starts below the header.
      expect(frames[0].props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ paddingTop: 44 })]),
      )
      const backdrops = hostViews(tree, "screen-frame-backdrop")
      expect(backdrops).toHaveLength(1)
      expect(backdrops[0].props.pointerEvents).toBe("none")
      // The screen itself is inside the frame, after the halo.
      expect(props(name)).toBeDefined()
      const probes = frames[0].findAll(
        (node) => (node.type as { name?: string }).name === "ScreenProbe",
      )
      expect(probes).toHaveLength(1)
    },
  )

  test("Accueil keeps the halo it draws itself: its route adds no frame", async () => {
    const tree = await mount(
      <Providers fixture={makeFixture()}>
        <HomeRoute navigation={nav()} route={{} as never} />
      </Providers>,
    )
    expect(hostViews(tree, "screen-frame")).toHaveLength(0)
  })
})

describe("the native large title frame (12.2-17)", () => {
  beforeEach(() => {
    mockNativeTabs.value = false
  })

  function withSelection(fixture: Fixture): Fixture {
    return {
      ...fixture,
      surveys: {
        ...fixture.surveys,
        state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
      } as unknown as SurveysContextValue,
    }
  }

  function hostViews(tree: renderer.ReactTestRenderer, testID: string) {
    return tree.root.findAll(
      (node) => (node.type as unknown) === "View" && node.props.testID === testID,
    )
  }

  const nav = () => makeNavigation() as never
  const largeTitleRoutes: [string, () => React.ReactElement][] = [
    ["surveyDetail", () => <SurveyDetailRoute navigation={nav()} route={{} as never} />],
    ["surveyScore", () => <SurveyScoreRoute navigation={nav()} route={{} as never} />],
    ["surveyHistory", () => <SurveyHistoryRoute navigation={nav()} route={{} as never} />],
    ["surveyJournal", () => <SurveyJournalRoute navigation={nav()} route={{} as never} />],
    ["surveyContext", () => <SurveyContextRoute navigation={nav()} route={{} as never} />],
    [
      "communitySurvey",
      () => <CommunitySurveyRoute route={{ params: { surveyId: "c-1" } } as never} />,
    ],
    [
      "communityHistory",
      () => <CommunityHistoryRoute route={{ params: { surveyId: "c-1" } } as never} />,
    ],
    ["account", () => <AccountRoute navigation={nav()} route={{} as never} />],
    ["settings", () => <SettingsRoute navigation={nav()} route={{} as never} />],
    ["offlineAreas", () => <OfflineAreasRoute navigation={nav()} route={{} as never} />],
  ]

  test.each(largeTitleRoutes)(
    "%s in the native iOS tab tree: no header padding, the halo on the frame, the page first",
    async (name, element) => {
      mockNativeTabs.value = true
      const tree = await mount(
        <Providers fixture={withSelection(makeFixture())}>{element()}</Providers>,
      )
      const frames = hostViews(tree, "screen-frame")
      expect(frames).toHaveLength(1)
      const style = Object.assign({}, ...[frames[0].props.style].flat()) as Record<string, unknown>
      expect(style.paddingTop).toBeUndefined()
      expect(style.experimental_backgroundImage).toBeDefined()
      expect(hostViews(tree, "screen-frame-backdrop")).toHaveLength(0)
      expect(props(name)).toBeDefined()
    },
  )

  test("routeGuide draws its own title everywhere: the frame of D-19, even in the native iOS tab tree", async () => {
    // The native large title never followed this page's scroll on the iOS simulator (it stayed
    // drawn over the cards), so the page keeps its own title and the header padding frame.
    mockNativeTabs.value = true
    const tree = await mount(
      <Providers fixture={withSelection(makeFixture())}>
        <RouteGuideRoute
          navigation={nav()}
          route={{ params: { surveyId: null, mode: "create", surfaceHa: null } } as never}
        />
      </Providers>,
    )
    const frames = hostViews(tree, "screen-frame")
    expect(frames).toHaveLength(1)
    const style = Object.assign({}, ...[frames[0].props.style].flat()) as Record<string, unknown>
    expect(style.paddingTop).toBe(44)
    expect(hostViews(tree, "screen-frame-backdrop")).toHaveLength(1)
  })

  test.each(largeTitleRoutes)(
    "%s elsewhere (Android, Expo Go): the frame of D-19, header padding and halo child",
    async (_name, element) => {
      const tree = await mount(
        <Providers fixture={withSelection(makeFixture())}>{element()}</Providers>,
      )
      const frames = hostViews(tree, "screen-frame")
      const style = Object.assign({}, ...[frames[0].props.style].flat()) as Record<string, unknown>
      expect(style.paddingTop).toBe(44)
      expect(hostViews(tree, "screen-frame-backdrop")).toHaveLength(1)
    },
  )
})
