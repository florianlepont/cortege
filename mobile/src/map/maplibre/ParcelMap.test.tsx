jest.mock("react-native", () => ({
  StyleSheet: { create: <T,>(styles: T): T => styles },
  View: "View",
  Platform: {
    OS: "ios",
    select: (options: Record<string, unknown>) => options.ios ?? options.default,
  },
}))

import React from "react"
import renderer, { act } from "react-test-renderer"
import { cameraMocks } from "../../../test/maplibre.mock"
import type { PublicParcelStatusItem } from "../../app/types"
import { ParcelMap, type ParcelMapHandle } from "./ParcelMap"
import { ORTHO_STYLE, PLAN_IGN_STYLE_URL } from "./styles"

const REGION = { latitude: 45, longitude: 5, latitudeDelta: 2, longitudeDelta: 4 }
const BOUNDS = [3, 44, 7, 46]

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

afterAll(() => jest.restoreAllMocks())

beforeEach(() => {
  for (const mock of Object.values(cameraMocks)) mock.mockClear()
})

function mount(props: Partial<React.ComponentProps<typeof ParcelMap>> = {}) {
  const handle = React.createRef<ParcelMapHandle>()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ParcelMap
        ref={handle}
        initialRegion={REGION}
        cadastreEnabled={false}
        parcels={[] as PublicParcelStatusItem[]}
        {...props}
      />,
    )
  })
  const map = () => tree.root.findByType("MapLibreMap" as never)
  return { tree, handle, map }
}

describe("ParcelMap", () => {
  test("starts on the initial region and draws the plan by default", () => {
    const { tree, map } = mount()
    expect(map().props.mapStyle).toBe(PLAN_IGN_STYLE_URL)
    expect(tree.root.findByType("Camera" as never).props.initialViewState).toEqual({
      bounds: BOUNDS,
    })
    expect(tree.root.findAllByType("UserLocation" as never)).toHaveLength(0)
    expect(tree.root.findAllByType("ViewAnnotation" as never)).toHaveLength(0)
  })

  test("the satellite basemap uses the orthophoto style", () => {
    expect(mount({ basemap: "satellite" }).map().props.mapStyle).toBe(ORTHO_STYLE)
  })

  test("an interactive map lets the user pan and zoom, never rotate or tilt", () => {
    const props = mount().map().props
    expect(props).toMatchObject({
      dragPan: true,
      touchZoom: true,
      doubleTapZoom: true,
      doubleTapHoldZoom: true,
      touchRotate: false,
      touchPitch: false,
    })
  })

  test("a still map takes no gesture at all", () => {
    expect(mount({ interactive: false }).map().props).toMatchObject({
      dragPan: false,
      touchZoom: false,
      doubleTapZoom: false,
      doubleTapHoldZoom: false,
    })
  })

  test("a move asked before the map has loaded waits, then happens at once", () => {
    const { handle, map } = mount()
    handle.current!.animateToRegion(REGION, 300)
    expect(cameraMocks.fitBounds).not.toHaveBeenCalled()
    act(() => map().props.onDidFinishLoadingMap())
    expect(cameraMocks.fitBounds).toHaveBeenCalledTimes(1)
    expect(cameraMocks.fitBounds).toHaveBeenCalledWith(BOUNDS, { duration: 0 })
    // The queued move is spent: loading again moves nothing.
    act(() => map().props.onDidFinishLoadingMap())
    expect(cameraMocks.fitBounds).toHaveBeenCalledTimes(1)
  })

  test("only the last move asked before loading is kept", () => {
    const { handle, map } = mount()
    handle.current!.animateToRegion({ ...REGION, latitude: 10 })
    handle.current!.animateToRegion(REGION)
    act(() => map().props.onDidFinishLoadingMap())
    expect(cameraMocks.fitBounds).toHaveBeenCalledTimes(1)
    expect(cameraMocks.fitBounds).toHaveBeenCalledWith(BOUNDS, { duration: 0 })
  })

  test("loading with nothing asked moves nothing", () => {
    const { map } = mount()
    act(() => map().props.onDidFinishLoadingMap())
    expect(cameraMocks.fitBounds).not.toHaveBeenCalled()
  })

  test("once loaded, a move animates for 420 ms unless told otherwise", () => {
    const { handle, map } = mount()
    act(() => map().props.onDidFinishLoadingMap())
    handle.current!.animateToRegion(REGION)
    expect(cameraMocks.fitBounds).toHaveBeenLastCalledWith(BOUNDS, { duration: 420 })
    handle.current!.animateToRegion(REGION, 0)
    expect(cameraMocks.fitBounds).toHaveBeenLastCalledWith(BOUNDS, { duration: 0 })
  })

  test("a settled camera reports the region", () => {
    const onRegionChange = jest.fn()
    const { map } = mount({ onRegionChange })
    act(() =>
      map().props.onRegionDidChange({
        nativeEvent: { center: [5, 45], bounds: [3, 44, 7, 46], userInteraction: true },
      }),
    )
    expect(onRegionChange).toHaveBeenCalledWith(REGION)
  })

  test("a settled camera without a listener is harmless", () => {
    const { map } = mount()
    expect(() =>
      act(() =>
        map().props.onRegionDidChange({
          nativeEvent: { center: [5, 45], bounds: [3, 44, 7, 46], userInteraction: false },
        }),
      ),
    ).not.toThrow()
  })

  test("the position dot, the cadastre and the GPS pin show when asked", () => {
    const { tree } = mount({
      showUserLocation: true,
      cadastreEnabled: true,
      marker: { latitude: 45.1, longitude: 5.2 },
    })
    expect(tree.root.findAllByType("UserLocation" as never)).toHaveLength(1)
    expect(tree.root.findAllByType("RasterSource" as never)).toHaveLength(1)
    expect(tree.root.findByType("ViewAnnotation" as never).props.lngLat).toEqual([5.2, 45.1])
  })
})
