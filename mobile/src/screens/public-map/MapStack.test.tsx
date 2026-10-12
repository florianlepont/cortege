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
import {
  MapStack,
  REVEAL_DELAY_MS,
  STYLE_SWAP_GAP_MS,
  useMapSync,
  useViewTracker,
} from "./MapStack"

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
    const element = (over: Partial<React.ComponentProps<typeof MapStack>> = {}) => (
      <MapStack
        mapStyle="https://tiles.example/style.json"
        clipLeft={clipLeft}
        clipRight={clipRight}
        width={400}
        initialRegion={REGION}
        cameraRef={cameraRef}
        {...props}
        {...over}
      >
        <LayerChild />
      </MapStack>
    )
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(element())
    })
    let current: Partial<React.ComponentProps<typeof MapStack>> = {}
    const rerender = (over: Partial<React.ComponentProps<typeof MapStack>>) => {
      current = { ...current, ...over }
      act(() => tree.update(element(current)))
    }
    return { tree, clipLeft, clipRight, cameraRef, rerender }
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

  // The mocked shared values do not re-render by themselves: a re-render reads the new value.
  const fireOn = (h: ReturnType<typeof mount>, event: string) => {
    act(() => h.tree.root.findByType("MapLibreMap" as never).props[event]())
    h.rerender({})
  }
  const makeReady = (h: ReturnType<typeof mount>) => {
    fireOn(h, "onDidFinishLoadingStyle")
    fireOn(h, "onDidFinishRenderingMapFully")
  }
  const clipWidth = (tree: renderer.ReactTestRenderer) =>
    flat(
      tree.root.find(
        (node) => (node.type as unknown) === "View" && flat(node.props.style).overflow === "hidden",
      ).props.style,
    ).width

  test("is clipped to nothing until its style is loaded and rendered, then follows the strip", () => {
    const h = mount()
    expect(clipWidth(h.tree)).toBe(0)
    // A rendered-fully before the style load belongs to nothing: still hidden.
    fireOn(h, "onDidFinishRenderingMapFully")
    expect(clipWidth(h.tree)).toBe(0)
    fireOn(h, "onDidFinishLoadingStyle")
    expect(clipWidth(h.tree)).toBe(0)
    fireOn(h, "onDidFinishRenderingMapFully")
    expect(clipWidth(h.tree)).toBe(280)
  })

  test("a new style hides it again until that style is rendered", () => {
    const h = mount()
    makeReady(h)
    expect(clipWidth(h.tree)).toBe(280)
    h.rerender({ mapStyle: "https://example.test/other.json" })
    h.rerender({})
    expect(clipWidth(h.tree)).toBe(0)
    // A render report of the old style, while the change is pending, does not reveal it.
    fireOn(h, "onDidFinishRenderingMapFully")
    expect(clipWidth(h.tree)).toBe(0)
    act(() => {
      jest.advanceTimersByTime(STYLE_SWAP_GAP_MS)
    })
    makeReady(h)
    expect(clipWidth(h.tree)).toBe(280)
  })

  test("onReady is called each time a style becomes ready, not on later render reports", () => {
    const onReady = jest.fn()
    const h = mount({ onReady })
    makeReady(h)
    expect(onReady).toHaveBeenCalledTimes(1)
    fireOn(h, "onDidFinishRenderingMapFully")
    expect(onReady).toHaveBeenCalledTimes(1)
    h.rerender({ mapStyle: "https://example.test/other.json" })
    act(() => {
      jest.advanceTimersByTime(STYLE_SWAP_GAP_MS)
    })
    makeReady(h)
    expect(onReady).toHaveBeenCalledTimes(2)
  })

  const nativeStyle = (tree: renderer.ReactTestRenderer) =>
    tree.root.findByType("MapLibreMap" as never).props.mapStyle
  const advance = (ms: number) =>
    act(() => {
      jest.advanceTimersByTime(ms)
    })
  const OTHER = "https://example.test/other.json"
  const THIRD = "https://example.test/third.json"

  test("a new style is applied to the native map only after the clip dropped to zero", () => {
    const h = mount()
    makeReady(h)
    h.rerender({ mapStyle: OTHER })
    // The old style is still on the native map while the clip is already zero.
    expect(nativeStyle(h.tree)).toBe("https://tiles.example/style.json")
    h.rerender({})
    expect(clipWidth(h.tree)).toBe(0)
    advance(STYLE_SWAP_GAP_MS - 1)
    expect(nativeStyle(h.tree)).toBe("https://tiles.example/style.json")
    advance(1)
    expect(nativeStyle(h.tree)).toBe(OTHER)
    // The readiness events count against the applied style.
    fireOn(h, "onDidFinishRenderingMapFully")
    expect(clipWidth(h.tree)).toBe(0)
    makeReady(h)
    expect(clipWidth(h.tree)).toBe(280)
  })

  const opacityOf = (tree: renderer.ReactTestRenderer) =>
    flat(
      tree.root.find(
        (node) => (node.type as unknown) === "View" && flat(node.props.style).overflow === "hidden",
      ).props.style,
    ).opacity

  test("a fresh map is hidden by its plain style: no width, no opacity, whatever the animated clip says", () => {
    const h = mount()
    expect(opacityOf(h.tree)).toBe(0)
    const clipStyles = (
      h.tree.root.findAll(
        (node) => (node.type as unknown) === "View" && flat(node.props.style).overflow === "hidden",
      )[0].props.style as unknown[]
    ).flat(3)
    // The first entry is the static style: width 0 and opacity 0 before any animated value.
    expect(clipStyles[0]).toMatchObject({ width: 0, opacity: 0, overflow: "hidden" })
  })

  test("reveal order: the clip opens and the camera is aligned first, the opacity comes after", () => {
    const calls: string[] = []
    const h = mount({ onReady: () => calls.push(`ready:${opacityOf(h.tree)}`) })
    makeReady(h)
    expect(calls).toEqual(["ready:0"])
    expect(opacityOf(h.tree)).toBe(0)
    act(() => {
      jest.advanceTimersByTime(REVEAL_DELAY_MS - 1)
    })
    h.rerender({})
    expect(opacityOf(h.tree)).toBe(0)
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(opacityOf(h.tree)).toBe(1)
  })

  test("a style change hides it at once, and going back to the shown style shows it again", () => {
    const h = mount()
    makeReady(h)
    act(() => {
      jest.advanceTimersByTime(REVEAL_DELAY_MS)
    })
    expect(opacityOf(h.tree)).toBe(1)
    h.rerender({ mapStyle: OTHER })
    expect(opacityOf(h.tree)).toBe(0)
    h.rerender({ mapStyle: "https://tiles.example/style.json" })
    expect(opacityOf(h.tree)).toBe(1)
  })

  test("the first style of a fresh map is not delayed", () => {
    const h = mount()
    expect(nativeStyle(h.tree)).toBe("https://tiles.example/style.json")
  })

  test("rapid changes end on the last style", () => {
    const h = mount()
    makeReady(h)
    h.rerender({ mapStyle: OTHER })
    advance(STYLE_SWAP_GAP_MS - 10)
    h.rerender({ mapStyle: THIRD })
    advance(STYLE_SWAP_GAP_MS - 10)
    expect(nativeStyle(h.tree)).toBe("https://tiles.example/style.json")
    advance(10)
    expect(nativeStyle(h.tree)).toBe(THIRD)
  })

  test("going back to the applied style before the swap cancels it and shows the map again", () => {
    const h = mount()
    makeReady(h)
    h.rerender({ mapStyle: OTHER })
    h.rerender({ mapStyle: "https://tiles.example/style.json" })
    h.rerender({})
    advance(STYLE_SWAP_GAP_MS * 2)
    expect(nativeStyle(h.tree)).toBe("https://tiles.example/style.json")
    expect(clipWidth(h.tree)).toBe(280)
  })

  test("going back before the first render of the style leaves it hidden", () => {
    const h = mount()
    h.rerender({ mapStyle: OTHER })
    h.rerender({ mapStyle: "https://tiles.example/style.json" })
    h.rerender({})
    expect(clipWidth(h.tree)).toBe(0)
  })

  test("an unmount in the gap cancels the swap", () => {
    const h = mount()
    makeReady(h)
    h.rerender({ mapStyle: OTHER })
    act(() => h.tree.unmount())
    expect(() => advance(STYLE_SWAP_GAP_MS * 2)).not.toThrow()
  })

  test("clips to the strip between clipLeft and clipRight and takes no touch", () => {
    const h = mount()
    makeReady(h)
    const { tree } = h
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

describe("useViewTracker", () => {
  function Probe({ onReady }: { onReady: (v: ReturnType<typeof useViewTracker>) => void }) {
    onReady(useViewTracker())
    return null
  }
  function mountProbe() {
    let latest!: ReturnType<typeof useViewTracker>
    act(() => {
      renderer.create(<Probe onReady={(v) => (latest = v)} />)
    })
    return () => latest
  }

  test("a stacked map jumps to the last settled Explorer camera, north up and flat", () => {
    const view = mountProbe()
    const camera = { current: cameraMocks as unknown as CameraRef }
    view().alignTo(camera)
    expect(cameraMocks.jumpTo).not.toHaveBeenCalled()
    view().track(changeEvent({ center: [4.8, 45.7], zoom: 12.5, bearing: 30 }))
    view().alignTo(camera)
    expect(cameraMocks.jumpTo).toHaveBeenCalledWith({
      center: [4.8, 45.7],
      zoom: 12.5,
      bearing: 0,
      pitch: 0,
    })
  })

  test("does nothing before the camera exists", () => {
    const view = mountProbe()
    view().track(changeEvent())
    expect(() => view().alignTo({ current: null })).not.toThrow()
  })
})
