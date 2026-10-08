jest.mock("react-native", () => ({
  useColorScheme: () => "light",
  StyleSheet: { create: <T>(styles: T): T => styles },
}))

import { contrastRatio } from "../../app/contrast"
import { buildTheme } from "../../app/theme"
import { createSearchStyles } from "./search.styles"

describe("search page cancel label", () => {
  it.each(["light", "dark"] as const)(
    "is the accent text token and meets AA on the %s canvas",
    (scheme) => {
      const theme = buildTheme(scheme)
      const { cancel, container, top } = createSearchStyles(theme)

      expect(cancel.color).toBe(theme.visual.accentText)
      // D-19: the page and its top block draw no colour: the route's ScreenFrame paints the canvas
      // (and the halo, whose cores are checked in visual-tokens.test.ts) behind them.
      expect("backgroundColor" in container).toBe(false)
      expect("backgroundColor" in top).toBe(false)
      expect(contrastRatio(String(cancel.color), theme.colors.canvas)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it("keeps the brand forest green in light mode and a light green in dark mode", () => {
    const light = createSearchStyles(buildTheme("light"))
    const dark = createSearchStyles(buildTheme("dark"))
    expect(light.cancel.color).toBe("#334E2B")
    expect(dark.cancel.color).toBe("#9BC26A")
  })
})
