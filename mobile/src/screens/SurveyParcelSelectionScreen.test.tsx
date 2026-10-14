/**
 * Phase 27, D-10: saving the parcel choice hands the centre of the tapped parcels to the route, so
 * the weather hook can look the weather up for that place. The map, the card and the sheets are
 * stubs; the real screen logic around them (the save handler and the centre) runs.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"

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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Platform: { OS: "android", select: (o: Record<string, unknown>) => o.android ?? o.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1, scale: 3 }),
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 0 }))
jest.mock("../app/feature-flags", () => ({ isOfflineMapsEnabled: () => false }))
jest.mock("../hooks/useOfflineAreas", () => ({
  useOfflineAreas: () => ({
    downloadingAreaId: null,
    downloadStatus: null,
    startDownload: jest.fn(),
    clearDownloadStatus: jest.fn(),
    estimateForRegion: () => null,
  }),
}))
jest.mock("../hooks/useOfflineMapPrompt", () => ({
  useOfflineMapPrompt: () => ({ state: "hidden" }),
}))
jest.mock("./public-map/useAreaDownloadAction", () => ({ useAreaDownloadAction: () => jest.fn() }))

let mockItems: unknown[] = []
jest.mock("../hooks/useParcelStatuses", () => ({
  useParcelStatuses: () => ({ items: mockItems, loading: false }),
}))

jest.mock("../map/maplibre/ParcelMap", () => {
  const ReactRef = require("react") as typeof import("react")
  return { ParcelMap: ReactRef.forwardRef(() => null) }
})
jest.mock("./public-map/MapChips", () => ({ MapTitlePill: () => null }))
jest.mock("./public-map/MapControls", () => ({
  MapTopControls: () => null,
  MapBottomDock: () => null,
}))
jest.mock("./public-map/ExplorerSheet", () => ({ ExplorerSheet: () => null }))
jest.mock("./public-map/OfflineAreasSheet", () => ({ OfflineAreasSheet: () => null }))
jest.mock("./public-map/ScoreLegend", () => ({ MapLegend: () => null }))
jest.mock("../ui/OfflineMapPrompt", () => ({ OfflineMapPrompt: () => null }))

let mockOnDone: (() => void) | null = null
jest.mock("./parcel-selection/ParcelSelectionCard", () => ({
  ParcelSelectionCard: ({ onDone }: { onDone: () => void }) => {
    mockOnDone = onDone
    return null
  },
}))

import { parcelAreaHa } from "../map/parcel-area"
import { SurveyParcelSelectionScreen } from "./SurveyParcelSelectionScreen"

const squareParcel = (parcelId: string, west: number, south: number, size: number) => ({
  parcel_id: parcelId,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [west + size, south],
        [west + size, south + size],
        [west, south + size],
        [west, south],
      ],
    ],
  },
})

async function mountAndSave(selectedParcelIds: string[]): Promise<jest.Mock> {
  const onSave = jest.fn(async () => undefined)
  await act(async () => {
    renderer.create(
      <SurveyParcelSelectionScreen
        apiUrl="http://api.test/v1"
        accessToken="token"
        gpsLocation={{ lat: "48.1", lng: "2.1", collected_at: "" }}
        siteName="Bois"
        selectedParcelIds={selectedParcelIds}
        onToggleParcelSelection={jest.fn()}
        onCaptureGpsLocation={jest.fn(async () => null)}
        onSave={onSave}
      />,
    )
  })
  await act(async () => {
    mockOnDone?.()
  })
  return onSave
}

describe("SurveyParcelSelectionScreen weather point", () => {
  beforeEach(() => {
    mockOnDone = null
    mockItems = []
  })

  test("saving passes the centre of the tapped parcels' geometry", async () => {
    mockItems = [squareParcel("P1", 2.0, 48.0, 0.2), squareParcel("P2", 5.0, 45.0, 0.2)]

    const onSave = await mountAndSave(["P1"])

    expect(onSave).toHaveBeenCalledTimes(1)
    const point = (onSave.mock.calls[0] as unknown[])[0] as { lat: number; lng: number }
    expect(point.lat).toBeCloseTo(48.1, 5)
    expect(point.lng).toBeCloseTo(2.1, 5)
  })

  test("saving passes the surface in hectares of the chosen parcels as the second argument", async () => {
    mockItems = [
      squareParcel("P1", 2.0, 46.0, 0.001),
      squareParcel("P2", 3.0, 46.0, 0.002),
      squareParcel("P3", 5.0, 45.0, 0.2),
    ]

    const onSave = await mountAndSave(["P1", "P2"])

    const surfaceHa = (onSave.mock.calls[0] as unknown[])[1]
    // About 0.86 ha plus 3.4 ha: the 0.2 degree parcel P3 is not counted.
    expect(surfaceHa).toBe(parcelAreaHa(mockItems as never, ["P1", "P2"]))
    expect(surfaceHa as number).toBeGreaterThan(4)
    expect(surfaceHa as number).toBeLessThan(5)
  })

  test("saving passes null when the geometry of the chosen parcels is not loaded", async () => {
    mockItems = [squareParcel("P2", 5.0, 45.0, 0.2)]

    const onSave = await mountAndSave(["P1"])

    expect(onSave).toHaveBeenCalledWith(null, null)
  })
})
