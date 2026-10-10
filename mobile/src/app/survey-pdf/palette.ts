import { brandColors, brandMapTokens } from "../brand-tokens"
import { buildTheme } from "../theme"
import { mixWithWhite, withAlpha } from "../visual-tokens"
import type { PdfPalette } from "./types"

// D-07: print is always light. Every colour of the PDF comes from the light theme and the token
// files (no literal here, ESLint enforces it): the document never follows the device scheme, so a
// phone in dark mode still produces the same paper-white sheet. Importing this file pulls theme.ts,
// which imports react-native, so tests that load it mock `react-native` like theme.test.ts does.

// Pale on purpose: the draft watermark sits above the content, and Skia PDF and CoreGraphics both
// draw a plain rgba text colour where a CSS `opacity` on text is less safe (RESEARCH Pattern 4).
// 0.07 stayed legible but quiet over photos and the map on both platforms (25.1-07, A12).
const WATERMARK_ALPHA = 0.07

// Tints toward white of the theme's own hues, for the quiet parts of the sheet.
const INK_FAINT_TINT = 0.45
const CHART_GRID_TINT = 0.75
const MAP_CANVAS_TINT = 0.7

/** The only colours the PDF builders use, built once from the light theme and the token files. */
export function buildPdfPalette(): PdfPalette {
  const theme = buildTheme("light")
  const { colors, semanticColors, onSurface, visual } = theme
  return {
    ink: colors.textPrimary,
    inkMuted: colors.textSecondary,
    inkFaint: mixWithWhite(colors.textSecondary, INK_FAINT_TINT),
    line: colors.divider,
    paper: semanticColors.surfaceElevated,
    panel: colors.panel,
    panelStrong: colors.panelMuted,
    // Forest, not the app's moss accent: moss text on white is too pale on paper, and the white
    // ink of the factor letters and chips needs a dark ground.
    accent: semanticColors.ctaPrimary,
    accentInk: semanticColors.onCtaPrimary,
    accentSoft: semanticColors.successSurface,
    alert: onSurface.danger,
    alertSoft: semanticColors.errorSurface,
    bandLow: visual.score.low,
    bandMid: visual.score.mid,
    bandHigh: visual.score.high,
    bandTrack: visual.score.track,
    watermark: withAlpha(brandColors.forest, WATERMARK_ALPHA),
    parcelFill: brandMapTokens.parcelSelectedFill,
    parcelStroke: brandMapTokens.parcelSelected,
    mapCanvas: mixWithWhite(brandColors.sage, MAP_CANVAS_TINT),
    chartGrid: mixWithWhite(colors.textSecondary, CHART_GRID_TINT),
  }
}
