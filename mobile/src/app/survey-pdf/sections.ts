import { buildConditionsBlock, conditionsSectionCss } from "./conditions-section"
import { buildFactorChartBlock, factorChartCss } from "./factor-chart-svg"
import { buildFactorBlocks, factorSectionCss } from "./factor-section"
import { buildIdentityBlocks, identityCss } from "./identity"
import { buildMapBlock, mapSectionCss } from "./map-section"
import { buildPhotoBlocks, photosSectionCss } from "./photos-section"
import { buildRouteBlock, routeSectionCss } from "./route-section"
import { buildScoreSummaryBlock, scoreSectionCss } from "./score-section"
import { buildTrendBlock, trendSectionCss } from "./trend-section"
import type { ExportMode, PdfBlock, PdfPalette, SurveyExportData } from "./types"

// Phase 33, D-10: the one ordered list of the sections of the PDF. A section is an id, the export
// modes that include it, a builder of blocks and its CSS. The order of the list is the order of the
// document: `build-html.ts` flat-maps `sectionsFor(mode)` twice (blocks, then CSS) and never names a
// section. A later phase adds a section by appending one entry here (for example an annotations
// section after `map`), and never edits the assembler. Pure: no react-native import.

/** One section of the document. */
export type PdfSection = {
  id: string
  /** The export modes whose document holds this section. */
  modes: readonly ExportMode[]
  /** The blocks of the section, none when the survey has nothing to print for it. */
  build: (data: SurveyExportData, palette: PdfPalette) => PdfBlock[]
  /** The CSS rules of the section (palette values only). */
  css: (palette: PdfPalette) => string
}

type BlockBuilder = (data: SurveyExportData, palette: PdfPalette) => PdfBlock

type OptionalBlockBuilder = (data: SurveyExportData, palette: PdfPalette) => PdfBlock | null

/** A builder that returns exactly one block. */
function one(builder: BlockBuilder): PdfSection["build"] {
  return (data, palette) => [builder(data, palette)]
}

/** A builder that returns one block or null (null prints nothing). */
function optional(builder: OptionalBlockBuilder): PdfSection["build"] {
  return (data, palette) => {
    const block = builder(data, palette)
    return block === null ? [] : [block]
  }
}

const COMPLETE: readonly ExportMode[] = Object.freeze(["complete"] as const)

/**
 * Every section of the PDF in document order: identity and method, the conditions (only when the
 * survey has a weather value or a note), the route used (only when the survey has a route, phase
 * 30), scores and chart, factors A to G then H to J, map, trend, photos.
 */
export const PDF_SECTIONS: readonly PdfSection[] = Object.freeze([
  { id: "identity", modes: COMPLETE, build: buildIdentityBlocks, css: identityCss },
  {
    id: "conditions",
    modes: COMPLETE,
    build: optional(buildConditionsBlock),
    css: conditionsSectionCss,
  },
  { id: "route", modes: COMPLETE, build: optional(buildRouteBlock), css: routeSectionCss },
  {
    id: "score-summary",
    modes: COMPLETE,
    build: one(buildScoreSummaryBlock),
    css: scoreSectionCss,
  },
  { id: "factor-chart", modes: COMPLETE, build: one(buildFactorChartBlock), css: factorChartCss },
  { id: "factors", modes: COMPLETE, build: buildFactorBlocks, css: factorSectionCss },
  { id: "map", modes: COMPLETE, build: one(buildMapBlock), css: mapSectionCss },
  { id: "trend", modes: COMPLETE, build: one(buildTrendBlock), css: trendSectionCss },
  { id: "photos", modes: COMPLETE, build: buildPhotoBlocks, css: photosSectionCss },
] satisfies PdfSection[])

/** The sections of one export mode, in document order. */
export function sectionsFor(mode: ExportMode): PdfSection[] {
  return PDF_SECTIONS.filter((section) => section.modes.includes(mode))
}
