import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

jest.mock("./WipeLayer", () => ({ WipeLayer: (props: object) => mockHost("WipeLayer", props) }))
jest.mock("./ImmersiveWindow", () => ({
  ImmersiveWindow: ({ children, ...props }: { children?: React.ReactNode }) =>
    (require("react") as typeof import("react")).createElement("ImmersiveWindow", props, children),
}))
jest.mock("./SwipeSurface", () => ({
  SwipeSurface: (props: object) => mockHost("SwipeSurface", props),
}))
jest.mock("./CompareGrabber", () => ({
  CompareGrabber: (props: object) => mockHost("CompareGrabber", props),
  grabberCenterY: (height: number) => Math.round(height * 0.32),
}))
jest.mock("./CompareLine", () => ({
  CompareLine: (props: object) => mockHost("CompareLine", props),
}))
jest.mock("./CompareSideTag", () => ({
  CompareSideTag: (props: object) => mockHost("CompareSideTag", props),
}))
jest.mock("./BasemapSwipeOverlay", () => ({
  BasemapSwipeOverlay: (props: object) => mockHost("BasemapSwipeOverlay", props),
}))
jest.mock("./QuitComparePill", () => ({
  QuitComparePill: (props: object) => mockHost("QuitComparePill", props),
}))
const mockShownParcels = jest.fn(
  (parcels: unknown[], _renderable: boolean, _studied: boolean) => parcels,
)
jest.mock("./MapContentLayers", () => ({
  MapContentLayers: (props: object) => mockHost("MapContentLayers", props),
  shownParcelsFor: (...args: [unknown[], boolean, boolean]) => mockShownParcels(...args),
}))

function mockHost(name: string, props: object) {
  return (require("react") as typeof import("react")).createElement(name, props)
}

import type { SharedValue } from "react-native-reanimated"
import type { PublicParcelStatusItem } from "../../app/types"
import { fr } from "../../i18n"
import {
  ExplorerSwipeLayers,
  type ExplorerSwipeLayersProps,
  type StackedContentProps,
} from "./ExplorerSwipeLayers"
import type { ExplorerSwipe, ExplorerSwipeView, StackedMapView } from "./useExplorerSwipe"
import type { ExplorerLayers } from "./useExplorerLayers"

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
  mockShownParcels.mockClear()
})

const REGION = { latitude: 48.4, longitude: 2.7, latitudeDelta: 0.02, longitudeDelta: 0.01 }
const shared = (value: number) => ({ value }) as unknown as SharedValue<number>
const clipLeft = shared(0)
const clipRight = shared(400)
const lineX = shared(220)

function stacked(layer: StackedMapView["layer"]): StackedMapView {
  return { layer, clipLeft, clipRight, cameraRef: { current: null } }
}

function makeView(overrides: Partial<ExplorerSwipeView> = {}): ExplorerSwipeView {
  return {
    width: 400,
    height: 800,
    initialRegion: REGION,
    second: null,
    third: null,
    swipeMode: false,
    comparing: false,
    controller: {
      gesture: { gesture: true },
      hintText: null,
      fingerDown: false,
      indicatorLayer: "map",
      introHintVisible: false,
      compareAvailable: true,
      next: jest.fn(),
      previous: jest.fn(),
      compareNext: jest.fn(),
      done: jest.fn(),
    } as unknown as ExplorerSwipeView["controller"],
    lineX,
    leftLayer: null,
    rightLayer: null,
    onExitZone: jest.fn(),
    quitHint: null,
    onEdgeExit: jest.fn(),
    lineDragging: false,
    onLineDragging: jest.fn(),
    canStep: jest.fn(() => true),
    onStep: jest.fn(),
    ...overrides,
  }
}

function makeSwipe(view: ExplorerSwipeView, extra: Partial<ExplorerSwipe> = {}): ExplorerSwipe {
  return {
    mapCanvasProps: {},
    layersView: view,
    immersive: {
      window: { value: 0 } as ExplorerSwipe["immersive"]["window"],
      buttons: { value: 1 } as ExplorerSwipe["immersive"]["buttons"],
      applied: true,
      buttonsHidden: view.swipeMode,
    },
    quitPillVisible: false,
    skippedVisible: false,
    noticesTop: 58,
    onBaseStyleLoaded: jest.fn(),
    onSecondStyleLoaded: jest.fn(),
    onPanelOpen: jest.fn(),
    toggleSwipe: jest.fn(),
    quit: jest.fn(),
    ...extra,
  }
}

const styleFailed = jest.fn()
const surveyParcelIds = new Set(["AB1234"])

function makeLayers(
  overrides: { overlay?: boolean; parcels?: "all" | "ibp" | "none"; available?: boolean } = {},
): ExplorerLayers {
  return {
    surveyParcelIds,
    isAvailable: () => overrides.available ?? true,
    layers: {
      state: { overlay: overrides.overlay ?? false, parcels: overrides.parcels ?? "all" },
      actions: { styleFailed },
    },
  } as unknown as ExplorerLayers
}

const parcel = (id: string): PublicParcelStatusItem => ({
  parcel_id: id,
  study_status: "studied",
  latest_submitted_survey_id: null,
  latest_observation_year: null,
  latest_ibp_total: null,
})

const contentProps: StackedContentProps = {
  parcelStatuses: [parcel("P1")],
  parcelLayerRenderable: true,
  studiedParcelsRenderable: true,
  selectedParcelIds: ["P1"],
  styleRetryKey: 3,
  styleRefreshKey: 2,
}

function render(
  view: ExplorerSwipeView,
  options: {
    swipe?: Partial<ExplorerSwipe>
    layers?: ExplorerLayers
    props?: Partial<ExplorerSwipeLayersProps>
  } = {},
) {
  const swipe = makeSwipe(view, options.swipe)
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ExplorerSwipeLayers
        swipe={swipe}
        layers={options.layers ?? makeLayers()}
        contentProps={contentProps}
        capsuleTop={58}
        infoBottom={103}
        {...options.props}
      />,
    )
  })
  return { tree, swipe }
}

const named = (tree: renderer.ReactTestRenderer, type: string): ReactTestInstance[] =>
  tree.root.findAll((node) => (node.type as unknown) === type)

describe("nothing active", () => {
  test("renders only the empty window", () => {
    const { tree } = render(makeView())
    expect(tree.toJSON()).toEqual({
      type: "ImmersiveWindow",
      props: expect.any(Object),
      children: null,
    })
  })
})

describe("the receding window (swipe mode only)", () => {
  const inside = (tree: renderer.ReactTestRenderer, type: string) =>
    named(tree, "ImmersiveWindow")[0].findAll((node) => (node.type as unknown) === type)

  test("it gets the immersive progress and the platform rule", () => {
    const { tree, swipe } = render(makeView())
    expect(named(tree, "ImmersiveWindow")[0].props).toMatchObject({
      progress: swipe.immersive.window,
      applied: true,
    })
    const { tree: off } = render(makeView(), {
      swipe: {
        immersive: { window: shared(0), buttons: shared(1), applied: false, buttonsHidden: false },
      },
    })
    expect(named(off, "ImmersiveWindow")[0].props.applied).toBe(false)
  })

  test("the Explorer map, the stacked maps, the line, the grabber and the tags are in the window", () => {
    const { tree } = render(
      makeView({
        comparing: true,
        leftLayer: "map",
        rightLayer: "photos-1950",
        second: stacked("photos-1950"),
        third: stacked("etat-major"),
      }),
      { props: { children: React.createElement("ExplorerMap") } },
    )
    expect(inside(tree, "ExplorerMap")).toHaveLength(1)
    expect(inside(tree, "WipeLayer")).toHaveLength(2)
    expect(inside(tree, "CompareLine")).toHaveLength(1)
    expect(inside(tree, "CompareGrabber")).toHaveLength(1)
    expect(inside(tree, "CompareSideTag")).toHaveLength(2)
  })

  test("the map comes first in the window, under the stacked maps", () => {
    const { tree } = render(makeView({ second: stacked("photos-1950") }), {
      props: { children: React.createElement("ExplorerMap") },
    })
    const order = named(tree, "ImmersiveWindow")[0].children.map((child) =>
      typeof child === "string" ? child : (child.type as unknown),
    )
    expect(order).toEqual(["ExplorerMap", expect.any(Function)])
  })

  test("the gesture surface, the top stack and the quit pill stay outside the window", () => {
    const swipeMode = render(makeView({ swipeMode: true }))
    expect(named(swipeMode.tree, "SwipeSurface")).toHaveLength(1)
    expect(named(swipeMode.tree, "BasemapSwipeOverlay")).toHaveLength(1)
    expect(inside(swipeMode.tree, "SwipeSurface")).toHaveLength(0)
    expect(inside(swipeMode.tree, "BasemapSwipeOverlay")).toHaveLength(0)

    const comparing = render(
      makeView({ comparing: true, leftLayer: "map", rightLayer: "photos-1950" }),
      { swipe: { quitPillVisible: true } },
    )
    expect(named(comparing.tree, "QuitComparePill")).toHaveLength(1)
    expect(inside(comparing.tree, "QuitComparePill")).toHaveLength(0)
  })
})

describe("the stacked maps", () => {
  test("the second map keeps a stable key and takes its layer, strip and sizes", () => {
    const { tree } = render(
      makeView({
        comparing: true,
        leftLayer: "map",
        rightLayer: "photos-1950",
        second: stacked("photos-1950"),
      }),
    )
    const maps = named(tree, "WipeLayer")
    expect(maps.map((map) => map.props.layer)).toEqual(["photos-1950"])
    expect(maps[0].props).toMatchObject({
      clipLeft,
      clipRight,
      width: 400,
      initialRegion: REGION,
      styleRefreshKey: 2,
      styleRetryKey: 3,
    })
    // `key` lives on the fibre of the mocked component, not in its props. A fixed key makes a wipe
    // released in the middle become the curtain in place.
    const keys = tree.root
      .findAll((node) => typeof node.type === "function" && "clipLeft" in node.props)
      .map((node) => (node as unknown as { _fiber: { key: string } })._fiber.key)
    expect(keys).toEqual(["second-map"])
  })

  test("the second map reports its style load, so a side change cover waiting for it can go", () => {
    const { tree, swipe } = render(makeView({ second: stacked("photos-1950") }))
    named(tree, "WipeLayer")[0].props.onStyleLoaded()
    expect(swipe.onSecondStyleLoaded).toHaveBeenCalledTimes(1)
  })

  test("a side change draws the third map over the second one, under its own stable key", () => {
    const thirdClipLeft = shared(200)
    const thirdClipRight = shared(400)
    const { tree } = render(
      makeView({
        comparing: true,
        leftLayer: "map",
        rightLayer: "photos-1950",
        second: stacked("photos-1950"),
        third: {
          layer: "etat-major",
          clipLeft: thirdClipLeft,
          clipRight: thirdClipRight,
          cameraRef: { current: null },
        },
      }),
    )
    const maps = named(tree, "WipeLayer")
    expect(maps.map((map) => map.props.layer)).toEqual(["photos-1950", "etat-major"])
    expect(maps[1].props).toMatchObject({
      clipLeft: thirdClipLeft,
      clipRight: thirdClipRight,
      width: 400,
      initialRegion: REGION,
      styleRefreshKey: 2,
      styleRetryKey: 3,
    })
    // The third map has no style-load callback: the hook waits for the second or Explorer map.
    expect(maps[1].props.onStyleLoaded).toBeUndefined()
    const keys = tree.root
      .findAll((node) => typeof node.type === "function" && "clipLeft" in node.props)
      .map((node) => (node as unknown as { _fiber: { key: string } })._fiber.key)
    expect(keys).toEqual(["second-map", "third-map"])
    styleFailed.mockClear()
    maps[1].props.onStyleFailed()
    expect(styleFailed).toHaveBeenCalledWith("etat-major")
  })

  test("a map that fails to load tells the layers state which layer failed", () => {
    styleFailed.mockClear()
    const { tree } = render(makeView({ second: stacked("photos-1950") }))
    named(tree, "WipeLayer")[0].props.onStyleFailed()
    expect(styleFailed).toHaveBeenCalledWith("photos-1950")
  })

  test("what a stacked map draws is the Explorer map's content, not interactive", () => {
    const { tree } = render(makeView({ second: stacked("photos-1950") }), {
      layers: makeLayers({ overlay: true, parcels: "ibp" }),
    })
    const content = named(tree, "WipeLayer")[0].props.content as (style: {
      cadastreInStyle: boolean
      cadastreOpacity: number
    }) => React.ReactElement<Record<string, unknown>>
    const element = content({ cadastreInStyle: true, cadastreOpacity: 0.7 })
    expect(element.props).toMatchObject({
      base: "photos-1950",
      forestOverlay: true,
      parcelsMode: "ibp",
      cadastreEnabled: true,
      cadastreInStyle: true,
      cadastreOpacity: 0.7,
      parcels: contentProps.parcelStatuses,
      selectedParcelIds: ["P1"],
      surveyParcelIds,
      interactive: false,
    })
    expect(element.props.onParcelPress).toBeUndefined()
    expect(mockShownParcels).toHaveBeenCalledWith(contentProps.parcelStatuses, true, true)
  })
})

describe("the swipe mode", () => {
  test("the gesture surface and the top stack render with the controller's outputs as they are", () => {
    const view = makeView({ swipeMode: true })
    Object.assign(view.controller, {
      hintText: fr.mapLayers.basemap.hintCancel,
      fingerDown: true,
      indicatorLayer: "satellite",
    })
    const { tree } = render(view)
    expect(named(tree, "SwipeSurface")[0].props.gesture).toBe(view.controller.gesture)
    const overlay = named(tree, "BasemapSwipeOverlay")[0].props
    expect(overlay).toMatchObject({
      bottom: 103,
      layer: "satellite",
      hintText: "Lâchez pour revenir",
      fingerDown: true,
      introHintVisible: false,
      compareAvailable: true,
      onDone: view.controller.done,
      onNext: view.controller.next,
      onPrevious: view.controller.previous,
      onCompareNext: view.controller.compareNext,
    })
    expect(overlay.isAvailable("map")).toBe(true)
    expect(named(tree, "CompareGrabber")).toHaveLength(0)
    expect(named(tree, "CompareLine")).toHaveLength(0)
    expect(named(tree, "QuitComparePill")).toHaveLength(0)
  })

  test("the compare zone's hint reaches the overlay unchanged", () => {
    const view = makeView({ swipeMode: true })
    Object.assign(view.controller, { hintText: fr.mapLayers.basemap.hintRelease })
    const { tree } = render(view)
    expect(named(tree, "BasemapSwipeOverlay")[0].props.hintText).toBe("Lâchez pour comparer")
  })

  test("the surface is under the stack, over the window with the second map", () => {
    const { tree } = render(makeView({ swipeMode: true, second: stacked("satellite") }))
    const order = (tree.toJSON() as { type: string }[]).map((child) => child.type)
    expect(order).toEqual(["ImmersiveWindow", "SwipeSurface", "BasemapSwipeOverlay"])
  })
})

describe("the comparison", () => {
  const comparing = (overrides: Partial<ExplorerSwipeView> = {}) =>
    makeView({
      comparing: true,
      leftLayer: "map",
      rightLayer: "photos-1950",
      second: stacked("photos-1950"),
      ...overrides,
    })

  test("the line, the grabber and the tags name both sides and follow the same line", () => {
    const view = comparing()
    const { tree } = render(view)
    expect(named(tree, "CompareLine")[0].props).toMatchObject({ lineX, top: 58 })
    const grabber = named(tree, "CompareGrabber")[0].props
    expect(grabber).toMatchObject({
      lineX,
      width: 400,
      height: 800,
      leftName: "Plan",
      rightName: "Photos 1950",
      onExitZone: view.onExitZone,
      onEdgeExit: view.onEdgeExit,
      onDragging: view.onLineDragging,
    })
    // The grabber is the only part of the line that takes a touch: it holds no quit and no line drag.
    expect(grabber).not.toHaveProperty("onQuit")
    const [left, right] = named(tree, "CompareSideTag").map((tag) => tag.props)
    expect(left).toMatchObject({
      side: "left",
      name: "Plan",
      label: "Plan",
      era: "aujourd'hui",
      lineX,
      width: 400,
      centerY: 256,
      unavailable: false,
      canStep: true,
      disabled: false,
    })
    expect(right).toMatchObject({
      side: "right",
      name: "Photos 1950",
      label: "Photos aériennes",
      era: "1950-1965",
      lineX,
      width: 400,
      centerY: 256,
      unavailable: false,
    })
  })

  test("a tag asks the hook to step its own side", () => {
    const view = comparing()
    const { tree } = render(view)
    const [left, right] = named(tree, "CompareSideTag").map((tag) => tag.props)
    act(() => left.onStep(1))
    expect(view.onStep).toHaveBeenLastCalledWith("left", 1)
    act(() => right.onStep(-1))
    expect(view.onStep).toHaveBeenLastCalledWith("right", -1)
  })

  test("a tag with no other layer to go to is told it cannot step", () => {
    const canStep = jest.fn((side: "left" | "right") => side === "right")
    const { tree } = render(comparing({ canStep }))
    const [left, right] = named(tree, "CompareSideTag").map((tag) => tag.props)
    expect(left.canStep).toBe(false)
    expect(right.canStep).toBe(true)
    expect(canStep).toHaveBeenCalledWith("left")
    expect(canStep).toHaveBeenCalledWith("right")
  })

  test("the tags take no touch while the line is dragged", () => {
    const { tree } = render(comparing({ lineDragging: true }))
    for (const tag of named(tree, "CompareSideTag")) expect(tag.props.disabled).toBe(true)
  })

  test("a side whose layer is not downloaded is told offline", () => {
    const { tree } = render(comparing(), { layers: makeLayers({ available: false }) })
    for (const tag of named(tree, "CompareSideTag")) {
      expect(tag.props).toMatchObject({ unavailable: true })
    }
  })

  test("the quit pill shows only when the hook says so, level with the capsule", () => {
    const hidden = render(comparing())
    expect(named(hidden.tree, "QuitComparePill")).toHaveLength(0)
    const shown = render(comparing(), { swipe: { quitPillVisible: true } })
    const pill = named(shown.tree, "QuitComparePill")[0].props
    expect(pill).toMatchObject({ top: 58, onQuit: shown.swipe.quit, hint: null })
  })

  test("the exit hint reaches the quit pill while the grabber is in an exit zone", () => {
    const { tree } = render(comparing({ quitHint: "Lâchez pour quitter la comparaison" }), {
      swipe: { quitPillVisible: true },
    })
    expect(named(tree, "QuitComparePill")[0].props.hint).toBe("Lâchez pour quitter la comparaison")
  })

  test("a comparison without both layers draws no line", () => {
    const { tree } = render(makeView({ comparing: true }))
    expect(named(tree, "CompareLine")).toHaveLength(0)
    expect(named(tree, "CompareGrabber")).toHaveLength(0)
  })
})
