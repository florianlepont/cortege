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
// SurveySearchRoute reads its navigation from the hook: it is mounted by two navigators.
const mockSearchNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
}
jest.mock("@react-navigation/native", () => ({ useNavigation: () => mockSearchNavigation }))
const mockCommunity = { items: [], status: "idle" }
const mockCommunityArgs: { query?: string; active?: boolean; accessToken?: string | null } = {}
jest.mock("../../hooks/useCommunitySurveys", () => ({
  useCommunitySurveys: (args: { query: string; active: boolean; accessToken: string | null }) => {
    Object.assign(mockCommunityArgs, args)
    return mockCommunity
  },
}))
jest.mock("../../screens/survey-search/SurveySearchScreen", () => ({
  SurveySearchScreen: mockScreen("surveySearch"),
}))
jest.mock("../../screens/community-survey/CommunitySurveyScreen", () => ({
  CommunitySurveyScreen: mockScreen("communitySurvey"),
}))
const mockCommunitySurvey = { detail: null, photos: [], status: "loading", photosFailed: false }
const mockCommunitySurveyArgs: { surveyId?: string; accessToken?: string | null } = {}
jest.mock("../../hooks/useCommunitySurvey", () => ({
  useCommunitySurvey: (_apiUrl: string, accessToken: string | null, surveyId: string) => {
    Object.assign(mockCommunitySurveyArgs, { accessToken, surveyId })
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
import { PublicMapReloadContext, createPublicMapReloadSignal } from "../public-map-reload"
import { SurveysStackConfigContext } from "../stacks/surveys-stack-config"
import { AccountRoute } from "./AccountRoute"
import { FactorDetailRoute, FinishStatusNotice } from "./FactorDetailRoute"
import { HomeRoute } from "./HomeRoute"
import { ParcelSelectionRoute } from "./ParcelSelectionRoute"
import { PublicMapRoute } from "./PublicMapRoute"
import { OfflineAreasRoute } from "./OfflineAreasRoute"
import { SettingsRoute } from "./SettingsRoute"
import { SurveyContextRoute } from "./SurveyContextRoute"
import { SurveyDetailRoute } from "./SurveyDetailRoute"
import { SurveyHistoryRoute } from "./SurveyHistoryRoute"
import { SurveyScoreRoute } from "./SurveyScoreRoute"
import { SurveyFormRoute } from "./SurveyFormRoute"
import { SurveyListRoute } from "./SurveyListRoute"
import { SurveySearchRoute } from "./SurveySearchRoute"
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
        position: null,
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
    popTo: jest.fn(),
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

    callback("surveyList", "onOpenSearch")()
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveySearch")
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

describe("SurveySearchRoute", () => {
  beforeEach(() => {
    mockSearchNavigation.navigate.mockClear()
    mockSearchNavigation.goBack.mockClear()
    mockSearchNavigation.canGoBack.mockReturnValue(true)
  })

  test("feeds the screen with the shared list filters, and queries the community only in its scope", async () => {
    const fixture = makeFixture()
    await mount(
      <Providers fixture={fixture}>
        <SurveySearchRoute />
      </Providers>,
    )
    const search = props("surveySearch")
    expect(search.surveys).toBe(fixture.surveys.state.visibleSurveys)
    expect(search.query).toBe(fixture.surveys.state.surveyQuery)
    expect(search.scope).toBe("mine")
    expect(search.community).toBe(mockCommunity)
    expect(mockCommunityArgs.active).toBe(false)
    expect(mockCommunityArgs.query).toBe(fixture.surveys.state.surveyQuery)

    await act(async () => {
      callback("surveySearch", "onScopeChange")("community")
    })
    expect(props("surveySearch").scope).toBe("community")
    expect(mockCommunityArgs.active).toBe(true)
    ;(search.onQueryChange as (value: string) => void)("chêne")
    expect(fixture.surveys.actions.setSurveyQuery).toHaveBeenCalledWith("chêne")
    ;(search.onStatusFilterChange as (value: string) => void)("draft")
    expect(fixture.surveys.actions.setStatusFilter).toHaveBeenCalledWith("draft")
    ;(search.onAttachmentFilterChange as (value: string) => void)("with")
    expect(fixture.surveys.actions.setAttachmentFilter).toHaveBeenCalledWith("with")
    ;(search.onSortModeChange as (value: string) => void)("site_asc")
    expect(fixture.surveys.actions.setSortMode).toHaveBeenCalledWith("site_asc")
  })

  test("opens a survey in the Mes Relevés stack, above the list", async () => {
    const fixture = makeFixture()
    await mount(
      <Providers fixture={fixture}>
        <SurveySearchRoute />
      </Providers>,
    )
    callback("surveySearch", "onOpenSurvey")("s-01")
    expect(fixture.surveys.actions.openSurvey).toHaveBeenCalledWith("s-01")
    expect(mockSearchNavigation.navigate).toHaveBeenLastCalledWith("surveys", {
      screen: "surveyDetail",
      initial: false,
    })
  })

  test("opens a community survey in the Mes Relevés stack, above the search", async () => {
    await mount(
      <Providers fixture={makeFixture()}>
        <SurveySearchRoute />
      </Providers>,
    )
    callback("surveySearch", "onOpenCommunitySurvey")("c-1")
    expect(mockSearchNavigation.navigate).toHaveBeenLastCalledWith("surveys", {
      screen: "communitySurvey",
      params: { surveyId: "c-1" },
      initial: false,
    })
  })

  test("cancel resets the filters and goes back, or returns to Mes Relevés from the search tab", async () => {
    const fixture = makeFixture()
    await mount(
      <Providers fixture={fixture}>
        <SurveySearchRoute />
      </Providers>,
    )
    await act(async () => {
      callback("surveySearch", "onScopeChange")("community")
    })
    await act(async () => {
      callback("surveySearch", "onCancel")()
    })
    expect(fixture.surveys.actions.resetFilters).toHaveBeenCalled()
    expect(mockSearchNavigation.goBack).toHaveBeenCalledTimes(1)
    expect(props("surveySearch").scope).toBe("mine")

    mockSearchNavigation.canGoBack.mockReturnValue(false)
    await act(async () => {
      callback("surveySearch", "onCancel")()
    })
    expect(mockSearchNavigation.navigate).toHaveBeenLastCalledWith("surveys")
  })
})

describe("CommunitySurveyRoute", () => {
  test("loads the survey of the route and opens another one from its history", async () => {
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

    callback("communitySurvey", "onOpenSurvey")("c-2")
    expect(navigation.push).toHaveBeenCalledWith("communitySurvey", { surveyId: "c-2" })
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

    await act(async () => {
      await callback("surveyDetail", "onOpenFactor")("s-01", "C")
    })
    expect(fixture.surveys.actions.startEditSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyFactorDetail", { factor: "C" })

    // The map card opens the parcel editor directly (OA-96).
    await act(async () => {
      await callback("surveyDetail", "onOpenParcels")("s-01")
    })
    expect(navigation.navigate).toHaveBeenLastCalledWith("surveyParcels", {
      surveyId: "s-01",
      mode: "edit",
    })
  })

  test("the map card stays on the page when the survey cannot be loaded for editing", async () => {
    const base = withSelection(makeFixture({ startEdit: false }))
    const navigation = makeNavigation()
    await mount(
      <Providers fixture={base}>
        <SurveyDetailRoute navigation={navigation as never} route={{} as never} />
      </Providers>,
    )
    await act(async () => {
      await callback("surveyDetail", "onOpenParcels")("s-01")
    })
    expect(navigation.navigate).not.toHaveBeenCalled()
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

  test("press: the edits are written, the finish runs once, success goes back to the summary", async () => {
    const base = makeFixture()
    const formActions = actionsProxy<SurveyFormContextValue["actions"]>({ flushDraft: true })
    const fixture = editing({ ...base, form: { ...base.form, actions: formActions } })
    const { element, navigation } = renderRoute(fixture)
    const tree = await mount(element(fixture))
    await act(async () => {
      pill(tree).props.onPress()
    })
    expect(formActions.flushDraft).toHaveBeenCalledTimes(1)
    expect(fixture.surveys.actions.submitSurvey).toHaveBeenCalledTimes(1)
    expect(fixture.surveys.actions.submitSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.popTo).not.toHaveBeenCalled()

    // The finish wrote "submitted": the list refresh reaches the route.
    await act(async () => {
      tree.update(element(editing(fixture, { surveyStatus: "submitted" })))
    })
    expect(navigation.popTo).toHaveBeenCalledTimes(1)
    expect(navigation.popTo).toHaveBeenCalledWith("surveyDetail")
    // No haptic here: the summary's useSubmitSuccessPulse plays it (D-25).
    expect(pill(tree)).toBeUndefined()
  })

  test("a calm failure stays on the pager and shows the status message the finish set", async () => {
    const base = makeFixture()
    const postponed = fr.status.surveyOps.submitPostponed({ name: "Site 01" })
    const fixture = editing({
      ...base,
      form: { ...base.form, actions: actionsProxy({ flushDraft: true }) },
    })
    const { element, navigation } = renderRoute(fixture)
    const tree = await mount(element(fixture))
    expect(tree.root.findAll((n) => n.props.testID === "pager-finish-notice")).toHaveLength(0)
    await act(async () => {
      tree.update(element({ ...fixture, status: postponed }))
    })
    await act(async () => {
      pill(tree).props.onPress()
    })
    expect(navigation.popTo).not.toHaveBeenCalled()
    expect(navigation.goBack).not.toHaveBeenCalled()
    const notices = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.testID === "pager-finish-notice",
    )
    expect(notices).toHaveLength(1)
    expect(notices[0].props.children).toBe(postponed)
    expect(postponed).not.toContain("\u2014")
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

  test("the notice keeps the message of its finish, not a later status", async () => {
    const first = fr.status.surveyOps.submitPostponed({ name: "Site 01" })
    const fixture = { ...makeFixture(), status: first }
    const tree = await mount(
      <Providers fixture={fixture}>
        <FinishStatusNotice />
      </Providers>,
    )
    await act(async () => {
      tree.update(
        <Providers fixture={{ ...fixture, status: fr.status.session.ready() }}>
          <FinishStatusNotice />
        </Providers>,
      )
    })
    const text = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.testID === "pager-finish-notice",
    )[0]
    expect(text.props.children).toBe(first)
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

  test("draws the author's located drafts and opens one as their own survey (OA-59)", async () => {
    const fixture = makeFixture()
    fixture.surveys.state.surveyDetails = {
      "s-01": {
        id: "s-01",
        status: "draft",
        display_location: { lat: 46.5, lng: 2.1 },
        created_at: "2026-10-01T09:30:00.000Z",
        factor_results: {},
        scores: { ibp_peuplement_gestion: 10, ibp_contexte: 5, ibp_total: 15 },
      },
    } as never
    // A public survey is already on the map; the draft is not one of them.
    ;(mockExplorer as { items: unknown[] }).items = [{ survey_id: "pub-1" }]
    const navigation = makeNavigation()
    const focus = { surveyId: "s-01", lat: 46.5, lng: 2.1, parcelIds: [], nonce: 1 }
    await mount(
      <Providers fixture={fixture}>
        <PublicMapRoute navigation={navigation as never} route={{ params: { focus } } as never} />
      </Providers>,
    )
    expect(props("publicMap").focus).toBe(focus)
    expect(
      (props("publicMap").draftItems as Array<{ survey_id: string }>).map((i) => i.survey_id),
    ).toEqual(["s-01"])

    act(() => {
      ;(props("publicMap").onOpenSurvey as (surveyId: string) => void)("s-01")
    })
    expect(fixture.surveys.actions.openSurvey).toHaveBeenCalledWith("s-01")
    expect(navigation.navigate).toHaveBeenCalledWith("surveys", { screen: "surveyDetail" })
    expect(navigation.navigate).not.toHaveBeenCalledWith("communitySurvey", expect.anything())
    ;(mockExplorer as { items: unknown[] }).items = []
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
    ["surveySearch", () => <SurveySearchRoute />],
    ["surveyDetail", () => <SurveyDetailRoute navigation={nav()} route={{} as never} />],
    ["surveyScore", () => <SurveyScoreRoute navigation={nav()} route={{} as never} />],
    ["surveyHistory", () => <SurveyHistoryRoute navigation={nav()} route={{} as never} />],
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
    // 12.2-16: the wizard. The stack hides its header, so on a phone the inset is 0.
    ["surveyForm", () => <SurveyFormRoute navigation={nav()} route={{} as never} />],
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
    ["surveyContext", () => <SurveyContextRoute navigation={nav()} route={{} as never} />],
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
