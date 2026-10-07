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
  buildInsetRing,
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
