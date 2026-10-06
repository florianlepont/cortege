import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { Alert } from "react-native"
import { fr } from "../i18n"
import type { OfflineAreaSummary } from "../storage/offline-map"
import { OfflineAreasScreen } from "./OfflineAreasScreen"

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

jest.mock("react-native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    ScrollView: mockComponent("ScrollView"),
    Pressable: mockComponent("Pressable"),
    Alert: { alert: jest.fn() },
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 44 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 68 }))
jest.mock("../ui/AppGroupedList", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return {
    AppGroupedList: ({ sections }: { sections: { rows: { key: string; content: unknown }[] }[] }) =>
      ReactRef.createElement(
        "AppGroupedList",
        { sections },
        sections.flatMap((section) =>
          section.rows.map((row) =>
            ReactRef.createElement(ReactRef.Fragment, { key: row.key }, row.content as never),
          ),
        ),
      ),
  }
})

function area(overrides: Partial<OfflineAreaSummary> = {}): OfflineAreaSummary {
  return {
    id: "a1",
    name: "Bois du Nord",
    bounds: { minLat: 0, minLng: 0, maxLat: 1, maxLng: 1 },
    minZoom: 13,
    maxZoom: 17,
    status: "ready",
    totalTiles: 10,
    downloadedTiles: 10,
    failedTiles: 0,
    estimatedBytes: 38_000_000,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  }
}

let tree: ReactTestRenderer
const texts = () =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))

afterEach(() => act(() => tree.unmount()))

describe("OfflineAreasScreen", () => {
  test("with no zone, says so and explains where to download one", () => {
    act(() => {
      tree = renderer.create(<OfflineAreasScreen areas={[]} onDeleteArea={jest.fn()} />)
    })
    expect(texts()).toContain(fr.offlineMap.areas.manage.empty)
    expect(texts()).toContain(fr.offlineMap.areas.manage.footer)
    expect(tree.root.findAllByType("AppGroupedList" as never)).toHaveLength(0)
  })

  test("lists each zone with its size and status", () => {
    act(() => {
      tree = renderer.create(
        <OfflineAreasScreen
          areas={[area(), area({ id: "a2", name: "Vallon", status: "failed" })]}
          onDeleteArea={jest.fn()}
        />,
      )
    })
    expect(texts()).toContain("Bois du Nord")
    expect(texts()).toContain(
      fr.offlineMap.areas.manage.sizeAndStatus({
        megabytes: "38.0",
        status: fr.offlineMap.areas.status.ready,
      }),
    )
    expect(texts()).toContain(
      fr.offlineMap.areas.manage.sizeAndStatus({
        megabytes: "38.0",
        status: fr.offlineMap.areas.status.failed,
      }),
    )
  })

  test("deleting a zone asks first, then calls onDeleteArea", () => {
    const onDeleteArea = jest.fn()
    act(() => {
      tree = renderer.create(<OfflineAreasScreen areas={[area()]} onDeleteArea={onDeleteArea} />)
    })
    const button = tree.root.findByProps({
      accessibilityLabel: fr.offlineMap.areas.a11y.deleteArea("Bois du Nord"),
    })
    act(() => button.props.onPress())
    expect(Alert.alert).toHaveBeenCalledWith(
      fr.offlineMap.areas.manage.confirmDeleteTitle("Bois du Nord"),
      fr.offlineMap.areas.manage.confirmDeleteMessage,
      expect.any(Array),
    )
    expect(onDeleteArea).not.toHaveBeenCalled()
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
      text: string
      onPress?: () => void
    }[]
    act(() => buttons.find((b) => b.text === fr.offlineMap.areas.manage.confirmDelete)?.onPress?.())
    expect(onDeleteArea).toHaveBeenCalledWith("a1")
  })
})
