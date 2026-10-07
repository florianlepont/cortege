jest.mock("react-native", () => ({ useColorScheme: () => "light" }))
jest.mock("../../storage/theme-preference", () => ({
  DEFAULT_THEME_MODE: "automatic",
  loadThemeModePreference: jest.fn(),
  saveThemeModePreference: jest.fn(),
}))

import { brandColors } from "../../app/brand-tokens"
import { contrastRatio } from "../../app/contrast"
import { buildTheme } from "../../app/theme"
import { permissionIconColors } from "./permission-icons"

describe.each(["light", "dark"] as const)("permissionIconColors, %s scheme", (scheme) => {
  const theme = buildTheme("automatic", scheme, () => {})
  const colors = permissionIconColors(theme)

  test("the location and camera icon clears 3:1 against its tile", () => {
    expect(contrastRatio(colors.icon, colors.tile)).toBeGreaterThanOrEqual(3)
  })

  test("the icon is in fact readable as text on its soft tile (4.5:1)", () => {
    expect(contrastRatio(colors.icon, colors.tile)).toBeGreaterThanOrEqual(4.5)
  })

  test("the granted check and the denied cross clear 3:1 against the card", () => {
    expect(contrastRatio(colors.grantedIcon, colors.card)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(colors.deniedIcon, colors.card)).toBeGreaterThanOrEqual(3)
  })

  test("the tile and card are the theme's own tokens", () => {
    expect(colors.tile).toBe(theme.colors.successSoft)
    expect(colors.card).toBe(theme.colors.panel)
    expect(colors.icon).toBe(theme.onSurface.success)
  })
})

test("the brand forest the icons used to carry fails on the dark tile, which is why they do not use it", () => {
  const dark = buildTheme("automatic", "dark", () => {})
  expect(contrastRatio(brandColors.forest, dark.colors.successSoft)).toBeLessThan(3)
  expect(permissionIconColors(dark).icon).not.toBe(brandColors.forest)
})
