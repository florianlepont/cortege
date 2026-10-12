import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

jest.mock("./WipeLayer", () => ({ WipeLayer: (props: object) => mockHost("WipeLayer", props) }))
jest.mock("./SwipeSurface", () => ({
  SwipeSurface: (props: object) => mockHost("SwipeSurface", props),
}))
jest.mock("./CurtainHandle", () => ({
  CurtainHandle: (props: object) => mockHost("CurtainHandle", props),
  knobCenterY: (height: number) => Math.round(height * 0.32),
}))
jest.mock("./CurtainSideTags", () => ({
  CurtainSideTags: (props: object) => mockHost("CurtainSideTags", props),
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
    onMoveLine: jest.fn(),
    onEdgeExit: jest.fn(),
    onSideAction: jest.fn(),
    onTopControlHeight: jest.fn(),
    ...overrides,
  }
}

function makeSwipe(view: ExplorerSwipeView, extra: Partial<ExplorerSwipe> = {}): ExplorerSwipe {
  return {
    mapCanvasProps: {},
    layersView: view,
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
        {...options.props}
      />,
    )
  })
  return { tree, swipe }
}

const named = (tree: renderer.ReactTestRenderer, type: string): ReactTestInstance[] =>
  tree.root.findAll((node) => (node.type as unknown) === type)

describe("nothing active", () => {
  test("renders nothing", () => {
    const { tree } = render(makeView())
    expect(tree.toJSON()).toBeNull()
  })
})

describe("the stacked maps", () => {
  test("the second and third map keep stable keys and take their layer, strip and sizes", () => {
    const { tree, swipe } = render(
      makeView({
        comparing: true,
        leftLayer: "map",
        rightLayer: "photos-1950",
        second: stacked("photos-1950"),
        third: stacked("etat-major"),
      }),
    )
    const maps = named(tree, "WipeLayer")
    expect(maps.map((map) => map.props.layer)).toEqual(["photos-1950", "etat-major"])
    for (const map of maps) {
      expect(map.props).toMatchObject({
        clipLeft,
        clipRight,
        width: 400,
        initialRegion: REGION,
        styleRefreshKey: 2,
        styleRetryKey: 3,
      })
    }
    // Only the second map reports its style loading (a side cover waits for it).
    maps[0].props.onStyleLoaded()
    expect(swipe.onSecondStyleLoaded).toHaveBeenCalledTimes(1)
    expect(maps[1].props.onStyleLoaded).toBeUndefined()
  })

  test("the keys are the second-map and third-map ones, so a wipe becomes the curtain in place", () => {
    const { tree } = render(
      makeView({ second: stacked("satellite"), third: stacked("etat-major"), comparing: true }),
    )
    // `key` lives on the fibre of the mocked component, not in its props.
    const keys = tree.root
      .findAll((node) => typeof node.type === "function" && "clipLeft" in node.props)
      .map((node) => (node as unknown as { _fiber: { key: string } })._fiber.key)
    expect(keys).toEqual(["second-map", "third-map"])
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
      top: 58,
      layer: "satellite",
      comparing: false,
      hintText: "Lâchez pour revenir",
      fingerDown: true,
      introHintVisible: false,
      compareAvailable: true,
      onDone: view.controller.done,
      onNext: view.controller.next,
      onPrevious: view.controller.previous,
      onCompareNext: view.controller.compareNext,
      onHeight: view.onTopControlHeight,
    })
    expect(overlay.isAvailable("map")).toBe(true)
    expect(named(tree, "CurtainHandle")).toHaveLength(0)
    expect(named(tree, "QuitComparePill")).toHaveLength(0)
  })

  test("the compare zone's hint reaches the overlay unchanged", () => {
    const view = makeView({ swipeMode: true })
    Object.assign(view.controller, { hintText: fr.mapLayers.basemap.hintRelease })
    const { tree } = render(view)
    expect(named(tree, "BasemapSwipeOverlay")[0].props.hintText).toBe("Lâchez pour comparer")
  })

  test("the surface is under the handle and the stack is over it", () => {
    const { tree } = render(
      makeView({
        swipeMode: true,
        comparing: true,
        leftLayer: "map",
        rightLayer: "satellite",
        second: stacked("satellite"),
      }),
    )
    const order = (tree.toJSON() as { type: string }[]).map((child) => child.type)
    expect(order).toEqual([
      "WipeLayer",
      "SwipeSurface",
      "CurtainHandle",
      "CurtainSideTags",
      "BasemapSwipeOverlay",
    ])
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

  test("the line and its tags name both sides and follow the same line", () => {
    const view = comparing()
    const { tree, swipe } = render(view)
    const handle = named(tree, "CurtainHandle")[0].props
    expect(handle).toMatchObject({
      lineX,
      width: 400,
      height: 800,
      lineTop: 58,
      leftName: "Plan",
      rightName: "Photos 1950",
      onMoveLine: view.onMoveLine,
      onEdgeExit: view.onEdgeExit,
      onSideAction: view.onSideAction,
      onQuit: swipe.quit,
    })
    const tags = named(tree, "CurtainSideTags")[0].props
    expect(tags).toMatchObject({
      lineX,
      width: 400,
      knobTop: 256,
      leftName: "Plan",
      rightName: "Photos 1950",
      swipeMode: false,
      leftUnavailable: false,
      rightUnavailable: false,
    })
  })

  test("a side whose layer is not downloaded is told offline", () => {
    const { tree } = render(comparing(), { layers: makeLayers({ available: false }) })
    expect(named(tree, "CurtainSideTags")[0].props).toMatchObject({
      leftUnavailable: true,
      rightUnavailable: true,
    })
  })

  test("with the swipe mode on the tags wear their chevrons and there is no indicator, only Terminé", () => {
    const { tree } = render(comparing({ swipeMode: true }))
    expect(named(tree, "CurtainSideTags")[0].props.swipeMode).toBe(true)
    expect(named(tree, "BasemapSwipeOverlay")[0].props.comparing).toBe(true)
  })

  test("the quit pill shows only when the hook says so, level with the capsule", () => {
    const hidden = render(comparing())
    expect(named(hidden.tree, "QuitComparePill")).toHaveLength(0)
    const shown = render(comparing(), { swipe: { quitPillVisible: true } })
    const pill = named(shown.tree, "QuitComparePill")[0].props
    expect(pill).toMatchObject({ top: 58, onQuit: shown.swipe.quit })
  })

  test("a comparison without both layers draws no line", () => {
    const { tree } = render(makeView({ comparing: true }))
    expect(named(tree, "CurtainHandle")).toHaveLength(0)
  })
})
