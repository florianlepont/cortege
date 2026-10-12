jest.mock("react-native", () => ({}))

const mockPermission = jest.fn()
const mockLast = jest.fn()
const mockCurrent = jest.fn()
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: () => mockPermission(),
  getLastKnownPositionAsync: () => mockLast(),
  getCurrentPositionAsync: (options: unknown) => mockCurrent(options),
  Accuracy: { Balanced: 3 },
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { forgetPosition, rememberPosition } from "../../app/last-position"
import {
  INITIAL_CENTRE_SPAN,
  cachedStartRegion,
  useInitialLocationCentre,
} from "./useInitialLocationCentre"

beforeEach(() => {
  forgetPosition()
  mockPermission.mockReset()
  mockLast.mockReset()
  mockCurrent.mockReset()
})

afterEach(async () => {
  await cleanup()
})

const flush = () => act(async () => undefined)

describe("useInitialLocationCentre", () => {
  test("granted with a last known position: moves there at once over a 0.15 degree span", async () => {
    mockPermission.mockResolvedValue({ granted: true })
    mockLast.mockResolvedValue({ coords: { latitude: 48.1, longitude: 2.3 } })
    const moveTo = jest.fn()
    await renderHook(() => useInitialLocationCentre({ hasFocus: false, moveTo }))
    await flush()
    expect(INITIAL_CENTRE_SPAN).toBe(0.15)
    expect(moveTo).toHaveBeenCalledTimes(1)
    expect(moveTo).toHaveBeenCalledWith(
      { latitude: 48.1, longitude: 2.3, latitudeDelta: 0.15, longitudeDelta: 0.15 },
      0,
    )
    expect(mockCurrent).not.toHaveBeenCalled()
  })

  test("granted without a last known position: falls back to the current one", async () => {
    mockPermission.mockResolvedValue({ granted: true })
    mockLast.mockResolvedValue(null)
    mockCurrent.mockResolvedValue({ coords: { latitude: 45, longitude: 5 } })
    const moveTo = jest.fn()
    await renderHook(() => useInitialLocationCentre({ hasFocus: false, moveTo }))
    await flush()
    expect(mockCurrent).toHaveBeenCalledWith({ accuracy: 3 })
    expect(moveTo).toHaveBeenCalledWith(
      { latitude: 45, longitude: 5, latitudeDelta: 0.15, longitudeDelta: 0.15 },
      0,
    )
  })

  test("not granted: never asks for a position and does not move", async () => {
    mockPermission.mockResolvedValue({ granted: false })
    const moveTo = jest.fn()
    await renderHook(() => useInitialLocationCentre({ hasFocus: false, moveTo }))
    await flush()
    expect(mockLast).not.toHaveBeenCalled()
    expect(mockCurrent).not.toHaveBeenCalled()
    expect(moveTo).not.toHaveBeenCalled()
  })

  test("a failure does not move", async () => {
    mockPermission.mockResolvedValue({ granted: true })
    mockLast.mockRejectedValue(new Error("no fix"))
    const moveTo = jest.fn()
    await renderHook(() => useInitialLocationCentre({ hasFocus: false, moveTo }))
    await flush()
    expect(moveTo).not.toHaveBeenCalled()
  })

  test("a focus request at the start: nothing is read and nothing moves", async () => {
    const moveTo = jest.fn()
    await renderHook(() => useInitialLocationCentre({ hasFocus: true, moveTo }))
    await flush()
    expect(mockPermission).not.toHaveBeenCalled()
    expect(moveTo).not.toHaveBeenCalled()
  })

  test("a focus request that arrives while the position is read wins", async () => {
    let resolve!: (value: unknown) => void
    mockPermission.mockResolvedValue({ granted: true })
    mockLast.mockReturnValue(new Promise((r) => (resolve = r)))
    const moveTo = jest.fn()
    const { rerender } = await renderHook(
      (props: { hasFocus: boolean }) => useInitialLocationCentre({ ...props, moveTo }),
      { initialProps: { hasFocus: false } },
    )
    await flush()
    await rerender({ hasFocus: true })
    resolve({ coords: { latitude: 1, longitude: 2 } })
    await flush()
    expect(moveTo).not.toHaveBeenCalled()
  })

  test("an unmount while the position is read drops the result", async () => {
    let resolve!: (value: unknown) => void
    mockPermission.mockResolvedValue({ granted: true })
    mockLast.mockReturnValue(new Promise((r) => (resolve = r)))
    const moveTo = jest.fn()
    const { unmount } = await renderHook(() =>
      useInitialLocationCentre({ hasFocus: false, moveTo }),
    )
    await flush()
    await unmount()
    resolve({ coords: { latitude: 1, longitude: 2 } })
    await flush()
    expect(moveTo).not.toHaveBeenCalled()
  })
})

describe("cachedStartRegion and the position cache", () => {
  afterEach(forgetPosition)

  test("is the 15 km region around the cached position, none without one or with a focus", () => {
    expect(cachedStartRegion(false)).toBeUndefined()
    rememberPosition(48.1, 2.3)
    expect(cachedStartRegion(false)).toEqual({
      latitude: 48.1,
      longitude: 2.3,
      latitudeDelta: INITIAL_CENTRE_SPAN,
      longitudeDelta: INITIAL_CENTRE_SPAN,
    })
    expect(cachedStartRegion(true)).toBeUndefined()
  })

  test("a map that started on the position reads nothing", async () => {
    const moveTo = jest.fn()
    await renderHook(() =>
      useInitialLocationCentre({ hasFocus: false, startedOnPosition: true, moveTo }),
    )
    await flush()
    expect(mockPermission).not.toHaveBeenCalled()
    expect(moveTo).not.toHaveBeenCalled()
  })

  test("a position read is remembered", async () => {
    mockPermission.mockResolvedValue({ granted: true })
    mockLast.mockResolvedValue({ coords: { latitude: 45, longitude: 5 } })
    await renderHook(() => useInitialLocationCentre({ hasFocus: false, moveTo: jest.fn() }))
    await flush()
    expect(cachedStartRegion(false)).toMatchObject({ latitude: 45, longitude: 5 })
  })
})
