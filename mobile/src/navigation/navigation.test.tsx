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

const mockPlatform = { OS: "android" as "android" | "ios" }

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatform.OS
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
  options?: unknown
  listeners?: Record<string, (...args: unknown[]) => void>
  component?: React.ComponentType<Record<string, unknown>>
}

const mockScreens: Record<string, ScreenRecord> = {}
const mockNavigators: Record<string, Record<string, unknown>[]> = {}
const mockNavigation = { navigate: jest.fn(), setOptions: jest.fn() }

function mockCreateFakeNavigator(kind: string) {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  const Navigator = ({ children, ...props }: { children?: React.ReactNode }) => {
    ;(mockNavigators[kind] ??= []).push(props)
    return ReactRef.createElement(ReactRef.Fragment, null, children)
  }
  const Screen = (props: ScreenRecord) => {
    mockScreens[props.name] = props
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

  test("a screen that draws its own title hides the native one on iOS, so a title is never doubled (OA-21)", async () => {
    mockPlatform.OS = "ios"
    await mount(<AppNavigation />)
    const resolve = (name: string, args: Record<string, unknown> = {}) => {
      const raw = mockScreens[name].options as Options | OptionsFn
      return typeof raw === "function" ? raw({ route: { params: {} }, ...args }) : raw
    }
    for (const name of [
      "accountHome",
      "settings",
      "offlineAreas",
      "communitySurvey",
      "surveyContext",
      "surveyScore",
      "surveyHistory",
    ]) {
      const options = resolve(name, { navigation: mockNavigation })
      expect((options.headerTitle as () => null)()).toBeNull()
      expect(options.headerTitleStyle).toEqual({ color: "transparent" })
    }
    const factor = resolve("surveyFactorDetail", { route: { params: { factor: "A" } } })
    expect((factor.headerTitle as () => null)()).toBeNull()
    expect(factor.headerTitleStyle).toEqual({ color: "transparent" })
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
    expect((mockScreens.surveyForm.options as Options).headerShown).toBe(false)
  })

  test("the JS surveys stack shows its own header; the native one shows the search header", async () => {
    await mount(<AppNavigation />)
    const jsStack = mockNavigators.stack.find(
      (props) => (props.screenOptions as Options).headerTitleAlign === "left",
    )
    expect(jsStack).toBeDefined()
    expect((mockScreens.surveysHome.options as Options).headerShown).toBe(false)

    for (const key of Object.keys(mockScreens)) delete mockScreens[key]
    mockPlatform.OS = "ios"
    await mount(<AppNavigation />)
    expect(mockScreens.surveysHome.options).toEqual(
      expect.objectContaining({
        title: fr.navigation.headers.surveys,
        headerShown: true,
        headerTransparent: false,
      }),
    )
  })

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
      expect(android.headerTransparent).toBeUndefined()
      expect(android.headerStyle).toBeDefined()
    }
  })

  test("the Accueil and Explorer stacks, which host Compte and Paramètres, have the page-colour header on iOS (OA-125)", async () => {
    mockPlatform.OS = "ios"
    await mount(<AppNavigation />)
    const withHeader = mockNavigators.stack.filter(
      (props) => (props.screenOptions as Options).headerBlurEffect === "none",
    )
    // Accueil, Mes Relevés and Explorer: every stack that can push Compte.
    expect(withHeader.length).toBeGreaterThanOrEqual(3)
    for (const props of withHeader) {
      expect((props.screenOptions as Options).headerStyle).toEqual({
        backgroundColor: expect.any(String),
      })
    }
  })

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
        expect("headerTransparent" in options).toBe(os === "ios")
      })
    }
  })
})
