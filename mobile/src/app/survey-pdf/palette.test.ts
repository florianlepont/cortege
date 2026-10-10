// theme.ts reads useColorScheme from react-native; the print palette never calls it, so the stub
// only has to exist (and returns "dark" to prove the palette ignores the device scheme).
jest.mock("react-native", () => ({ useColorScheme: () => "dark" }))

import { brandColors, brandMapTokens } from "../brand-tokens"
import { buildTheme } from "../theme"
import { withAlpha } from "../visual-tokens"
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
  "bandLow",
  "bandMid",
  "bandHigh",
  "bandTrack",
  "watermark",
  "parcelFill",
  "parcelStroke",
  "mapCanvas",
  "chartGrid",
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
})
