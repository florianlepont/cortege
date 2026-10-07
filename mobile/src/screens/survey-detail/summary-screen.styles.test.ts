import { brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
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
