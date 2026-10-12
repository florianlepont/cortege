/**
 * The split public map screen (01.9-28, D-05, D-06, D-07; Phase 2 member-only sharing): viewport
 * loading, first-load fit, clusters (zoom or list), survey selection, tapping a studied parcel to
 * open its latest survey, locate, controls, and a role and catalogue label on every Pressable.
 */
import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { computeRegionBbox } from "../../app/map-viewport"
import type { PublicMapItem, PublicParcelStatusItem } from "../../app/types"
import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { fr } from "../../i18n"
import { PublicMapScreen } from "../PublicMapScreen"
import { downloadButtonTopOf, overlaySlotTopOf } from "./styles"
import { DEFAULT_MAP_REGION, VIEWPORT_DEBOUNCE_MS } from "./useMapViewport"

// The shared Reanimated mock hands out a fresh shared value on every render. The grabber's drag
// re-renders the screen midway (the exit hint appears), so here a shared value lives as long as its
// component, like the real hook, and the line keeps the position the drag gave it.
jest.mock("react-native-reanimated", () => {
  const ReactRef = require("react") as typeof import("react")
  const actual = jest.requireActual("react-native-reanimated")
  return {
    ...actual,
    __esModule: true,
    useSharedValue: <T,>(initial: T) => {
      const ref = ReactRef.useRef<{ value: T } | null>(null)
      if (ref.current === null) ref.current = { value: initial }
      return ref.current
    },
  }
})

const mockFetchParcelSurveyHistory = jest.fn()
jest.mock("../../api/ibp-api", () => ({
  fetchParcelSurveyHistory: (...args: unknown[]) => mockFetchParcelSurveyHistory(...args),
}))

const mockAnimateToRegion = jest.fn()
const mockJumpTo = jest.fn()
const mockAlert = jest.fn()
const mockLocation = {
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}

// The panel's own animation and gestures are tested in ExplorerSheet.test.tsx.
jest.mock("./ExplorerSheet", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    ExplorerSheet: ({ visible, children }: { visible: boolean; children?: React.ReactNode }) =>
      visible ? ReactRef.createElement("ExplorerSheet", null, children) : null,
  }
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    AppState: { addEventListener: () => ({ remove: () => undefined }) },
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
      isScreenReaderEnabled: () => Promise.resolve(false),
      addEventListener: () => ({ remove: () => undefined }),
    },
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Keyboard: { dismiss: jest.fn() },
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Switch: mockComponent("Switch"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: {}, hairlineWidth: 0.5 },
    Platform: { OS: "ios" },
    useWindowDimensions: () => ({ width: 400, height: 800 }),
  }
})

// The swipe mode's pan gestures are recorded with their handlers, so a test can drive the real
// controller (`useBasemapSwipe`) like a finger would.
type MockPan = { handlers: Record<string, (...args: unknown[]) => void> }
const mockPans: MockPan[] = []
jest.mock("react-native-gesture-handler", () => {
  const ReactRef = require("react") as typeof import("react")
  const pan = () => {
    const gesture: Record<string, unknown> & MockPan = { handlers: {} }
    mockPans.push(gesture)
    for (const name of ["runOnJS", "minDistance", "activeOffsetX", "failOffsetY"])
      gesture[name] = () => gesture
    for (const name of ["onBegin", "onUpdate", "onEnd", "onFinalize"]) {
      gesture[name] = (handler: (...args: unknown[]) => void) => {
        gesture.handlers[name] = handler
        return gesture
      }
    }
    return gesture
  }
  return {
    Gesture: { Pan: pan },
    GestureDetector: ({ gesture, children }: { gesture?: MockPan; children?: React.ReactNode }) =>
      ReactRef.createElement("GestureDetector", { gesture }, children),
  }
})

jest.mock("@maplibre/maplibre-react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const { boundsToRegion } = jest.requireActual("../../map/maplibre/regions") as {
    boundsToRegion: (bounds: number[]) => unknown
  }
  const Camera = ReactRef.forwardRef(function Camera(
    props: Record<string, unknown>,
    ref: React.Ref<unknown>,
  ) {
    ReactRef.useImperativeHandle(ref, () => ({
      fitBounds: (bounds: number[], options: { duration: number }) =>
        mockAnimateToRegion(boundsToRegion(bounds), options.duration),
      jumpTo: (...args: unknown[]) => mockJumpTo(...args),
    }))
    return ReactRef.createElement("Camera", props)
  })
  return {
    Map: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("MapLibreMap", props, children),
    Camera,
    UserLocation: (props: Record<string, unknown>) => ReactRef.createElement("UserLocation", props),
    // The label lives on the drawn child; the host copies it up so tests can find a marker by it.
    ViewAnnotation: ({
      children,
      ...props
    }: {
      children?: React.ReactElement<{ accessibilityLabel?: string }>
    }) =>
      ReactRef.createElement(
        "Marker",
        { ...props, accessibilityLabel: children?.props.accessibilityLabel },
        children,
      ),
  }
})

const mockOfflineEnabled = { value: false }
jest.mock("../../app/feature-flags", () => ({
  isOfflineMapsEnabled: () => mockOfflineEnabled.value,
}))
// The outcome of the Phase 28 device spike: both switches on, but a test can turn one off.
const mockStackMode = { wipe: "wipe", comparison: true }
jest.mock("./map-stack-mode", () => ({
  get WIPE_PRESENTATION() {
    return mockStackMode.wipe
  },
  get COMPARISON_BUILT() {
    return mockStackMode.comparison
  },
  LEFT_MAP_ANDROID_VIEW: "texture",
}))
const mockStartDownload = jest.fn()
const mockDeleteArea = jest.fn()
const mockDownloading: { areaId: string | null } = { areaId: null }
const mockDownloadStatus: { value: unknown } = { value: null }
const mockClearDownloadStatus = jest.fn()
jest.mock("../../hooks/useOfflineAreas", () => ({
  useOfflineAreas: () => ({
    areas: [],
    downloadingAreaId: mockDownloading.areaId,
    downloadStatus: mockDownloadStatus.value,
    clearDownloadStatus: mockClearDownloadStatus,
    estimateForRegion: () => ({
      policy: "all",
      layers: [],
      totalTileCount: 120,
      estimatedBytes: 84_000_000,
      baseBytes: 53_000_000,
      extraBytes: 31_000_000,
      exceedsCap: false,
    }),
    startDownload: (...args: unknown[]) => mockStartDownload(...args),
    deleteArea: (...args: unknown[]) => mockDeleteArea(...args),
    refresh: jest.fn(),
  }),
}))
jest.mock("../../ui/AppChoiceChip", () => ({ AppChoiceChip: "AppChoiceChip" }))
// The panels hook is the real one; only the options the screen hands it are recorded.
const mockPanelsOptions: Array<{ onPanelOpen: () => void }> = []
jest.mock("./useExplorerPanels", () => {
  const actual = jest.requireActual("./useExplorerPanels") as typeof import("./useExplorerPanels")
  return {
    ...actual,
    useExplorerPanels: (options: Parameters<typeof actual.useExplorerPanels>[0]) => {
      mockPanelsOptions.push(options)
      return actual.useExplorerPanels(options)
    },
  }
})
// Which layers are downloaded under the view centre is useLayerAvailability's own test; here the
// screen is told what it wants (everything, or only the Plan and the Satellite offline).
const mockAvailable: { all: boolean } = { all: true }
jest.mock("./useLayerAvailability", () => ({
  useLayerAvailability: () => ({
    isAvailable: (key: string) => mockAvailable.all || key === "map" || key === "satellite",
    areaAtCenter: false,
  }),
}))
// The glow is drawn by the navigation layer (download-edge-glow.test.tsx) and its motion is tested in
// EdgePulse.test.tsx; here only the screen's request for it is counted.
jest.mock("../../navigation/download-edge-glow", () => ({ DownloadEdgeGlow: "DownloadEdgeGlow" }))

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: () => mockLocation.requestForegroundPermissionsAsync(),
  getCurrentPositionAsync: () => mockLocation.getCurrentPositionAsync(),
  getForegroundPermissionsAsync: () => mockLocation.getForegroundPermissionsAsync(),
  getLastKnownPositionAsync: () => mockLocation.getLastKnownPositionAsync(),
  Accuracy: { Balanced: 3 },
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 50 }))
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../map/maplibre/CadastreLayer", () => ({ CadastreLayer: "CadastreLayer" }))
jest.mock("../../map/maplibre/ForestTypesLayer", () => ({ ForestTypesLayer: "ForestTypesLayer" }))
jest.mock("../../map/maplibre/ParcelPolygonsLayer", () => ({
  ParcelPolygonsLayer: "ParcelPolygonsLayer",
}))
// Outside a navigator the screen counts as focused (the hook itself is tested on its own).
jest.mock("../../ui/useScreenFocus", () => ({ useScreenFocus: () => true }))
jest.mock("../../map/maplibre/PlacePinLayer", () => ({ PlacePinLayer: "PlacePinLayer" }))
jest.mock("../../ui/AppButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppButton: ({ label, onPress }: { label: string; onPress: () => void }) =>
      ReactRef.createElement("AppButton", { label, onPress }),
  }
})
// The Explorer panels' full-width actions are glass calls to action (12.2-18).
jest.mock("../../ui/GlassButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassButton: (props: { label: string; onPress: () => void }) =>
      ReactRef.createElement("GlassButton", props),
  }
})
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))
// The panel rows' entrance is covered by PanelRowEntrance.test.tsx and useFocusEntrance.test.tsx.
jest.mock("../../ui/EntranceView", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    EntranceView: ({ index, children }: { index: number; children?: React.ReactNode }) =>
      ReactRef.createElement("EntranceView", { index }, children),
  }
})
jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})
jest.mock("../../ui/AppField", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppField: (props: { label: string; onChangeText: (value: string) => void }) =>
      ReactRef.createElement("AppField", props),
  }
})
jest.mock("../../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title, trailing }: { title: string; trailing?: React.ReactNode }) =>
      ReactRef.createElement("AppSectionHeader", { title }, trailing),
  }
})

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

function item(id: string, lat: number, lng: number, ibp = 30): PublicMapItem {
  return {
    survey_id: id,
    display_location: { lat, lng },
    survey_date: "2026-05-01",
    region_code: "ACA",
    ibp_total: ibp,
  }
}

type ScreenProps = React.ComponentProps<typeof PublicMapScreen>

function parcelStatus(
  parcelId: string,
  studyStatus: PublicParcelStatusItem["study_status"],
  latestSurveyId: string | null = null,
): PublicParcelStatusItem {
  return {
    parcel_id: parcelId,
    study_status: studyStatus,
    latest_submitted_survey_id: latestSurveyId,
    latest_observation_year: null,
    latest_ibp_total: null,
  }
}

function makeProps(overrides: Partial<ScreenProps> = {}): ScreenProps {
  return {
    apiUrl: "http://localhost:3000",
    accessToken: "access-token",
    items: [],
    parcelStatuses: [],
    loading: false,
    onLoad: jest.fn(async () => undefined),
    onLoadParcels: jest.fn(async () => undefined),
    onViewportBboxChange: jest.fn(),
    isOffline: false,
    basemap: "map",
    onChangeBasemap: jest.fn(),
    onOpenSurvey: jest.fn(),
    ...overrides,
  }
}

let tree: ReactTestRenderer

function mount(props: ScreenProps) {
  act(() => {
    tree = renderer.create(<PublicMapScreen {...props} />)
  })
}

function update(props: ScreenProps) {
  act(() => {
    tree.update(<PublicMapScreen {...props} />)
  })
}

function byLabel(label: string): ReactTestInstance {
  return tree.root.find(
    (node) => (node.type as unknown) === "Pressable" && node.props.accessibilityLabel === label,
  )
}

// A testID sits on the composite and on the host it renders: count the host only.
function byTestId(testID: string): ReactTestInstance[] {
  return tree.root.findAll((node) => typeof node.type === "string" && node.props.testID === testID)
}

const flatStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function markers(): ReactTestInstance[] {
  return tree.root.findAll((node) => (node.type as unknown) === "Marker")
}

// The offline panel lays out unseen copies of its statuses to reserve their height (12.2-19):
// what the user sees is outside that measuring layer.
function shown(node: ReactTestInstance): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.props.testID === "offline-area-measure") return false
  }
  return true
}

function texts(): string[] {
  return tree.root
    .findAll((node) => (node.type as unknown) === "Text" && shown(node))
    .map((node) => [node.props.children].flat().join(""))
}

beforeEach(() => {
  mockAnimateToRegion.mockClear()
  mockAlert.mockClear()
  mockLocation.requestForegroundPermissionsAsync.mockReset()
  mockLocation.getCurrentPositionAsync.mockReset()
  // The opening centre never prompts: by default the permission is not granted, so the view stays.
  mockLocation.getForegroundPermissionsAsync.mockReset()
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false })
  mockLocation.getLastKnownPositionAsync.mockReset()
  mockFetchParcelSurveyHistory.mockReset()
  mockFetchParcelSurveyHistory.mockResolvedValue({ parcel_id: "p1", items: [] })
})

afterEach(() => {
  act(() => tree.unmount())
})

describe("PublicMapScreen", () => {
  test("loads the first viewport by bbox and fits the first items once", () => {
    const props = makeProps()
    mount(props)
    const bbox = computeRegionBbox(DEFAULT_MAP_REGION)
    expect(props.onLoad).toHaveBeenCalledWith({ bbox })
    expect(props.onViewportBboxChange).toHaveBeenCalledWith(bbox)

    const items = [item("a", 45.7, 4.8), item("b", 48.8, 2.3)]
    update({ ...props, items })
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1)
    update({ ...props, items: [item("c", 45.7, 4.8)] })
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1)
    expect(markers()).toHaveLength(1)
  })

  test("a marker press opens the survey's page at once, with no card in between (12.2-19)", () => {
    const props = makeProps({ items: [item("s-42", 45.7, 4.8, 27)] })
    mount(props)
    const marker = () =>
      markers().find(
        (node) => node.props.accessibilityLabel === fr.publicMap.a11y.surveyMarker(27),
      ) as ReactTestInstance
    act(() => marker().props.onPress())

    expect(props.onOpenSurvey).toHaveBeenCalledTimes(1)
    expect(props.onOpenSurvey).toHaveBeenCalledWith("s-42")
    // No panel: the sheet stays closed and nothing offers a second "open" step.
    expect(tree.root.findAll((node) => (node.type as unknown) === "ExplorerSheet")).toHaveLength(0)
    expect(tree.root.findAll((node) => (node.type as unknown) === "GlassButton")).toHaveLength(0)
    // The marker of the survey just opened is drawn selected when the map is seen again.
    expect(marker().props.selected).toBe(true)
  })

  test("a double tap on a marker opens the survey once; a later tap opens it again", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(10_000)
    try {
      const props = makeProps({ items: [item("s-42", 45.7, 4.8, 27)] })
      mount(props)
      const press = () =>
        act(() =>
          markers()
            .find((node) => node.props.accessibilityLabel === fr.publicMap.a11y.surveyMarker(27))
            ?.props.onPress(),
        )
      press()
      nowSpy.mockReturnValue(10_300)
      press()
      expect(props.onOpenSurvey).toHaveBeenCalledTimes(1)
      // Back on the map a while later, a new tap opens it again.
      nowSpy.mockReturnValue(12_000)
      press()
      expect(props.onOpenSurvey).toHaveBeenCalledTimes(2)
    } finally {
      nowSpy.mockRestore()
    }
  })

  test("the author's draft marker opens it directly too (OA-59)", () => {
    const props = makeProps({ draftItems: [item("d-1", 45.7, 4.8, 15)] })
    mount(props)
    const marker = markers().find(
      (node) => node.props.accessibilityLabel === fr.publicMap.a11y.draftMarker(15),
    ) as ReactTestInstance
    act(() => marker.props.onPress())
    expect(props.onOpenSurvey).toHaveBeenCalledWith("d-1")
    expect(tree.root.findAll((node) => (node.type as unknown) === "ExplorerSheet")).toHaveLength(0)
  })

  test("an own survey from local data is a normal marker that opens directly (D-01)", () => {
    const props = makeProps({ ownItems: [item("o-1", 45.7, 4.8, 27)] })
    mount(props)
    const marker = markers().find(
      (node) => node.props.accessibilityLabel === fr.publicMap.a11y.surveyMarker(27),
    ) as ReactTestInstance
    expect(marker).toBeDefined()
    expect(
      markers().some((node) => node.props.accessibilityLabel === fr.publicMap.a11y.draftMarker(27)),
    ).toBe(false)
    act(() => marker.props.onPress())
    expect(props.onOpenSurvey).toHaveBeenCalledWith("o-1")
  })

  test("offline, own surveys are counted and only the offline badge marks the state (D-02)", () => {
    mount(
      makeProps({
        isOffline: true,
        ownItems: [item("o-1", 45.7, 4.8, 27), item("o-2", 48.8, 2.3, 31)],
      }),
    )
    expect(markers()).toHaveLength(2)
    expect(texts()).toContain(fr.offlineMap.indicator.offline)
  })

  test("the Explorer draws no survey count and shows a bare spinner while the surveys load (item 13 e)", () => {
    const props = makeProps({ items: [item("a", 45.7, 4.8), item("b", 48.8, 2.3)] })
    mount(props)
    expect(texts().filter((text) => /relev[ée]s? ici/.test(text))).toEqual([])
    expect(byTestId("map-legend-loading")).toHaveLength(0)
    update({ ...props, loading: true })
    expect(texts().filter((text) => /relev[ée]s? ici/.test(text))).toEqual([])
    expect(byTestId("map-legend-loading")).toHaveLength(1)
  })

  test("a focus request centres the map and highlights the survey's marker, no panel (OA-59)", () => {
    const focus = {
      kind: "survey" as const,
      surveyId: "s-7",
      lat: 45.7,
      lng: 4.8,
      parcelIds: ["P1"],
      nonce: 1,
    }
    const props = makeProps({ focus })
    mount(props)
    expect(mockAnimateToRegion).toHaveBeenCalled()

    // The public survey arrives with the viewport load the move triggered.
    update({ ...props, items: [item("s-7", 45.7, 4.8, 33)] })
    const marker = markers().find(
      (node) => node.props.accessibilityLabel === fr.publicMap.a11y.surveyMarker(33),
    ) as ReactTestInstance
    expect(marker.props.selected).toBe(true)
    expect(tree.root.findAll((node) => (node.type as unknown) === "ExplorerSheet")).toHaveLength(0)
    expect(props.onOpenSurvey).not.toHaveBeenCalled()
  })

  test("without a focus the map opens on the position when the permission is already granted", async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: true })
    mockLocation.getLastKnownPositionAsync.mockResolvedValue({
      coords: { latitude: 45.7, longitude: 4.8 },
    })
    mount(makeProps())
    await act(async () => undefined)
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1)
    const [region, duration] = mockAnimateToRegion.mock.calls[0]
    expect(region.latitude).toBeCloseTo(45.7, 3)
    expect(region.longitude).toBeCloseTo(4.8, 3)
    expect(duration).toBe(0)
  })

  test("a focus request keeps the position out of it", async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: true })
    mockLocation.getLastKnownPositionAsync.mockResolvedValue({
      coords: { latitude: 10, longitude: 10 },
    })
    mount(
      makeProps({ focus: { kind: "place", lat: 45.7, lng: 4.8, placeKind: "street", nonce: 1 } }),
    )
    await act(async () => undefined)
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1)
    expect(mockLocation.getForegroundPermissionsAsync).not.toHaveBeenCalled()
  })

  test("a place focus centres the map, draws the pin and opens no panel (D-05)", () => {
    const props = makeProps({
      focus: { kind: "place", lat: 45.7, lng: 4.8, placeKind: "street", nonce: 1 },
    })
    mount(props)
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1)
    const pin = tree.root.find((node) => (node.type as unknown) === "PlacePinLayer")
    expect(pin.props.pin).toEqual({ lat: 45.7, lng: 4.8 })
    const parcels = tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer")
    expect(parcels.props.selectedParcelIds).toBeUndefined()
    expect(tree.root.findAll((node) => (node.type as unknown) === "ExplorerSheet")).toHaveLength(0)
    expect(props.onOpenSurvey).not.toHaveBeenCalled()
  })

  test("a parcel focus draws that parcel selected and opens nothing by itself (D-06)", () => {
    const props = makeProps({
      focus: { kind: "parcel", parcelId: "P-42", lat: 45.7, lng: 4.8, bbox: null, nonce: 1 },
    })
    mount(props)
    const parcels = tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer")
    expect(parcels.props.selectedParcelIds).toEqual(["P-42"])
    expect(
      tree.root.find((node) => (node.type as unknown) === "PlacePinLayer").props.pin,
    ).toBeNull()
    expect(tree.root.findAll((node) => (node.type as unknown) === "ExplorerSheet")).toHaveLength(0)
    expect(props.onOpenSurvey).not.toHaveBeenCalled()
  })

  test("a reload after a focus (new props, same focus) does not move the camera again", () => {
    const focus = {
      kind: "place" as const,
      lat: 45.7,
      lng: 4.8,
      placeKind: "municipality" as const,
      nonce: 5,
    }
    const props = makeProps({ focus })
    mount(props)
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1)
    update({ ...props, loading: true, focus: { ...focus } })
    update({ ...props, loading: false, items: [item("a", 45.7, 4.8)], focus: { ...focus } })
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1)
  })

  test("tapping a studied parcel opens the page of its latest survey directly, no panel", async () => {
    const props = makeProps({
      parcelStatuses: [parcelStatus("studied-1", "studied", "s-latest")],
    })
    mount(props)
    const overlay = tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer")

    await act(async () => {
      overlay.props.onParcelPress("studied-1")
    })

    expect(props.onOpenSurvey).toHaveBeenCalledWith("s-latest")
    expect(props.onOpenSurvey).toHaveBeenCalledTimes(1)
    // The parcel history is a row of the survey page: the map opens no panel and asks nothing.
    expect(tree.root.findAll((node) => (node.type as unknown) === "ExplorerSheet")).toHaveLength(0)
    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
  })

  test("a not-studied parcel, or a studied one with no survey to open, does nothing", async () => {
    const props = makeProps({
      parcelStatuses: [
        parcelStatus("empty-1", "not_studied"),
        parcelStatus("studied-1", "studied"),
      ],
    })
    mount(props)
    const overlay = tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer")

    await act(async () => {
      overlay.props.onParcelPress("empty-1")
      overlay.props.onParcelPress("studied-1")
      overlay.props.onParcelPress("unknown-parcel")
    })

    expect(props.onOpenSurvey).not.toHaveBeenCalled()
  })

  test("tapping a parcel while offline opens the survey page too, without any map request", async () => {
    const props = makeProps({
      parcelStatuses: [parcelStatus("studied-1", "studied", "s-latest")],
      isOffline: true,
    })
    mount(props)
    const overlay = tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer")

    await act(async () => {
      overlay.props.onParcelPress("studied-1")
    })

    expect(props.onOpenSurvey).toHaveBeenCalledWith("s-latest")
    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
  })

  test("a cluster that cannot split opens the list, and a row opens the survey directly", () => {
    const props = makeProps({
      items: [item("a", 45.76, 4.84, 10), item("b", 45.76, 4.84, 20), item("c", 45.76, 4.84, 30)],
    })
    mount(props)
    const cluster = markers().find(
      (node) => node.props.accessibilityLabel === fr.publicMap.a11y.cluster(3),
    ) as ReactTestInstance
    mockAnimateToRegion.mockClear()
    act(() => cluster.props.onPress())
    expect(mockAnimateToRegion).not.toHaveBeenCalled()
    expect(texts()).toContain(fr.publicMap.clusterList.row({ ibp: 20, date: "2026-05-01" }))

    act(() =>
      byLabel(
        fr.publicMap.a11y.clusterListItem({
          ibp: 20,
          date: "2026-05-01",
          region: fr.labels.regions.ACA,
        }),
      ).props.onPress(),
    )
    expect(props.onOpenSurvey).toHaveBeenCalledTimes(1)
    expect(props.onOpenSurvey).toHaveBeenCalledWith("b")
    // The list stays under the survey page, so back returns to it.
    expect(texts()).toContain(fr.publicMap.clusterList.row({ ibp: 20, date: "2026-05-01" }))

    act(() => byLabel(fr.publicMap.a11y.closeClusterList).props.onPress())
    expect(texts()).not.toContain(fr.publicMap.clusterList.row({ ibp: 20, date: "2026-05-01" }))
  })

  test("a cluster that can split zooms the camera to its expansion zoom", () => {
    const props = makeProps({ items: [item("a", 45.7, 4.8), item("b", 45.71, 4.81)] })
    mount(props)
    mockAnimateToRegion.mockClear()
    const cluster = markers().find(
      (node) => node.props.accessibilityLabel === fr.publicMap.a11y.cluster(2),
    ) as ReactTestInstance
    act(() => cluster.props.onPress())
    expect(mockAnimateToRegion).toHaveBeenCalledTimes(1)
    const [target, duration] = mockAnimateToRegion.mock.calls[0] as [
      { longitudeDelta: number },
      number,
    ]
    expect(duration).toBe(450)
    expect(target.longitudeDelta).toBeLessThan(DEFAULT_MAP_REGION.longitudeDelta)
  })

  test("controls: the globe no longer switches the basemap, the parcels load once zoomed in, no filters", () => {
    jest.useFakeTimers()
    try {
      const props = makeProps({ items: [item("a", 45.76, 4.84)] })
      mount(props)
      act(() => byLabel(fr.mapLayers.basemap.buttonA11y).props.onPress())
      // The globe enters the swipe mode (Phase 28): the saved basemap is untouched.
      expect(props.onChangeBasemap).not.toHaveBeenCalled()

      // Zoom in to parcel level: the cadastre loads after the debounce.
      const map = tree.root.find((node) => (node.type as unknown) === "MapLibreMap")
      // MAP-04: the device's position is the native halo, not a custom marker.
      expect(tree.root.findAll((node) => (node.type as unknown) === "UserLocation")).toHaveLength(1)
      act(() =>
        map.props.onRegionDidChange({
          nativeEvent: {
            center: [4.84, 45.76],
            bounds: [4.838, 45.758, 4.842, 45.762],
            userInteraction: true,
          },
        }),
      )
      act(() => {
        jest.advanceTimersByTime(VIEWPORT_DEBOUNCE_MS)
      })
      expect(props.onLoadParcels).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })

  test("between zoom 12 and 15 only the studied parcels are drawn; from 15 every parcel is", () => {
    const parcels = [
      parcelStatus("studied-1", "studied", "s-1"),
      parcelStatus("empty-1", "not_studied"),
    ]
    mount(makeProps({ parcelStatuses: parcels }))
    const layerItems = () =>
      (
        tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer").props
          .items as PublicParcelStatusItem[]
      ).map((parcel) => parcel.parcel_id)
    const moveTo = (halfSpan: number) => {
      const map = tree.root.find((node) => (node.type as unknown) === "MapLibreMap")
      act(() =>
        map.props.onRegionDidChange({
          nativeEvent: {
            center: [4.84, 45.76],
            bounds: [4.84 - halfSpan, 45.76 - halfSpan, 4.84 + halfSpan, 45.76 + halfSpan],
            userInteraction: true,
          },
        }),
      )
    }

    // The whole country: no parcel.
    expect(layerItems()).toEqual([])
    // About zoom 13.5: the studied parcel only.
    moveTo(0.015)
    expect(layerItems()).toEqual(["studied-1"])
    // About zoom 16: every parcel of the view.
    moveTo(0.002)
    expect(layerItems()).toEqual(["studied-1", "empty-1"])
  })

  describe("download card and chip (behind the offline flag)", () => {
    afterEach(() => {
      mockOfflineEnabled.value = false
      mockDownloading.areaId = null
      mockDownloadStatus.value = null
      mockClearDownloadStatus.mockClear()
      mockStartDownload.mockReset()
      jest.useRealTimers()
    })

    const edgePulses = () =>
      tree.root.findAll((node) => (node.type as unknown) === "DownloadEdgeGlow").length
    const card = () => byTestId("download-card")
    const startButton = () =>
      tree.root.find(
        (node) => (node.type as unknown) === "AppButton" && node.props.label === "Télécharger",
      )
    const chip = () => byTestId("download-chip")
    const running = (percentage: number) => ({
      phase: "running",
      areaId: "area-1",
      name: "Zone",
      percentage,
      downloadedTiles: 5,
      totalTiles: 10,
    })

    test("download mode: the map's edge glows while the card is open before a download, and only then (12.2-19)", async () => {
      mockOfflineEnabled.value = true
      mockStartDownload.mockResolvedValue({ ok: true, areaId: "area-1" })
      const props = makeProps()
      mount(props)
      expect(edgePulses()).toBe(0)

      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      expect(edgePulses()).toBe(1)
      expect(card()).toHaveLength(1)

      // Télécharger: the download starts and the card closes at once, the glow with it.
      await act(async () => startButton().props.onPress())
      expect(mockStartDownload).toHaveBeenCalledWith(expect.anything(), expect.any(String))
      expect(card()).toHaveLength(0)
      expect(edgePulses()).toBe(0)

      // Reopened: a new choice, the glow is back; the close control ends it.
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      expect(edgePulses()).toBe(1)
      act(() => byLabel(fr.mapLayers.download.closeA11y).props.onPress())
      expect(card()).toHaveLength(0)
      expect(edgePulses()).toBe(0)

      // A download already running (started earlier) keeps the glow off.
      mockDownloading.areaId = "area-1"
      update({ ...props })
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      expect(edgePulses()).toBe(0)
    })

    test("a refused download alerts and leaves the area free to move and try again", async () => {
      mockOfflineEnabled.value = true
      mockStartDownload.mockResolvedValue({ ok: false, reason: "too_large" })
      mount(makeProps())
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      await act(async () => startButton().props.onPress())
      expect(mockAlert).toHaveBeenCalledWith(fr.offlineMap.areas.tooLarge)
    })

    test("no glow over the map outside download mode (a cluster list open)", () => {
      mockOfflineEnabled.value = true
      mount(
        makeProps({
          items: [item("a", 45.76, 4.84), item("b", 45.76, 4.84)],
          parcelStatuses: [parcelStatus("studied-1", "studied")],
        }),
      )
      const cluster = markers().find(
        (node) => node.props.accessibilityLabel === fr.publicMap.a11y.cluster(2),
      ) as ReactTestInstance
      act(() => cluster.props.onPress())
      expect(edgePulses()).toBe(0)
    })

    test("flag off: no download button", () => {
      mount(makeProps())
      expect(
        tree.root.findAll(
          (node) => node.props.accessibilityLabel === fr.offlineMap.areas.openSheet,
        ),
      ).toHaveLength(0)
    })

    test("the card shows the weight of the framed area, drops a finished outcome and lifts the locate arrow", () => {
      mockOfflineEnabled.value = true
      mount(makeProps())
      const locateBottom = () =>
        tree.root.find((node) => typeof node.type !== "string" && node.props.onLocate !== undefined)
          .props.bottom
      const restingBottom = locateBottom()

      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      // Opening the card drops a finished download's outcome.
      expect(mockClearDownloadStatus).toHaveBeenCalledTimes(1)
      expect(texts()).toContain(fr.mapLayers.download.cardTitle)
      expect(texts()).toContain(fr.mapLayers.download.estimate("84"))
      expect(texts()).toContain(fr.mapLayers.download.estimateSplit({ base: "53", extra: "31" }))

      // Once the card reports its height the arrow rises above it (tab bar 50 + 14, then 10).
      const [host] = card()
      act(() => host.props.onLayout({ nativeEvent: { layout: { height: 150 } } }))
      expect(restingBottom).toBe(60)
      expect(locateBottom()).toBe(50 + 14 + 150 + 10)
    })

    test("the chip shows the percentage and the card keeps only a disabled button while it runs", () => {
      mockOfflineEnabled.value = true
      mockDownloading.areaId = "area-1"
      mockDownloadStatus.value = running(42)
      mount(makeProps())
      expect(chip()).toHaveLength(1)
      expect(texts()).toContain(fr.mapLayers.download.chip.running(42))
      expect(card()).toHaveLength(0)

      mockDownloadStatus.value = running(60)
      update(makeProps())
      expect(texts()).toContain(fr.mapLayers.download.chip.running(60))

      // The card hides the chip while it is open; its button is disabled, with no progress.
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      expect(chip()).toHaveLength(0)
      expect(card()).toHaveLength(1)
      const start = tree.root.find((node) => (node.type as unknown) === "AppButton")
      expect(start.props.label).toBe(fr.offlineMap.areas.downloading)
    })

    test("a failed chip reopens the card on its failed view; a partial one on the partial view", () => {
      mockOfflineEnabled.value = true
      mockDownloadStatus.value = { phase: "failed", areaId: "area-1", name: "Lisière" }
      mount(makeProps())
      act(() => byLabel(fr.mapLayers.download.chip.failedA11y).props.onPress())
      expect(card()).toHaveLength(1)
      expect(texts()).toContain(fr.offlineMap.areas.failed.title)
      // Closing the card keeps the failure for the chip.
      act(() => byLabel(fr.mapLayers.download.closeA11y).props.onPress())
      expect(card()).toHaveLength(0)
      expect(mockClearDownloadStatus).not.toHaveBeenCalled()
      expect(chip()).toHaveLength(1)

      mockDownloadStatus.value = {
        phase: "done",
        areaId: "area-1",
        name: "Zone",
        percentage: 100,
        downloadedTiles: 10,
        totalTiles: 10,
        failedLayers: ["types-foret"],
      }
      update(makeProps())
      act(() => byLabel(fr.mapLayers.download.chip.partialA11y).props.onPress())
      expect(texts()).toContain(fr.offlineMap.areas.done.title)
      expect(texts()).toContain(fr.mapLayers.download.partial(fr.mapLayers.layers.forestTypes.name))
      // Terminé closes the card and clears the chip.
      const done = tree.root.find(
        (node) =>
          (node.type as unknown) === "GlassButton" &&
          node.props.label === fr.offlineMap.areas.done.close,
      )
      act(() => done.props.onPress())
      expect(card()).toHaveLength(0)
      expect(mockClearDownloadStatus).toHaveBeenCalledTimes(1)
    })

    test("retry after a failure downloads the area shown again, under the same name", async () => {
      mockOfflineEnabled.value = true
      mockStartDownload.mockResolvedValue({ ok: true, areaId: "area-2" })
      mockDownloadStatus.value = { phase: "failed", areaId: "area-1", name: "Lisière" }
      mount(makeProps())
      act(() => byLabel(fr.mapLayers.download.chip.failedA11y).props.onPress())
      const retry = tree.root.find(
        (node) =>
          (node.type as unknown) === "GlassButton" &&
          node.props.label === fr.offlineMap.areas.failed.retry,
      )
      await act(async () => retry.props.onPress())
      expect(mockStartDownload).toHaveBeenCalledWith(expect.anything(), "Lisière")
      expect(card()).toHaveLength(0)
      expect(mockAlert).not.toHaveBeenCalled()
    })

    test("a done chip is cleared after 4 s", () => {
      jest.useFakeTimers()
      mockOfflineEnabled.value = true
      mockDownloadStatus.value = {
        phase: "done",
        areaId: "area-1",
        name: "Zone",
        percentage: 100,
        downloadedTiles: 10,
        totalTiles: 10,
        failedLayers: [],
      }
      mount(makeProps())
      expect(chip()).toHaveLength(1)
      act(() => {
        jest.advanceTimersByTime(4000)
      })
      expect(mockClearDownloadStatus).toHaveBeenCalledTimes(1)
    })

    test("a failure once the card is closed shows no alert: the chip tells it", async () => {
      mockOfflineEnabled.value = true
      let finish: (outcome: { ok: boolean; reason?: string }) => void = () => undefined
      mockStartDownload.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      mount(makeProps())
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      act(() => startButton().props.onPress())
      await act(async () => finish({ ok: false, reason: "failed" }))
      expect(mockAlert).not.toHaveBeenCalled()
    })
  })

  describe("layers: the overlay button, its bubble and Parcelles (Phase 28)", () => {
    const overlayButton = () => tree.root.find((node) => node.props.testID === "map-overlay-button")
    const bubble = () => byTestId("map-overlay-bubble")
    const backdrop = () => byTestId("overlay-bubble-backdrop")
    const parcelsLayer = () =>
      tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer")
    const chipFor = (testID: string) => tree.root.find((node) => node.props.testID === testID)

    afterEach(() => {
      mockAvailable.all = true
    })

    test("the default render: the overlay button without a dot, Toutes, no overlay, today's legend", () => {
      mount(makeProps({ items: [item("a", 45.76, 4.84)] }))
      expect(overlayButton().props.accessibilityValue).toBeUndefined()
      expect(overlayButton().props.accessibilityState).toEqual({ expanded: false })
      expect(bubble()).toHaveLength(0)
      expect(parcelsLayer().props.mode).toBe("all")
      expect(texts().filter((text) => /relev[ée]s? ici/.test(text))).toEqual([])
      act(() => byLabel(fr.publicMap.a11y.showLegend).props.onPress())
      expect(texts()).toContain(fr.publicMap.legend.attribution)
      // No notice at rest.
      expect(
        tree.root.findAll((node) => String(node.props.testID ?? "").startsWith("map-notice-")),
      ).toHaveLength(0)
    })

    test("the capsule and the locate arrow stay as they were", () => {
      mockOfflineEnabled.value = true
      try {
        mount(makeProps())
        expect(byLabel(fr.mapLayers.basemap.buttonA11y)).toBeTruthy()
        expect(byLabel(fr.offlineMap.areas.openSheet)).toBeTruthy()
        expect(byLabel(fr.publicMap.a11y.locate)).toBeTruthy()
      } finally {
        mockOfflineEnabled.value = false
      }
    })

    test("the button opens the bubble; its backdrop closes it and nothing else", () => {
      mount(makeProps())
      act(() => overlayButton().props.onPress())
      expect(bubble()).toHaveLength(1)
      expect(overlayButton().props.accessibilityState).toEqual({ expanded: true })
      expect(backdrop()).toHaveLength(1)

      act(() => backdrop()[0].props.onPress())
      expect(bubble()).toHaveLength(0)
      expect(backdrop()).toHaveLength(0)
      // Nothing else changed: no overlay, no Parcelles change.
      expect(parcelsLayer().props.mode).toBe("all")
      expect(
        tree.root.find((node) => (node.type as unknown) === "ForestTypesLayer").props.enabled,
      ).toBe(false)

      act(() => overlayButton().props.onPress())
      act(() => overlayButton().props.onPress())
      expect(bubble()).toHaveLength(0)
    })

    test("the forest switch reaches the map at once and lights the button's dot", () => {
      const forestLayer = () =>
        tree.root.find((node) => (node.type as unknown) === "ForestTypesLayer")
      mount(makeProps())
      expect(forestLayer().props.enabled).toBe(false)
      act(() => overlayButton().props.onPress())
      act(() => chipFor("overlay-forest-switch").props.onValueChange(true))
      expect(forestLayer().props.enabled).toBe(true)
      expect(overlayButton().props.accessibilityValue).toEqual({
        text: fr.mapLayers.overlays.buttonActiveValue,
      })

      act(() => chipFor("overlay-forest-switch").props.onValueChange(false))
      expect(forestLayer().props.enabled).toBe(false)
      expect(overlayButton().props.accessibilityValue).toBeUndefined()
    })

    test("choosing Aucune reaches the parcels layer; Avec IBP keeps the author's parcels", () => {
      const surveyParcelIds = new Set(["P1"])
      mount(makeProps({ surveyParcelIds }))
      act(() => overlayButton().props.onPress())
      act(() => chipFor("overlay-parcels-none").props.onPress())
      expect(parcelsLayer().props.mode).toBe("none")
      expect(overlayButton().props.accessibilityValue).toEqual({
        text: fr.mapLayers.overlays.buttonActiveValue,
      })
      act(() => chipFor("overlay-parcels-ibp").props.onPress())
      expect(parcelsLayer().props.mode).toBe("withIbp")
      expect(parcelsLayer().props.surveyParcelIds).toBe(surveyParcelIds)
    })

    test("the download button closes the bubble and opens the card", () => {
      mockOfflineEnabled.value = true
      try {
        mount(makeProps())
        act(() => overlayButton().props.onPress())
        expect(bubble()).toHaveLength(1)
        act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
        expect(bubble()).toHaveLength(0)
        expect(byTestId("download-card")).toHaveLength(1)
        // And the other way round: the bubble closes the card.
        act(() => overlayButton().props.onPress())
        expect(byTestId("download-card")).toHaveLength(0)
        expect(bubble()).toHaveLength(1)
      } finally {
        mockOfflineEnabled.value = false
      }
    })

    describe("the capsule layout (owner item 13 a)", () => {
      // The safe area top is 20 and the container starts at 0: the capsule's top is 30.
      const CAPSULE_TOP = 30
      const topOf = (node: ReactTestInstance): unknown => {
        for (let current: ReactTestInstance | null = node; current; current = current.parent) {
          const top = flatStyle(current.props.style).top
          if (top !== undefined) return top
        }
        return undefined
      }
      const runningStatus = {
        phase: "running",
        areaId: "area-1",
        name: "Zone",
        percentage: 42,
        downloadedTiles: 5,
        totalTiles: 10,
      }

      afterEach(() => {
        mockOfflineEnabled.value = false
        mockDownloading.areaId = null
        mockDownloadStatus.value = null
      })

      test("the capsule holds the globe and the overlay button; the download button is absent with offline maps off", () => {
        mount(makeProps())
        expect(byTestId("map-globe-button")).toHaveLength(1)
        expect(byTestId("map-overlay-button")).toHaveLength(1)
        expect(byTestId("map-download-button")).toHaveLength(0)
      })

      test("with offline maps on, the download button sits 8 pt under the capsule and opens the card", () => {
        mockOfflineEnabled.value = true
        mount(makeProps())
        const [button] = byTestId("map-download-button")
        expect(flatStyle(button.props.style).top).toBe(downloadButtonTopOf(CAPSULE_TOP))
        // The overlay button is the capsule's second button, the bubble level with it.
        act(() => overlayButton().props.onPress())
        const [bubbleNode] = bubble()
        expect(topOf(bubbleNode)).toBe(overlaySlotTopOf(CAPSULE_TOP))
        act(() => byTestId("map-download-button")[0].props.onPress())
        expect(byTestId("download-card")).toHaveLength(1)
      })

      test("a running download: the chip is centred on the download button, hidden while the bubble is open", () => {
        mockOfflineEnabled.value = true
        mockDownloading.areaId = "area-1"
        mockDownloadStatus.value = runningStatus
        mount(makeProps())
        const position = () => byTestId("download-chip-position")
        expect(position()).toHaveLength(1)
        expect(flatStyle(position()[0].props.style).top).toBe(downloadButtonTopOf(CAPSULE_TOP) + 5)
        expect(flatStyle(position()[0].props.style).right).toBe(72)
        act(() => overlayButton().props.onPress())
        expect(position()).toHaveLength(0)
        act(() => backdrop()[0].props.onPress())
        expect(position()).toHaveLength(1)
      })

      test("the notices start below the chip's row while it shows, else at the capsule", () => {
        mockAvailable.all = false
        mockOfflineEnabled.value = true
        mockDownloading.areaId = "area-1"
        mockDownloadStatus.value = runningStatus
        mount(makeProps({ isOffline: true }))
        const notice = () => byTestId("map-notice-offline")
        act(() => overlayButton().props.onPress())
        act(() => chipFor("overlay-forest-switch").props.onValueChange(true))
        // The bubble is open: no chip, the notices start at the capsule.
        expect(notice()).toHaveLength(1)
        expect(topOf(notice()[0])).toBe(CAPSULE_TOP)
        act(() => backdrop()[0].props.onPress())
        expect(topOf(notice()[0])).toBe(downloadButtonTopOf(CAPSULE_TOP) + 25 + 20 + 8)
      })
    })

    test("with the forest overlay on, the legend lists its source line and the common attribution", () => {
      mount(makeProps())
      act(() => overlayButton().props.onPress())
      act(() => chipFor("overlay-forest-switch").props.onValueChange(true))
      act(() => byLabel(fr.publicMap.a11y.showLegend).props.onPress())
      expect(texts()).toContain(fr.mapLayers.layers.forestTypes.source)
      expect(texts()).toContain(fr.mapLayers.layers.map.source)
      expect(texts()).toContain(fr.mapLayers.sources.common)
      expect(texts()).not.toContain(fr.publicMap.legend.attribution)
    })

    test("an unavailable layer is told by a notice column pill, offline", () => {
      mockAvailable.all = false
      mount(makeProps({ isOffline: true }))
      act(() => overlayButton().props.onPress())
      act(() => chipFor("overlay-forest-switch").props.onValueChange(true))
      expect(texts()).toContain(
        fr.mapLayers.notice.offlineLayer(fr.mapLayers.layers.forestTypes.name),
      )
    })

    test("the style failing shows the error notice, and Réessayer asks the style again", () => {
      mount(makeProps())
      const map = () => tree.root.find((node) => (node.type as unknown) === "MapLibreMap")
      act(() => map().props.onDidFailLoadingMap())
      expect(texts()).toContain(fr.mapLayers.notice.loadError(fr.mapLayers.layers.map.name))
      const retry = tree.root.find((node) => node.props.testID === "map-notice-retry")
      act(() => retry.props.onPress())
      act(() => map().props.onDidFinishLoadingStyle())
      expect(texts()).not.toContain(fr.mapLayers.notice.loadError(fr.mapLayers.layers.map.name))
    })
  })

  describe("the swipe mode and the comparison (Phase 28)", () => {
    const globe = () => byLabel(fr.mapLayers.basemap.buttonA11y)
    const maps = () => tree.root.findAll((node) => (node.type as unknown) === "MapLibreMap")
    const explorerMap = () => maps()[0]
    const swipePan = () => [...mockPans].reverse().find((pan) => pan.handlers.onFinalize) as MockPan
    const drag = (fromX: number, toX: number) => {
      act(() => swipePan().handlers.onBegin({ x: fromX, y: 400 }))
      act(() => swipePan().handlers.onUpdate({ x: toX, y: 400 }))
    }
    const release = () => act(() => swipePan().handlers.onEnd({}, true))
    const present = (testID: string) => byTestId(testID).length > 0
    const chip = () => byTestId("download-chip")

    beforeEach(() => {
      jest.useFakeTimers()
      mockPans.length = 0
      mockJumpTo.mockClear()
      mockStackMode.wipe = "wipe"
      mockStackMode.comparison = true
    })

    afterEach(() => {
      jest.useRealTimers()
      mockOfflineEnabled.value = false
      mockDownloadStatus.value = null
      mockAvailable.all = true
    })

    // A drag left from the right edge to the middle, let go in the compare zone.
    function startComparison(props = makeProps()) {
      mount(props)
      act(() => globe().props.onPress())
      drag(380, 200)
      release()
      return props
    }

    test("the free map is today's Explorer: not frozen, no extra map, no swipe control", () => {
      mount(makeProps())
      const map = explorerMap()
      for (const prop of ["dragPan", "touchZoom", "doubleTapZoom", "touchRotate", "touchPitch"]) {
        expect(map.props[prop]).toBeUndefined()
      }
      expect(map.props.onRegionIsChanging).toBeUndefined()
      expect(map.props.androidView).toBe("texture")
      expect(maps()).toHaveLength(1)
      for (const id of ["swipe-surface", "swipe-indicator", "compare-line", "compare-grabber"]) {
        expect(present(id)).toBe(false)
      }
      expect(present("compare-quit")).toBe(false)
      expect(globe().props.accessibilityState).toEqual({ expanded: false, disabled: false })
      expect(globe().props.accessibilityValue).toBeUndefined()
    })

    test("the globe enters the swipe mode: surface, indicator and Terminé, the map frozen, the chip hidden", () => {
      mockOfflineEnabled.value = true
      mockDownloading.areaId = "area-1"
      mockDownloadStatus.value = {
        phase: "running",
        areaId: "area-1",
        name: "Zone",
        percentage: 42,
        downloadedTiles: 5,
        totalTiles: 10,
      }
      const props = makeProps()
      mount(props)
      expect(chip()).toHaveLength(1)
      act(() => globe().props.onPress())
      expect(props.onChangeBasemap).not.toHaveBeenCalled()
      expect(globe().props.accessibilityState).toEqual({ expanded: true, disabled: false })
      expect(present("swipe-surface")).toBe(true)
      expect(present("swipe-indicator")).toBe(true)
      for (const prop of ["dragPan", "touchZoom", "touchRotate", "touchPitch", "doubleTapZoom"]) {
        expect(explorerMap().props[prop]).toBe(false)
      }
      expect(chip()).toHaveLength(0)
      mockDownloading.areaId = null
      // The camera was put north up and flat for the stacked maps.
      expect(mockJumpTo).toHaveBeenCalledWith(expect.objectContaining({ bearing: 0, pitch: 0 }))
      // The globe again frees the map; the chip returns.
      act(() => globe().props.onPress())
      expect(present("swipe-surface")).toBe(false)
      expect(chip()).toHaveLength(1)
      expect(explorerMap().props.dragPan).toBeUndefined()
    })

    describe("the immersive effect (UI-SPEC section 3c)", () => {
      // The shared values are read when a style is built: a render shows what the effect set.
      const scale = (props: ScreenProps) => {
        update(props)
        const style = flatStyle(byTestId("immersive-window")[0].props.style)
        return (style.transform as { scaleX?: number }[]).find((t) => t.scaleX !== undefined)!
          .scaleX!
      }
      const buttons = () => byTestId("immersive-buttons")[0]
      const insideWindow = (testID: string) =>
        byTestId("immersive-window")[0].findAll((node) => node.props.testID === testID).length > 0

      afterEach(() => setReducedMotion(false))

      test("at rest the window is full size and the map buttons are shown and touchable", () => {
        const props = makeProps()
        mount(props)
        expect(scale(props)).toBe(1)
        expect(buttons().props.pointerEvents).toBe("box-none")
        expect(buttons().props.accessibilityElementsHidden).toBe(false)
        expect(insideWindow("compare-line")).toBe(false)
      })

      test("the swipe mode recedes the window and fades the buttons out of touch and of the tree", () => {
        const props = makeProps()
        mount(props)
        act(() => globe().props.onPress())
        // 800 tall; top: capsule 30 + 52 (carousel) + 16; bottom: 50 (tab bar) + 8 + 14 (hint lift) +
        // 40 (hint) + 28 (notices) + 8. 554 left: scaleY 0.6925, scaleX 0.76175, the centre 25 up.
        expect(scale(props)).toBeCloseTo(0.76175, 5)
        const moved = flatStyle(byTestId("immersive-window")[0].props.style).transform as {
          translateY?: number
        }[]
        expect(moved.find((t) => t.translateY !== undefined)!.translateY).toBeCloseTo(-25, 5)
        expect(buttons().props.pointerEvents).toBe("none")
        expect(buttons().props.accessibilityElementsHidden).toBe(true)
        expect(buttons().props.importantForAccessibility).toBe("no-hide-descendants")
        // The map is in the window; the surface and the top stack are in screen coordinates.
        expect(insideWindow("swipe-surface")).toBe(false)
        expect(insideWindow("swipe-indicator")).toBe(false)
        expect(
          byTestId("immersive-window")[0].findAll(
            (node) => (node.type as unknown) === "MapLibreMap",
          ),
        ).toHaveLength(1)
        // The capsule (with the globe), the locate arrow and the legend are in the faded layer.
        const fading = (testID: string) =>
          buttons().findAll((node) => node.props.testID === testID).length > 0
        expect(fading("map-overlay-button")).toBe(true)
      })

      test("done returns the window to full size and the buttons", () => {
        const props = makeProps()
        mount(props)
        act(() => globe().props.onPress())
        act(() =>
          byTestId("swipe-indicator")[0].props.onAccessibilityAction({
            nativeEvent: { actionName: "done" },
          }),
        )
        expect(scale(props)).toBe(1)
        expect(buttons().props.pointerEvents).toBe("box-none")
        expect(buttons().props.accessibilityElementsHidden).toBe(false)
      })

      test("a release in the compare zone returns the window and the buttons while the comparison shows", () => {
        const props = makeProps()
        mount(props)
        act(() => globe().props.onPress())
        expect(scale(props)).toBeCloseTo(0.76175, 5)
        drag(380, 200)
        release()
        expect(present("compare-grabber")).toBe(true)
        expect(scale(props)).toBe(1)
        expect(buttons().props.pointerEvents).toBe("box-none")
        expect(buttons().props.accessibilityElementsHidden).toBe(false)
        // The line, the grabber and the tags are drawn in the window.
        for (const id of ["compare-line", "compare-grabber", "compare-tag-left"]) {
          expect(insideWindow(id)).toBe(true)
        }
        expect(insideWindow("compare-quit")).toBe(false)
      })

      test("the comparison itself is never immersive", () => {
        const props = makeProps()
        mount(props)
        act(() => globe().props.onPress())
        drag(380, 200)
        release()
        act(() => {
          jest.advanceTimersByTime(2000)
        })
        expect(scale(props)).toBe(1)
        expect(buttons().props.pointerEvents).toBe("box-none")
      })

      test("under Reduce Motion the same states come at once", () => {
        setReducedMotion(true)
        const props = makeProps()
        mount(props)
        act(() => globe().props.onPress())
        expect(scale(props)).toBeCloseTo(0.76175, 5)
        expect(buttons().props.pointerEvents).toBe("none")
        act(() =>
          byTestId("swipe-indicator")[0].props.onAccessibilityAction({
            nativeEvent: { actionName: "done" },
          }),
        )
        expect(scale(props)).toBe(1)
        expect(buttons().props.pointerEvents).toBe("box-none")
      })

      test("a wipe measured on the receded window: a touch in the margin counts as the nearest edge", () => {
        const props = makeProps()
        mount(props)
        act(() => globe().props.onPress())
        update(props)
        // Screen x 399 is in the margin (window x 400); screen x 200 is the window's centre.
        drag(399, 200)
        release()
        expect(present("compare-grabber")).toBe(true)
        expect(scale(props)).toBe(1)
      })
    })

    test("the globe closes the overlay bubble while it enters the swipe mode", () => {
      mount(makeProps())
      act(() => byTestId("map-overlay-button")[0].props.onPress())
      expect(byTestId("map-overlay-bubble")).toHaveLength(1)
      act(() => globe().props.onPress())
      expect(byTestId("map-overlay-bubble")).toHaveLength(0)
      expect(present("swipe-surface")).toBe(true)
    })

    test("done frees the map", () => {
      mount(makeProps())
      act(() => globe().props.onPress())
      act(() =>
        byTestId("swipe-indicator")[0].props.onAccessibilityAction({
          nativeEvent: { actionName: "done" },
        }),
      )
      expect(present("swipe-surface")).toBe(false)
      expect(explorerMap().props.dragPan).toBeUndefined()
    })

    test("a wipe draws the incoming layer on a second map; a committed base stays covered until the Explorer map has loaded it", () => {
      const props = makeProps()
      mount(props)
      act(() => globe().props.onPress())
      drag(380, 60)
      expect(maps()).toHaveLength(2)
      release()
      act(() => {
        jest.advanceTimersByTime(500)
      })
      // Satellite is the Plan's neighbour: it is the saved preference now.
      expect(props.onChangeBasemap).toHaveBeenCalledWith("satellite")
      // The stacked map keeps covering while the Explorer map loads the new style.
      expect(maps()).toHaveLength(2)
      act(() => explorerMap().props.onDidFinishLoadingStyle())
      expect(maps()).toHaveLength(1)
    })

    test("a wipe let go near its start changes nothing and unmounts the extra map", () => {
      const props = makeProps()
      mount(props)
      act(() => globe().props.onPress())
      drag(380, 340)
      release()
      act(() => {
        jest.advanceTimersByTime(500)
      })
      expect(props.onChangeBasemap).not.toHaveBeenCalled()
      expect(maps()).toHaveLength(1)
    })

    test("a release in the compare zone starts one single mode: free map, centre line, grabber, tags, the quit pill only", () => {
      startComparison(makeProps({ items: [item("a", 45.76, 4.84)] }))
      expect(present("compare-grabber")).toBe(true)
      expect(present("compare-line")).toBe(true)
      expect(present("compare-tag-left")).toBe(true)
      expect(present("compare-tag-right")).toBe(true)
      expect(maps()).toHaveLength(2)
      // The swipe mode ended in the same change: no surface, no indicator.
      for (const id of ["swipe-surface", "swipe-indicator", "swipe-dots"]) {
        expect(present(id)).toBe(false)
      }
      expect(present("compare-quit")).toBe(true)
      // The map is free: native pan and zoom; rotation and pitch stay locked; markers hidden.
      for (const prop of ["dragPan", "touchZoom", "doubleTapZoom"]) {
        expect(explorerMap().props[prop]).toBeUndefined()
      }
      expect(explorerMap().props.touchRotate).toBe(false)
      expect(explorerMap().props.touchPitch).toBe(false)
      expect(markers()).toHaveLength(0)
      expect(globe().props.accessibilityValue).toEqual({
        text: fr.mapLayers.basemap.buttonActiveValue,
      })
    })

    test("the globe is disabled and dimmed while comparing, and a press changes nothing", () => {
      startComparison()
      expect(globe().props.disabled).toBe(true)
      expect(globe().props.accessibilityState).toEqual({ expanded: false, disabled: true })
      const glyph = globe().findByType("Ionicons" as never)
      expect(flatStyle(glyph.props.style).opacity).toBe(0.4)
      act(() => globe().props.onPress())
      expect(present("swipe-surface")).toBe(false)
      expect(present("compare-grabber")).toBe(true)
      expect(present("compare-quit")).toBe(true)
    })

    // The text of a side tag, and the source the layer drawn by a map comes from.
    const tagName = (side: "left" | "right") =>
      byTestId(`compare-tag-${side}`)[0]
        .findAllByType("Text" as never)
        .map((text) => text.props.children)
        .join("")
    const drawn = (map: ReactTestInstance) => JSON.stringify(map.props.mapStyle)

    test("a tag's chevrons change its side: the right one to the next layer, the left one to the previous", () => {
      setReducedMotion(true)
      try {
        const props = startComparison()
        expect(tagName("left")).toBe("Plan")
        expect(tagName("right")).toBe("Satellite")
        act(() => byTestId("compare-tag-right-next")[0].props.onPress())
        expect(tagName("right")).toBe("État-major")
        // The second map draws the right side.
        expect(drawn(maps()[1])).toContain('"etat-major"')
        act(() => byTestId("compare-tag-left-previous")[0].props.onPress())
        // Plan going back wraps to the last layer, which the right side does not show.
        expect(tagName("left")).toBe("Photos 1950")
        expect(drawn(explorerMap())).toContain('"photos-1950"')
        // The comparison goes on, with no extra map and no change to the saved preference.
        expect(maps()).toHaveLength(2)
        expect(present("compare-grabber")).toBe(true)
        expect(props.onChangeBasemap).not.toHaveBeenCalled()
      } finally {
        setReducedMotion(false)
      }
    })

    test("a side change plays as a wipe on a third map over that side's half, and the line stays", () => {
      startComparison()
      act(() => byTestId("compare-tag-right-next")[0].props.onPress())
      expect(maps()).toHaveLength(3)
      expect(drawn(maps()[2])).toContain('"etat-major"')
      // The tag keeps its layer until the wipe has ended; the line did not move.
      expect(tagName("right")).toBe("Satellite")
      expect(present("compare-line")).toBe(true)
      expect(present("compare-grabber")).toBe(true)
    })

    test("the tags take no touch while the grabber is dragged, and again after", () => {
      startComparison()
      const pointerEvents = () => byTestId("compare-tag-right")[0].props.pointerEvents
      expect(pointerEvents()).toBe("auto")
      act(() => grabberPan().handlers.onBegin())
      expect(pointerEvents()).toBe("none")
      act(() => grabberPan().handlers.onFinalize({}, false))
      expect(pointerEvents()).toBe("auto")
    })

    test("a comparison starts with no notice pill: the markers hide silently (item 13 e)", () => {
      startComparison(makeProps({ items: [item("a", 45.76, 4.84)] }))
      expect(
        tree.root.findAll((node) => String(node.props.testID ?? "").startsWith("map-notice-")),
      ).toHaveLength(0)
      expect(markers()).toHaveLength(0)
      expect(explorerMap().props.hideMarkers).toBeUndefined()
    })

    test("Quitter la comparaison keeps side A: the curtain goes, one base again", () => {
      setReducedMotion(true)
      try {
        const props = startComparison()
        act(() => byTestId("compare-quit")[0].props.onPress())
        for (const id of ["compare-line", "compare-grabber", "compare-tag-left", "compare-quit"]) {
          expect(present(id)).toBe(false)
        }
        expect(maps()).toHaveLength(1)
        expect(explorerMap().props.touchRotate).toBeUndefined()
        // Side A is Plan, the saved base: it is written again, unchanged.
        expect(props.onChangeBasemap).toHaveBeenCalledWith("map")
        // The comparison is gone: the globe works again and enters the swipe mode.
        expect(globe().props.disabled).toBe(false)
        act(() => globe().props.onPress())
        expect(present("swipe-surface")).toBe(true)
        expect(present("swipe-indicator")).toBe(true)
      } finally {
        setReducedMotion(false)
      }
    })

    // The pan of the grabber, found through the detector that wraps it (the swipe mode's own pans
    // are not mounted in a comparison, and a re-render may build new ones).
    const grabberPan = () => {
      const detector = tree.root.find(
        (node) =>
          (node.type as unknown) === "GestureDetector" &&
          node.findAll((child) => child.props.testID === "compare-grabber").length > 0,
      )
      return detector.props.gesture as MockPan
    }
    const grabberLineX = () =>
      tree.root.findAll(
        (node) => node.props.lineX && node.props.onEdgeExit && node.props.leftName !== undefined,
      )[0].props.lineX.value as number
    const dragGrabber = (translationX: number) => {
      act(() => grabberPan().handlers.onUpdate({ translationX }))
    }

    test("dragging the grabber into the left fifth warns, and a release there keeps the right layer, covered until the Explorer map has loaded it", () => {
      const props = startComparison()
      expect(maps()).toHaveLength(2)
      expect(grabberLineX()).toBe(200)
      expect(present("compare-exit-hint")).toBe(false)
      act(() => grabberPan().handlers.onBegin())
      dragGrabber(-150)
      // x 50 on a 400 pt window is in the outer fifth: the hint shows under the quit pill.
      expect(texts()).toContain("Lâchez pour quitter la comparaison")
      act(() => grabberPan().handlers.onEnd({}, true))
      // B was the incoming Satellite, drawn by the second map: it is the base now (and saved).
      expect(props.onChangeBasemap).toHaveBeenCalledWith("satellite")
      expect(present("compare-grabber")).toBe(false)
      expect(present("compare-line")).toBe(false)
      expect(present("compare-exit-hint")).toBe(false)
      expect(maps()).toHaveLength(2)
      act(() => explorerMap().props.onDidFinishLoadingStyle())
      expect(maps()).toHaveLength(1)
    })

    test("dragging into the right fifth keeps the left layer", () => {
      const props = startComparison()
      act(() => grabberPan().handlers.onBegin())
      dragGrabber(150)
      expect(present("compare-exit-hint")).toBe(true)
      act(() => grabberPan().handlers.onEnd({}, true))
      expect(props.onChangeBasemap).toHaveBeenCalledWith("map")
      expect(present("compare-grabber")).toBe(false)
    })

    test("a release away from the edges springs the line back to the centre: the comparison stays, no hint", () => {
      const props = startComparison()
      act(() => grabberPan().handlers.onBegin())
      dragGrabber(-150)
      expect(present("compare-exit-hint")).toBe(true)
      // Back out of the zone: the hint goes at once; the line follows the finger.
      dragGrabber(-50)
      expect(present("compare-exit-hint")).toBe(false)
      expect(grabberLineX()).toBe(150)
      dragGrabber(-150)
      expect(present("compare-exit-hint")).toBe(true)
      dragGrabber(-100)
      act(() => grabberPan().handlers.onEnd({}, true))
      expect(grabberLineX()).toBe(200)
      expect(present("compare-exit-hint")).toBe(false)
      expect(present("compare-grabber")).toBe(true)
      expect(present("compare-line")).toBe(true)
      expect(present("compare-quit")).toBe(true)
      expect(maps()).toHaveLength(2)
      expect(props.onChangeBasemap).not.toHaveBeenCalled()
    })

    test("a cancelled drag in an exit zone springs back and leaves no hint", () => {
      const props = startComparison()
      act(() => grabberPan().handlers.onBegin())
      dragGrabber(-150)
      expect(present("compare-exit-hint")).toBe(true)
      act(() => grabberPan().handlers.onEnd({}, false))
      act(() => grabberPan().handlers.onFinalize({}, false))
      expect(grabberLineX()).toBe(200)
      expect(present("compare-exit-hint")).toBe(false)
      expect(present("compare-grabber")).toBe(true)
      expect(props.onChangeBasemap).not.toHaveBeenCalled()
    })

    test("only the grabber takes a touch on the line: the line is untouchable and the map is free across the centre", () => {
      startComparison()
      expect(byTestId("compare-line")[0].props.pointerEvents).toBe("none")
      expect(explorerMap().props.dragPan).toBeUndefined()
      expect(explorerMap().props.touchZoom).toBeUndefined()
      // No swipe surface in a comparison: nothing else captures a pan.
      expect(present("swipe-surface")).toBe(false)
    })

    test("opening the overlay bubble or the download card during a comparison keeps the comparison", () => {
      mockOfflineEnabled.value = true
      startComparison()
      act(() => byTestId("map-overlay-button")[0].props.onPress())
      expect(byTestId("map-overlay-bubble")).toHaveLength(1)
      expect(present("compare-grabber")).toBe(true)
      expect(present("compare-quit")).toBe(true)
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      expect(present("compare-grabber")).toBe(true)
      expect(present("compare-quit")).toBe(true)
      expect(maps()).toHaveLength(2)
    })

    test("opening a panel from the swipe mode ends it", () => {
      mockOfflineEnabled.value = true
      mount(makeProps())
      act(() => globe().props.onPress())
      expect(present("swipe-surface")).toBe(true)
      act(() => byTestId("map-overlay-button")[0].props.onPress())
      expect(present("swipe-surface")).toBe(false)
      act(() => globe().props.onPress())
      expect(present("swipe-surface")).toBe(true)
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      expect(present("swipe-surface")).toBe(false)
    })

    test("with the comparison not built a release in the middle creates none", () => {
      mockStackMode.comparison = false
      const props = makeProps()
      mount(props)
      act(() => globe().props.onPress())
      drag(380, 200)
      release()
      act(() => {
        jest.advanceTimersByTime(500)
      })
      for (const id of ["compare-line", "compare-grabber", "compare-tag-left", "compare-quit"]) {
        expect(present(id)).toBe(false)
      }
      // Two zones only: past a third of the width it is a plain change of base.
      expect(props.onChangeBasemap).toHaveBeenCalledWith("satellite")
      expect(explorerMap().props.touchRotate).toBe(false)
      expect(explorerMap().props.hideMarkers).toBeUndefined()
    })

    test("with an instant presentation no extra map is mounted during a gesture", () => {
      mockStackMode.wipe = "instant"
      mount(makeProps())
      act(() => globe().props.onPress())
      drag(380, 60)
      expect(maps()).toHaveLength(1)
    })

    test("offline, the layers the area lacks are skipped and told when the swipe mode starts", () => {
      mockAvailable.all = false
      mount(makeProps({ isOffline: true }))
      act(() => globe().props.onPress())
      expect(texts()).toContain(fr.mapLayers.basemap.skipped(3))
    })

    test("the notices sit under the window, above the tab bar, in the swipe mode and start below the quit pill", () => {
      // A notice that stays whatever the mode: the forest overlay, not in the offline area.
      mockAvailable.all = false
      const noticeStyle = () =>
        flatStyle(
          tree.root.find(
            (node) =>
              typeof node.type === "string" &&
              node.props.pointerEvents === "box-none" &&
              [node.props.style].flat(3).some((style) => style && style.alignItems === "center") &&
              node.findAll((child) => child.props.testID === "map-notice-offline").length > 0,
          ).props.style,
        )
      mount(makeProps({ isOffline: true }))
      const byId = (testID: string) => tree.root.find((node) => node.props.testID === testID)
      act(() => byId("map-overlay-button").props.onPress())
      act(() => byId("overlay-forest-switch").props.onValueChange(true))
      act(() => globe().props.onPress())
      const swipeStyle = noticeStyle()
      drag(380, 200)
      release()
      const pillTop = noticeStyle().top
      // The swipe mode puts the notices at the bottom.
      // The quit pill of the comparison holds the top: its 40 pt plus 8.
      expect(swipeStyle.top).toBeUndefined()
      // 50 (tab bar) + 8 + 14 + 40 (hint): in the white zone under the window, over the hint.
      expect(swipeStyle.bottom).toBe(50 + 8 + 14 + 40)
      expect(pillTop).toBe(30 + 40 + 8)
    })
  })

  test("locate: centres on the position, or explains a refusal or a failure", async () => {
    mount(makeProps())
    const press = async () => {
      await act(async () => {
        byLabel(fr.publicMap.a11y.locate).props.onPress()
      })
    }

    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false })
    await press()
    expect(mockAlert).toHaveBeenLastCalledWith(
      fr.publicMap.alerts.locationDisabled.title,
      fr.publicMap.alerts.locationDisabled.message,
    )

    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true })
    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error("gps off"))
    await press()
    expect(mockAlert).toHaveBeenLastCalledWith(
      fr.publicMap.alerts.locationUnavailable.title,
      fr.publicMap.alerts.locationUnavailable.message,
    )

    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 45.1, longitude: 5.2 },
    })
    await press()
    // MAP-04: the device's own position is the native showsUserLocation halo, not an app Marker.
    // The camera takes bounds, so the region comes back with a float rounding error.
    const [region, duration] = mockAnimateToRegion.mock.calls.at(-1) as [
      { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
      number,
    ]
    expect(region.latitude).toBeCloseTo(45.1, 6)
    expect(region.longitude).toBeCloseTo(5.2, 6)
    expect(region.latitudeDelta).toBeCloseTo(0.012, 6)
    expect(region.longitudeDelta).toBeCloseTo(0.012, 6)
    expect(duration).toBe(450)
  })

  test("a second locate press while locating is ignored", async () => {
    mount(makeProps())
    let resolvePermission: (value: { granted: boolean }) => void = () => undefined
    mockLocation.requestForegroundPermissionsAsync.mockReturnValue(
      new Promise((resolve) => {
        resolvePermission = resolve
      }),
    )
    await act(async () => {
      byLabel(fr.publicMap.a11y.locate).props.onPress()
    })
    await act(async () => {
      byLabel(fr.publicMap.a11y.locate).props.onPress()
    })
    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolvePermission({ granted: false })
    })
  })

  test("the panels hook gets one stable swipe callback, not a fresh no-op each render (hook order)", () => {
    mockPanelsOptions.length = 0
    const props = makeProps()
    mount(props)
    update({ ...props, loading: true })
    update({ ...props, loading: false, items: [item("a", 45.7, 4.8)] })
    expect(mockPanelsOptions.length).toBeGreaterThanOrEqual(3)
    const callbacks = new Set(mockPanelsOptions.map((options) => options.onPanelOpen))
    expect(callbacks.size).toBe(1)
    // The ref is filled after the swipe hook has run: calling it is harmless with nothing to end.
    expect(() => act(() => mockPanelsOptions[0].onPanelOpen())).not.toThrow()
    // Opening the bubble calls it through the hook.
    act(() => byTestId("map-overlay-button")[0].props.onPress())
    expect(byTestId("map-overlay-bubble")).toHaveLength(1)
  })

  test("every Pressable has a role and a catalogue label (D-07)", () => {
    mount(makeProps({ items: [item("a", 45.76, 4.84), item("b", 45.76, 4.84)] }))
    const cluster = markers().find(
      (node) => node.props.accessibilityLabel === fr.publicMap.a11y.cluster(2),
    ) as ReactTestInstance
    act(() => cluster.props.onPress())
    const pressables = tree.root.findAll((node) => (node.type as unknown) === "Pressable")
    expect(pressables.length).toBeGreaterThanOrEqual(6)
    for (const pressable of pressables) {
      expect(pressable.props.accessibilityRole).toBe("button")
      expect(typeof pressable.props.accessibilityLabel).toBe("string")
      expect(pressable.props.accessibilityLabel.length).toBeGreaterThan(0)
    }
  })
})
