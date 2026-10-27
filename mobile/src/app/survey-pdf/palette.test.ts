// theme.ts reads useColorScheme from react-native; the print palette never calls it, so the stub
// only has to exist (and returns "dark" to prove the palette ignores the device scheme).
jest.mock("react-native", () => ({ useColorScheme: () => "dark" }))

import { brandColors, brandMapTokens } from "../brand-tokens"
import { compositeOver, contrastRatio, relativeLuminance } from "../contrast"
import { buildTheme } from "../theme"
import { contourDrift, forestStops, mixWithWhite, withAlpha } from "../visual-tokens"
import { buildPdfPalette } from "./palette"
import type { PdfPalette } from "./types"

const KEYS: Array<keyof PdfPalette> = [
  "ink",
  "inkMuted",
  "inkFaint",
  "line",
  "paper",
  "panel",
  "panelStrong",
  "accent",
  "accentInk",
  "accentSoft",
  "alert",
  "alertSoft",
  "warning",
  "warningSoft",
  "bandLow",
  "bandMid",
  "bandHigh",
  "bandTrack",
  "watermark",
  "parcelFill",
  "parcelStroke",
  "mapCanvas",
  "chartGrid",
  "forest",
  "forestDeep",
  "onForest",
  "onForestAccent",
  "onForestBody",
  "contourSage",
  "contourMoss",
  "zoneLow",
  "zoneLowSoft",
  "zoneMid",
  "zoneHighSoft",
  "zoneHigh",
  "contextInk",
]

const light = buildTheme("light")

describe("buildPdfPalette", () => {
  const palette = buildPdfPalette()

  test("has a non-empty string for every key of PdfPalette and no other key", () => {
    expect(Object.keys(palette).sort()).toEqual([...KEYS].sort())
    for (const key of KEYS) {
      expect(typeof palette[key]).toBe("string")
      expect(palette[key].length).toBeGreaterThan(0)
    }
  })

  test("the band tones are the light theme's score tones", () => {
    expect(palette.bandLow).toBe(light.visual.score.low)
    expect(palette.bandMid).toBe(light.visual.score.mid)
    expect(palette.bandHigh).toBe(light.visual.score.high)
    expect(palette.bandTrack).toBe(light.visual.score.track)
  })

  test("the parcel colours are the map tokens of a selected parcel", () => {
    expect(palette.parcelStroke).toBe(brandMapTokens.parcelSelected)
    expect(palette.parcelFill).toBe(brandMapTokens.parcelSelectedFill)
  })

  test("the text, line and panel colours come from the light theme", () => {
    expect(palette.ink).toBe(light.colors.textPrimary)
    expect(palette.inkMuted).toBe(light.colors.textSecondary)
    expect(palette.line).toBe(light.colors.divider)
    expect(palette.paper).toBe(light.semanticColors.surfaceElevated)
    expect(palette.panel).toBe(light.colors.panel)
    expect(palette.panelStrong).toBe(light.colors.panelMuted)
    expect(palette.alert).toBe(light.onSurface.danger)
    expect(palette.alertSoft).toBe(light.semanticColors.errorSurface)
  })

  test("the doubt colours are the light theme's warning ink and soft fill, readable on both grounds", () => {
    expect(palette.warning).toBe(light.onSurface.warning)
    expect(palette.warningSoft).toBe(light.colors.warningSoft)
    expect(contrastRatio(palette.warning, palette.paper)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.warning, palette.warningSoft)).toBeGreaterThanOrEqual(4.5)
  })

  test("the accent is the forest green with a white ink (print contrast), not the dark scheme's", () => {
    expect(palette.accent).toBe(light.semanticColors.ctaPrimary)
    expect(palette.accent).toBe(brandColors.forest)
    expect(palette.accentInk).toBe(light.semanticColors.onCtaPrimary)
    expect(palette.accentInk).toBe(brandColors.white)
  })

  test("the watermark is a pale rgba of the forest colour, not a CSS opacity", () => {
    expect(palette.watermark).toBe(withAlpha(brandColors.forest, 0.07))
    expect(palette.watermark).toMatch(/^rgba\(\d+, \d+, \d+, 0\.\d+\)$/)
  })

  test("the paper is white and the palette is the same on every call (always light)", () => {
    expect(palette.paper).toBe(brandColors.white)
    expect(buildPdfPalette()).toEqual(palette)
    const dark = buildTheme("dark")
    expect(palette.ink).not.toBe(dark.colors.textPrimary)
    expect(palette.paper).not.toBe(dark.semanticColors.surfaceElevated)
  })

  test("the soft fills and the map canvas are lighter tints, not the saturated brand hues", () => {
    expect(palette.mapCanvas).not.toBe(brandColors.sage)
    expect(palette.mapCanvas).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(palette.inkFaint).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(palette.chartGrid).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  test("the forest keys come from the token files (phase 33, UI-SPEC Surface B)", () => {
    expect(palette.forest).toBe(brandColors.forest)
    expect(palette.forestDeep).toBe(forestStops.a)
    expect(palette.onForest).toBe(light.visual.forest.title)
    expect(palette.onForestAccent).toBe(light.visual.forest.titleAccent)
    expect(palette.onForestBody).toBe(light.visual.forest.body)
    expect(palette.contourMoss).toBe(light.visual.forest.contourMoss)
  })

  test("contourSage is the sage at its drift opacity pre-blended over forest, an opaque hex", () => {
    expect(palette.contourSage).toBe(
      compositeOver(
        withAlpha(light.visual.forest.contourSage, contourDrift.sageOpacity),
        brandColors.forest,
      ),
    )
    expect(palette.contourSage).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  test("text on forest passes 4.5:1 (onForest 9.27, 13.49 on forestDeep, accent 6.32, body 6.90)", () => {
    expect(contrastRatio(palette.onForest, palette.forest)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.onForest, palette.forestDeep)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.onForestAccent, palette.forest)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.onForestBody, palette.forest)).toBeGreaterThanOrEqual(4.5)
  })

  test("the contour decoration stays visible (2.66 >= 2) and a large title over it passes 3:1 (3.49)", () => {
    expect(contrastRatio(palette.contourSage, palette.forest)).toBeGreaterThanOrEqual(2)
    expect(contrastRatio(palette.onForest, palette.contourSage)).toBeGreaterThanOrEqual(3)
  })

  test("muted ink and accent are readable on the panel and soft fills (4.5:1)", () => {
    expect(contrastRatio(palette.inkMuted, palette.panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.inkMuted, palette.accentSoft)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.accent, palette.accentSoft)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.alert, palette.alertSoft)).toBeGreaterThanOrEqual(4.5)
  })

  test("the band tones are graphics readable on paper and on the panel (3:1)", () => {
    for (const band of [palette.bandHigh, palette.bandMid, palette.bandLow]) {
      expect(contrastRatio(band, palette.paper)).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(band, palette.panel)).toBeGreaterThanOrEqual(3)
    }
  })

  test("has 36 keys: the 30 of today plus the six of the charts (phase 33, D-27)", () => {
    expect(Object.keys(palette)).toHaveLength(36)
  })

  test("the plane tints are strong and soft mixes of the band tones, contextInk the warning ink", () => {
    expect(palette.zoneLow).toBe(mixWithWhite(light.visual.score.low, 0.4))
    expect(palette.zoneLowSoft).toBe(mixWithWhite(light.visual.score.low, 0.65))
    expect(palette.zoneMid).toBe(mixWithWhite(light.visual.score.mid, 0.7))
    expect(palette.zoneHighSoft).toBe(mixWithWhite(light.visual.score.high, 0.65))
    expect(palette.zoneHigh).toBe(mixWithWhite(light.visual.score.high, 0.4))
    expect(palette.contextInk).toBe(light.onSurface.warning)
  })

  test("the strong tint of a tone is darker than its soft tint, and the five zones are distinct", () => {
    expect(relativeLuminance(palette.zoneLow)).toBeLessThan(relativeLuminance(palette.zoneLowSoft))
    expect(relativeLuminance(palette.zoneHigh)).toBeLessThan(
      relativeLuminance(palette.zoneHighSoft),
    )
    const zones = [
      palette.zoneLow,
      palette.zoneLowSoft,
      palette.zoneMid,
      palette.zoneHighSoft,
      palette.zoneHigh,
    ]
    expect(new Set(zones).size).toBe(5)
  })

  test("the marker keeps 4:1 and the ink 6:1 on every zone (4.07 to 6.55, 6.02 to 9.68)", () => {
    const zones = [
      palette.zoneLow,
      palette.zoneLowSoft,
      palette.zoneMid,
      palette.zoneHighSoft,
      palette.zoneHigh,
    ]
    for (const zone of zones) {
      expect(contrastRatio(palette.accent, zone)).toBeGreaterThanOrEqual(4)
      expect(contrastRatio(palette.ink, zone)).toBeGreaterThanOrEqual(6)
    }
  })

  test("the rose names are readable on paper and panel (accent 9.27 and 8.56, contextInk 7.47 and 6.90)", () => {
    expect(contrastRatio(palette.accent, palette.paper)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.accent, palette.panel)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.contextInk, palette.paper)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(palette.contextInk, palette.panel)).toBeGreaterThanOrEqual(4.5)
  })
})
