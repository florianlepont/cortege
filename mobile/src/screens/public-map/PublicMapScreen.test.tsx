/**
 * The split public map screen (01.9-28, D-05, D-06, D-07; Phase 2 member-only sharing): viewport
 * loading, first-load fit, clusters (zoom or list), survey selection, tapping a studied parcel to
 * open its latest survey, locate, controls, and a role and catalogue label on every Pressable.
 */
import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { computeRegionBbox } from "../../app/map-viewport"
import type { PublicMapItem, PublicParcelStatusItem } from "../../app/types"
import { fr } from "../../i18n"
import { PublicMapScreen } from "../PublicMapScreen"
import { DEFAULT_MAP_REGION, VIEWPORT_DEBOUNCE_MS } from "./useMapViewport"

const mockFetchParcelSurveyHistory = jest.fn()
jest.mock("../../api/ibp-api", () => ({
  fetchParcelSurveyHistory: (...args: unknown[]) => mockFetchParcelSurveyHistory(...args),
}))

const mockAnimateToRegion = jest.fn()
const mockAlert = jest.fn()
const mockLocation = {
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
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
    AccessibilityInfo: { announceForAccessibility: jest.fn() },
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Keyboard: { dismiss: jest.fn() },
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: {} },
    Platform: { OS: "ios" },
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
      totalTileCount: 120,
      estimatedBytes: 2_400_000,
      exceedsCap: false,
    }),
    startDownload: (...args: unknown[]) => mockStartDownload(...args),
    deleteArea: (...args: unknown[]) => mockDeleteArea(...args),
    refresh: jest.fn(),
  }),
}))
jest.mock("../../ui/AppChoiceChip", () => ({ AppChoiceChip: "AppChoiceChip" }))
// The glow is drawn by the navigation layer (download-edge-glow.test.tsx) and its motion is tested in
// EdgePulse.test.tsx; here only the screen's request for it is counted.
jest.mock("../../navigation/download-edge-glow", () => ({ DownloadEdgeGlow: "DownloadEdgeGlow" }))

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: () => mockLocation.requestForegroundPermissionsAsync(),
  getCurrentPositionAsync: () => mockLocation.getCurrentPositionAsync(),
  Accuracy: { Balanced: 3 },
}))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 50 }))
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../map/maplibre/CadastreLayer", () => ({ CadastreLayer: "CadastreLayer" }))
jest.mock("../../map/maplibre/ParcelPolygonsLayer", () => ({
  ParcelPolygonsLayer: "ParcelPolygonsLayer",
}))
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
    region_code: "ARA",
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
    expect(texts()).toContain(fr.publicMap.count(1))
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
        fr.publicMap.a11y.clusterListItem({ ibp: 20, date: "2026-05-01", region: "ARA" }),
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

  test("controls: one tap switches the basemap, the parcels load once zoomed in, no filters", () => {
    jest.useFakeTimers()
    try {
      const props = makeProps({ items: [item("a", 45.76, 4.84)] })
      mount(props)
      act(() =>
        byLabel(
          fr.offlineMap.basemap.a11y.switchTo(fr.offlineMap.basemap.satellite),
        ).props.onPress(),
      )
      expect(props.onChangeBasemap).toHaveBeenCalledWith("satellite")
      expect(texts()).toContain(fr.publicMap.count(1))

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

  describe("offline areas (behind the feature flag)", () => {
    afterEach(() => {
      mockOfflineEnabled.value = false
      mockDownloading.areaId = null
      mockDownloadStatus.value = null
      mockClearDownloadStatus.mockClear()
    })

    const edgePulses = () =>
      tree.root.findAll((node) => (node.type as unknown) === "DownloadEdgeGlow").length

    test("download mode: the map's edge glows while the area is chosen, and only then (12.2-19)", async () => {
      mockOfflineEnabled.value = true
      let finish: (outcome: { ok: boolean; reason?: string }) => void = () => undefined
      mockStartDownload.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      const props = makeProps()
      mount(props)
      expect(edgePulses()).toBe(0)

      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      expect(edgePulses()).toBe(1)

      // The download starts: the area is chosen, the glow goes and stays gone once it is done.
      const download = () =>
        tree.root.find(
          (node) =>
            (node.type as unknown) === "GlassButton" &&
            node.props.label === fr.offlineMap.areas.downloadThisArea,
        )
      act(() => download().props.onPress())
      expect(edgePulses()).toBe(0)
      await act(async () => finish({ ok: true }))
      expect(edgePulses()).toBe(0)

      // Reopened: a new choice, the glow is back; closing the panel ends the mode.
      act(() => byLabel(fr.offlineMap.areas.a11y.closeSheet).props.onPress())
      expect(edgePulses()).toBe(0)
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      expect(edgePulses()).toBe(1)

      // A refused download leaves the mode on, to move the map and try again.
      mockStartDownload.mockResolvedValue({ ok: false, reason: "too_large" })
      await act(async () => download().props.onPress())
      expect(mockAlert).toHaveBeenCalledWith(fr.offlineMap.areas.tooLarge)
      expect(edgePulses()).toBe(1)

      // A download already running (started earlier) keeps the glow off.
      mockDownloading.areaId = "area-1"
      update({ ...props })
      expect(edgePulses()).toBe(0)
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

    test("flag on: the button opens the sheet, a download starts for the viewport", async () => {
      mockOfflineEnabled.value = true
      mockStartDownload.mockResolvedValue({ ok: false, reason: "failed" })
      mount(makeProps())
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      // The panel downloads; the areas already on the phone are managed in Paramètres (OA-123).
      expect(texts().some((text) => text.includes("tuiles"))).toBe(true)
      expect(texts()).not.toContain(fr.offlineMap.areas.empty)
      const download = tree.root.find(
        (node) =>
          (node.type as unknown) === "GlassButton" &&
          node.props.label === fr.offlineMap.areas.downloadThisArea,
      )
      // 12.2-19: the call to action across the whole panel, 46 pt (md too thin, lg too big).
      expect(download.props.minHeight).toBe(46)
      expect(download.props.style).toMatchObject({ alignSelf: "stretch" })
      expect(download.props.disabled).toBe(false)
      await act(async () => {
        download.props.onPress()
      })
      expect(mockStartDownload).toHaveBeenCalledWith(expect.anything(), expect.any(String))
      // 12.2-19 third round: the open panel shows the failure itself, with its retry; no alert.
      expect(mockAlert).not.toHaveBeenCalled()
    })

    const statusView = () =>
      tree.root.findAll(
        (node) => node.props.testID?.startsWith?.("offline-download-") === true && shown(node),
      )

    test("the panel shows the running download, then its outcome; Terminé closes it", () => {
      mockOfflineEnabled.value = true
      mount(makeProps())
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      // Opening the panel drops a finished download's outcome.
      expect(mockClearDownloadStatus).toHaveBeenCalledTimes(1)

      mockDownloading.areaId = "area-1"
      mockDownloadStatus.value = {
        phase: "running",
        areaId: "area-1",
        name: "Bois du Nord",
        percentage: 42,
        downloadedTiles: 51,
        totalTiles: 120,
      }
      update(makeProps())
      expect(texts()).toContain("Téléchargement : 42 %")
      expect(texts()).toContain("51 sur 120 tuiles")

      mockDownloading.areaId = null
      mockDownloadStatus.value = {
        phase: "done",
        areaId: "area-1",
        name: "Bois du Nord",
        percentage: 100,
        downloadedTiles: 120,
        totalTiles: 120,
      }
      update(makeProps())
      expect(texts()).toContain(fr.offlineMap.areas.done.title)
      expect(statusView().length).toBeGreaterThan(0)
      const done = tree.root.find(
        (node) =>
          (node.type as unknown) === "GlassButton" &&
          node.props.label === fr.offlineMap.areas.done.close &&
          shown(node),
      )
      act(() => done.props.onPress())
      expect(mockClearDownloadStatus).toHaveBeenCalledTimes(2)
      expect(tree.root.findAll((node) => (node.type as unknown) === "ExplorerSheet")).toHaveLength(
        0,
      )
    })

    test("retry after a failure downloads the area shown again, under the same name", async () => {
      mockOfflineEnabled.value = true
      mockStartDownload.mockResolvedValue({ ok: true, areaId: "area-2" })
      mount(makeProps())
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      mockDownloadStatus.value = { phase: "failed", areaId: "area-1", name: "Lisière" }
      update(makeProps())
      expect(texts()).toContain(fr.offlineMap.areas.failed.title)
      const retry = tree.root.find(
        (node) =>
          (node.type as unknown) === "GlassButton" &&
          node.props.label === fr.offlineMap.areas.failed.retry &&
          shown(node),
      )
      await act(async () => retry.props.onPress())
      expect(mockStartDownload).toHaveBeenCalledWith(expect.anything(), "Lisière")
      expect(mockAlert).not.toHaveBeenCalled()
    })

    test("a failure once the panel is closed is still told by an alert", async () => {
      mockOfflineEnabled.value = true
      let finish: (outcome: { ok: boolean; reason?: string }) => void = () => undefined
      mockStartDownload.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve
        }),
      )
      mount(makeProps())
      act(() => byLabel(fr.offlineMap.areas.openSheet).props.onPress())
      const download = tree.root.find(
        (node) =>
          (node.type as unknown) === "GlassButton" &&
          node.props.label === fr.offlineMap.areas.downloadThisArea,
      )
      act(() => download.props.onPress())
      act(() => byLabel(fr.offlineMap.areas.a11y.closeSheet).props.onPress())
      await act(async () => finish({ ok: false, reason: "failed" }))
      expect(mockAlert).toHaveBeenCalledWith(fr.offlineMap.areas.downloadFailed)
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
