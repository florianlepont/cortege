jest.mock("react-native", () => ({ useColorScheme: () => "light" }))
jest.mock("../storage/theme-preference", () => ({
  DEFAULT_THEME_MODE: "automatic",
  loadThemeModePreference: jest.fn(),
  saveThemeModePreference: jest.fn(),
}))

import { brandColors } from "./brand-tokens"
import { compositeOver, contrastRatio, relativeLuminance } from "./contrast"
import { buildTheme, defaultTheme, type BrandTheme } from "./theme"
import {
  brandGlassFills,
  buildForestHeroImage,
  buildForestImage,
  buildLinearGradient,
  buildRadialGradient,
  forestStops,
  mixWithWhite,
  withAlpha,
} from "./visual-tokens"

const noop = () => {}
const themes: Record<"light" | "dark", BrandTheme> = {
  light: buildTheme("automatic", "light", noop),
  dark: buildTheme("automatic", "dark", noop),
}
const schemes = ["light", "dark"] as const
const stops = [forestStops.a, forestStops.b, forestStops.c]

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value)
  else if (value && typeof value === "object") {
    Object.values(value).forEach((child) => collectStrings(child, out))
  }
  return out
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ""
  for (const char of value) {
    if (char === "(") depth += 1
    if (char === ")") depth -= 1
    if (char === "," && depth === 0) {
      parts.push(current.trim())
      current = ""
    } else current += char
  }
  parts.push(current.trim())
  return parts
}

describe("contrast helpers", () => {
  test("black on white is 21:1 and luminance bounds hold", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5)
    expect(relativeLuminance("#000000")).toBe(0)
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5)
  })

  test("compositeOver returns a #RRGGBB string", () => {
    expect(compositeOver("rgba(255, 255, 255, 0.14)", "#334E2B")).toMatch(/^#[0-9A-F]{6}$/)
    expect(compositeOver("rgba(255, 255, 255, 0)", "#334E2B")).toBe("#334E2B")
    expect(compositeOver("#FFFFFF", "#000000")).toBe("#FFFFFF")
  })

  test("an rgba foreground is composited before the ratio is taken", () => {
    const ratio = contrastRatio("rgba(255, 255, 255, 0.5)", "#000000")
    expect(ratio).toBeCloseTo(
      contrastRatio(compositeOver("rgba(255, 255, 255, 0.5)", "#000000"), "#000000"),
    )
  })

  test("rejects unsupported colour formats", () => {
    expect(() => relativeLuminance("#FFF")).toThrow()
    expect(() => relativeLuminance("red")).toThrow()
    expect(() => relativeLuminance("rgba(a, b, c)")).toThrow()
  })
})

describe("gradient and colour builders", () => {
  test("linear and radial gradients join colour and percent stops", () => {
    expect(
      buildLinearGradient(140, [
        ["#000000", 0],
        ["#FFFFFF", 100],
      ]),
    ).toBe("linear-gradient(140deg, #000000 0%, #FFFFFF 100%)")
    expect(
      buildRadialGradient("10% 20% at 0% 0%", [
        ["#000000", 0],
        ["rgba(0, 0, 0, 0)", 50],
      ]),
    ).toBe("radial-gradient(10% 20% at 0% 0%, #000000 0%, rgba(0, 0, 0, 0) 50%)")
  })

  test("forest images stack the halo over the base", () => {
    expect(buildForestImage("#6F9A3C")).toBe(
      "radial-gradient(120% 150% at 88% -10%, #6F9A3C 0%, rgba(111, 154, 60, 0) 58%), linear-gradient(140deg, #1D3418 0%, #334E2B 55%, #0E2210 100%)",
    )
    expect(buildForestHeroImage("#6F9A3C")).toBe(
      "radial-gradient(110% 130% at 100% -10%, #6F9A3C 0%, rgba(111, 154, 60, 0) 55%), linear-gradient(150deg, #1D3418 0%, #334E2B 60%, #0E2210 100%)",
    )
  })

  test("mixWithWhite and withAlpha", () => {
    expect(mixWithWhite("#000000", 0.2)).toBe("#333333")
    expect(mixWithWhite("#FFFFFF", 0.5)).toBe("#FFFFFF")
    expect(withAlpha("#CD5833", 0.4)).toBe("rgba(205, 88, 51, 0.4)")
  })

  test("the iOS control glass fill equals the pre-12.2 GlassSurface literals", () => {
    expect(brandGlassFills.control.light).toBe("rgba(247, 246, 240, 0.38)")
    expect(brandGlassFills.control.dark).toBe("rgba(8, 13, 19, 0.38)")
    expect(brandGlassFills.android.light).toBe("rgba(247, 246, 240, 0.92)")
    expect(brandGlassFills.android.dark).toBe("rgba(24, 25, 28, 0.90)")
  })
})

describe("BrandTheme.visual", () => {
  test("exists in both schemes and the default theme is the light one", () => {
    expect(themes.light.visual).toBeDefined()
    expect(themes.dark.visual).toBeDefined()
    expect(defaultTheme.visual).toEqual(themes.light.visual)
  })

  test("Graphite dark neutrals are unchanged (D-03)", () => {
    expect(themes.dark.colors.canvas).toBe("#08090A")
    expect(themes.dark.colors.panel).toBe("#111214")
    expect(themes.dark.colors.textSecondary).toBe("#9A9FA6")
  })

  test("light ring and bar high tone is darker than brand moss (D-16)", () => {
    expect(themes.light.visual.score.high).toBe("#728A2D")
    expect(themes.light.visual.factorBar.high.base).toBe("#728A2D")
    expect(themes.dark.visual.score.high).toBe(brandColors.moss)
    expect(themes.dark.visual.factorBar.high.base).toBe(brandColors.moss)
  })

  test("the dark forest halo core is dimmer than the light one (D-14)", () => {
    expect(themes.dark.visual.forest.image).toContain("rgba(111, 154, 60, 0.55)")
    expect(themes.dark.visual.forest.heroImage).toContain("rgba(111, 154, 60, 0.55)")
    expect(themes.light.visual.forest.image).toContain("#6F9A3C")
    expect(themes.light.visual.forest.image).not.toContain("0.55)")
  })

  test.each(schemes)("no forbidden sketch colour in the %s visual tree", (scheme) => {
    const all = collectStrings(themes[scheme].visual).join("|").toLowerCase()
    for (const forbidden of ["#8a9482", "#62666d", "#4c7a2a"]) {
      expect(all).not.toContain(forbidden)
    }
  })

  test.each(schemes)("every %s gradient is well formed", (scheme) => {
    const gradients = collectStrings(themes[scheme].visual).filter((value) =>
      /^(radial|linear)-gradient\(/.test(value),
    )
    expect(gradients.length).toBeGreaterThan(5)
    for (const gradient of gradients) {
      const opens = gradient.split("(").length - 1
      const closes = gradient.split(")").length - 1
      expect(opens).toBe(closes)
      for (const layer of splitTopLevel(gradient)) {
        expect(layer).toMatch(/^(radial|linear)-gradient\(/)
      }
    }
    for (const value of collectStrings(themes[scheme].visual)) {
      for (const rgba of value.match(/rgba\([^)]*\)/g) ?? []) {
        expect(rgba).toMatch(/^rgba\(\d+, \d+, \d+, \d(\.\d+)?\)$/)
      }
    }
  })

  test.each(schemes)("every %s boxShadow token is well formed", (scheme) => {
    const visual = themes[scheme].visual
    const shadows = [
      visual.forest.shadow,
      visual.forest.highlight,
      visual.forest.glowShadow,
      visual.pill.shadow,
      visual.glass.cardShadow,
      visual.tab.dotShadow,
      visual.factorBar.low.shadow,
      visual.factorBar.mid.shadow,
      visual.factorBar.high.shadow,
    ]
    const layer =
      /^(inset )?-?\d+(px)? -?\d+(px)? \d+(px)?( -?\d+px)? (rgba\([^)]*\)|#[0-9A-Fa-f]{6})$/
    for (const shadow of shadows) {
      for (const part of splitTopLevel(shadow)) expect(part).toMatch(layer)
    }
  })
})

describe.each(schemes)("contrast pairs, %s scheme", (scheme) => {
  const theme = themes[scheme]
  const { visual, colors } = theme
  const forest = visual.forest

  test.each(["title", "titleAccent", "body", "sage"] as const)(
    "forest %s on the three stops",
    (key) => {
      for (const stop of stops) expect(contrastRatio(forest[key], stop)).toBeGreaterThanOrEqual(4.5)
    },
  )

  test("tag text on the 14% white tag fill over each stop", () => {
    for (const stop of stops) {
      const fill = compositeOver(forest.tagFill, stop)
      expect(contrastRatio(forest.tagText, fill)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test("pill label on the pill top and fallback", () => {
    expect(contrastRatio(visual.pill.label, visual.pill.top)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(visual.pill.label, visual.pill.fallback)).toBeGreaterThanOrEqual(4.5)
  })

  test("numeral end on the mid stop (large text)", () => {
    expect(contrastRatio(forest.numeralBottom, forestStops.b)).toBeGreaterThanOrEqual(3)
  })

  test("glow bar end on the track over the mid stop", () => {
    const track = compositeOver(forest.glowTrack, forestStops.b)
    expect(contrastRatio("#D5EC8F", track)).toBeGreaterThanOrEqual(3)
  })

  test("score tones and factor bars on the panel (graphics)", () => {
    for (const tone of [visual.score.low, visual.score.mid, visual.score.high]) {
      expect(contrastRatio(tone, colors.panel)).toBeGreaterThanOrEqual(3)
    }
    for (const bar of Object.values(visual.factorBar)) {
      expect(contrastRatio(bar.base, colors.panel)).toBeGreaterThanOrEqual(3)
    }
  })

  test("secondary text on the panel", () => {
    expect(contrastRatio(colors.textSecondary, colors.panel)).toBeGreaterThanOrEqual(4.5)
  })

  test("active chip text on the active chip fill", () => {
    expect(contrastRatio(visual.chip.activeText, visual.chip.activeBg)).toBeGreaterThanOrEqual(4.5)
  })

  test("active tab tint on the glass tab background over the canvas", () => {
    const background = compositeOver(visual.tab.background, colors.canvas)
    expect(contrastRatio(visual.tab.activeTint, background)).toBeGreaterThanOrEqual(4.5)
  })

  test("accent text on the panel and on the canvas", () => {
    expect(contrastRatio(visual.accentText, colors.panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(visual.accentText, colors.canvas)).toBeGreaterThanOrEqual(4.5)
  })

  test("row text stays readable under the green press wave at its full strength (D-21)", () => {
    const wave = compositeOver(visual.pressWave, colors.panel)
    expect(contrastRatio(colors.textPrimary, wave)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.textSecondary, wave)).toBeGreaterThanOrEqual(4.5)
  })
})
