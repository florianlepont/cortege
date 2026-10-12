import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: { position: "absolute" } },
  }
})

jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  return { ...actual, useBrandTheme: () => actual.defaultTheme }
})

const mockUseMapStyle = jest.fn((layer: string, _refresh: number, _retry: number) => ({
  mapStyle: `style-of-${layer}`,
  cadastreInStyle: layer === "map",
  cadastreOpacity: layer === "photos-1950" ? 0.7 : 0.9,
}))
jest.mock("../../hooks/useMapStyle", () => ({
  useMapStyle: (layer: string, refresh: number, retry: number) =>
    mockUseMapStyle(layer, refresh, retry),
}))

import type { CameraRef } from "@maplibre/maplibre-react-native"
import type { SharedValue } from "react-native-reanimated"
import type { BaseLayerKey } from "../../map/layers"
import { STYLE_SWAP_GAP_MS } from "./MapStack"
import { WipeLayer, type WipeLayerProps } from "./WipeLayer"

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
  jest.useFakeTimers()
  mockUseMapStyle.mockClear()
})

const shared = (value: number) => ({ value }) as unknown as SharedValue<number>
const REGION = { latitude: 48.4, longitude: 2.69, latitudeDelta: 0.02, longitudeDelta: 0.03 }

function Content({ label }: { label: string }) {
  return React.createElement("Content", { label })
}

function layerElement(layer: BaseLayerKey, over: Partial<WipeLayerProps> = {}) {
  const cameraRef = React.createRef<CameraRef | null>() as React.RefObject<CameraRef | null>
  return (
    <WipeLayer
      key="second-map"
      layer={layer}
      clipLeft={shared(200)}
      clipRight={shared(400)}
      width={400}
      initialRegion={REGION}
      cameraRef={cameraRef}
      content={({ cadastreInStyle, cadastreOpacity }) => (
        <Content label={`${layer}|${cadastreInStyle}|${cadastreOpacity}`} />
      )}
      {...over}
    />
  )
}

function mount(layer: BaseLayerKey, over: Partial<WipeLayerProps> = {}) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(layerElement(layer, over))
  })
  return tree
}

describe("WipeLayer", () => {
  test("draws one stacked map with the style the hook returns for the layer", () => {
    const tree = mount("photos-1950")
    expect(mockUseMapStyle).toHaveBeenCalledWith("photos-1950", 0, 0)
    const maps = tree.root.findAllByType("MapLibreMap" as never)
    expect(maps).toHaveLength(1)
    expect(maps[0].props.mapStyle).toBe("style-of-photos-1950")
  })

  test("passes the refresh and retry keys to the style hook", () => {
    mount("satellite", { styleRefreshKey: 3, styleRetryKey: 2 })
    expect(mockUseMapStyle).toHaveBeenCalledWith("satellite", 3, 2)
  })

  test("renders the shared content inside the map with the style's cadastre facts", () => {
    const tree = mount("photos-1950")
    const content = tree.root.findByType("Content" as never)
    expect(content.props.label).toBe("photos-1950|false|0.7")
    const map = tree.root.findByType("MapLibreMap" as never)
    expect(map.findAllByType("Content" as never)).toHaveLength(1)
  })

  test("forwards the load events of the map", () => {
    const onStyleLoaded = jest.fn()
    const onStyleFailed = jest.fn()
    const tree = mount("map", { onStyleLoaded, onStyleFailed })
    const map = tree.root.findByType("MapLibreMap" as never)
    act(() => map.props.onDidFinishLoadingStyle())
    act(() => map.props.onDidFailLoadingMap())
    expect(onStyleLoaded).toHaveBeenCalledTimes(1)
    expect(onStyleFailed).toHaveBeenCalledTimes(1)
  })

  test("another layer under the same key keeps the one map instance and swaps its style", () => {
    const tree = mount("satellite")
    const before = tree.root.findByType("MapLibreMap" as never)
    expect(before.props.mapStyle).toBe("style-of-satellite")
    act(() => {
      tree.update(layerElement("photos-1950"))
    })
    // The native style follows once the map has been hidden (MapStack.test.tsx).
    act(() => {
      jest.advanceTimersByTime(STYLE_SWAP_GAP_MS)
    })
    const after = tree.root.findByType("MapLibreMap" as never)
    expect(after).toBe(before)
    expect(after.props.mapStyle).toBe("style-of-photos-1950")
    expect(tree.root.findAllByType("MapLibreMap" as never)).toHaveLength(1)
  })

  test("the clip strip reaches the map wrapper", () => {
    const tree = mount("satellite", { clipLeft: shared(120), clipRight: shared(400) })
    const clip = tree.root.find(
      (node) =>
        (node.type as unknown) === "View" &&
        [node.props.style].flat(3).some((style: { overflow?: string }) => style?.overflow),
    )
    const style = Object.assign({}, ...[clip.props.style].flat(3).filter(Boolean))
    expect(style.left).toBe(120)
    // Not revealed before its style is loaded and rendered (MapStack.test.tsx covers the reveal).
    expect(style.width).toBe(0)
  })
})
