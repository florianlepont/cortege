jest.mock("react-native", () => ({ useColorScheme: () => mockUseColorScheme() }))

const mockUseColorScheme = jest.fn<string | null | undefined, []>()
const mockLoadThemeModePreference = jest.fn()
const mockSaveThemeModePreference = jest.fn()

jest.mock("../storage/theme-preference", () => ({
  DEFAULT_THEME_MODE: "automatic",
  loadThemeModePreference: (...args: unknown[]) => mockLoadThemeModePreference(...args),
  saveThemeModePreference: (...args: unknown[]) => mockSaveThemeModePreference(...args),
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import { BrandThemeProvider, defaultTheme, useBrandTheme } from "./theme"

beforeEach(() => {
  mockUseColorScheme.mockReset().mockReturnValue("light")
  mockLoadThemeModePreference.mockReset().mockResolvedValue("automatic")
  mockSaveThemeModePreference.mockReset().mockResolvedValue(undefined)
})

afterEach(async () => {
  await cleanup()
})

describe("useBrandTheme outside a provider", () => {
  test("falls back to the light default theme instead of throwing", async () => {
    const { result } = await renderHook(() => useBrandTheme())
    expect(result.current).toBe(defaultTheme)
    expect(result.current.scheme).toBe("light")
    expect(result.current.mode).toBe("automatic")
  })
})

describe("BrandThemeProvider", () => {
  test("resolves 'automatic' to the OS dark scheme", async () => {
    mockUseColorScheme.mockReturnValue("dark")
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: BrandThemeProvider })

    await waitFor(() => expect(result.current.scheme).toBe("dark"))
    expect(result.current.colors.canvas).not.toBe(defaultTheme.colors.canvas)
  })

  test("resolves 'automatic' to the OS light scheme", async () => {
    mockUseColorScheme.mockReturnValue("light")
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: BrandThemeProvider })

    await waitFor(() => expect(mockLoadThemeModePreference).toHaveBeenCalled())
    expect(result.current.scheme).toBe("light")
  })

  test("loads a persisted explicit mode and ignores the OS scheme", async () => {
    mockUseColorScheme.mockReturnValue("light")
    mockLoadThemeModePreference.mockResolvedValue("dark")
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: BrandThemeProvider })

    await waitFor(() => expect(result.current.mode).toBe("dark"))
    expect(result.current.scheme).toBe("dark")
  })

  test("setMode updates the resolved theme immediately and persists in the background", async () => {
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: BrandThemeProvider })
    await waitFor(() => expect(mockLoadThemeModePreference).toHaveBeenCalled())

    await act(async () => {
      result.current.setMode("dark")
    })

    expect(result.current.mode).toBe("dark")
    expect(result.current.scheme).toBe("dark")
    expect(mockSaveThemeModePreference).toHaveBeenCalledWith("dark")
  })

  test("ignores a load that resolves after unmount", async () => {
    let resolveLoad: (value: string) => void = () => {}
    mockLoadThemeModePreference.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveLoad = resolve
      }),
    )
    const { result, unmount } = await renderHook(() => useBrandTheme(), {
      wrapper: BrandThemeProvider,
    })

    unmount()
    await act(async () => {
      resolveLoad("dark")
    })

    expect(result.current.mode).toBe("automatic")
  })
})
