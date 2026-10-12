import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import type { SharedValue } from "react-native-reanimated"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import type { AreaLayersEstimate } from "../../map/offline-estimate"
import { ExplorerPanelsView } from "./ExplorerPanelsView"
import type { ExplorerPanelsViewProps } from "./ExplorerPanelsView"
import type { ExplorerLayers } from "./useExplorerLayers"
import type { ExplorerPanels } from "./useExplorerPanels"

jest.mock("react-native", () => ({ StyleSheet: { absoluteFill: { position: "absolute" } } }))
jest.mock("../../ui/AppPressable", () => ({ AppPressable: "AppPressable" }))
jest.mock("./MapControls", () => ({ MapDownloadButton: "MapDownloadButton" }))
jest.mock("./OverlayBubble", () => ({ OverlayBubble: "OverlayBubble" }))
const MapControlsProbe = "MapControlsProbe" as unknown as React.ComponentType
jest.mock("./DownloadCard", () => ({ DownloadCard: "DownloadCard" }))
jest.mock("./DownloadChip", () => ({ DownloadChip: "DownloadChip" }))
jest.mock("./ImmersiveWindow", () => ({ ImmersiveButtons: "ImmersiveButtons" }))
jest.mock("./MapNoticeStack", () => ({ MapNoticeStack: "MapNoticeStack" }))
const mockAnnouncements = jest.fn()
jest.mock("./useDownloadAnnouncements", () => ({
  useDownloadAnnouncements: (status: unknown) => mockAnnouncements(status),
}))

const mockOpacity = { value: 1 } as SharedValue<number>
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

const ESTIMATE = {
  policy: "all",
  layers: [],
  totalTileCount: 10,
  estimatedBytes: 1,
  baseBytes: 1,
  extraBytes: 0,
  exceedsCap: false,
} as AreaLayersEstimate

const RUNNING: AreaDownloadStatus = {
  phase: "running",
  areaId: "a1",
  name: "Zone",
  percentage: 10,
  downloadedTiles: 1,
  totalTiles: 10,
}
const FAILED: AreaDownloadStatus = { phase: "failed", areaId: "a1", name: "Zone" }
const PARTIAL: AreaDownloadStatus = {
  phase: "done",
  areaId: "a1",
  name: "Zone",
  percentage: 100,
  downloadedTiles: 10,
  totalTiles: 10,
  failedLayers: ["etat-major", "types-foret"],
}

const mockActions = {
  toggleOverlay: jest.fn(),
  setParcels: jest.fn(),
}

function makePanels(overrides: Partial<ExplorerPanels> = {}): ExplorerPanels {
  return {
    panel: null,
    cardView: "form",
    clusterItems: null,
    areaChosen: false,
    openCard: jest.fn(),
    openCardOn: jest.fn(),
    toggleBubble: jest.fn(),
    closeBubble: jest.fn(),
    openClusterList: jest.fn(),
    closeCluster: jest.fn(),
    closePanel: jest.fn(),
    closeAll: jest.fn(),
    chooseArea: jest.fn(),
    unchooseArea: jest.fn(),
    ...overrides,
  }
}

function makeLayers(
  stateOverrides: Record<string, unknown> = {},
  overrides: Partial<ExplorerLayers> = {},
): ExplorerLayers {
  return {
    layers: {
      state: { overlay: false, parcels: "all", compare: null, ...stateOverrides },
      overlayDot: false,
      actions: mockActions,
    },
    capsuleTop: 60,
    chipShown: false,
    notices: [],
    noticesTop: 60,
    downloadButtonTop: 170,
    overlayBubbleTop: 111,
    ...overrides,
  } as unknown as ExplorerLayers
}

function makeProps(overrides: Partial<ExplorerPanelsViewProps> = {}): ExplorerPanelsViewProps {
  return {
    panels: makePanels(),
    layers: makeLayers(),
    downloadStatus: null,
    estimate: ESTIMATE,
    downloading: false,
    onDownload: jest.fn(),
    onRetry: jest.fn(),
    onClearStatus: jest.fn(),
    onRetryStyle: jest.fn(),
    onCardHeight: jest.fn(),
    downloadEnabled: true,
    forestAvailable: true,
    cardBottom: 64,
    buttons: { opacity: mockOpacity, hidden: false },
    ...overrides,
  }
}

function mount(props: ExplorerPanelsViewProps, children?: React.ReactNode) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<ExplorerPanelsView {...props}>{children}</ExplorerPanelsView>)
  })
  return tree
}

const all = (tree: renderer.ReactTestRenderer, type: string): ReactTestInstance[] =>
  tree.root.findAll((node) => (node.type as unknown) === type)
const one = (tree: renderer.ReactTestRenderer, type: string): ReactTestInstance =>
  tree.root.find((node) => (node.type as unknown) === type)

beforeEach(() => {
  mockAnnouncements.mockReset()
  mockActions.toggleOverlay.mockReset()
  mockActions.setParcels.mockReset()
})

describe("ExplorerPanelsView", () => {
  test("the download button, the children and the chip are the map buttons that fade; the rest stays", () => {
    const props = makeProps({
      panels: makePanels({ panel: "bubble" }),
      buttons: { opacity: mockOpacity, hidden: true },
    })
    const tree = mount(props, <MapControlsProbe />)
    const wrapper = one(tree, "ImmersiveButtons")
    expect(wrapper.props).toMatchObject({ opacity: mockOpacity, hidden: true })
    const inside = (type: string) =>
      wrapper.findAll((node) => (node.type as unknown) === type).length
    expect(inside("MapDownloadButton")).toBe(1)
    expect(inside("MapControlsProbe")).toBe(1)
    expect(inside("DownloadChip")).toBe(1)
    // The bubble and its backdrop, the notices column and the card are not map buttons.
    expect(inside("OverlayBubble")).toBe(0)
    expect(inside("MapNoticeStack")).toBe(0)
    expect(all(tree, "OverlayBubble")).toHaveLength(1)
    expect(all(tree, "MapNoticeStack")).toHaveLength(1)
  })

  test("the card stays outside the fading buttons", () => {
    const tree = mount(makeProps({ panels: makePanels({ panel: "card" }) }))
    const wrapper = one(tree, "ImmersiveButtons")
    expect(wrapper.findAll((node) => (node.type as unknown) === "DownloadCard")).toHaveLength(0)
    expect(all(tree, "DownloadCard")).toHaveLength(1)
    expect(wrapper.props.hidden).toBe(false)
  })

  test("at rest: the download button, the notices column and the idle chip; no bubble, card or backdrop", () => {
    const props = makeProps()
    const tree = mount(props)
    const button = one(tree, "MapDownloadButton")
    expect(button.props).toMatchObject({ top: 170 })
    expect(button.props.onPress).toBe(props.panels.openCard)
    expect(all(tree, "OverlayBubble")).toHaveLength(0)
    expect(all(tree, "DownloadCard")).toHaveLength(0)
    expect(all(tree, "AppPressable")).toHaveLength(0)
    expect(one(tree, "MapNoticeStack").props).toMatchObject({
      notices: [],
      top: 60,
      onRetry: props.onRetryStyle,
    })
    expect(one(tree, "DownloadChip").props).toMatchObject({
      status: null,
      visible: false,
      buttonTop: 170,
      onExpire: props.onClearStatus,
    })
  })

  test("the download button renders only when offline maps are on, and opens the card", () => {
    const off = mount(makeProps({ downloadEnabled: false }))
    expect(all(off, "MapDownloadButton")).toHaveLength(0)
    const props = makeProps()
    const on = mount(props)
    act(() => one(on, "MapDownloadButton").props.onPress())
    expect(props.panels.openCard).toHaveBeenCalledTimes(1)
  })

  test("the bubble carries the layers state, with a backdrop that only closes it", () => {
    const props = makeProps({
      panels: makePanels({ panel: "bubble" }),
      layers: makeLayers({ overlay: true, parcels: "withIbp", compare: { x: 1 } }),
      forestAvailable: false,
    })
    const tree = mount(props)
    const bubble = one(tree, "OverlayBubble")
    expect(bubble.props).toMatchObject({
      top: 111,
      forest: true,
      forestAvailable: false,
      parcels: "withIbp",
      comparing: true,
      onToggleForest: mockActions.toggleOverlay,
      onChangeParcels: mockActions.setParcels,
    })

    const backdrop = tree.root.find((node) => node.props.testID === "overlay-bubble-backdrop")
    expect(backdrop.props.accessibilityLabel).toBe(fr.mapLayers.overlays.closeA11y)
    act(() => backdrop.props.onPress())
    expect(props.panels.closeBubble).toHaveBeenCalledTimes(1)
    expect(props.panels.closeAll).not.toHaveBeenCalled()
    expect(props.panels.closePanel).not.toHaveBeenCalled()
    expect(mockActions.toggleOverlay).not.toHaveBeenCalled()
  })

  test("the map controls sit above the backdrop and under the bubble and the card", () => {
    // Pre-order list of the host types, so the fading wrapper's children count in place.
    const flat = (tree: renderer.ReactTestRenderer): string[] => {
      const out: string[] = []
      const walk = (node: unknown) => {
        if (node === null || typeof node !== "object") return
        if (Array.isArray(node)) return node.forEach(walk)
        const { type, children } = node as { type: string; children: unknown }
        out.push(type)
        walk(children)
      }
      walk(tree.toJSON())
      return out
    }
    const props = makeProps({
      panels: makePanels({ panel: "card" }),
    })
    const tree = mount(props, <React.Fragment>{React.createElement("MapControls")}</React.Fragment>)
    const order = flat(tree)
    expect(order.indexOf("MapDownloadButton")).toBeLessThan(order.indexOf("MapControls"))
    expect(order.indexOf("MapControls")).toBeLessThan(order.indexOf("DownloadCard"))

    const bubbleTree = mount(
      makeProps({ panels: makePanels({ panel: "bubble" }) }),
      React.createElement("MapControls"),
    )
    const bubbleOrder = flat(bubbleTree)
    expect(bubbleOrder.indexOf("AppPressable")).toBeLessThan(bubbleOrder.indexOf("MapControls"))
    expect(bubbleOrder.indexOf("MapControls")).toBeLessThan(bubbleOrder.indexOf("OverlayBubble"))
  })

  test("the card: form view, a running download disables it, its height is reported", () => {
    const props = makeProps({
      panels: makePanels({ panel: "card" }),
      downloading: true,
      downloadStatus: RUNNING,
    })
    const tree = mount(props)
    const card = one(tree, "DownloadCard")
    expect(card.props).toMatchObject({
      estimate: ESTIMATE,
      view: "form",
      failedLayers: [],
      runningElsewhere: true,
      bottom: 64,
      onHeight: props.onCardHeight,
    })
  })

  test("Télécharger starts the download, then closes the card and keeps the status", () => {
    const props = makeProps({ panels: makePanels({ panel: "card" }) })
    const tree = mount(props)
    act(() => one(tree, "DownloadCard").props.onDownload("Zone du 11/10 12:00"))
    expect(props.onDownload).toHaveBeenCalledWith("Zone du 11/10 12:00")
    expect(props.panels.closePanel).toHaveBeenCalledTimes(1)
    expect(props.panels.closeAll).not.toHaveBeenCalled()
  })

  test("the failed view retries then closes; Terminé and the close control end differently", () => {
    const props = makeProps({
      panels: makePanels({ panel: "card", cardView: "failed" }),
      downloadStatus: FAILED,
    })
    const tree = mount(props)
    const card = one(tree, "DownloadCard")
    expect(card.props.view).toBe("failed")
    act(() => card.props.onRetry())
    expect(props.onRetry).toHaveBeenCalledTimes(1)
    expect(props.panels.closePanel).toHaveBeenCalledTimes(1)

    act(() => card.props.onClose())
    expect(props.panels.closePanel).toHaveBeenCalledTimes(2)
    expect(props.panels.closeAll).not.toHaveBeenCalled()

    act(() => card.props.onDone())
    expect(props.panels.closeAll).toHaveBeenCalledTimes(1)
  })

  test("the partial view names the layers that failed", () => {
    const tree = mount(
      makeProps({
        panels: makePanels({ panel: "card", cardView: "partial" }),
        downloadStatus: PARTIAL,
      }),
    )
    expect(one(tree, "DownloadCard").props.failedLayers).toEqual(["etat-major", "types-foret"])
  })

  test("the chip gets the status and its visibility from the layers hook", () => {
    const props = makeProps({
      downloadStatus: RUNNING,
      layers: makeLayers({}, { chipShown: true }),
    })
    const tree = mount(props)
    expect(one(tree, "DownloadChip").props).toMatchObject({ status: RUNNING, visible: true })
  })

  test("a failed chip reopens the card on the failed view, a partial one on the partial view", () => {
    const failed = makeProps({
      downloadStatus: FAILED,
      layers: makeLayers({}, { chipShown: true }),
    })
    const failedTree = mount(failed)
    act(() => one(failedTree, "DownloadChip").props.onPress())
    expect(failed.panels.openCardOn).toHaveBeenCalledWith("failed")

    const partial = makeProps({
      downloadStatus: PARTIAL,
      layers: makeLayers({}, { chipShown: true }),
    })
    const partialTree = mount(partial)
    act(() => one(partialTree, "DownloadChip").props.onPress())
    expect(partial.panels.openCardOn).toHaveBeenCalledWith("partial")
  })

  test("the screen-level announcements follow the status, chip shown or not", () => {
    mount(makeProps({ downloadStatus: RUNNING }))
    expect(mockAnnouncements).toHaveBeenCalledWith(RUNNING)
  })

  test("the notices column carries the notices and the retry", () => {
    const notices = [{ id: "overzoom", kind: "overzoom", text: "t", icon: "x" }]
    const props = makeProps({
      layers: makeLayers({}, { notices: notices as never, noticesTop: 104 }),
    })
    const tree = mount(props)
    expect(one(tree, "MapNoticeStack").props).toMatchObject({ notices, top: 104 })
  })

  test("a swipe control that holds the top moves the notices below it", () => {
    const props = makeProps({ layers: makeLayers({}, { noticesTop: 104 }), noticesTop: 198 })
    expect(one(mount(props), "MapNoticeStack").props.top).toBe(198)
  })
})
