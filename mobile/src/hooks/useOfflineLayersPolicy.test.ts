jest.mock("react-native", () => ({}))

const mockLoad = jest.fn()
const mockSave = jest.fn()
let mockFocused = true

jest.mock("../storage/offline-layers-policy", () => ({
  DEFAULT_OFFLINE_LAYERS_POLICY: "all",
  loadOfflineLayersPolicy: (...args: unknown[]) => mockLoad(...args),
  saveOfflineLayersPolicy: (...args: unknown[]) => mockSave(...args),
}))
jest.mock("../ui/useScreenFocus", () => ({
  useScreenFocus: () => mockFocused,
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import { useOfflineLayersPolicy } from "./useOfflineLayersPolicy"

beforeEach(() => {
  mockFocused = true
  mockLoad.mockReset().mockResolvedValue("all")
  mockSave.mockReset().mockResolvedValue(undefined)
})

afterEach(async () => {
  await cleanup()
})

describe("useOfflineLayersPolicy", () => {
  test("starts at 'all', then shows the stored policy once loaded", async () => {
    let resolveLoad: (value: string) => void = () => {}
    mockLoad.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const { result } = await renderHook(() => useOfflineLayersPolicy())

    expect(result.current.policy).toBe("all")
    await act(async () => {
      resolveLoad("base")
    })
    expect(result.current.policy).toBe("base")
  })

  test("loads again when the screen regains focus", async () => {
    mockFocused = false
    const { result, rerender } = await renderHook(() => useOfflineLayersPolicy())
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(1))
    expect(result.current.policy).toBe("all")

    mockLoad.mockResolvedValue("base")
    mockFocused = true
    await rerender({})

    await waitFor(() => expect(result.current.policy).toBe("base"))
    expect(mockLoad).toHaveBeenCalledTimes(2)
  })

  test("setPolicy updates the state at once and saves once", async () => {
    const { result } = await renderHook(() => useOfflineLayersPolicy())
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())

    await act(async () => {
      result.current.setPolicy("base")
    })

    expect(result.current.policy).toBe("base")
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave).toHaveBeenCalledWith("base")
  })

  test("setPolicy with the current value saves nothing", async () => {
    const { result } = await renderHook(() => useOfflineLayersPolicy())
    await waitFor(() => expect(mockLoad).toHaveBeenCalled())

    await act(async () => {
      result.current.setPolicy("all")
    })

    expect(result.current.policy).toBe("all")
    expect(mockSave).not.toHaveBeenCalled()
  })

  test("reload reads the stored policy again", async () => {
    const { result } = await renderHook(() => useOfflineLayersPolicy())
    await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(1))

    mockLoad.mockResolvedValue("base")
    await act(async () => {
      await result.current.reload()
    })

    expect(result.current.policy).toBe("base")
  })

  test("ignores a load that resolves after unmount", async () => {
    let resolveLoad: (value: string) => void = () => {}
    mockLoad.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const { result, unmount } = await renderHook(() => useOfflineLayersPolicy())

    await unmount()
    await act(async () => {
      resolveLoad("base")
    })

    expect(result.current.policy).toBe("all")
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
