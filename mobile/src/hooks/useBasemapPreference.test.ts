jest.mock("react-native", () => ({}))

const mockLoadBasemapPreference = jest.fn()
const mockSaveBasemapPreference = jest.fn()

jest.mock("../storage/map-preference", () => ({
  DEFAULT_BASEMAP: "map",
  loadBasemapPreference: (...args: unknown[]) => mockLoadBasemapPreference(...args),
  saveBasemapPreference: (...args: unknown[]) => mockSaveBasemapPreference(...args),
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import { useBasemapPreference } from "./useBasemapPreference"

beforeEach(() => {
  mockLoadBasemapPreference.mockReset().mockResolvedValue("map")
  mockSaveBasemapPreference.mockReset().mockResolvedValue(undefined)
})

afterEach(async () => {
  await cleanup()
})

describe("useBasemapPreference", () => {
  test("loads the stored preference", async () => {
    mockLoadBasemapPreference.mockResolvedValue("satellite")
    const { result } = await renderHook(() => useBasemapPreference())

    await waitFor(() => expect(result.current.basemap).toBe("satellite"))
  })

  test("defaults to 'map' before the stored preference resolves", async () => {
    let resolveLoad: (value: string) => void = () => {}
    mockLoadBasemapPreference.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const { result } = await renderHook(() => useBasemapPreference())

    expect(result.current.basemap).toBe("map")
    await act(async () => {
      resolveLoad("satellite")
    })
    expect(result.current.basemap).toBe("satellite")
  })

  test("setBasemap updates state immediately and persists in the background", async () => {
    const { result } = await renderHook(() => useBasemapPreference())
    await waitFor(() => expect(mockLoadBasemapPreference).toHaveBeenCalled())

    await act(async () => {
      result.current.setBasemap("satellite")
    })

    expect(result.current.basemap).toBe("satellite")
    expect(mockSaveBasemapPreference).toHaveBeenCalledWith("satellite")
  })

  test("ignores a load that resolves after unmount", async () => {
    let resolveLoad: (value: string) => void = () => {}
    mockLoadBasemapPreference.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const { result, unmount } = await renderHook(() => useBasemapPreference())

    unmount()
    await act(async () => {
      resolveLoad("satellite")
    })

    expect(result.current.basemap).toBe("map")
  })
})
