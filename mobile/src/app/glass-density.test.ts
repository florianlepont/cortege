jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import { compositeOver, contrastRatio } from "./contrast"
import { buildTheme, withGlassInk } from "./theme"
import {
  darkGlassTint,
  downloadBarColors,
  explorerSheetGlass,
  glassInkDark,
  liquidGlassDark,
  mapControlGlass,
} from "./visual-tokens"

// 12.2-23 correction (owner on iOS 26: "le verre en mode sombre n'était PAS assez transparent. Les
// panneaux du verre devraient être du verre natif et pas du flou"): the dark glass is translucent
// native Liquid Glass, no underlay, each tint the lowest that keeps its content legible. The glass is
// modelled as its tint laid flat over the basemap, the white plan being the worst case; the system's
// own blur, rim and material are not in the model (only the device shows them).
const themes = {
  light: buildTheme("light"),
  dark: buildTheme("dark"),
}
const backdrops = ["#FFFFFF", "#F2EFE9", "#6B7356", "#1C2618", "#000000"]

function alphaOf(rgba: string): number {
  return Number(/, (\d(\.\d+)?)\)$/.exec(rgba)?.[1])
}

/** The same colour at another alpha. */
function atAlpha(rgba: string, alpha: number): string {
  return rgba.replace(/, (\d(\.\d+)?)\)$/, `, ${alpha})`)
}

/** The lowest ratio of `ink` on `glass` over every basemap. */
function worst(ink: string, glass: string): number {
  return Math.min(
    ...backdrops.map((backdrop) => contrastRatio(ink, compositeOver(glass, backdrop))),
  )
}

const inked = withGlassInk(themes.dark)
const glassTexts = [
  inked.colors.textPrimary,
  inked.colors.textSecondary,
  inked.semanticColors.textStrong,
  inked.onSurface.danger,
]

describe("dark Liquid Glass is translucent (12.2-23 correction)", () => {
  const { visual } = themes.dark

  test("no glass carries an underlay any more", () => {
    expect(JSON.stringify(visual)).not.toContain("underlay")
    expect(Object.keys(liquidGlassDark)).toEqual(["tint"])
    expect(Object.keys(visual.mapControl.glass).sort()).toEqual(["android", "fill", "tint"])
  })

  test("the tints are well under the 0.84 and 0.92 they replace, still a tint", () => {
    for (const tint of [
      visual.mapControl.glass.tint,
      visual.mapControl.glass.fill,
      visual.mapPanel.tint,
      visual.sheet.glass?.tint ?? "",
      liquidGlassDark.tint,
    ]) {
      expect(alphaOf(tint)).toBeGreaterThanOrEqual(0.6)
      expect(alphaOf(tint)).toBeLessThanOrEqual(0.7)
    }
    expect(visual.mapPanel.tint).toBe(darkGlassTint)
    expect(visual.sheet.glass?.tint).toBe(darkGlassTint)
    expect(liquidGlassDark.tint).toBe(darkGlassTint)
  })

  test("Android and the blur fallback keep their denser flat fills", () => {
    expect(visual.mapControl.glass.android).toBe("rgba(16, 24, 14, 0.94)")
    expect(visual.sheet.fill).toBe("rgba(17, 18, 20, 0.88)")
    expect(visual.sheet.glass).toEqual({
      tint: darkGlassTint,
      fill: explorerSheetGlass.dark.fill,
      android: explorerSheetGlass.dark.fill,
    })
    expect(visual.mapPanel).toEqual({
      tint: darkGlassTint,
      fill: visual.sheet.fill,
      android: visual.sheet.fill,
    })
  })

  test("map controls: icons 3:1 and labels 4.5:1 at 0.66, and 0.64 is too low", () => {
    const control = visual.mapControl
    const check = (glass: string) =>
      worst(control.icon, glass) >= 3 &&
      worst(control.text, glass) >= 4.5 &&
      worst(control.textMuted, glass) >= 4.5
    expect(alphaOf(control.glass.tint)).toBe(0.66)
    expect(check(control.glass.tint)).toBe(true)
    expect(check(atAlpha(control.glass.tint, 0.64))).toBe(false)
    // The muted label it had needed a 0.72 glass.
    expect(worst("#C9CED3", control.glass.tint)).toBeLessThan(4.5)
  })

  test("sheet, map panel and default glass: the glass ink reads at 4.5:1, and 0.66 is too low", () => {
    for (const text of glassTexts) expect(worst(text, darkGlassTint)).toBeGreaterThanOrEqual(4.5)
    const lower = atAlpha(darkGlassTint, 0.66)
    expect(glassTexts.some((text) => worst(text, lower) < 4.5)).toBe(true)
  })

  test("the theme's own secondary and danger inks would not read on that glass", () => {
    expect(worst(themes.dark.colors.textSecondary, darkGlassTint)).toBeLessThan(4.5)
    expect(worst(themes.dark.onSurface.danger, darkGlassTint)).toBeLessThan(4.5)
  })

  test("no tint from 0.35 to 0.5 can carry text over the white plan, even pure white", () => {
    for (const alpha of [0.35, 0.4, 0.45, 0.5]) {
      for (const tint of [mapControlGlass.dark.tint, darkGlassTint]) {
        expect(
          contrastRatio("#FFFFFF", compositeOver(atAlpha(tint, alpha), "#FFFFFF")),
        ).toBeLessThan(4.5)
      }
    }
  })

  test("on the sheet glass the close circle, handle and download bar keep their ratios", () => {
    const { sheet } = inked.visual
    for (const backdrop of backdrops) {
      const surface = compositeOver(darkGlassTint, backdrop)
      const circle = compositeOver(sheet.close.tint, surface)
      expect(contrastRatio(sheet.closeIcon, circle)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(compositeOver(sheet.closeHairline, circle), surface)).toBeGreaterThan(
        1.3,
      )
      expect(contrastRatio(compositeOver(sheet.handle, surface), surface)).toBeGreaterThan(1.5)
      expect(contrastRatio(downloadBarColors.dark.fill, surface)).toBeGreaterThanOrEqual(3)
    }
  })
})

describe("glass ink theme (12.2-23 correction)", () => {
  test("dark: only the secondary and danger inks change, every derived token follows", () => {
    expect(inked.colors).toEqual({
      ...themes.dark.colors,
      textSecondary: glassInkDark.textSecondary,
    })
    expect(inked.onSurface).toEqual({ ...themes.dark.onSurface, danger: glassInkDark.danger })
    expect(inked.semanticColors.textSecondary).toBe(glassInkDark.textSecondary)
    expect(inked.colors.textPrimary).toBe(themes.dark.colors.textPrimary)
    expect(inked.scheme).toBe("dark")
  })

  test("one theme per theme, and light content keeps the theme's own ink", () => {
    expect(withGlassInk(themes.dark)).toBe(inked)
    expect(withGlassInk(themes.light)).toBe(themes.light)
  })
})

describe("light glass is unchanged (12.2-23)", () => {
  const { visual } = themes.light

  test("the same tints and fills as before, no native sheet glass", () => {
    expect(visual.mapControl.glass).toEqual({
      tint: "rgba(247, 246, 240, 0.76)",
      fill: "rgba(247, 246, 240, 0.76)",
      android: "rgba(247, 246, 240, 0.92)",
    })
    expect(visual.sheet.fill).toBe("rgba(247, 246, 240, 0.88)")
    expect(visual.sheet).not.toHaveProperty("glass")
    expect(visual.mapPanel).toEqual({
      tint: visual.sheet.fill,
      fill: visual.sheet.fill,
      android: visual.sheet.fill,
    })
  })
})
