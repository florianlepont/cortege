jest.mock("react-native", () => ({ useColorScheme: () => "light" }))
jest.mock("../storage/theme-preference", () => ({
  DEFAULT_THEME_MODE: "automatic",
  loadThemeModePreference: jest.fn(),
  saveThemeModePreference: jest.fn(),
}))

import { compositeOver, contrastRatio, relativeLuminance } from "./contrast"
import { buildTheme } from "./theme"
import { explorerSheetGlass, liquidGlassDark, mapControlGlass } from "./visual-tokens"

// 12.2-23 (owner on iOS 26 in dark: "tous les boutons et les fenêtres avec les effets Liquid Glass
// vont vers leur transparence"): the dark glass floating over a map or an image is dense. On the
// Liquid Glass the surface is the underlay (behind the glass) under the tint; on older iOS the fill
// lies over the blur; Android keeps its flat fill. Light is unchanged.
const noop = () => {}
const themes = {
  light: buildTheme("automatic", "light", noop),
  dark: buildTheme("automatic", "dark", noop),
}
const backdrops = ["#FFFFFF", "#F2EFE9", "#6B7356", "#1C2618", "#000000"]

function alphaOf(rgba: string): number {
  return Number(/, (\d(\.\d+)?)\)$/.exec(rgba)?.[1])
}

/** The Liquid Glass stack modelled as plain layers: the underlay, then the tint, over `backdrop`. */
function liquidStack(glass: { tint: string; underlay?: string }, backdrop: string): string {
  const under = glass.underlay ? compositeOver(glass.underlay, backdrop) : backdrop
  return compositeOver(glass.tint, under)
}

describe("dark Liquid Glass density (12.2-23)", () => {
  const { visual, colors } = themes.dark

  test("the map controls' glass is near opaque: 0.92 tint and fill, a dense underlay", () => {
    const glass = visual.mapControl.glass
    expect(alphaOf(glass.tint)).toBeGreaterThanOrEqual(0.92)
    expect(alphaOf(glass.fill)).toBeGreaterThanOrEqual(0.92)
    expect(glass.underlay).toBe(mapControlGlass.dark.underlay)
    expect(alphaOf(glass.underlay ?? "")).toBeGreaterThanOrEqual(0.85)
    // Still glass: nothing is fully opaque, so the system blur and rim keep something to show.
    for (const value of [glass.tint, glass.fill, glass.android, glass.underlay ?? ""]) {
      expect(alphaOf(value)).toBeLessThan(1)
    }
    expect(alphaOf(glass.android)).toBeGreaterThanOrEqual(alphaOf(glass.fill))
  })

  test("the sheets and the map panel take the 0.96 fill, the panel also as its underlay", () => {
    expect(visual.sheet.fill).toBe(explorerSheetGlass.dark.fill)
    expect(alphaOf(visual.sheet.fill)).toBeGreaterThanOrEqual(0.96)
    expect(alphaOf(visual.sheet.fill)).toBeLessThan(1)
    expect(visual.mapPanel).toEqual({
      tint: visual.sheet.fill,
      fill: visual.sheet.fill,
      android: visual.sheet.fill,
      underlay: visual.sheet.fill,
    })
  })

  test("a surface with no glass of its own gets the dense Graphite glass", () => {
    expect(alphaOf(liquidGlassDark.tint)).toBeGreaterThanOrEqual(0.92)
    expect(alphaOf(liquidGlassDark.underlay)).toBeGreaterThanOrEqual(0.85)
    for (const backdrop of backdrops) {
      const surface = liquidStack(liquidGlassDark, backdrop)
      expect(contrastRatio(colors.textPrimary, surface)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.textSecondary, surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test("over the white plan every dark glass stays dark: the map no longer shows through", () => {
    const stacks = [
      liquidStack(visual.mapControl.glass, "#FFFFFF"),
      liquidStack(visual.mapPanel, "#FFFFFF"),
      liquidStack(liquidGlassDark, "#FFFFFF"),
      compositeOver(visual.sheet.fill, "#FFFFFF"),
    ]
    for (const surface of stacks) expect(relativeLuminance(surface)).toBeLessThan(0.025)
  })

  test("the map control ink keeps its margin on the denser glass over every basemap", () => {
    const control = visual.mapControl
    for (const backdrop of backdrops) {
      const surface = liquidStack(control.glass, backdrop)
      expect(contrastRatio(control.icon, surface)).toBeGreaterThanOrEqual(7)
      expect(contrastRatio(control.text, surface)).toBeGreaterThanOrEqual(7)
      expect(contrastRatio(control.textMuted, surface)).toBeGreaterThanOrEqual(7)
    }
  })

  test("the 0.84 glass and the 0.88 sheet it replaces let the white plan through", () => {
    expect(relativeLuminance(compositeOver("rgba(16, 24, 14, 0.84)", "#FFFFFF"))).toBeGreaterThan(
      0.04,
    )
    expect(relativeLuminance(compositeOver("rgba(17, 18, 20, 0.88)", "#FFFFFF"))).toBeGreaterThan(
      0.025,
    )
  })
})

describe("light glass is unchanged (12.2-23)", () => {
  const { visual } = themes.light

  test("no underlay, the same tints and fills as before", () => {
    expect(visual.mapControl.glass).toEqual({
      tint: "rgba(247, 246, 240, 0.76)",
      fill: "rgba(247, 246, 240, 0.76)",
      android: "rgba(247, 246, 240, 0.92)",
    })
    expect(visual.sheet.fill).toBe("rgba(247, 246, 240, 0.88)")
    expect(visual.mapPanel).not.toHaveProperty("underlay")
  })
})
