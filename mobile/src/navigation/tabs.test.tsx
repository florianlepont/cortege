/**
 * Tab tree tests (phase 01.9-25, D-08 and D-13).
 *
 * Both tab libraries are replaced by fake navigators that record the names of
 * their screens and the native navigator's props. The tests check that both
 * trees register exactly the four tabs and hide the tab bar on parcel
 * selection through the shared rule.
 */

import React from "react"
import renderer, { act } from "react-test-renderer"

const mockPlatform = { OS: "ios" as "android" | "ios" }

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

type ScreenProps = {
  name: string
  options?: unknown
  component?: React.ComponentType<Record<string, unknown>>
}

const mockTabScreens: Record<string, string[]> = {}
const mockNativeNavigatorProps: Record<string, unknown>[] = []
const mockJsSurveysOptions: unknown[] = []
const mockContainer: { onStateChange?: (state: unknown) => void } = {}

function mockCreateTabs(kind: "native" | "js") {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  const Navigator = ({ children, ...props }: { children?: React.ReactNode }) => {
    mockTabScreens[kind] = []
    if (kind === "native") mockNativeNavigatorProps.push(props)
    return ReactRef.createElement(ReactRef.Fragment, null, children)
  }
  const Screen = (props: ScreenProps) => {
    mockTabScreens[kind].push(props.name)
    if (kind === "js" && props.name === "surveys") mockJsSurveysOptions.push(props.options)
    return null
  }
  return { Navigator, Screen }
}

jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return {
    createNavigationContainerRef: () => ({ current: null, isReady: () => false }),
    useFocusEffect: () => undefined,
    NavigationContainer: ({
      children,
      onStateChange,
    }: {
      children?: React.ReactNode
      onStateChange?: (state: unknown) => void
    }) => {
      mockContainer.onStateChange = onStateChange
      return ReactRef.createElement(ReactRef.Fragment, null, children)
    },
    getFocusedRouteNameFromRoute: (route: { focused?: string }) => route.focused,
    DefaultTheme: { dark: false, colors: {} },
    DarkTheme: { dark: true, colors: {} },
  }
})
jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => mockCreateTabs("js"),
}))
jest.mock("@bottom-tabs/react-navigation", () => ({
  createNativeBottomTabNavigator: () => mockCreateTabs("native"),
}))

jest.mock("./tab-config", () => {
  const actual = jest.requireActual("./tab-config") as Record<string, unknown>
  return {
    ...actual,
    useTabListenerDeps: () => ({}),
    makeSurveysTabListeners: () => ({}),
    makePublicMapTabListeners: () => ({}),
    makeAccountTabListeners: () => ({}),
  }
})
jest.mock("./stacks/HomeStack", () => ({ HomeTabNavigator: () => null }))
jest.mock("./stacks/SurveysStack", () => ({ SurveysTabNavigator: () => null }))
jest.mock("./stacks/PublicMapStack", () => ({ PublicMapTabNavigator: () => null }))
jest.mock("./stacks/AccountStack", () => ({ AccountTabNavigator: () => null }))

import { AppNavigation } from "./AppNavigation"
import { defaultTheme } from "../app/theme"
import { buildJsTabBarStyle } from "./tab-config"

// OA-13: Compte is no longer a tab.
const THREE_TABS = ["home", "surveys", "publicMap"]

type Options = Record<string, unknown>
type OptionsFn = (args: Record<string, unknown>) => Options

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "warn").mockImplementation(() => undefined)
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

beforeEach(() => {
  mockPlatform.OS = "ios"
  for (const key of Object.keys(mockTabScreens)) delete mockTabScreens[key]
  mockNativeNavigatorProps.length = 0
  mockJsSurveysOptions.length = 0
  delete mockContainer.onStateChange
})

async function mount() {
  await act(async () => {
    renderer.create(<AppNavigation />)
  })
}

function surveysState(leaf: string) {
  return {
    index: 1,
    routes: [
      { name: "home" },
      {
        name: "surveys",
        state: { index: 1, routes: [{ name: "surveysHome" }, { name: leaf }] },
      },
      { name: "publicMap" },
      { name: "account" },
    ],
  }
}

describe("the three root tabs (D-08, OA-13)", () => {
  test("the native tree registers exactly the three tabs", async () => {
    await mount()
    expect(mockTabScreens.native).toEqual(THREE_TABS)
    expect(mockTabScreens.js).toBeUndefined()
  })

  test("the JS tree registers exactly the three tabs", async () => {
    mockPlatform.OS = "android"
    await mount()
    expect(mockTabScreens.js).toEqual(THREE_TABS)
    expect(mockTabScreens.native).toBeUndefined()
  })
})

describe("OA-28: the tab bar stays visible on parcel selection in both trees", () => {
  test("native tree: tabBarHidden stays false on every route", async () => {
    await mount()
    expect(mockNativeNavigatorProps.at(-1)?.tabBarHidden).toBe(false)

    await act(async () => {
      mockContainer.onStateChange?.(surveysState("surveyParcels"))
    })
    expect(mockNativeNavigatorProps.at(-1)?.tabBarHidden).toBe(false)

    await act(async () => {
      mockContainer.onStateChange?.({
        index: 1,
        routes: [
          { name: "home" },
          { name: "surveys", state: { index: 0, routes: [{ name: "surveysHome" }] } },
        ],
      })
    })
    expect(mockNativeNavigatorProps.at(-1)?.tabBarHidden).toBe(false)

    await act(async () => {
      mockContainer.onStateChange?.(undefined)
    })
    expect(mockNativeNavigatorProps.at(-1)?.tabBarHidden).toBe(false)
  })

  test("native tree: a state change that keeps the bar does not re-render the tabs", async () => {
    await mount()
    const renders = mockNativeNavigatorProps.length
    await act(async () => {
      mockContainer.onStateChange?.(surveysState("surveyDetail"))
      mockContainer.onStateChange?.(surveysState("surveyForm"))
    })
    expect(mockNativeNavigatorProps).toHaveLength(renders)
  })

  test("JS tree: the surveys tab bar stays on parcel selection", async () => {
    mockPlatform.OS = "android"
    await mount()
    expect(mockContainer.onStateChange).toBeUndefined()
    const options = mockJsSurveysOptions.at(-1) as OptionsFn
    expect(options({ route: { focused: "surveyParcels" } }).tabBarStyle).toEqual(
      buildJsTabBarStyle(defaultTheme),
    )
    expect(options({ route: { focused: "surveysHome" } }).tabBarStyle).toEqual(
      buildJsTabBarStyle(defaultTheme),
    )
    expect(options({ route: {} }).tabBarStyle).toEqual(buildJsTabBarStyle(defaultTheme))
  })
})
