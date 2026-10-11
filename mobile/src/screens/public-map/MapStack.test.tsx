import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

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

const mockTheme = { scheme: "light" as "light" | "dark" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  return {
    ...actual,
    useBrandTheme: () =>
      mockTheme.scheme === "dark" ? actual.buildTheme("dark") : actual.defaultTheme,
  }
})

import { Camera, type CameraRef, type ViewStateChangeEvent } from "@maplibre/maplibre-react-native"
import type { NativeSyntheticEvent } from "react-native"
import type { SharedValue } from "react-native-reanimated"
import { cameraMocks } from "../../../test/maplibre.mock"
import { brandMapTokens } from "../../app/brand-tokens"
import { boundsFromRegion } from "../../map/maplibre/regions"
import { MapStack, useMapSync } from "./MapStack"

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
  cameraMocks.jumpTo.mockClear()
  mockTheme.scheme = "light"
})

// The Reanimated mock's shared values are plain `{ value }` records.
const shared = (value: number) => ({ value }) as unknown as SharedValue<number>

function LayerChild() {
  return React.createElement("LayerChild")
}

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

const REGION = { latitude: 48.4, longitude: 2.69, latitudeDelta: 0.02, longitudeDelta: 0.03 }

function changeEvent(over: Partial<ViewStateChangeEvent> = {}) {
  return {
    nativeEvent: { center: [2.69, 48.4], zoom: 14.2, bearing: 30, pitch: 10, ...over },
  } as unknown as NativeSyntheticEvent<ViewStateChangeEvent>
}

describe("useMapSync", () => {
  function Probe({ onReady }: { onReady: (sync: ReturnType<typeof useMapSync>) => void }) {
    const sync = useMapSync()
    onReady(sync)
    return null
  }

  function mountProbe() {
    let latest!: ReturnType<typeof useMapSync>
    act(() => {
      renderer.create(
        <Probe
          onReady={(sync) => {
            latest = sync
          }}
        />,
      )
    })
    return () => latest
  }

  test("syncFrom jumps the followed camera to the centre and zoom, north up and flat", () => {
    const sync = mountProbe()
    sync().cameraRef.current = cameraMocks as unknown as CameraRef
    sync().syncFrom(changeEvent())
    expect(cameraMocks.jumpTo).toHaveBeenCalledTimes(1)
    expect(cameraMocks.jumpTo).toHaveBeenCalledWith({
      center: [2.69, 48.4],
      zoom: 14.2,
      bearing: 0,
      pitch: 0,
    })
  })

  test("syncFrom does nothing before the camera exists", () => {
    const sync = mountProbe()
    expect(() => sync().syncFrom(changeEvent())).not.toThrow()
    expect(cameraMocks.jumpTo).not.toHaveBeenCalled()
  })

  test("the hook returns the same handles on every render", () => {
    const sync = mountProbe()
    const first = sync()
    expect(first.syncFrom).toBe(sync().syncFrom)
    expect(first.cameraRef).toBe(sync().cameraRef)
  })
})

describe("MapStack", () => {
  function mount(props: Partial<React.ComponentProps<typeof MapStack>> = {}) {
    const clipLeft = shared(120)
    const clipRight = shared(400)
    const cameraRef = React.createRef<CameraRef | null>() as React.RefObject<CameraRef | null>
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <MapStack
          mapStyle="https://tiles.example/style.json"
          clipLeft={clipLeft}
          clipRight={clipRight}
          width={400}
          initialRegion={REGION}
          cameraRef={cameraRef}
          {...props}
        >
          <LayerChild />
        </MapStack>,
      )
    })
    return { tree, clipLeft, clipRight, cameraRef }
  }

  test("renders one non-interactive texture map with the given style", () => {
    const { tree } = mount()
    const maps = tree.root.findAllByType("MapLibreMap" as never)
    expect(maps).toHaveLength(1)
    const props = maps[0].props
    expect(props.mapStyle).toBe("https://tiles.example/style.json")
    expect(props.androidView).toBe("texture")
    for (const gesture of ["dragPan", "touchZoom", "touchRotate", "touchPitch", "doubleTapZoom"]) {
      expect(props[gesture]).toBe(false)
    }
    expect(props.attribution).toBe(false)
    expect(props.logo).toBe(false)
  })

  test("androidView can be switched to surface", () => {
    const { tree } = mount({ androidView: "surface" })
    expect(tree.root.findByType("MapLibreMap" as never).props.androidView).toBe("surface")
  })

  test("clips to the strip between clipLeft and clipRight and takes no touch", () => {
    const { tree } = mount()
    const hosts = tree.root.findAll(
      (node) => (node.type as unknown) === "View" && node.props.pointerEvents === "none",
    )
    expect(hosts.length).toBeGreaterThanOrEqual(2)
    const clip = hosts.find((node) => flat(node.props.style).overflow === "hidden") as
      | ReactTestInstance
      | undefined
    expect(clip).toBeDefined()
    const clipStyle = flat(clip?.props.style)
    expect(clipStyle.left).toBe(120)
    expect(clipStyle.width).toBe(280)
    expect(clipStyle.overflow).toBe("hidden")
  })

  test("the inner map is shifted back by clipLeft at the full width", () => {
    const { tree } = mount()
    const map = tree.root.findByType("MapLibreMap" as never)
    let node: ReactTestInstance | null = map.parent
    let inner: Record<string, unknown> | null = null
    while (node && !inner) {
      const style = flat(node.props.style)
      if (style.width === 400 && style.left === -120) inner = style
      node = node.parent
    }
    expect(inner).not.toBeNull()
  })

  test("the camera takes the given ref and starts on the region, children follow it", () => {
    const { tree, cameraRef } = mount()
    const camera = tree.root.findByType("Camera" as never)
    expect(camera.props.initialViewState).toEqual({ bounds: boundsFromRegion(REGION) })
    expect(cameraRef.current).not.toBeNull()
    const map = tree.root.findByType("MapLibreMap" as never)
    const kinds = map.children.map((child) => (typeof child === "string" ? child : child.type))
    expect(kinds).toEqual([Camera, LayerChild])
  })
  const clipOf = (tree: renderer.ReactTestRenderer) =>
    tree.root.find(
      (node) => (node.type as unknown) === "View" && flat(node.props.style).overflow === "hidden",
    )
  const fire = (tree: renderer.ReactTestRenderer, event: string) =>
    act(() => {
      tree.root.findByType("MapLibreMap" as never).props[event]()
    })

  test("shows the light map ground under the map until the first style load", () => {
    const onStyleLoaded = jest.fn()
    const { tree } = mount({ onStyleLoaded })
    expect(flat(clipOf(tree).props.style).backgroundColor).toBe(
      brandMapTokens.lightBasemapBackground,
    )
    fire(tree, "onDidFinishLoadingStyle")
    expect(flat(clipOf(tree).props.style).backgroundColor).toBeUndefined()
    expect(onStyleLoaded).toHaveBeenCalledTimes(1)
  })

  test("the ground is the dark basemap ground in the dark scheme", () => {
    mockTheme.scheme = "dark"
    const { tree } = mount()
    expect(flat(clipOf(tree).props.style).backgroundColor).toBe(
      brandMapTokens.darkBasemapBackground,
    )
  })

  test("a failed load keeps the ground and reports the failure", () => {
    const onStyleFailed = jest.fn()
    const { tree } = mount({ onStyleFailed })
    fire(tree, "onDidFailLoadingMap")
    expect(onStyleFailed).toHaveBeenCalledTimes(1)
    expect(flat(clipOf(tree).props.style).backgroundColor).toBe(
      brandMapTokens.lightBasemapBackground,
    )
  })

  test("the load callbacks are optional", () => {
    const { tree } = mount()
    expect(tree.root.findByType("MapLibreMap" as never).props.onDidFailLoadingMap).toBeUndefined()
    expect(() => fire(tree, "onDidFinishLoadingStyle")).not.toThrow()
  })
})
