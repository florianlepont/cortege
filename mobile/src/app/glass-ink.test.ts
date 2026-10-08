jest.mock("react-native", () => ({ useColorScheme: () => mockUseColorScheme() }))

const mockUseColorScheme = jest.fn<string | null | undefined, []>()

import { createElement, type ReactNode } from "react"
import { cleanup, renderHook } from "@testing-library/react-native/pure"
import { BrandThemeProvider, GlassInkProvider, defaultTheme, useBrandTheme } from "./theme"
import { glassInkDark } from "./visual-tokens"

beforeEach(() => {
  mockUseColorScheme.mockReset().mockReturnValue("light")
})

afterEach(async () => {
  await cleanup()
})

describe("GlassInkProvider (12.2-23 correction)", () => {
  const inGlass = ({ children }: { children?: ReactNode }) =>
    createElement(BrandThemeProvider, null, createElement(GlassInkProvider, null, children))

  test("dark: its content reads the brighter secondary and danger inks", async () => {
    mockUseColorScheme.mockReturnValue("dark")
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: inGlass })

    expect(result.current.scheme).toBe("dark")
    expect(result.current.colors.textSecondary).toBe(glassInkDark.textSecondary)
    expect(result.current.onSurface.danger).toBe(glassInkDark.danger)
  })

  test("light: its content keeps the theme's own ink", async () => {
    const { result } = await renderHook(() => useBrandTheme(), { wrapper: inGlass })

    expect(result.current.scheme).toBe("light")
    expect(result.current.colors.textSecondary).toBe(defaultTheme.colors.textSecondary)
  })
})
