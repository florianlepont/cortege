/**
 * Navigation tree tests (phase 01.9-24, D-04).
 *
 * The navigators are replaced by fakes that record every Screen's props and
 * render its `component`, and the route components by probes. The tests check
 * the tree choice (native or JS tabs), the tab options and icons, the tab and
 * stack listeners, the stack options, and the static surveys stack config.
 */

import React from "react"
import renderer, { act } from "react-test-renderer"

const mockPlatform = { OS: "android" as "android" | "ios", Version: 26 as number | string }

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatform.OS
    },
    get Version() {
      return mockPlatform.Version
    },
    select: (options: Record<string, unknown>) =>
      mockPlatform.OS in options ? options[mockPlatform.OS] : options.default,
  },
  StyleSheet: { create: <T,>(value: T): T => value },
  StatusBar: "StatusBar",
  View: "View",
  Pressable: "Pressable",
}))

// DS-13: JsRootTabs reads the safe-area bottom inset to size the JS tab bar.
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

const mockConstants: { executionEnvironment: string; appOwnership: string | null } = {
  executionEnvironment: "bare",
  appOwnership: null,
}

jest.mock("expo-constants", () => ({
  __esModule: true,
  get default() {
    return mockConstants
  },
  ExecutionEnvironment: { StoreClient: "storeClient", Bare: "bare", Standalone: "standalone" },
}))

type ScreenRecord = {
  name: string
  /** The props of the navigator that registered the screen (its `screenOptions`). */
  navigator?: Record<string, unknown>
  options?: unknown
  listeners?: Record<string, (...args: unknown[]) => void>
  component?: React.ComponentType<Record<string, unknown>>
}

const mockScreens: Record<string, ScreenRecord> = {}
const mockNavigators: Record<string, Record<string, unknown>[]> = {}
const mockNavigation = { navigate: jest.fn(), setOptions: jest.fn() }

function mockCreateFakeNavigator(kind: string) {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  const NavigatorProps = ReactRef.createContext<Record<string, unknown> | undefined>(undefined)
  const Navigator = ({ children, ...props }: { children?: React.ReactNode }) => {
    ;(mockNavigators[kind] ??= []).push(props)
    return ReactRef.createElement(NavigatorProps.Provider, { value: props }, children)
  }
  const Screen = (props: ScreenRecord) => {
    mockScreens[props.name] = { ...props, navigator: ReactRef.useContext(NavigatorProps) }
    if (!props.component) return null
    return ReactRef.createElement(props.component, {
      navigation: mockNavigation,
      route: { key: props.name, name: props.name, params: { factor: "A" } },
    })
  }
  return { Navigator, Screen }
}

const mockNavigationThemeColors = {
  primary: "#000",
  background: "#fff",
  card: "#fff",
  text: "#000",
  border: "#000",
  notification: "#000",
}

jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return {
    NavigationContainer: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement(ReactRef.Fragment, null, children),
    getFocusedRouteNameFromRoute: (route: { focused?: string }) => route.focused,
    createNavigationContainerRef: () => ({ current: null, isReady: () => false }),
    useFocusEffect: () => undefined,
    DefaultTheme: { dark: false, colors: mockNavigationThemeColors },
    DarkTheme: { dark: true, colors: mockNavigationThemeColors },
  }
})
jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => mockCreateFakeNavigator("stack"),
}))
jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => mockCreateFakeNavigator("jsTabs"),
}))
jest.mock("@bottom-tabs/react-navigation", () => ({
  createNativeBottomTabNavigator: () => mockCreateFakeNavigator("nativeTabs"),
}))

// ─── Route probes ────────────────────────────────────────────────────────────

const mockListConfigs: { useNativeNav: boolean }[] = []
const mockReloadSignals: unknown[] = []

function mockRoute() {
  return function RouteProbe() {
    return null
  }
}

jest.mock("./routes/HomeRoute", () => ({ HomeRoute: mockRoute() }))
jest.mock("./routes/SurveyDetailRoute", () => ({ SurveyDetailRoute: mockRoute() }))
jest.mock("./routes/SurveyContextRoute", () => ({ SurveyContextRoute: mockRoute() }))
jest.mock("./routes/SurveyScoreRoute", () => ({ SurveyScoreRoute: mockRoute() }))
jest.mock("./routes/SurveyHistoryRoute", () => ({ SurveyHistoryRoute: mockRoute() }))
jest.mock("./routes/SurveyFormRoute", () => ({ SurveyFormRoute: mockRoute() }))
jest.mock("./routes/SurveySearchRoute", () => ({ SurveySearchRoute: mockRoute() }))
jest.mock("./routes/CommunitySurveyRoute", () => ({ CommunitySurveyRoute: mockRoute() }))
jest.mock("./routes/FactorDetailRoute", () => ({ FactorDetailRoute: mockRoute() }))
jest.mock("./routes/ParcelSelectionRoute", () => ({
  ParcelSelectionRoute: mockRoute(),
}))
jest.mock("./routes/AccountRoute", () => ({ AccountRoute: mockRoute() }))
jest.mock("./routes/SettingsRoute", () => ({ SettingsRoute: mockRoute() }))
jest.mock("./routes/OfflineAreasRoute", () => ({ OfflineAreasRoute: mockRoute() }))
jest.mock("./routes/SurveyListRoute", () => {
  const config = jest.requireActual("./stacks/surveys-stack-config") as {
    useSurveysStackConfig: () => { useNativeNav: boolean }
  }
  return {
    SurveyListRoute: function SurveyListProbe() {
      mockListConfigs.push(config.useSurveysStackConfig())
      return null
    },
  }
})
jest.mock("./routes/PublicMapRoute", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  const reload = jest.requireActual("./public-map-reload") as {
    PublicMapReloadContext: React.Context<unknown>
  }
  return {
    PublicMapRoute: function PublicMapProbe() {
      mockReloadSignals.push(ReactRef.useContext(reload.PublicMapReloadContext))
      return null
    },
  }
})

// ─── Contexts ────────────────────────────────────────────────────────────────

const mockSession = {
  state: { isAuthenticated: true },
  actions: { handleLoadMyProfile: jest.fn(async () => undefined) },
}
const mockSyncActions = { handlePullChanges: jest.fn(async () => undefined) }
const mockSurveyActions = { closeSurveyDetailSelection: jest.fn() }

jest.mock("../state/session-context", () => ({ useSession: () => mockSession }))
jest.mock("../state/sync-actions-context", () => ({ useSyncActions: () => mockSyncActions }))
jest.mock("../state/surveys-context", () => ({ useSurveyActions: () => mockSurveyActions }))

import { AppNavigation } from "./AppNavigation"
import { PublicMapReloadContext, createPublicMapReloadSignal } from "./public-map-reload"
import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import {
  buildJsTabBarStyle,
  jsTabScreenOptions,
  nativeTabScreenOptions,
  TAB_TITLES,
} from "./tab-config"
import { JsRootTabs } from "./tabs/JsRootTabs"
import { NativeRootTabs } from "./tabs/NativeRootTabs"
import { nativeLargeTitle } from "./stacks/stack-options"

type Options = Record<string, unknown>
type OptionsFn = (args: Record<string, unknown>) => Options

let warn: jest.SpyInstance
let silenceErrors = false
const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  warn = jest.spyOn(console, "warn").mockImplementation(() => undefined)
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (silenceErrors) return
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  mockPlatform.OS = "android"
  mockPlatform.Version = 26
  mockConstants.executionEnvironment = "bare"
  mockConstants.appOwnership = null
  delete process.env.EXPO_PUBLIC_ENABLE_NATIVE_TABS
  for (const key of Object.keys(mockScreens)) delete mockScreens[key]
  for (const key of Object.keys(mockNavigators)) delete mockNavigators[key]
  mockListConfigs.length = 0
  mockReloadSignals.length = 0
  mockSession.state.isAuthenticated = true
  jest.clearAllMocks()
})

async function mount(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer | undefined
  await act(async () => {
    tree = renderer.create(element)
  })
  return tree as renderer.ReactTestRenderer
}

function press(name: string) {
  mockScreens[name].listeners?.tabPress()
}

/** The options a screen really gets: its navigator's `screenOptions`, then its own `options`. */
function effectiveOptions(name: string, args: Record<string, unknown> = {}): Options {
  const record = mockScreens[name]
  const own = record.options as Options | OptionsFn | undefined
  const resolved =
    typeof own === "function"
      ? own({ route: { params: {} }, navigation: mockNavigation, ...args })
      : (own ?? {})
  return { ...((record.navigator?.screenOptions as Options | undefined) ?? {}), ...resolved }
}

const HALO_HEADER = {
  headerTransparent: true,
  headerBlurEffect: "none",
  headerShadowVisible: false,
  headerStyle: { backgroundColor: "transparent" },
}

/**
 * The halo header of a page: transparent with no shadow (D-19). Under the native large title
 * (12.2-17) the collapsed bar takes the system material once content is under it (owner, batch 3
 * round 2); the transparent large-title state keeps the halo at rest.
 */
function expectHaloHeader(options: Options) {
  const { headerBlurEffect: _blur, ...transparent } = HALO_HEADER
  expect(options).toEqual(expect.objectContaining(transparent))
  expect(options.headerBlurEffect).toBe(
    options.headerLargeTitleEnabled === true ? "systemMaterial" : "none",
  )
}

describe("AppNavigation tree choice", () => {
  test("Android mounts the JS tabs and logs the fallback", async () => {
    await mount(<AppNavigation />)
    expect(mockNavigators.jsTabs).toHaveLength(1)
    expect(mockNavigators.nativeTabs).toBeUndefined()
    expect(Object.keys(mockScreens)).toEqual(
      expect.arrayContaining([
        "home",
        "surveys",
        "publicMap",
        "accountHome",
        "settings",
        "offlineAreas",
      ]),
    )
    // OA-13: Compte is pushed onto a tab's stack, not a tab of its own.
    expect(mockScreens.account).toBeUndefined()
    expect(mockScreens.search).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(mockListConfigs).toEqual([{ useNativeNav: false }])
  })

  test("iOS in a native build mounts the native tabs with one survey stack", async () => {
    mockPlatform.OS = "ios"
    const tree = await mount(<AppNavigation />)
    expect(mockNavigators.nativeTabs).toHaveLength(1)
    expect(mockNavigators.jsTabs).toBeUndefined()
    expect(mockScreens.search).toBeDefined()
    expect(warn).not.toHaveBeenCalled()
    expect(mockListConfigs).toEqual([{ useNativeNav: true }])

    // A re-render keeps the lazily created native navigator.
    await act(async () => {
      tree.update(<AppNavigation />)
    })
    expect(mockNavigators.nativeTabs.length).toBeGreaterThan(1)
  })

  test.each([
    ["the env opt-out", () => (process.env.EXPO_PUBLIC_ENABLE_NATIVE_TABS = "false")],
    ["Expo Go (store client)", () => (mockConstants.executionEnvironment = "storeClient")],
    ["Expo Go (app ownership)", () => (mockConstants.appOwnership = "expo")],
  ])("iOS falls back to the JS tabs with %s", async (_label, setup) => {
    mockPlatform.OS = "ios"
    setup()
    await mount(<AppNavigation />)
    expect(mockNavigators.jsTabs).toHaveLength(1)
    expect(mockNavigators.nativeTabs).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toMatch(/^\[tabs\] native=false reason=/)
  })

  test("a Release build ignores the env opt-out, stays native and says so once", async () => {
    mockPlatform.OS = "ios"
    process.env.EXPO_PUBLIC_ENABLE_NATIVE_TABS = "false"
    const info = jest.spyOn(console, "info").mockImplementation(() => undefined)
    const globals = globalThis as { __DEV__?: boolean }
    const previousDev = globals.__DEV__
    globals.__DEV__ = false
    try {
      const tree = await mount(<AppNavigation />)
      await act(async () => {
        tree.update(<AppNavigation />)
      })
      expect(mockNavigators.nativeTabs).toBeDefined()
      expect(mockNavigators.jsTabs).toBeUndefined()
      expect(warn).not.toHaveBeenCalled()
      expect(info).toHaveBeenCalledTimes(1)
      expect(String(info.mock.calls[0][0])).toContain("[tabs] native=true reason=ok")
    } finally {
      globals.__DEV__ = previousDev
      info.mockRestore()
    }
  })

  test("the native tabs add the search tab with the search role (OA-52)", async () => {
    await mount(
      <PublicMapReloadContext.Provider value={createPublicMapReloadSignal()}>
        <NativeRootTabs />
      </PublicMapReloadContext.Provider>,
    )
    expect(mockScreens.surveys).toBeDefined()
    expect(mockScreens.search.options).toEqual({ role: "search" })
  })

  test("the root tabs refuse to render outside AppNavigation", async () => {
    silenceErrors = true
    try {
      await expect(mount(<JsRootTabs />)).rejects.toThrow(
        "The root tabs must be rendered inside AppNavigation",
      )
    } finally {
      silenceErrors = false
    }
  })
})

describe("tab listeners", () => {
  test("Mes Relevés pulls changes when signed in", async () => {
    await mount(<AppNavigation />)
    press("surveys")
    expect(mockSyncActions.handlePullChanges).toHaveBeenCalledTimes(1)
  })

  test("Mes Relevés does nothing when signed out", async () => {
    mockSession.state.isAuthenticated = false
    await mount(<AppNavigation />)
    press("surveys")
    expect(mockSyncActions.handlePullChanges).not.toHaveBeenCalled()
  })

  test("Explorer closes the detail selection and requests a map reload", async () => {
    await mount(<AppNavigation />)
    const signal = mockReloadSignals[0] as ReturnType<typeof createPublicMapReloadSignal>
    const reload = jest.fn()
    signal.subscribe(reload)
    press("publicMap")
    expect(mockSurveyActions.closeSurveyDetailSelection).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  test("the native tree wires the same listeners", async () => {
    mockPlatform.OS = "ios"
    await mount(<AppNavigation />)
    press("surveys")
    press("publicMap")
    expect(mockSyncActions.handlePullChanges).toHaveBeenCalledTimes(1)
    expect(mockSurveyActions.closeSurveyDetailSelection).toHaveBeenCalledTimes(1)
  })
})

describe("tab options", () => {
  test("native options use SF Symbols on iOS and images elsewhere", () => {
    mockPlatform.OS = "ios"
    const options = nativeTabScreenOptions({ route: { name: "surveys" } })
    expect(options.title).toBe(TAB_TITLES.surveys)
    expect(options.tabBarIcon({ focused: true })).toEqual({
      sfSymbol: "list.bullet.clipboard.fill",
    })
    expect(options.tabBarIcon({ focused: false })).toEqual({ sfSymbol: "list.bullet.clipboard" })
    mockPlatform.OS = "android"
    expect(options.tabBarIcon({ focused: true })).toBeDefined()
  })

  test("JS options render an Ionicons icon and the platform bar metrics", () => {
    const options = jsTabScreenOptions(defaultTheme, { route: { name: "publicMap" } })
    expect(options.tabBarLabel).toBe("Explorer")
    expect(options.tabBarStyle.height).toBe(buildJsTabBarStyle(defaultTheme).height)
    const icon = options.tabBarIcon({ color: "red", size: 20, focused: false })
    expect(icon.props.theme).toBe(defaultTheme)
    expect(icon.props).toEqual(
      expect.objectContaining({ name: "map-outline", size: 20, color: "red", focused: false }),
    )
  })

  // DS-13: height/padding grow with the device's own safe-area bottom inset instead of guessing
  // per platform, but never shrink below a usable minimum on a device that reports none.
  test("buildJsTabBarStyle grows with the safe-area bottom inset, floored at a usable minimum", () => {
    const noInset = buildJsTabBarStyle(defaultTheme, { bottom: 0 })
    const bigInset = buildJsTabBarStyle(defaultTheme, { bottom: 34 })
    expect(bigInset.paddingBottom).toBe(34)
    expect(bigInset.height).toBeGreaterThan(noInset.height)
    expect(buildJsTabBarStyle(defaultTheme, { bottom: 2 }).paddingBottom).toBe(
      noInset.paddingBottom,
    )
  })

  test("jsTabScreenOptions threads the insets argument into the bar style", () => {
    const options = jsTabScreenOptions(
      defaultTheme,
      { route: { name: "publicMap" } },
      { bottom: 40 },
    )
    expect(options.tabBarStyle).toEqual(buildJsTabBarStyle(defaultTheme, { bottom: 40 }))
  })

  test("the JS tab navigator's own screenOptions reads the real safe-area inset", async () => {
    await mount(<AppNavigation />)
    const screenOptions = mockNavigators.jsTabs.at(-1)?.screenOptions as OptionsFn
    const options = screenOptions({ route: { name: "publicMap" } })
    expect(options.tabBarStyle).toEqual(buildJsTabBarStyle(defaultTheme, { bottom: 0 }))
  })

  test("OA-28: the JS surveys tab keeps the bar on parcel selection too", async () => {
    await mount(<AppNavigation />)
    const options = mockScreens.surveys.options as OptionsFn
    expect(options({ route: { focused: "surveyParcels" } }).tabBarStyle).toEqual(
      buildJsTabBarStyle(defaultTheme),
    )
    expect(options({ route: { focused: "surveyForm" } }).tabBarStyle).toEqual(
      buildJsTabBarStyle(defaultTheme),
    )
    expect(options({ route: {} }).tabBarLabel).toBe(TAB_TITLES.surveys)
  })
})

describe("stack options and listeners", () => {
  test("the surveys stack closes the detail selection before the detail is removed", async () => {
    await mount(<AppNavigation />)
    mockScreens.surveyDetail.listeners?.beforeRemove()
    expect(mockSurveyActions.closeSurveyDetailSelection).toHaveBeenCalledTimes(1)
  })

  test("the factor detail title names the factor", async () => {
    await mount(<AppNavigation />)
    const options = mockScreens.surveyFactorDetail.options as OptionsFn
    expect(options({ route: { params: { factor: "C" } } }).title).toBe("Facteur C")
  })

  // Pages whose title is the native large title in the native iOS tab tree (12.2-17).
  const ACCOUNT_PAGES = ["accountHome", "settings", "offlineAreas"]
  const SURVEY_SUB_PAGES = ["communitySurvey", "surveyContext", "surveyScore", "surveyHistory"]
  const resolveOwn = (name: string, args: Record<string, unknown> = {}) => {
    const raw = mockScreens[name].options as Options | OptionsFn
    return typeof raw === "function"
      ? raw({ route: { params: {} }, navigation: mockNavigation, ...args })
      : raw
  }

  test.each([
    ["Android", "android", "bare"],
    ["Expo Go on iOS", "ios", "storeClient"],
  ] as const)(
    "%s: a page that draws its own title hides the native one, so a title is never doubled (OA-21)",
    async (_label, os, environment) => {
      mockPlatform.OS = os
      mockConstants.executionEnvironment = environment
      await mount(<AppNavigation />)
      for (const name of [...ACCOUNT_PAGES, ...SURVEY_SUB_PAGES]) {
        const options = resolveOwn(name)
        expect((options.headerTitle as () => null)()).toBeNull()
        expect(options.headerTitleStyle).toEqual({ color: "transparent" })
        expect(options.headerLargeTitleEnabled).toBeUndefined()
      }
      const factor = resolveOwn("surveyFactorDetail", { route: { params: { factor: "A" } } })
      expect((factor.headerTitle as () => null)()).toBeNull()
      expect(factor.headerTitleStyle).toEqual({ color: "transparent" })
    },
  )

  test("native iOS tab tree: Compte, Paramètres and Cartes hors ligne have the native large title (12.2-17)", async () => {
    mockPlatform.OS = "ios"
    await mount(<AppNavigation />)
    const titles: Record<string, string> = {
      accountHome: fr.navigation.headers.account,
      settings: fr.navigation.headers.settings,
      offlineAreas: fr.navigation.headers.offlineAreas,
    }
    for (const name of ACCOUNT_PAGES) {
      const options = effectiveOptions(name)
      expect(options).toEqual(expect.objectContaining(nativeLargeTitle(defaultTheme)))
      expect(options.title).toBe(titles[name])
      // The halo stays continuous behind the bar, and no custom title view hides the large one.
      expect(options.headerTransparent).toBe(true)
      expect(options.headerTitle).toBeUndefined()
      expect(options.headerShown).toBe(true)
    }
    // The gear button stays in the bar of Compte.
    expect(typeof resolveOwn("accountHome").headerRight).toBe("function")
    // The factor pager keeps its own title row above the pages (no large title, see 12.2-17).
    const factor = resolveOwn("surveyFactorDetail", { route: { params: { factor: "A" } } })
    expect(factor.headerLargeTitleEnabled).toBeUndefined()
    expect((factor.headerTitle as () => null)()).toBeNull()
  })

  test("native iOS tab tree: the survey summary and its sub-pages have the native large title (12.2-17)", async () => {
    mockPlatform.OS = "ios"
    await mount(<AppNavigation />)
    const titles: Record<string, string> = {
      communitySurvey: fr.navigation.headers.communitySurvey,
      surveyContext: fr.navigation.headers.surveyContext,
      surveyScore: fr.navigation.headers.surveyScore,
      surveyHistory: fr.navigation.headers.surveyHistory,
    }
    for (const name of Object.keys(titles)) {
      const options = effectiveOptions(name)
      expect(options).toEqual(expect.objectContaining(nativeLargeTitle(defaultTheme)))
      expect(options.title).toBe(titles[name])
      expect(options.headerTitle).toBeUndefined()
      expectHaloHeader(options)
    }
    // The summary's title is the survey's name, set by the screen; it starts empty (OA-94).
    const detail = effectiveOptions("surveyDetail")
    expect(detail).toEqual(expect.objectContaining(nativeLargeTitle(defaultTheme)))
    expect(detail.title).toBe("")
  })

  test("Android: the survey summary keeps its own title, no native large title", async () => {
    await mount(<AppNavigation />)
    const detail = effectiveOptions("surveyDetail")
    expect(detail.title).toBe("")
    expect(detail.headerLargeTitleEnabled).toBeUndefined()
  })

  test("the factor screen has no swipe-back: a slide along the A to J strip is not a back (OA-111)", async () => {
    await mount(<AppNavigation />)
    const options = mockScreens.surveyFactorDetail.options as OptionsFn
    expect(options({ route: { params: { factor: "A" } } }).gestureEnabled).toBe(false)
  })

  test("the parcel step is titled by its mode and the wizard draws its own top bar", async () => {
    await mount(<AppNavigation />)
    const options = mockScreens.surveyParcels.options as OptionsFn
    expect(options({ route: { params: { mode: "wizard" } } }).title).toBe(
      fr.navigation.headers.parcelsWizard,
    )
    expect(options({ route: { params: { mode: "wizard" } } }).presentation).toBe("card")
    expect(options({ route: { params: { mode: "edit" } } }).presentation).toBe("card")
    expect(options({ route: { params: { mode: "edit" } } }).title).toBe(
      fr.navigation.headers.parcels,
    )
    // Android: the wizard keeps its own top bar (12.2-17 changes iOS only).
    expect((mockScreens.surveyForm.options as Options).headerShown).toBe(false)
  })

  test("iOS: the wizard shows the native transparent header with the system back button (12.2-17)", async () => {
    mockPlatform.OS = "ios"
    await mount(<AppNavigation />)
    const wizard = effectiveOptions("surveyForm")
    expect(wizard.headerShown).toBe(true)
    // The step counter is set by the wizard; no large title, no custom back or title view.
    expect(wizard.title).toBe("")
    expect(wizard.headerLargeTitleEnabled).toBe(false)
    expect(wizard.headerTitle).toBeUndefined()
    expect(wizard.headerLeft).toBeUndefined()
    expect(wizard.headerBackButtonDisplayMode).toBe("minimal")
    expect(wizard.headerTitleStyle).toEqual({
      fontFamily: "Sora-SemiBold",
      fontSize: 17,
      fontWeight: "600",
      color: defaultTheme.semanticColors.textStrong,
    })
    // D-19: the transparent halo header, no blur (the page starts below the bar).
    expectHaloHeader(wizard)
  })

  test("the JS surveys stack shows its own header; the native one shows the halo header", async () => {
    await mount(<AppNavigation />)
    const jsStack = mockNavigators.stack.find(
      (props) => (props.screenOptions as Options).headerTitleAlign === "left",
    )
    expect(jsStack).toBeDefined()
    expect((mockScreens.surveysHome.options as Options).headerShown).toBe(false)
    // The JS list draws its own title bar: no native large title.
    expect(effectiveOptions("surveysHome").headerLargeTitleEnabled).toBeUndefined()

    for (const key of Object.keys(mockScreens)) delete mockScreens[key]
    mockPlatform.OS = "ios"
    await mount(<AppNavigation />)
    expect(effectiveOptions("surveysHome")).toEqual(
      expect.objectContaining({
        title: fr.navigation.headers.surveys,
        headerShown: true,
        // D-19: transparent, the halo runs on behind the title and the "+" (no canvas band).
        ...HALO_HEADER,
        // 12.2-17: the native large title, which collapses into the bar as the list scrolls.
        ...nativeLargeTitle(defaultTheme),
      }),
    )
  })

  test.each(["ios", "android"] as const)(
    "the survey pages have the transparent halo header on %s (D-19)",
    async (os) => {
      mockPlatform.OS = os
      await mount(<AppNavigation />)
      const surveyPages = [
        "surveysHome",
        "surveyDetail",
        "communitySurvey",
        "surveyContext",
        "surveyScore",
        "surveyHistory",
      ]
      for (const name of surveyPages) {
        expectHaloHeader(effectiveOptions(name))
      }
      // The search page draws its own top block under the status bar: no native header.
      expect((mockScreens.surveySearch.options as Options).headerShown).toBe(false)
    },
  )

  test("the parcel map is one full-screen map: transparent header on iOS, dark opaque on Android", async () => {
    await mount(<AppNavigation />)
    const options = mockScreens.surveyParcels.options as OptionsFn
    for (const mode of ["wizard", "edit"]) {
      mockPlatform.OS = "ios"
      const ios = options({ route: { params: { mode } } })
      expect(ios.headerTransparent).toBe(true)
      expect((ios.headerTitle as () => null)()).toBeNull()
      // The native title is still drawn from `title`, so it is invisible (OA-109).
      expect(ios.headerTitleStyle).toEqual({ color: "transparent" })
      mockPlatform.OS = "android"
      const android = options({ route: { params: { mode } } })
      // The stack default is transparent (D-19): the map keeps its opaque bar on Android.
      expect(android.headerTransparent).toBe(false)
      expect(android.headerStyle).toBeDefined()
    }
  })

  test.each(["ios", "android"] as const)(
    "every stack defaults to the transparent halo header on %s, Compte and Paramètres included (D-19)",
    async (os) => {
      mockPlatform.OS = os
      await mount(<AppNavigation />)
      // Accueil, Mes Relevés, Explorer and (iOS) the search tab.
      expect(mockNavigators.stack.length).toBeGreaterThanOrEqual(3)
      for (const props of mockNavigators.stack) {
        expect(props.screenOptions).toEqual(expect.objectContaining(HALO_HEADER))
      }
      for (const name of ["accountHome", "settings", "offlineAreas"]) {
        expectHaloHeader(effectiveOptions(name))
      }
    },
  )

  test.each(["ios", "android"] as const)(
    "the factor pager has the transparent halo header on %s like every page (D-19, 12.2-15)",
    async (os) => {
      mockPlatform.OS = os
      await mount(<AppNavigation />)
      const factor = effectiveOptions("surveyFactorDetail", { route: { params: { factor: "A" } } })
      expect(factor).toEqual(expect.objectContaining(HALO_HEADER))
      // Its own options keep only the title, the hidden native title and no swipe-back.
      const own = (mockScreens.surveyFactorDetail.options as OptionsFn)({
        route: { params: { factor: "A" } },
      })
      expect(own.headerStyle).toBeUndefined()
      expect(own.headerTransparent).toBeUndefined()
    },
  )

  test("Paramètres and Cartes hors ligne draw their own title too", async () => {
    await mount(<AppNavigation />)
    const settings = mockScreens.settings.options as Options
    expect(settings.title).toBe(fr.navigation.headers.settings)
    expect((settings.headerTitle as () => null)()).toBeNull()
    const areas = mockScreens.offlineAreas.options as Options
    expect(areas.title).toBe(fr.navigation.headers.offlineAreas)
    expect((areas.headerTitle as () => null)()).toBeNull()
  })

  test("the account header button opens the settings", async () => {
    await mount(<AppNavigation />)
    const options = (mockScreens.accountHome.options as OptionsFn)({
      navigation: mockNavigation,
    })
    expect(options.title).toBe(fr.navigation.headers.account)
    // The page draws its own large title (OA-69): the header keeps only its buttons.
    expect((options.headerTitle as () => null)()).toBeNull()
    const button = await mount((options.headerRight as () => React.ReactElement)())
    const pressable = button.root.findByType("Pressable" as unknown as React.ElementType)
    expect(pressable.props.accessibilityLabel).toBe(fr.navigation.a11y.openSettings)
    pressable.props.onPress()
    expect(mockNavigation.navigate).toHaveBeenCalledWith("settings")
  })

  test("the shared stack options follow the platform at load time", () => {
    for (const os of ["ios", "android"] as const) {
      mockPlatform.OS = os
      jest.isolateModules(() => {
        const { createBaseStackScreenOptions } = jest.requireActual("./stacks/stack-options") as {
          createBaseStackScreenOptions: (theme: unknown) => Options
        }
        const options = createBaseStackScreenOptions(defaultTheme)
        expect(options.contentStyle).toEqual({ backgroundColor: defaultTheme.colors.canvas })
        // Android draws its own title colour; iOS keeps the system's.
        expect("headerTintColor" in options).toBe(os === "android")
      })
    }
  })

  test("every stack screen has the transparent halo header by default, on both platforms (D-19)", () => {
    for (const os of ["ios", "android"] as const) {
      mockPlatform.OS = os
      jest.isolateModules(() => {
        const { createBaseStackScreenOptions, backdropHeader } = jest.requireActual(
          "./stacks/stack-options",
        ) as {
          createBaseStackScreenOptions: (theme: unknown) => Options
          backdropHeader: Options
        }
        expect(backdropHeader).toEqual({
          headerTransparent: true,
          headerBlurEffect: "none",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "transparent" },
        })
        expect(createBaseStackScreenOptions(defaultTheme)).toEqual(
          expect.objectContaining(backdropHeader),
        )
      })
    }
  })
})
