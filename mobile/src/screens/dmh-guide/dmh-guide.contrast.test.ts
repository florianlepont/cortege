jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import { contrastRatio } from "../../app/contrast"
import { buildTheme } from "../../app/theme"

// Redesign brief B-C2 item 4: the inks of the tinted callout (success-soft fill, no border) of the
// group page and the sources page. Text is 4.5:1 (WCAG 1.4.3).
const TEXT = 4.5

describe.each(["light", "dark"] as const)("guide callout contrast, %s scheme", (scheme) => {
  const { colors, onSurface, componentColors } = buildTheme(scheme)
  const fill = componentColors.statusChip.successBackground

  test("the fill is the success-soft neutral", () => {
    expect(fill).toBe(colors.successSoft)
  })

  test.each([
    ["the heading (onSurface.success)", onSurface.success],
    ["the rule and note text (textPrimary)", colors.textPrimary],
    ["the captions (textSecondary)", colors.textSecondary],
  ])("%s is at least 4.5:1 on the fill", (_name, ink) => {
    expect(contrastRatio(ink, fill)).toBeGreaterThanOrEqual(TEXT)
  })
})
