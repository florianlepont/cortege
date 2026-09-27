/**
 * Tests for useNearbyParcels.
 *
 * Strategy: mock expo-location and the API client, render the real hook with
 * renderHook (phase 01.9 D-01), then call `load()` inside act and assert the
 * bbox sent to fetchPublicParcelStatuses and the resulting state.
 */

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))

const mockGetForegroundPermissionsAsync = jest.fn()
const mockRequestForegroundPermissionsAsync = jest.fn()
const mockGetCurrentPositionAsync = jest.fn()

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: mockGetForegroundPermissionsAsync,
  requestForegroundPermissionsAsync: mockRequestForegroundPermissionsAsync,
  getCurrentPositionAsync: mockGetCurrentPositionAsync,
  Accuracy: { Balanced: 3 },
}))

const mockFetchPublicParcelStatuses = jest.fn()

jest.mock("../api/ibp-api", () => ({
  fetchPublicParcelStatuses: mockFetchPublicParcelStatuses,
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { hasMixedMethodVersions, useNearbyParcels } from "./useNearbyParcels"

const API_URL = "http://localhost:3000"

afterEach(async () => {
  await cleanup()
})

describe("useNearbyParcels", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchPublicParcelStatuses.mockResolvedValue({ items: [] })
  })

  test("load calls fetchPublicParcelStatuses with the correct bbox order", async () => {
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: true })
    mockGetCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 46, longitude: 2 } })

    const { result } = await renderHook(() => useNearbyParcels(API_URL))
    await act(async () => {
      await result.current.load()
    })

    expect(mockFetchPublicParcelStatuses).toHaveBeenCalledWith(API_URL, {
      bbox: "1.975000,45.975000,2.025000,46.025000",
      zoom: 15,
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.parcels).toEqual([])
    expect(result.current.sectorAvgScore).toBeNull()
  })

  test("load does not call fetchPublicParcelStatuses when permission is denied twice", async () => {
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: false })
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ granted: false })

    const { result } = await renderHook(() => useNearbyParcels(API_URL))
    await act(async () => {
      await result.current.load()
    })

    expect(mockFetchPublicParcelStatuses).not.toHaveBeenCalled()
    expect(result.current.locationDenied).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  test("load sorts parcels by distance and averages the scored ones", async () => {
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: false })
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ granted: true })
    mockGetCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 46, longitude: 2 } })
    const square = (lng: number, lat: number) => [
      [lng, lat],
      [lng + 0.001, lat],
      [lng + 0.001, lat + 0.001],
      [lng, lat + 0.001],
    ]
    mockFetchPublicParcelStatuses.mockResolvedValue({
      items: [
        {
          parcel_id: "far",
          latest_ibp_total: 20,
          latest_observation_year: 2024,
          geometry: { type: "Polygon", coordinates: [square(2.02, 46.02)] },
        },
        {
          parcel_id: "near",
          latest_ibp_total: 11,
          latest_observation_year: null,
          geometry: { type: "MultiPolygon", coordinates: [[square(2, 46)]] },
        },
        { parcel_id: "no-geometry", latest_ibp_total: null, geometry: null },
      ],
    })

    const { result } = await renderHook(() => useNearbyParcels(API_URL))
    await act(async () => {
      await result.current.load()
    })

    expect(result.current.parcels.map((parcel) => parcel.parcel_id)).toEqual([
      "near",
      "far",
      "no-geometry",
    ])
    expect(result.current.parcels[0].surveyCount).toBe(0)
    expect(result.current.parcels[1].surveyCount).toBe(1)
    expect(result.current.parcels[2].distanceKm).toBe(999)
    expect(result.current.sectorAvgScore).toBe(15.5)
    expect(result.current.locationDenied).toBe(false)
  })

  test("load sets error when the request fails", async () => {
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: true })
    mockGetCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 46, longitude: 2 } })
    mockFetchPublicParcelStatuses.mockRejectedValue(new Error("offline"))

    const { result } = await renderHook(() => useNearbyParcels(API_URL))
    await act(async () => {
      await result.current.load()
    })

    expect(result.current.error).toBe(true)
    expect(result.current.loading).toBe(false)
  })
})

describe("hasMixedMethodVersions (01.8 owner review: mixed methods in the sector average)", () => {
  const parcel = (id: string, total: number | null, version?: string | null) => ({
    parcel_id: id,
    latest_ibp_total: total,
    ...(version === undefined ? {} : { latest_ibp_method_version: version }),
  })

  test("no parcel or only untagged parcels (v3.0) is not mixed", () => {
    expect(hasMixedMethodVersions([])).toBe(false)
    expect(hasMixedMethodVersions([parcel("a", 12), parcel("b", 30, null)])).toBe(false)
  })

  test("an untagged parcel and a v3.2 parcel are mixed", () => {
    expect(hasMixedMethodVersions([parcel("a", 12), parcel("b", 30, IBP_METHOD_V3_2)])).toBe(true)
  })

  test("an explicit v3.0 parcel and an untagged parcel are the same method", () => {
    expect(hasMixedMethodVersions([parcel("a", 12, IBP_METHOD_V3_0), parcel("b", 30)])).toBe(false)
  })

  test("only scored parcels count: an unscored v3.2 parcel does not mix the average", () => {
    expect(hasMixedMethodVersions([parcel("a", 12), parcel("b", null, IBP_METHOD_V3_2)])).toBe(
      false,
    )
  })

  test("all v3.2 is not mixed", () => {
    expect(
      hasMixedMethodVersions([parcel("a", 12, IBP_METHOD_V3_2), parcel("b", 3, IBP_METHOD_V3_2)]),
    ).toBe(false)
  })
})
