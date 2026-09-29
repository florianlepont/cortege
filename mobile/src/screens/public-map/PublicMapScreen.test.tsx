/**
 * The split public map screen (01.9-28, D-05, D-06, D-07; Phase 2 member-only sharing): viewport
 * loading, first-load fit, clusters (zoom or list), survey selection, tapping a studied parcel to
 * see its history, locate, controls, and a role and catalogue label on every Pressable.
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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: {} },
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
): PublicParcelStatusItem {
  return {
    parcel_id: parcelId,
    study_status: studyStatus,
    latest_submitted_survey_id: null,
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
    ownSurveyIds: [],
    loading: false,
    parcelsLoading: false,
    fromDate: "",
    toDate: "",
    region: "",
    onChangeFromDate: jest.fn(),
    onChangeToDate: jest.fn(),
    onChangeRegion: jest.fn(),
    onLoad: jest.fn(async () => undefined),
    onLoadParcels: jest.fn(async () => undefined),
    onViewportBboxChange: jest.fn(),
    isOffline: false,
    basemap: "map",
    onChangeBasemap: jest.fn(),
    onQueueParcelDownload: jest.fn(),
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

function texts(): string[] {
  return tree.root
    .findAll((node) => (node.type as unknown) === "Text")
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

  test("a marker press shows the survey card, which never shows the id", () => {
    const props = makeProps({ items: [item("secret-id", 45.7, 4.8, 27)] })
    mount(props)
    const marker = markers().find(
      (node) => node.props.accessibilityLabel === fr.publicMap.a11y.surveyMarker(27),
    ) as ReactTestInstance
    act(() => marker.props.onPress())

    const header = tree.root.find((node) => (node.type as unknown) === "AppSectionHeader")
    expect(header.props.title).toBe(fr.publicMap.selected.title(27))
    // The annotation's technical `id` is not user-facing: what a user reads or hears never has it.
    const visible = tree.root
      .findAll((node) => typeof node.type === "string")
      .flatMap((node) => [node.props.accessibilityLabel, node.props.children].flat(2))
      .filter((value): value is string => typeof value === "string")
    expect(visible.join(" ")).not.toContain("secret-id")

    act(() => byLabel(fr.publicMap.a11y.closeSelection).props.onPress())
    expect(tree.root.findAll((node) => (node.type as unknown) === "AppSectionHeader")).toHaveLength(
      0,
    )
  })

  test("selecting an own survey shows a notice instead of a report entry point (Phase 2: removed)", () => {
    const props = makeProps({ items: [item("mine", 48.8, 2.3, 12)] })
    props.ownSurveyIds = ["mine"]
    mount(props)
    act(() =>
      markers()
        .find((node) => node.props.accessibilityLabel === fr.publicMap.a11y.surveyMarker(12))
        ?.props.onPress(),
    )
    expect(tree.root.findAll((node) => (node.type as unknown) === "AppNotice")).toHaveLength(1)
    expect(
      tree.root.findAll(
        (node) =>
          (node.type as unknown) === "AppButton" && node.props.label === "Signaler ce relevé",
      ),
    ).toHaveLength(0)
  })

  test("tapping a studied parcel opens its history; a not-studied parcel does nothing", async () => {
    const props = makeProps({
      parcelStatuses: [
        parcelStatus("studied-1", "studied"),
        parcelStatus("empty-1", "not_studied"),
      ],
    })
    mount(props)
    const overlay = tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer")

    await act(async () => {
      overlay.props.onParcelPress("empty-1")
    })
    expect(tree.root.findAll((node) => (node.type as unknown) === "AppSectionHeader")).toHaveLength(
      0,
    )

    await act(async () => {
      overlay.props.onParcelPress("studied-1")
    })
    const header = tree.root.find((node) => (node.type as unknown) === "AppSectionHeader")
    expect(header.props.title).toBe(fr.parcelHistory.title)
    expect(mockFetchParcelSurveyHistory).toHaveBeenCalledWith(
      "http://localhost:3000",
      "access-token",
      "studied-1",
    )

    act(() => byLabel(fr.publicMap.a11y.closeParcelHistory).props.onPress())
    expect(tree.root.findAll((node) => (node.type as unknown) === "AppSectionHeader")).toHaveLength(
      0,
    )
  })

  test("tapping a studied parcel while offline shows the missing-parcel warning, never the network", async () => {
    const onQueueParcelDownload = jest.fn()
    const props = makeProps({
      parcelStatuses: [parcelStatus("studied-1", "studied")],
      isOffline: true,
      onQueueParcelDownload,
    })
    mount(props)
    const overlay = tree.root.find((node) => (node.type as unknown) === "ParcelPolygonsLayer")

    await act(async () => {
      overlay.props.onParcelPress("studied-1")
    })

    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
    const notice = tree.root.findAll(
      (node) =>
        (node.type as unknown) === "AppNotice" &&
        node.props.title === fr.offlineMap.parcelMissing.title,
    )
    expect(notice).toHaveLength(1)
    expect(notice[0].props.message).toBe(fr.offlineMap.parcelMissing.message)

    const downloadButton = tree.root.find(
      (node) =>
        (node.type as unknown) === "AppButton" &&
        node.props.label === fr.offlineMap.parcelMissing.downloadAction,
    )
    await act(async () => {
      downloadButton.props.onPress()
    })

    expect(onQueueParcelDownload).toHaveBeenCalledWith("studied-1")
    const noticeAfterQueue = tree.root.find(
      (node) =>
        (node.type as unknown) === "AppNotice" &&
        node.props.title === fr.offlineMap.parcelMissing.title,
    )
    expect(noticeAfterQueue.props.message).toBe(fr.offlineMap.parcelMissing.queued)
    expect(
      tree.root.findAll(
        (node) =>
          (node.type as unknown) === "AppButton" &&
          node.props.label === fr.offlineMap.parcelMissing.downloadAction,
      ),
    ).toHaveLength(0)
  })

  test("a cluster that cannot split opens the list, and a row selects the survey", () => {
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
    const header = tree.root.find((node) => (node.type as unknown) === "AppSectionHeader")
    expect(header.props.title).toBe(fr.publicMap.selected.title(20))

    act(() => cluster.props.onPress())
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

  test("controls: filters, apply, refresh and the parcel layer label", () => {
    jest.useFakeTimers()
    try {
      let props = makeProps()
      mount(props)
      act(() => byLabel(fr.publicMap.a11y.showFilters).props.onPress())
      expect(
        byLabel(fr.publicMap.a11y.hideParcels).findByType("Text" as never).props.children,
      ).toBe(fr.publicMap.layer.zoomIn)

      // MAP-02: a period chip reports the resolved range immediately (no "Appliquer" button).
      const yearChip = tree.root.find(
        (node) =>
          (node.type as unknown) === "Pressable" &&
          node
            .findAll((child) => (child.type as unknown) === "Text")
            .some((text) => text.props.children === fr.publicMap.filters.period.year),
      )
      act(() => yearChip.props.onPress())
      expect(props.onChangeFromDate).toHaveBeenCalledTimes(1)
      expect(props.onChangeToDate).toHaveBeenCalledTimes(1)

      // The parent (usePublicMapExplorer) reflects the change back as new props: the screen
      // re-applies immediately, with no separate "Appliquer" step.
      const [nextFromDate] = (props.onChangeFromDate as jest.Mock).mock.calls[0] as [string]
      const [nextToDate] = (props.onChangeToDate as jest.Mock).mock.calls[0] as [string]
      props = { ...props, fromDate: nextFromDate, toDate: nextToDate }
      update(props)
      expect(props.onLoad).toHaveBeenLastCalledWith({ force: true })

      act(() => byLabel(fr.publicMap.a11y.refresh).props.onPress())
      expect(props.onLoad).toHaveBeenLastCalledWith({
        bbox: computeRegionBbox(DEFAULT_MAP_REGION),
        force: true,
      })

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
      update({ ...props, parcelsLoading: true })
      expect(texts()).toContain(fr.publicMap.layer.loading)
      update({ ...props, parcelsLoading: false })
      expect(texts()).toContain(fr.publicMap.layer.active)

      act(() => byLabel(fr.publicMap.a11y.hideParcels).props.onPress())
      expect(texts()).toContain(fr.publicMap.layer.hidden)
      update({ ...props, loading: true })
      expect(
        tree.root.findAll((node) => (node.type as unknown) === "ActivityIndicator"),
      ).toHaveLength(1)
      expect(texts()).toContain(fr.publicMap.filters.period.year)
      act(() => byLabel(fr.publicMap.a11y.hideFilters).props.onPress())
      expect(texts()).not.toContain(fr.publicMap.filters.period.year)
    } finally {
      jest.useRealTimers()
    }
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
    act(() => byLabel(fr.publicMap.a11y.showFilters).props.onPress())
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
