jest.mock("react-native", () => ({
  useColorScheme: () => "light",
  StyleSheet: { create: <T>(styles: T): T => styles },
}))
jest.mock("../../storage/theme-preference", () => ({
  DEFAULT_THEME_MODE: "automatic",
  loadThemeModePreference: jest.fn(),
  saveThemeModePreference: jest.fn(),
}))

import { contrastRatio } from "../../app/contrast"
import { buildTheme } from "../../app/theme"
import { createSearchStyles } from "./search.styles"

describe("search page cancel label", () => {
  it.each(["light", "dark"] as const)(
    "is the accent text token and meets AA on the %s canvas",
    (scheme) => {
      const theme = buildTheme("automatic", scheme, () => {})
      const { cancel, container } = createSearchStyles(theme)

      expect(cancel.color).toBe(theme.visual.accentText)
      expect(container.backgroundColor).toBe(theme.colors.canvas)
      expect(contrastRatio(String(cancel.color), theme.colors.canvas)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it("keeps the brand forest green in light mode and a light green in dark mode", () => {
    const light = createSearchStyles(buildTheme("automatic", "light", () => {}))
    const dark = createSearchStyles(buildTheme("automatic", "dark", () => {}))
    expect(light.cancel.color).toBe("#334E2B")
    expect(dark.cancel.color).toBe("#9BC26A")
  })
})
