/**
 * Tests for useSearchRecents: loaded on mount, newest first on save, updated from storage on
 * remove, clear and reload, and silent when an answer arrives after unmount.
 */

jest.mock("react-native", () => ({}))

const mockLoad = jest.fn()
const mockSave = jest.fn()
const mockRemove = jest.fn()
const mockClear = jest.fn()
jest.mock("../storage/search-recents", () => ({
  loadSearchRecents: (...args: unknown[]) => mockLoad(...args),
  saveSearchRecent: (...args: unknown[]) => mockSave(...args),
  removeSearchRecent: (...args: unknown[]) => mockRemove(...args),
  clearSearchRecents: (...args: unknown[]) => mockClear(...args),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { useSearchRecents } from "./useSearchRecents"

beforeEach(() => {
  mockLoad.mockReset().mockResolvedValue(["Marie", "Lyon"])
  mockSave.mockReset()
  mockRemove.mockReset()
  mockClear.mockReset().mockResolvedValue(undefined)
})

afterEach(async () => {
  await cleanup()
})

describe("useSearchRecents", () => {
  it("loads the list on mount", async () => {
    const { result } = await renderHook(() => useSearchRecents())
    expect(result.current.recents).toEqual(["Marie", "Lyon"])
    expect(mockLoad).toHaveBeenCalledTimes(1)
  })

  it("puts a saved search first", async () => {
    mockSave.mockResolvedValue(["Fontainebleau", "Marie", "Lyon"])
    const { result } = await renderHook(() => useSearchRecents())
    await act(async () => {
      await result.current.save("Fontainebleau")
    })
    expect(mockSave).toHaveBeenCalledWith("Fontainebleau")
    expect(result.current.recents).toEqual(["Fontainebleau", "Marie", "Lyon"])
  })

  it("removes one search, clears the list and reloads from storage", async () => {
    mockRemove.mockResolvedValue(["Lyon"])
    const { result } = await renderHook(() => useSearchRecents())
    await act(async () => {
      await result.current.remove("Marie")
    })
    expect(mockRemove).toHaveBeenCalledWith("Marie")
    expect(result.current.recents).toEqual(["Lyon"])

    await act(async () => {
      await result.current.clear()
    })
    expect(mockClear).toHaveBeenCalledTimes(1)
    expect(result.current.recents).toEqual([])

    mockLoad.mockResolvedValue(["Autun"])
    await act(async () => {
      await result.current.reload()
    })
    expect(result.current.recents).toEqual(["Autun"])
  })

  it("keeps the callbacks stable across renders", async () => {
    const { result, rerender } = await renderHook(() => useSearchRecents())
    const first = result.current
    await rerender({})
    expect(result.current.save).toBe(first.save)
    expect(result.current.remove).toBe(first.remove)
    expect(result.current.clear).toBe(first.clear)
    expect(result.current.reload).toBe(first.reload)
  })

  it("ignores an answer that arrives after unmount", async () => {
    let resolveLoad: (value: string[]) => void = () => undefined
    mockLoad.mockReturnValueOnce(
      new Promise<string[]>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const { result, unmount } = await renderHook(() => useSearchRecents())
    await unmount()
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined)
    await act(async () => {
      resolveLoad(["late"])
      await Promise.resolve()
    })
    expect(result.current.recents).toEqual([])
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
