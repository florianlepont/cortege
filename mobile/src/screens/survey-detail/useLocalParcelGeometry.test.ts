import React from "react"
import renderer, { act } from "react-test-renderer"
import { useLocalParcelGeometry, type LocalParcelGeometry } from "./useLocalParcelGeometry"

const mockLoadWeatherPoint = jest.fn()
const mockGetCachedParcelById = jest.fn()
jest.mock("../../storage/weather", () => ({
  loadWeatherPoint: (...args: unknown[]) => mockLoadWeatherPoint(...args),
}))
jest.mock("../../storage/offline-map", () => ({
  getCachedParcelById: (...args: unknown[]) => mockGetCachedParcelById(...args),
}))

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

afterEach(() => {
  mockLoadWeatherPoint.mockReset()
  mockGetCachedParcelById.mockReset()
})

const square = [
  [2.0, 46.0],
  [2.2, 46.0],
  [2.2, 46.4],
  [2.0, 46.4],
  [2.0, 46.0],
]

async function read(surveyId: string | undefined, parcelIds: string[]) {
  let current!: LocalParcelGeometry
  function Probe() {
    current = useLocalParcelGeometry(surveyId, parcelIds)
    return null
  }
  await act(async () => {
    renderer.create(React.createElement(Probe))
  })
  return current
}

describe("useLocalParcelGeometry", () => {
  test("reads the stored point and the bounding box of the cached parcels", async () => {
    mockLoadWeatherPoint.mockResolvedValue({ lat: 46.2, lng: 2.1 })
    mockGetCachedParcelById.mockResolvedValue({
      parcel_id: "P1",
      study_status: "not_studied",
      geometry: { type: "Polygon", coordinates: [square] },
    })

    const geometry = await read("s1", ["P1"])

    expect(mockLoadWeatherPoint).toHaveBeenCalledWith("s1")
    expect(geometry).toEqual({
      point: { lat: 46.2, lng: 2.1 },
      bounds: { west: 2.0, south: 46.0, east: 2.2, north: 46.4 },
    })
  })

  test("a parcel that is not cached leaves the bounds empty, the point stays", async () => {
    mockLoadWeatherPoint.mockResolvedValue({ lat: 46.2, lng: 2.1 })
    mockGetCachedParcelById.mockResolvedValue(null)

    expect(await read("s1", ["P1"])).toEqual({ point: { lat: 46.2, lng: 2.1 }, bounds: null })
  })

  test("nothing is read without a survey or without parcels", async () => {
    expect(await read(undefined, ["P1"])).toEqual({ point: null, bounds: null })
    expect(await read("s1", [])).toEqual({ point: null, bounds: null })
    expect(mockLoadWeatherPoint).not.toHaveBeenCalled()
  })

  test("a failed read counts as nothing known", async () => {
    mockLoadWeatherPoint.mockRejectedValue(new Error("db"))
    mockGetCachedParcelById.mockResolvedValue(null)

    expect(await read("s1", ["P1"])).toEqual({ point: null, bounds: null })
  })
})
