const mockAlert = jest.fn()
jest.mock("react-native", () => ({ Alert: { alert: (...args: unknown[]) => mockAlert(...args) } }))

const mockPermission = jest.fn()
const mockPosition = jest.fn()
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: () => mockPermission(),
  getCurrentPositionAsync: (options: unknown) => mockPosition(options),
  Accuracy: { Balanced: 3 },
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { fr } from "../../i18n"
import { useLocateAction } from "./useLocateAction"

beforeEach(() => {
  mockAlert.mockReset()
  mockPermission.mockReset()
  mockPosition.mockReset()
})

afterEach(async () => {
  await cleanup()
})

describe("useLocateAction", () => {
  test("moves to the position with the 0.012 span over 450 ms", async () => {
    mockPermission.mockResolvedValue({ granted: true })
    mockPosition.mockResolvedValue({ coords: { latitude: 48.1, longitude: 2.3 } })
    const moveTo = jest.fn()
    const { result } = await renderHook(() => useLocateAction({ moveTo }))
    expect(result.current.locating).toBe(false)
    await act(async () => result.current.onLocate())
    expect(mockPosition).toHaveBeenCalledWith({ accuracy: 3 })
    expect(moveTo).toHaveBeenCalledWith(
      { latitude: 48.1, longitude: 2.3, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      450,
    )
    expect(result.current.locating).toBe(false)
    expect(mockAlert).not.toHaveBeenCalled()
  })

  test("a refusal shows the location disabled alert and does not move", async () => {
    mockPermission.mockResolvedValue({ granted: false })
    const moveTo = jest.fn()
    const { result } = await renderHook(() => useLocateAction({ moveTo }))
    await act(async () => result.current.onLocate())
    expect(mockAlert).toHaveBeenCalledWith(
      fr.publicMap.alerts.locationDisabled.title,
      fr.publicMap.alerts.locationDisabled.message,
    )
    expect(moveTo).not.toHaveBeenCalled()
    expect(result.current.locating).toBe(false)
  })

  test("a failure shows the location unavailable alert", async () => {
    mockPermission.mockResolvedValue({ granted: true })
    mockPosition.mockRejectedValue(new Error("gps off"))
    const moveTo = jest.fn()
    const { result } = await renderHook(() => useLocateAction({ moveTo }))
    await act(async () => result.current.onLocate())
    expect(mockAlert).toHaveBeenCalledWith(
      fr.publicMap.alerts.locationUnavailable.title,
      fr.publicMap.alerts.locationUnavailable.message,
    )
    expect(moveTo).not.toHaveBeenCalled()
    expect(result.current.locating).toBe(false)
  })

  test("locating is true during the request and a second call is ignored", async () => {
    let grant: (value: { granted: boolean }) => void = () => undefined
    mockPermission.mockReturnValue(new Promise((resolve) => (grant = resolve)))
    mockPosition.mockResolvedValue({ coords: { latitude: 1, longitude: 2 } })
    const moveTo = jest.fn()
    const { result } = await renderHook(() => useLocateAction({ moveTo }))
    await act(async () => result.current.onLocate())
    expect(result.current.locating).toBe(true)
    await act(async () => result.current.onLocate())
    expect(mockPermission).toHaveBeenCalledTimes(1)
    await act(async () => grant({ granted: true }))
    expect(moveTo).toHaveBeenCalledTimes(1)
    expect(result.current.locating).toBe(false)
  })
})
