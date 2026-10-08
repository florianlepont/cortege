jest.mock("react-native", () => ({ useColorScheme: () => mockUseColorScheme() }))

const mockUseColorScheme = jest.fn<string | null | undefined, []>()

import { readFileSync } from "fs"
import { join } from "path"
import { cleanup, renderHook } from "@testing-library/react-native/pure"
import { BrandThemeProvider, defaultTheme, useBrandTheme } from "./theme"

beforeEach(() => {
  mockUseColorScheme.mockReset().mockReturnValue("light")
})

afterEach(async () => {
  await cleanup()
})

describe("useBrandTheme outside a provider", () => {
  test("falls back to the light default theme instead of throwing", async () => {
    const { result } = await renderHook(() => useBrandTheme())
    expect(result.current).toBe(defaultTheme)
    expect(result.current.scheme).toBe("light")
  })
})

// Owner decision (2026-10-08): the theme follows the system appearance only, no in-app setting.
describe("BrandThemeProvider", () => {
  test("follows the system dark scheme", async () => {
    mockUseColorScheme.mockReturnValue("dark")
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: BrandThemeProvider })

    expect(result.current.scheme).toBe("dark")
    expect(result.current.colors.canvas).not.toBe(defaultTheme.colors.canvas)
  })

  test("follows the system light scheme", async () => {
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: BrandThemeProvider })

    expect(result.current).toBe(defaultTheme)
  })

  test("falls back to light when the system reports no scheme", async () => {
    mockUseColorScheme.mockReturnValue(null)
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: BrandThemeProvider })

    expect(result.current.scheme).toBe("light")
  })

  test("reacts live to a system change, with one stable theme per scheme", async () => {
    const { result, rerender } = await renderHook(() => useBrandTheme(), {
      wrapper: BrandThemeProvider,
    })
    const light = result.current

    mockUseColorScheme.mockReturnValue("dark")
    await rerender({})
    const dark = result.current
    expect(dark.scheme).toBe("dark")

    await rerender({})
    expect(result.current).toBe(dark)

    mockUseColorScheme.mockReturnValue("light")
    await rerender({})
    expect(result.current).toBe(light)
  })

  test("no theme preference is read or written, and UIKit is never forced", () => {
    const source = readFileSync(join(__dirname, "theme.ts"), "utf8")
    expect(source).not.toMatch(/from "\.\.\/storage|getDb\(/)
    expect(source).not.toMatch(/Appearance/)
  })
})
