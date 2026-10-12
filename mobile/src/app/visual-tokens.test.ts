jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import { brandColors, brandMapTokens } from "./brand-tokens"
import { compositeOver, contrastRatio, relativeLuminance } from "./contrast"
import { buildTheme, defaultTheme, withGlassInk, type BrandTheme } from "./theme"
import {
  brandGlassFills,
  buildEdgeGlow,
  buildEdgeGlowDeep,
  buildForestHeroImage,
  buildForestImage,
  buildInsetRing,
  buildLinearGradient,
  buildRadialGradient,
  downloadBarColors,
  downloadBarGeometry,
  edgeGlowGeometry,
  edgeGlowGreens,
  edgePulseMotion,
  explorerSheetGlass,
  forestStops,
  mixWithWhite,
  withAlpha,
} from "./visual-tokens"

const themes: Record<"light" | "dark", BrandTheme> = {
  light: buildTheme("light"),
  dark: buildTheme("dark"),
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

  test("the inset ring is a 1 pt inset box shadow with no blur (12.2-17)", () => {
    expect(buildInsetRing("rgba(255, 255, 255, 0.14)")).toBe(
      "inset 0 0 0 1px rgba(255, 255, 255, 0.14)",
    )
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
      visual.forest.edge,
      visual.forest.ring,
      visual.forest.glowShadow,
      visual.pill.shadow,
      visual.glass.cardShadow,
      visual.tab.dotShadow,
      visual.factorBar.low.shadow,
      visual.factorBar.mid.shadow,
      visual.factorBar.high.shadow,
      visual.edgeGlow,
    ]
    const layer =
      /^(inset )?-?\d+(px)? -?\d+(px)? \d+(px)?( -?\d+px)? (rgba\([^)]*\)|#[0-9A-Fa-f]{6})$/
    for (const shadow of shadows) {
      for (const part of splitTopLevel(shadow)) expect(part).toMatch(layer)
    }
  })
})

// 12.2-21 dark pass: every per-scheme token of UI-SPEC has its own dark value, so no light value
// leaks into the Graphite dark screens (and the reverse). The contrast pairs below then hold for
// each scheme's own values.
describe("dark pass: per-scheme tokens differ between light and dark (12.2-21)", () => {
  const perScheme: Record<string, (visual: BrandTheme["visual"]) => string> = {
    backdrop: (visual) => visual.backdrop,
    accentText: (visual) => visual.accentText,
    "glass.cardFill": (visual) => visual.glass.cardFill,
    "glass.cardBorder": (visual) => visual.glass.cardBorder,
    "glass.cardShadow": (visual) => visual.glass.cardShadow,
    "glass.controlFill": (visual) => visual.glass.controlFill,
    "glass.androidFill": (visual) => visual.glass.androidFill,
    "tab.activeTint": (visual) => visual.tab.activeTint,
    "tab.background": (visual) => visual.tab.background,
    "tab.border": (visual) => visual.tab.border,
    "chip.activeBg": (visual) => visual.chip.activeBg,
    "chip.activeText": (visual) => visual.chip.activeText,
    "score.high": (visual) => visual.score.high,
    "score.track": (visual) => visual.score.track,
    "score.neutral": (visual) => visual.score.neutral,
    "forest.image": (visual) => visual.forest.image,
    "forest.heroImage": (visual) => visual.forest.heroImage,
    "forest.shadow": (visual) => visual.forest.shadow,
    "mapPanel.fill": (visual) => visual.mapPanel.fill,
  }

  test.each(Object.keys(perScheme))("%s has its own dark value", (key) => {
    const light = perScheme[key](themes.light.visual)
    const dark = perScheme[key](themes.dark.visual)
    expect(light).toEqual(expect.any(String))
    expect(light.length).toBeGreaterThan(0)
    expect(dark).not.toBe(light)
  })

  test("the dark values are the darker surfaces and the lighter inks", () => {
    const { light, dark } = { light: themes.light.visual, dark: themes.dark.visual }
    // Glass and tab surfaces: dark over the dark canvas, light over the light one.
    for (const key of ["cardFill", "controlFill", "androidFill"] as const) {
      const overLight = compositeOver(light.glass[key], themes.light.colors.canvas)
      const overDark = compositeOver(dark.glass[key], themes.dark.colors.canvas)
      expect(relativeLuminance(overDark)).toBeLessThan(relativeLuminance(overLight))
    }
    // Inks read on their own scheme: the dark accent and active tab tint are the lighter greens.
    expect(relativeLuminance(dark.accentText)).toBeGreaterThan(relativeLuminance(light.accentText))
    expect(relativeLuminance(dark.tab.activeTint)).toBeGreaterThan(
      relativeLuminance(light.tab.activeTint),
    )
    expect(relativeLuminance(dark.chip.activeBg)).toBeGreaterThan(
      relativeLuminance(light.chip.activeBg),
    )
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

  test("forest body and title on the 9% white footer band of the resume card over each stop", () => {
    for (const stop of stops) {
      const band = compositeOver(forest.tileFill, stop)
      expect(contrastRatio(forest.body, band)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(forest.title, band)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test("pill label on the pill top and fallback", () => {
    expect(contrastRatio(visual.pill.label, visual.pill.top)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(visual.pill.label, visual.pill.fallback)).toBeGreaterThanOrEqual(4.5)
  })

  test("success and danger text on the glass card over the canvas (24 delta card)", () => {
    const card = compositeOver(visual.glass.cardFill, colors.canvas)
    expect(contrastRatio(theme.onSurface.success, card)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(theme.onSurface.danger, card)).toBeGreaterThanOrEqual(4.5)
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

  test("page text stays readable on each backdrop halo core over the canvas (D-19)", () => {
    // Every framed page draws its title and rows over the backdrop (ScreenFrame). Each of the two
    // radial layers starts at full strength at its own corner; text is checked on each core.
    const cores = splitTopLevel(visual.backdrop).map((layer) => {
      const first = /rgba\([^)]*\)/.exec(layer)
      if (!first) throw new Error(`No colour in ${layer}`)
      return compositeOver(first[0], colors.canvas)
    })
    expect(cores).toHaveLength(2)
    const texts = [
      colors.textPrimary,
      colors.textSecondary,
      theme.semanticColors.textStrong,
      visual.accentText,
    ]
    for (const core of cores) {
      for (const text of texts) expect(contrastRatio(text, core)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test("row text stays readable under the green press wave at its full strength (D-21)", () => {
    const wave = compositeOver(visual.pressWave, colors.panel)
    expect(contrastRatio(colors.textPrimary, wave)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.textSecondary, wave)).toBeGreaterThanOrEqual(4.5)
  })
})

describe.each(schemes)("forest glass call to action (D-27c, D-28), %s scheme", (scheme) => {
  const theme = themes[scheme]
  const { visual, colors } = theme
  const cta = visual.glassCta

  // The worst plausible backdrops behind the button, never the glass itself: the canvas, the panel,
  // the strongest point of each backdrop halo, and the extreme of the scheme (pure white in light,
  // pure black in dark) for content that scrolls behind the bar. The label is white on the forest in
  // both schemes, so the lightest backdrop the translucent fill can let through is the risk (pure
  // white in light), and the halos and the extreme cover it.
  const halos = splitTopLevel(visual.backdrop).map((layer) => {
    const first = /rgba\([^)]*\)/.exec(layer)
    if (!first) throw new Error(`No colour in ${layer}`)
    return compositeOver(first[0], colors.canvas)
  })
  const extreme = scheme === "light" ? "#FFFFFF" : "#000000"
  const backdrops = [colors.canvas, colors.panel, extreme, ...halos]
  // Every colour stop of the fallback's reflection, strongest first.
  const sheenStops = [...cta.sheen.matchAll(/rgba\([^)]*\)/g)].map((match) => match[0])

  function channels(hex: string): number[] {
    return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  }

  function saturation(hex: string): number {
    const rgb = channels(hex)
    const max = Math.max(...rgb)
    return max === 0 ? 0 : (max - Math.min(...rgb)) / max
  }

  test("the native glass tint is the charter forest and the white label reads at 4.5:1", () => {
    expect(cta.tint).toBe(brandColors.forest)
    expect(cta.tint).toBe("#334E2B")
    expect(cta.ink).toBe(brandColors.white)
    const [r, g, b] = channels(cta.tint)
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
    expect(contrastRatio(cta.ink, cta.tint)).toBeGreaterThanOrEqual(9)
    // The system's specular highlight lightens the glass: a white label must still read at 4.5:1
    // under a 20% white highlight (the specular is local to the top edge, never spread over the label).
    expect(
      contrastRatio(cta.ink, compositeOver("rgba(255, 255, 255, 0.2)", cta.tint)),
    ).toBeGreaterThanOrEqual(4.5)
  })

  test("the tint is the same forest in both schemes and darker than the brand moss it replaces", () => {
    expect(themes.light.visual.glassCta.tint).toBe(themes.dark.visual.glassCta.tint)
    expect(contrastRatio(cta.tint, brandColors.white)).toBeGreaterThan(
      contrastRatio(brandColors.moss, brandColors.white) * 2,
    )
  })

  test.each([
    ["flat fallback", "flat", "ink"],
    ["flat fallback, disabled", "flatOff", "inkOff"],
  ] as const)("the label reads at 4.5:1 on the %s over every backdrop", (_name, fill, ink) => {
    for (const backdrop of backdrops) {
      const effective = compositeOver(cta[fill], backdrop)
      expect(contrastRatio(cta[ink], effective)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test("the label still reads at 4.5:1 under every stop of the fallback's reflection", () => {
    expect(sheenStops.length).toBeGreaterThanOrEqual(2)
    for (const backdrop of backdrops) {
      const fill = compositeOver(cta.flat, backdrop)
      for (const stop of sheenStops) {
        expect(contrastRatio(cta.ink, compositeOver(stop, fill))).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  test("the fallback fills are translucent, so the content behind shows through", () => {
    for (const fill of [cta.flat, cta.flatOff]) {
      const alpha = Number(/, (\d(\.\d+)?)\)$/.exec(fill)?.[1])
      expect(alpha).toBeGreaterThan(0)
      expect(alpha).toBeLessThan(1)
    }
  })

  test("the fallback is the native tint's forest made translucent, and the disabled one clearly less saturated", () => {
    const flat = compositeOver(cta.flat, colors.canvas)
    const flatOff = compositeOver(cta.flatOff, colors.canvas)
    const [r, g, b] = channels(flat)
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
    expect(saturation(flat)).toBeGreaterThan(saturation(flatOff) + 0.1)
    // Same colour as the native tint, only made translucent.
    expect(channels(cta.tint)).toEqual(
      (/rgba\((\d+), (\d+), (\d+),/.exec(cta.flat) ?? []).slice(1, 4).map(Number),
    )
  })

  test("the fallback keeps a marked top rim highlight over the forest", () => {
    // D-27c rim was 0.28 / 0.35; D-28 made it much clearer and the forest keeps it.
    const beforeRim = scheme === "light" ? 0.28 : 0.35
    // 12.2-17: a 2 pt band, its inner point just inside the 1 pt inset hairline ring.
    const rim = /inset 0 2px 0 rgba\(255, 255, 255, (\d(\.\d+)?)\)/.exec(cta.shadow)
    expect(Number(rim?.[1])).toBeGreaterThan(beforeRim + 0.2)
  })

  test("the fallback hairline is an inset ring at the head of the shadow, not a border (12.2-17)", () => {
    expect(splitTopLevel(cta.shadow)[0]).toBe(`inset 0 0 0 1px ${cta.hairline}`)
  })

  test("the disabled label is clearly muted against the white label yet readable", () => {
    expect(cta.inkOff).not.toBe(cta.ink)
    for (const backdrop of backdrops) {
      expect(
        contrastRatio(cta.inkOff, compositeOver(cta.flatOff, backdrop)),
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  test("the fallback edge tokens are well formed", () => {
    const layer =
      /^(inset )?-?\d+(px)? -?\d+(px)? \d+(px)?( -?\d+px)? (rgba\([^)]*\)|#[0-9A-Fa-f]{6})$/
    for (const part of splitTopLevel(cta.shadow)) expect(part).toMatch(layer)
    expect(cta.sheen).toMatch(/^linear-gradient\(180deg, /)
    expect(cta.hairline).toMatch(/^rgba\(255, 255, 255, /)
    expect(cta.hairlineOff).toMatch(/^rgba\(/)
  })
})

describe.each(schemes)("secondary glass button, %s scheme", (scheme) => {
  const theme = themes[scheme]
  const { visual, colors } = theme
  const secondary = visual.glassCta.secondary
  const extreme = scheme === "light" ? "#FFFFFF" : "#000000"
  const halos = splitTopLevel(visual.backdrop).map((layer) => {
    const first = /rgba\([^)]*\)/.exec(layer)
    if (!first) throw new Error(`No colour in ${layer}`)
    return compositeOver(first[0], colors.canvas)
  })
  const backdrops = [colors.canvas, colors.panel, extreme, ...halos]

  test("the label is the app's primary text colour", () => {
    expect(secondary.ink).toBe(colors.textPrimary)
  })

  test("the label reads at 4.5:1 on the outlined fallback over every backdrop", () => {
    for (const backdrop of backdrops) {
      expect(
        contrastRatio(secondary.ink, compositeOver(secondary.flat, backdrop)),
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  test("the label reads at 4.5:1 on the bare native glass over the canvas and the panel", () => {
    // The system glass is see-through: the worst case is the backdrop itself, plus a 30% white
    // highlight in light or a 12% white lift in dark.
    const lift = scheme === "light" ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.12)"
    for (const backdrop of [colors.canvas, colors.panel, extreme]) {
      expect(contrastRatio(secondary.ink, backdrop)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(secondary.ink, compositeOver(lift, backdrop))).toBeGreaterThanOrEqual(
        4.5,
      )
    }
  })

  test("the fallback outline is a visible hairline, translucent, not the forest button", () => {
    const edge = secondary.hairline
    expect(edge).toMatch(/^rgba\(\d+, \d+, \d+, 0\.\d+\)$/)
    expect(contrastRatio(compositeOver(edge, colors.canvas), colors.canvas)).toBeGreaterThan(1.2)
    // 12.2-17: no outline token for the native glass any more.
    expect(Object.keys(secondary).sort()).toEqual(["flat", "hairline", "ink"])
    const alpha = Number(/, (\d(\.\d+)?)\)$/.exec(secondary.flat)?.[1])
    expect(alpha).toBeGreaterThan(0)
    expect(alpha).toBeLessThan(1)
  })
})

// The basemaps do not follow the app scheme: the same light plan (white roads, paper land) and the
// same dark orthophoto (forest canopy, black as its extreme) lie under the map controls in light and
// dark, plus a mid-tone field of the orthophoto.
const mapBackdrops = ["#FFFFFF", "#F2EFE9", "#6B7356", "#1C2618", "#000000"]

describe.each(schemes)("map controls over the basemap (12.2-19 fix round), %s scheme", (scheme) => {
  const control = themes[scheme].visual.mapControl
  const glassKeys = ["tint", "fill", "android"] as const

  function alphaOf(rgba: string): number {
    return Number(/, (\d(\.\d+)?)\)$/.exec(rgba)?.[1])
  }

  test.each(glassKeys)(
    "icons reach 3:1 and labels 4.5:1 on the %s glass over the plan and the orthophoto",
    (key) => {
      for (const backdrop of mapBackdrops) {
        const surface = compositeOver(control.glass[key], backdrop)
        expect(contrastRatio(control.icon, surface)).toBeGreaterThanOrEqual(3)
        expect(contrastRatio(control.text, surface)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(control.textMuted, surface)).toBeGreaterThanOrEqual(4.5)
      }
    },
  )

  test("the glass stays translucent, so the real blur and refraction show (D-04, D-12)", () => {
    for (const key of glassKeys) {
      expect(alphaOf(control.glass[key])).toBeGreaterThan(0)
      expect(alphaOf(control.glass[key])).toBeLessThan(1)
    }
    // Android draws no blur (D-17): its flat fill is the densest.
    expect(alphaOf(control.glass.android)).toBeGreaterThanOrEqual(alphaOf(control.glass.fill))
  })

  if (scheme === "dark") {
    test("dark: a translucent dark glass with light content (12.2-23 correction)", () => {
      // The lowest tint that keeps the ratios above (`glass-density.test.ts`), the map showing
      // through; the light inks are what let it be that low.
      expect(alphaOf(control.glass.tint)).toBeLessThanOrEqual(0.7)
      expect(alphaOf(control.glass.fill)).toBeLessThanOrEqual(0.7)
      const overPlan = compositeOver(control.glass.fill, "#FFFFFF")
      expect(relativeLuminance(overPlan)).toBeLessThan(0.2)
      for (const ink of [control.icon, control.text, control.textMuted]) {
        expect(relativeLuminance(ink)).toBeGreaterThan(0.7)
      }
    })

    test("dark: the light hairline stands out from the glass over the plan", () => {
      const surface = compositeOver(control.glass.fill, "#FFFFFF")
      expect(control.hairline).toMatch(/^rgba\(255, 255, 255, 0\.\d+\)$/)
      expect(
        contrastRatio(compositeOver(control.hairline, surface), surface),
      ).toBeGreaterThanOrEqual(1.8)
    })

    test("dark: the 38% glass and the moss accent it replaces failed 3:1 over the plan", () => {
      const before = compositeOver(brandGlassFills.control.dark, "#FFFFFF")
      expect(contrastRatio(themes.dark.visual.accentText, before)).toBeLessThan(3)
    })
  } else {
    test("light: the glyph stays the forest accent and the outline the theme divider", () => {
      expect(control.icon).toBe(themes.light.visual.accentText)
      expect(control.text).toBe(themes.light.colors.textPrimary)
      expect(control.hairline).toBe(themes.light.colors.divider)
    })
  }
})

describe.each(schemes)(
  "Explorer sheet over the basemap (12.2-19 fix round), %s scheme",
  (scheme) => {
    const theme = themes[scheme]
    const { colors, visual } = theme
    const sheet = visual.sheet
    const surfaces = mapBackdrops.map((backdrop) => compositeOver(sheet.fill, backdrop))

    test("title, body, subtitle, estimate and warning text reach 4.5:1 on the sheet", () => {
      const texts = [
        colors.textPrimary,
        colors.textSecondary,
        theme.semanticColors.textStrong,
        theme.onSurface.danger,
      ]
      for (const surface of surfaces) {
        for (const text of texts) expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5)
      }
    })

    test("the close glyph reads at 4.5:1 on its glass circle, above the 3:1 icon floor", () => {
      expect(sheet.closeIcon).toBe(colors.textPrimary)
      for (const surface of surfaces) {
        for (const key of ["tint", "fill", "android"] as const) {
          const circle = compositeOver(sheet.close[key], surface)
          expect(contrastRatio(sheet.closeIcon, circle)).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    test("the close circle's outline and the drag handle stand out from the sheet", () => {
      for (const surface of surfaces) {
        const circle = compositeOver(sheet.close.fill, surface)
        expect(contrastRatio(compositeOver(sheet.closeHairline, circle), surface)).toBeGreaterThan(
          1.3,
        )
        expect(contrastRatio(compositeOver(sheet.handle, surface), surface)).toBeGreaterThan(1.5)
      }
    })

    if (scheme === "dark") {
      test("dark: the theme's grey text failed 4.5:1 on the bare dark glass over the plan", () => {
        // The sheet without its fill, modelled as the 38% dark glass over the white plan.
        const before = compositeOver(brandGlassFills.control.dark, "#FFFFFF")
        expect(contrastRatio(colors.textSecondary, before)).toBeLessThan(4.5)
      })
    }
  },
)

// 12.2-21 dark pass: the cards and banners floating over a map that keep the theme's own text (the
// parcel picker's bottom card and its offline banner) take `mapPanel`, the Explorer sheet's dense
// fill, on every glass path. The default 38% glass they had left the secondary text near 1:1.
describe.each(schemes)("map panel over the basemap (12.2-21 dark pass), %s scheme", (scheme) => {
  const theme = themes[scheme]
  const { colors, visual } = theme
  const texts = [
    colors.textPrimary,
    colors.textSecondary,
    theme.semanticColors.textStrong,
    theme.onSurface.danger,
  ]

  test.each(["tint", "fill", "android"] as const)(
    "the theme's text reads at 4.5:1 on the %s glass over the plan and the orthophoto",
    (key) => {
      // On the dark Liquid Glass (`tint`) the content takes the glass ink (12.2-23 correction); the
      // light panel's content keeps the theme's ink (its surface does not ask for the light ink).
      const inked = key === "tint" && scheme === "dark" ? withGlassInk(theme) : theme
      const inks = [
        inked.colors.textPrimary,
        inked.colors.textSecondary,
        inked.semanticColors.textStrong,
        inked.onSurface.danger,
      ]
      expect(inks.length).toBe(texts.length)
      for (const backdrop of mapBackdrops) {
        const surface = compositeOver(visual.mapPanel[key], backdrop)
        for (const text of inks) expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5)
      }
    },
  )

  test("it is the Explorer sheet's glass, the panel already tested above", () => {
    // Dark: the sheet's translucent Liquid Glass tint, its fill for the fallbacks (12.2-23). Light:
    // the sheet's dense fill everywhere (the light sheet's own glass is not used for the panel).
    expect(visual.mapPanel).toEqual({
      tint: scheme === "dark" ? visual.sheet.glass.tint : visual.sheet.fill,
      fill: visual.sheet.fill,
      android: visual.sheet.fill,
    })
  })

  test("the default glass it replaces failed over a basemap of the other luminance", () => {
    // Dark over the light plan, light over the dark canopy: the secondary text near 1:1.
    const backdrop = scheme === "dark" ? "#FFFFFF" : "#1C2618"
    const before = compositeOver(brandGlassFills.control[scheme], backdrop)
    expect(contrastRatio(colors.textSecondary, before)).toBeLessThan(2)
    expect(contrastRatio(colors.textPrimary, before)).toBeLessThan(3)
  })

  test("the map control ink of the title pill and the nearby card reads on its glass", () => {
    for (const backdrop of mapBackdrops) {
      for (const key of ["tint", "fill", "android"] as const) {
        const surface = compositeOver(visual.mapControl.glass[key], backdrop)
        // The forest title on the default glass fell under 4.5:1 on one basemap or another.
        expect(contrastRatio(visual.mapControl.text, surface)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(visual.mapControl.textMuted, surface)).toBeGreaterThanOrEqual(4.5)
      }
    }
    const worst = Math.min(
      ...mapBackdrops.map((backdrop) =>
        contrastRatio(brandColors.forest, compositeOver(brandGlassFills.control[scheme], backdrop)),
      ),
    )
    expect(worst).toBeLessThan(4.5)
  })
})

describe("download edge glow (12.2-19 fix rounds: stronger, then round the whole screen)", () => {
  const glow = themes.light.visual.edgeGlow
  const layers = splitTopLevel(glow)

  function channels(hex: string): number[] {
    return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  }

  function saturation(hex: string): number {
    const rgb = channels(hex)
    const max = Math.max(...rgb)
    return max === 0 ? 0 : (max - Math.min(...rgb)) / max
  }

  test("one glow in both schemes: the basemap does not follow the scheme", () => {
    expect(themes.dark.visual.edgeGlow).toBe(glow)
    expect(glow).toBe(buildEdgeGlow())
  })

  test("a crisp line, a tight band and a wide halo, all inset", () => {
    expect(layers).toEqual([
      `inset 0 0 0 3px ${edgeGlowGreens.line}`,
      `inset 0 0 12px 4px ${withAlpha(edgeGlowGreens.band, 0.85)}`,
      `inset 0 0 28px 8px ${withAlpha(edgeGlowGreens.halo, 0.45)}`,
    ])
  })

  test("the halo is 36 to 48 pt deep on every edge, the band inside it", () => {
    const { band, halo, line } = edgeGlowGeometry
    const depth = halo.spread + halo.blur
    expect(depth).toBeGreaterThanOrEqual(36)
    expect(depth).toBeLessThanOrEqual(48)
    expect(band.spread + band.blur).toBeLessThan(depth)
    expect(line).toBeGreaterThanOrEqual(3)
  })

  test("over the white panel the halo stays light: the panel's text keeps its contrast", () => {
    // The glow now lies over the panel, whose content starts 16 pt in from the edge.
    expect(edgeGlowGeometry.halo.alpha).toBeLessThanOrEqual(0.5)
    expect(edgeGlowGeometry.band.spread + edgeGlowGeometry.band.blur).toBeLessThanOrEqual(16)
  })

  test("the glow's corners follow the iPhone display radius", () => {
    expect(edgeGlowGeometry.corner).toBeGreaterThanOrEqual(47)
    expect(edgeGlowGeometry.corner).toBeLessThanOrEqual(55)
  })

  test("the line keeps 3:1 against the white plan and the dark orthophoto", () => {
    for (const backdrop of ["#FFFFFF", "#F2EFE9", "#1C2618", "#000000"]) {
      expect(contrastRatio(edgeGlowGreens.line, backdrop)).toBeGreaterThanOrEqual(3)
    }
  })

  test("saturated greens, the halo brighter than the brand moss it replaces", () => {
    for (const green of Object.values(edgeGlowGreens)) {
      const [r, g, b] = channels(green)
      expect(g).toBeGreaterThan(r)
      expect(g).toBeGreaterThan(b)
      expect(saturation(green)).toBeGreaterThan(saturation(brandColors.moss))
    }
    expect(relativeLuminance(edgeGlowGreens.halo)).toBeGreaterThan(
      relativeLuminance(brandColors.moss),
    )
  })

  test("a strong pulse, 0.35 to full over 1.5 s, still at full under Reduce Motion", () => {
    expect(edgePulseMotion.minOpacity).toBe(0.35)
    expect(edgePulseMotion.halfCycleMs * 2).toBe(1500)
    expect(edgePulseMotion.stillOpacity).toBe(1)
  })

  test("the deeper halo of the top of the beat is 48 to 56 pt deep, beyond the base halo", () => {
    const { deep, halo } = edgeGlowGeometry
    const depth = deep.spread + deep.blur
    expect(depth).toBeGreaterThanOrEqual(48)
    expect(depth).toBeLessThanOrEqual(56)
    expect(depth).toBeGreaterThan(halo.spread + halo.blur)
    expect(themes.light.visual.edgeGlowDeep).toBe(buildEdgeGlowDeep())
    expect(themes.dark.visual.edgeGlowDeep).toBe(themes.light.visual.edgeGlowDeep)
    expect(buildEdgeGlowDeep()).toBe(
      `inset 0 0 38px 14px ${withAlpha(edgeGlowGreens.halo, deep.alpha)}`,
    )
  })

  test("no travelling light any more: only the line, band and halo greens are left", () => {
    expect(Object.keys(edgeGlowGreens).sort()).toEqual(["band", "halo", "line"])
  })

  describe("at the top of the beat the panel's text keeps 4.5:1 under the glow", () => {
    // An inset shadow of blur b is a Gaussian of sigma b / 2 past its spread: its alpha `distance` pt
    // in from the edge is alpha * erfc((distance - spread) / (sigma * sqrt 2)) / 2.
    function erf(x: number): number {
      // Abramowitz and Stegun 7.1.26, within 1.5e-7.
      const sign = x < 0 ? -1 : 1
      const t = 1 / (1 + 0.3275911 * Math.abs(x))
      const poly =
        t *
        (0.254829592 +
          t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
      return sign * (1 - poly * Math.exp(-x * x))
    }
    function layerAlpha(layer: { blur: number; spread: number; alpha: number }, distance: number) {
      if (distance <= layer.spread) return layer.alpha
      const sigma = layer.blur / 2
      return (layer.alpha * (1 - erf((distance - layer.spread) / (sigma * Math.SQRT2)))) / 2
    }
    // The panel's content starts 16 pt in from the screen edge (the sheet's horizontal padding).
    const contentInset = 16

    test.each(schemes)("%s sheet", (scheme) => {
      const { band, halo, deep } = edgeGlowGeometry
      const sheet = compositeOver(
        explorerSheetGlass[scheme].fill,
        scheme === "light" ? "#FFFFFF" : "#000000",
      )
      let under = sheet
      for (const [green, layer] of [
        [edgeGlowGreens.halo, deep],
        [edgeGlowGreens.halo, halo],
        [edgeGlowGreens.band, band],
      ] as const) {
        under = compositeOver(withAlpha(green, layerAlpha(layer, contentInset)), under)
      }
      const { colors, semanticColors } = themes[scheme]
      expect(contrastRatio(semanticColors.textStrong, under)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.textSecondary, under)).toBeGreaterThanOrEqual(4.5)
    })
  })
})

describe("offline download progress bar (12.2-19 third round)", () => {
  test("a thick rounded bar that eases to each report", () => {
    expect(downloadBarGeometry.height).toBe(10)
    expect(downloadBarGeometry.smoothMs).toBeGreaterThan(0)
    expect(downloadBarGeometry.smoothMs).toBeLessThanOrEqual(500)
  })

  test.each(schemes)("%s: the fill keeps 3:1 against the sheet and against its track", (scheme) => {
    const { track, fill } = themes[scheme].visual.downloadBar
    expect(themes[scheme].visual.downloadBar).toBe(downloadBarColors[scheme])
    // The sheet's fill over the brightest and the darkest map under it.
    for (const map of ["#FFFFFF", "#000000"]) {
      const sheet = compositeOver(explorerSheetGlass[scheme].fill, map)
      expect(contrastRatio(fill, sheet)).toBeGreaterThanOrEqual(3)
    }
    expect(contrastRatio(fill, track)).toBeGreaterThanOrEqual(3)
  })

  test("the light fill is a deeper moss: the brand moss is under 3:1 on the light sheet", () => {
    const sheet = compositeOver(explorerSheetGlass.light.fill, "#FFFFFF")
    expect(contrastRatio(brandColors.moss, sheet)).toBeLessThan(3)
    const [r, g, b] = [1, 3, 5].map((i) =>
      parseInt(downloadBarColors.light.fill.slice(i, i + 2), 16),
    )
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
  })
})

// The forest card aurora's colours and readable zones: `forest-aurora-tokens.test.ts`.

// Phase 28: the comparison line and the swipe dots over the three reference backdrops of the old
// maps and photographs (cream paper of the etat-major map, grey of a 1950 photograph, the dark
// plan). Non-text graphics need 3:1: the white core carries the dark and the grey, the graphite
// edge carries the cream where white is near 1.2:1.
describe.each(schemes)("curtain line and swipe dots (Phase 28), %s scheme", (scheme) => {
  const { curtain } = themes[scheme].visual
  const backdrops = { cream: "#EFE6CF", grey: "#8C8C8C", darkPlan: "#0E1512" }

  test("both schemes hold the same values (the map does not follow the scheme)", () => {
    expect(curtain).toEqual(themes.light.visual.curtain)
    expect(curtain).toEqual(themes.dark.visual.curtain)
    expect(curtain.line).toBe(brandColors.white)
    expect(curtain.edge).toMatch(/^rgba\(\d+, \d+, \d+, 0\.\d+\)$/)
  })

  test.each(Object.entries(backdrops))(
    "the better of the white core and the graphite edge reaches 3:1 over the %s backdrop",
    (_name, backdrop) => {
      const core = contrastRatio(curtain.line, backdrop)
      const edge = contrastRatio(compositeOver(curtain.edge, backdrop), backdrop)
      expect(Math.max(core, edge)).toBeGreaterThanOrEqual(3)
    },
  )

  test("a swipe dot (white fill inside the edge ring) reaches 3:1 over each backdrop", () => {
    for (const backdrop of Object.values(backdrops)) {
      const ring = compositeOver(curtain.edge, backdrop)
      const fill = contrastRatio(curtain.line, backdrop)
      expect(Math.max(fill, contrastRatio(ring, backdrop))).toBeGreaterThanOrEqual(3)
    }
  })

  test("the edge alpha is the lowest of the 0.05 steps from 0.45 that passes over the cream", () => {
    const alpha = Number(/, (0\.\d+)\)$/.exec(curtain.edge)?.[1])
    const rgb = /^rgba\((\d+), (\d+), (\d+),/.exec(curtain.edge)?.slice(1, 4).join(", ")
    const ratioAt = (a: number) =>
      contrastRatio(compositeOver(`rgba(${rgb}, ${a})`, backdrops.cream), backdrops.cream)
    expect(ratioAt(alpha)).toBeGreaterThanOrEqual(3)
    expect(ratioAt(Math.round((alpha - 0.05) * 100) / 100)).toBeLessThan(3)
  })
})

// Phase 28, plan 28-25 (owner item 13 c): the receded map window of the swipe mode. Light draws a
// soft shadow and no ring (a shadow cannot be measured as 3:1); dark draws a 1 pt opaque ring that
// must reach 3:1 against the dark canvas, plus a faint shadow.
describe.each(schemes)("immersive window tokens (Phase 28), %s scheme", (scheme) => {
  const { immersive } = themes[scheme].visual
  const { canvas } = themes[scheme].colors

  test("the shadow is a black shadow with a radius and an offset", () => {
    expect(immersive.shadow.color).toBe(brandColors.black)
    expect(immersive.shadow.opacity).toBeGreaterThan(0)
    expect(immersive.shadow.opacity).toBeLessThanOrEqual(0.65)
    expect(immersive.shadow.radius).toBeGreaterThan(0)
    expect(immersive.shadow.offsetY).toBeGreaterThan(0)
  })

  if (scheme === "light") {
    test("light is a soft shadow (0.32, 28, 12) with no ring", () => {
      expect(immersive.shadow).toEqual({
        color: brandColors.black,
        opacity: 0.32,
        radius: 28,
        offsetY: 12,
      })
      expect(immersive.ring).toBeNull()
    })
  } else {
    test("dark ring is an opaque #RRGGBB reaching 3:1 against the canvas", () => {
      expect(immersive.ring).toMatch(/^#[0-9A-F]{6}$/i)
      expect(contrastRatio(immersive.ring as string, canvas)).toBeGreaterThanOrEqual(3)
    })

    test("dark ring is not dimmer than the map control hairline over the canvas", () => {
      const hairline = compositeOver(themes.dark.visual.mapControl.hairline, canvas)
      expect(contrastRatio(immersive.ring as string, canvas)).toBeGreaterThanOrEqual(
        contrastRatio(hairline, canvas),
      )
    })
  }
})

// Phase 28 (28-11): the hint scrim, the accent dots and the parcels on the old bases, measured over
// the backdrops the basemaps really have.
describe.each(schemes)(
  "map hint, accent dots and old-base parcels (Phase 28), %s scheme",
  (scheme) => {
    const { visual } = themes[scheme]
    const paper = "#EFE6CF"
    const photograph = "#8C8C8C"

    test("the raster dimming is 0.8 in dark and 1 in light", () => {
      expect(visual.mapRaster.dimBrightnessMax).toBe(scheme === "dark" ? 0.8 : 1)
    })

    test("the hint scrim is graphite at 70 % alpha or more with a white ink", () => {
      expect(visual.mapHint.ink).toBe(brandColors.white)
      const alpha = Number(/, ([\d.]+)\)$/.exec(visual.mapHint.fill)?.[1])
      expect(alpha).toBeGreaterThanOrEqual(0.7)
    })

    test("the hint ink holds 4.5:1 on its scrim over the lightest basemap and every other backdrop", () => {
      for (const backdrop of ["#FFFFFF", paper, photograph, "#6B7356", "#1C2618", "#000000"]) {
        const surface = compositeOver(visual.mapHint.fill, backdrop)
        expect(contrastRatio(visual.mapHint.ink, surface)).toBeGreaterThanOrEqual(4.5)
      }
    })

    test("the accent dot reaches 3:1 against the capsule glass over light and dark maps", () => {
      for (const backdrop of mapBackdrops) {
        for (const key of ["fill", "android"] as const) {
          const surface = compositeOver(visual.mapControl.glass[key], backdrop)
          expect(contrastRatio(visual.tab.dot, surface)).toBeGreaterThanOrEqual(3)
        }
      }
    })

    test("the casing token is white at about 85 % alpha and the old-base factor is 0.6", () => {
      expect(brandMapTokens.parcelCasing).toBe("rgba(255, 255, 255, 0.85)")
      expect(brandMapTokens.parcelFillOldBaseFactor).toBe(0.6)
    })

    // Outline tones of the Explorer (byScore): the three score bands, the warm grey and the heavy
    // outline of the survey shown from its page. The plain selected tone is the terracotta.
    const tones = {
      low: { stroke: brandMapTokens.scoreMarker.low, fill: brandMapTokens.scoreParcelFill.low },
      mid: { stroke: brandMapTokens.scoreMarker.mid, fill: brandMapTokens.scoreParcelFill.mid },
      high: { stroke: brandMapTokens.scoreMarker.high, fill: brandMapTokens.scoreParcelFill.high },
      unscored: { stroke: brandMapTokens.parcelUnscored, fill: brandMapTokens.parcelUnscoredFill },
      selected: { stroke: brandMapTokens.parcelSelected, fill: brandMapTokens.parcelSelectedFill },
      selectedScored: {
        stroke: brandMapTokens.scoreMarkerSelectedBorder,
        fill: brandMapTokens.scoreParcelFill.high,
      },
    }
    const factors = [0.4, 0.5, 0.6, 0.7, 0.8]
    const withFactor = (fill: string, factor: number) => {
      const match = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(fill)
      if (!match) throw new Error(fill)
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${Number(match[4]) * factor})`
    }

    test("the measured contrast of an outline against its own lightened fill (owner question)", () => {
      // 28-11 finding: a hue outline over a tint of the same hue never reaches 3:1, whatever factor
      // between 0.4 and 0.8 is chosen (the fill is a quiet tint by design). What separates the
      // outline from the pale old map is the white casing under it, measured in the next test. The
      // best measured ratio over the factors is pinned here so a token change shows up.
      const best = Object.fromEntries(
        Object.entries(tones).map(([name, tone]) => {
          const worstBackdrop = Math.min(
            ...[paper, photograph].map((backdrop) =>
              Math.max(
                ...factors.map((factor) =>
                  contrastRatio(
                    tone.stroke,
                    compositeOver(withFactor(tone.fill, factor), backdrop),
                  ),
                ),
              ),
            ),
          )
          return [name, Math.round(worstBackdrop * 10) / 10]
        }),
      )
      expect(best).toEqual({
        low: 1.1,
        mid: 1,
        high: 1.1,
        unscored: 1.1,
        selected: 1.2,
        selectedScored: 2.9,
      })
    })

    test("the white casing under the outline gives the outline 3:1 on the old bases (moss excepted)", () => {
      const casing = (backdrop: string) => compositeOver(brandMapTokens.parcelCasing, backdrop)
      const worst = (stroke: string) =>
        Math.min(...[paper, photograph].map((backdrop) => contrastRatio(stroke, casing(backdrop))))
      for (const name of ["low", "mid", "unscored", "selected", "selectedScored"] as const) {
        expect(worst(tones[name].stroke)).toBeGreaterThanOrEqual(3)
      }
      // The high-band moss outline (the same moss as the marker) measures 2.5 against the casing:
      // below 3:1, recorded as an owner question in the 28-11 summary.
      expect(Math.round(worst(tones.high.stroke) * 10) / 10).toBe(2.5)
    })
  },
)
