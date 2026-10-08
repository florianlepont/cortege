import { brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { FINISH_BAR } from "./finish-bar-layout"
import { createSummaryScreenStyles } from "./summary-screen.styles"

jest.mock("react-native", () => ({
  StyleSheet: { create: <T>(styles: T): T => styles, absoluteFill: {} },
}))

describe("sub-page content (Score, Historique, Contexte)", () => {
  test("blocks are 24 pt apart and the padding is on the 4 grid", () => {
    const { subContent } = createSummaryScreenStyles(defaultTheme)
    expect(subContent.gap).toBe(brandSpacing4.lg)
    expect(subContent.padding).toBe(brandSpacing4.md)
    expect(subContent.paddingBottom).toBe(brandSpacing4.xxl)
  })
})

describe("floating finish bar (D-27c)", () => {
  test.each(["light", "dark"] as const)(
    "has no opaque fill, floats at the bottom edge and keeps the air above the button (%s)",
    () => {
      const { bottomBar } = createSummaryScreenStyles(defaultTheme)
      expect(bottomBar).not.toHaveProperty("backgroundColor")
      expect(bottomBar).not.toHaveProperty("experimental_backgroundImage")
      expect(bottomBar).toMatchObject({
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: FINISH_BAR.paddingTop,
      })
    },
  )
})
