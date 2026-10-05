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
    View: "View",
    ScrollView: "ScrollView",
    KeyboardAvoidingView: "KeyboardAvoidingView",
    Pressable,
    Text: "Text",
    ActivityIndicator: "ActivityIndicator",
  }
})

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}))

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
jest.mock("../../screens/SurveyScoreScreen", () => ({
  SurveyScoreScreen: mockScreen("surveyScore"),
}))
jest.mock("../../screens/SurveyHistoryScreen", () => ({
  SurveyHistoryScreen: mockScreen("surveyHistory"),
}))
jest.mock("../../screens/survey-wizard/SurveyWizardScreen", () => ({
  SurveyWizardScreen: mockScreen("surveyForm"),
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
jest.mock("../../hooks/useIsOffline", () => ({ useIsOffline: () => false }))
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
jest.mock("../../hooks/useOfflinePendingParcelDrain", () => ({
  useOfflinePendingParcelDrain: jest.fn(),
}))
const mockAddPendingParcelDownload = jest.fn()
jest.mock("../../storage/offline-map", () => ({
  addPendingParcelDownload: (...args: unknown[]) => mockAddPendingParcelDownload(...args),
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
import { PublicMapReloadContext, createPublicMapReloadSignal } from "../public-map-reload"
import { SurveysStackConfigContext } from "../stacks/surveys-stack-config"
import { AccountRoute } from "./AccountRoute"
import { FactorDetailRoute } from "./FactorDetailRoute"
import { HomeRoute } from "./HomeRoute"
import { ParcelSelectionRoute } from "./ParcelSelectionRoute"
import { PublicMapRoute } from "./PublicMapRoute"
import { SettingsRoute } from "./SettingsRoute"
import { SurveyContextRoute } from "./SurveyContextRoute"
import { SurveyDetailRoute } from "./SurveyDetailRoute"
import { SurveyHistoryRoute } from "./SurveyHistoryRoute"
import { SurveyScoreRoute } from "./SurveyScoreRoute"
import { SurveyFormRoute } from "./SurveyFormRoute"
import { SurveyListRoute } from "./SurveyListRoute"

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

function makeFixture(overrides: { startEdit?: boolean; saved?: boolean } = {}): Fixture {
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
        attachmentsBySurvey: {},
        surveyQuery: "",
        surveyFromDate: "",
        surveyToDate: "",
        statusFilter: "all",
        visibilityFilter: "all",
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
        formErrors: { siteName: null },
        draftInput: {},
        formMode: "create",
        editingSurveyId: null,
      } as unknown as SurveyFormContextValue["state"],
      actions: actionsProxy({ saveSurveyEdits: saved, createDraft: saved }),
    },
    nearby: {
      state: {
        parcels: [],
        sectorAvgScore: null,
        loading: false,
        locationDenied: false,
        error: false,
      },
      load: jest.fn(async () => undefined),
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
                        {children}
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
    setOptions: jest.fn(),
    reset: jest.fn(),
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
  mockExplorer.loadPublicMap.mockClear()
})

describe("SettingsRoute", () => {
  test("passes the status, the session and the sync actions", async () => {
    const fixture = makeFixture()
    await mount(
      <Providers fixture={fixture}>
        <SettingsRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    const settings = props("settings")
    expect(settings.status).toBe(fr.status.session.ready())
    expect(settings.apiUrl).toBe("http://api.test/v1")
    expect(settings.onApiUrlChange).toBe(fixture.session.actions.setApiUrl)
    expect(settings.onSync).toBe(fixture.syncActions.handleSync)
    expect(settings.onRefreshLocalList).toBe(fixture.syncActions.refreshLocalSurveys)
    expect(settings.onDeleteAccount).toBe(fixture.session.actions.handleDeleteAccount)
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

    callback("account", "onOpenSyncAndData")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("settings")

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

    callback("home", "onOpenSurvey")("s-01")
    expect(fixture.surveys.actions.openSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveys", {
      screen: "surveyDetail",
      initial: false,
    })

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
  test("opens the form and a survey, with the filtered list and inline search", async () => {
    const fixture = makeFixture()
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyListRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    const list = props("surveyList")
    expect(list.visibleSurveys).toBe(fixture.surveys.state.visibleSurveys)
    expect(list.showInlineSearch).toBe(true)
    expect(list.useNativeSearchUI).toBe(false)
    expect(list.surveyDetails).toBe(fixture.surveys.state.surveyDetails)
    expect(navigation.setOptions).not.toHaveBeenCalled()

    callback("surveyList", "onOpenCreateSurvey")()
    expect(fixture.surveys.actions.openCreateSurvey).toHaveBeenCalled()
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyForm")

    callback("surveyList", "onOpenSurvey")("s-01")
    expect(fixture.surveys.actions.openSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyDetail")
  })

  test("with the native tab bar outside iOS it keeps the inline search", async () => {
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
    expect(props("surveyList").visibleSurveys).toBe(fixture.surveys.state.visibleSurveys)
    expect(props("surveyList").showInlineSearch).toBe(true)
    expect(props("surveyList").useNativeSearchUI).toBe(false)
    expect(navigation.setOptions).not.toHaveBeenCalled()
  })

  test("in the native iOS Mes Relevés tab it owns the header search bar and syncs its text", async () => {
    mockPlatform.OS = "ios"
    const fixture = makeFixture()
    const navigation = makeNavigation()
    const nativeConfig = { useNativeNav: true }
    const route = (query: string) => (
      <Providers
        fixture={{
          ...fixture,
          surveys: { ...fixture.surveys, state: { ...fixture.surveys.state, surveyQuery: query } },
        }}
      >
        <SurveysStackConfigContext.Provider value={nativeConfig}>
          <SurveyListRoute navigation={navigation as never} route={{} as never} />
        </SurveysStackConfigContext.Provider>
      </Providers>
    )
    const tree = await mount(route(""))
    expect(props("surveyList").useNativeSearchUI).toBe(true)
    expect(props("surveyList").showInlineSearch).toBe(false)
    expect(props("surveyList").visibleSurveys).toBe(fixture.surveys.state.visibleSurveys)
    expect(navigation.setOptions).toHaveBeenCalledTimes(1)

    const setOptionsCall = navigation.setOptions.mock.calls[0][0]
    const options = setOptionsCall.headerSearchBarOptions
    expect(options.placeholder).toBe(fr.navigation.search.placeholder)
    expect(options.placement).toBe("automatic")
    options.onChangeText({ nativeEvent: { text: "chêne" } })
    expect(fixture.surveys.actions.setSurveyQuery).toHaveBeenLastCalledWith("chêne")
    options.onCancelButtonPress()
    expect(fixture.surveys.actions.setSurveyQuery).toHaveBeenLastCalledWith("")

    // OA-85: the title sits left, on the same row as the "+" create button.
    expect(setOptionsCall.headerTitle).toBe("")
    const [titleItem] = setOptionsCall.unstable_headerLeftItems()
    expect(titleItem.hidesSharedBackground).toBe(true)
    let titleTree: renderer.ReactTestRenderer | undefined
    act(() => {
      titleTree = renderer.create(titleItem.element)
    })
    expect(
      titleTree!.root.findAll((node) => (node.type as unknown) === "Text").length,
    ).toBeGreaterThan(0)
    act(() => titleTree!.unmount())

    // SYNC-02/HOME-01: the native header also carries the "+" create button.
    const [createButton] = setOptionsCall.unstable_headerRightItems()
    expect(createButton.label).toBe(fr.surveyList.a11y.createSurvey)
    createButton.onPress()
    expect(fixture.surveys.actions.openCreateSurvey).toHaveBeenCalled()

    const bar = { setText: jest.fn(), clearText: jest.fn() }
    options.ref.current = bar
    await act(async () => {
      tree.update(route("chêne"))
    })
    expect(bar.setText).toHaveBeenCalledWith("chêne")
    await act(async () => {
      tree.update(route("  "))
    })
    expect(bar.clearText).toHaveBeenCalled()
  })
})

describe("SurveyDetailRoute", () => {
  test("renders nothing until a survey is selected", async () => {
    await mount(
      <Providers fixture={makeFixture()}>
        <SurveyDetailRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(mockScreenProps.surveyDetail).toBeUndefined()
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

  test("passes the survey and opens the three sub-pages", async () => {
    const fixture = withSelection(makeFixture())
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyDetailRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyDetail").apiUrl).toBe("http://api.test/v1")
    expect(props("surveyDetail").navigation).toBe(navigation)
    expect(props("surveyDetail").onSubmitSurvey).toBe(fixture.surveys.actions.submitSurvey)
    expect(props("surveyDetail").onSimulateMissingAttachmentFile).toBe(
      fixture.syncActions.handleSimulateMissingAttachmentFile,
    )

    await act(async () => {
      callback("surveyDetail", "onOpenContext")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyContext")
    await act(async () => {
      callback("surveyDetail", "onOpenScore")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyScore")
    await act(async () => {
      callback("surveyDetail", "onOpenHistory")()
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyHistory")
  })
})

describe("SurveyContextRoute", () => {
  function withSelection(fixture: Fixture): Fixture {
    return {
      ...fixture,
      surveys: {
        ...fixture.surveys,
        state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
      } as unknown as SurveysContextValue,
    }
  }

  test("renders nothing until a survey is selected", async () => {
    await mount(
      <Providers fixture={makeFixture()}>
        <SurveyContextRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(mockScreenProps.surveyContext).toBeUndefined()
  })

  test("opens the parcel editing once the survey is loaded for editing", async () => {
    const fixture = withSelection(makeFixture())
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyContextRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyContext").onUpdateIbpCas).toBe(fixture.surveys.actions.updateIbpCas)

    await act(async () => {
      await callback("surveyContext", "onOpenParcels")("s-01")
    })
    expect(fixture.surveys.actions.startEditSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyParcels", {
      surveyId: "s-01",
      mode: "edit",
    })
  })

  test("does not navigate when the survey cannot be loaded", async () => {
    const fixture = withSelection(makeFixture({ startEdit: false }))
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={fixture}>
        <SurveyContextRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      await callback("surveyContext", "onOpenParcels")("s-01")
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
  test("passes the events and the loader of the selected survey", async () => {
    const fixture = {
      ...makeFixture(),
    }
    fixture.surveys = {
      ...fixture.surveys,
      state: { ...fixture.surveys.state, selectedSurveyId: "s-01", selectedSurvey: survey },
    } as unknown as SurveysContextValue
    await mount(
      <Providers fixture={fixture}>
        <SurveyHistoryRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )
    expect(props("surveyHistory").onLoadSurveyEvents).toBe(fixture.surveys.actions.loadSurveyEvents)
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

  test("the wizard parcel step creates the draft and replaces the flow with the survey page", async () => {
    const fixture = makeFixture()
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
      await callback("parcelSelection", "onSave")()
    })
    expect(fixture.form.actions.createDraft).toHaveBeenCalled()
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [{ name: "surveysHome" }, { name: "surveyDetail" }],
    })

    const failing = makeFixture({ saved: false })
    const stay = makeNavigation()
    await mount(
      <Providers fixture={failing}>
        <ParcelSelectionRoute
          navigation={stay as never}
          route={{ params: { surveyId: "draft", mode: "wizard" } } as never}
        />
      </Providers>,
    )
    await act(async () => {
      await callback("parcelSelection", "onSave")()
    })
    expect(stay.reset).not.toHaveBeenCalled()
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
    expect(props("publicMap").ownSurveyIds).toEqual(["s-01"])
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

  test("queuing a parcel download (REQ-D-offline-parcel-warning) writes to the offline queue", async () => {
    await mount(
      <Providers fixture={makeFixture()}>
        <PublicMapRoute navigation={makeNavigation() as never} route={{} as never} />
      </Providers>,
    )

    act(() => {
      ;(props("publicMap").onQueueParcelDownload as (parcelId: string) => void)("parcel-1")
    })

    expect(mockAddPendingParcelDownload).toHaveBeenCalledWith("parcel-1")
  })
})
