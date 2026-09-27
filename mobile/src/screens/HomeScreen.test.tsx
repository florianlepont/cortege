/**
 * Tests for HomeScreen (BUG-08, UX audit Phase 2): pull-to-refresh reflects the real state of the
 * in-flight refresh instead of a hardcoded refreshing={false}.
 */
import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { HomeScreen } from "./HomeScreen"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    RefreshControl: mockComponent("RefreshControl"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../ui/AppSectionHeader", () => ({ AppSectionHeader: "AppSectionHeader" }))
jest.mock("../components/cards/DraftCard", () => ({ DraftCard: "DraftCard" }))
jest.mock("../components/cards/ParcelNearbyCard", () => ({ ParcelNearbyCard: "ParcelNearbyCard" }))
jest.mock("./home/SectorScoreCard", () => ({ SectorScoreCard: "SectorScoreCard" }))
jest.mock("../hooks/useNearbyParcels", () => ({ hasMixedMethodVersions: () => false }))

let tree: ReactTestRenderer

function makeProps(overrides: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  return {
    currentUser: null,
    surveys: [],
    surveyStats: { total: 0, draft: 0, submitted: 0, pending: 0, synced: 0, failed: 0, blocked: 0 },
    nearbyParcels: {
      parcels: [],
      sectorAvgScore: null,
      loading: false,
      locationDenied: false,
      error: false,
    },
    onLoadNearbyParcels: jest.fn(),
    onCreateSurvey: jest.fn(),
    onOpenSurvey: jest.fn(),
    onNavigateToExplorer: jest.fn(),
    onRefresh: jest.fn(async () => undefined),
    ...overrides,
  }
}

function mount(props: React.ComponentProps<typeof HomeScreen>) {
  act(() => {
    tree = renderer.create(<HomeScreen {...props} />)
  })
}

afterEach(() => {
  act(() => tree.unmount())
})

describe("HomeScreen", () => {
  test("refreshing reflects the in-flight state of onRefresh, not a hardcoded false", async () => {
    let resolveRefresh: () => void = () => undefined
    const onRefresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve
        }),
    )
    mount(makeProps({ onRefresh }))

    // ScrollView is mocked to a bare host component: refreshControl is a prop (a React element
    // built from RefreshControl), not a mounted child, so its own props are read off that element.
    const scroll = tree.root.find(
      (node) => (node.type as unknown) === "ScrollView",
    ) as ReactTestInstance
    const control = () => scroll.props.refreshControl as ReactTestInstance
    expect(control().props.refreshing).toBe(false)

    act(() => {
      control().props.onRefresh()
    })
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(control().props.refreshing).toBe(true)

    await act(async () => {
      resolveRefresh()
      await Promise.resolve()
    })
    expect(control().props.refreshing).toBe(false)
  })
})
