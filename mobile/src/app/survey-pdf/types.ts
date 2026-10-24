import type { SurveyRoute, SurveyWeather } from "@cortege/ibp-domain"
import type {
  DisplayedFactorResult,
  DisplayedScores,
} from "../../screens/survey-detail/useLocalDraftSummary"
import type { ParcelSurveyHistoryItem } from "../types"

// The contract every PDF builder shares (phase 25.1, D-01 to D-11). Type-only imports, so no
// builder pulls storage or react-native in through this file.

/** Key of the catalogue `scaleLines`: a null or legacy method tag is `v3_0`. */
export type MethodKey = "v3_2" | "v3_0"

/** The method facts printed in the diagnostic criteria (D-03). */
export type ExportMethodContext = {
  version: string | null
  ibpCas: number | null
  ibpCas3Scale: boolean
  regionVersion: string | null
  vegetationStage: string | null
}

/** One photo ready to inline: a JPEG data URI and its pixel size (D-05). */
export type ExportPhoto = {
  id: string
  dataUri: string
  width: number
  height: number
}

/** Parcel outline and optional basemap snapshot for the map section (D-06). */
export type ExportMap = {
  polygons: Array<{ parcelId: string; rings: Array<Array<[number, number]>> }>
  basemap: {
    dataUri: string
    // Structurally the MapFrame of map-projection.ts, written inline so this file imports nothing.
    frame: {
      centerLng: number
      centerLat: number
      zoom: number
      width: number
      height: number
    }
  } | null
  frameSize: { width: number; height: number }
}

/** The parcel's survey history as cached on the device, and when it was cached (D-13, D-06b). */
export type ExportHistory = {
  fetchedAt: string
  items: ParcelSurveyHistoryItem[]
}

/** Fonts and logo read as base64 on the phone (structurally ExportAssets of assets.ts). */
export type PdfAssets = {
  fonts: ReadonlyArray<{ family: string; base64: string }>
  logoDataUri: string | null
}

/** Platform facts that change the print layout. */
export type PdfLayout = {
  platform: "ios" | "android"
  layoutScale: number
}

/** The only colours builders may use; tests pass a fake palette whose values are the key names. */
export type PdfPalette = {
  ink: string
  inkMuted: string
  inkFaint: string
  line: string
  paper: string
  panel: string
  panelStrong: string
  accent: string
  accentInk: string
  accentSoft: string
  alert: string
  alertSoft: string
  // The doubt badge of a factor card (phase 27, D-13): the light theme's warning ink on its soft fill.
  warning: string
  warningSoft: string
  bandLow: string
  bandMid: string
  bandHigh: string
  bandTrack: string
  watermark: string
  parcelFill: string
  parcelStroke: string
  mapCanvas: string
  chartGrid: string
  // Phase 33 (D-02, D-11, UI-SPEC Surface B): the forest panel of the cover and of the summary
  // score card, and the inks that sit on it.
  /** Forest panel of the cover and the summary score card. */
  forest: string
  /** Ring track on the forest panel. */
  forestDeep: string
  /** Titles and numerals on forest. */
  onForest: string
  /** Eyebrow, band text and ring arc on forest. */
  onForestAccent: string
  /** Dates, units and "/ 50" on forest. */
  onForestBody: string
  /** Contour rings, pre-blended over forest so no SVG opacity is needed. */
  contourSage: string
  /** The one moss ring of the contour art. */
  contourMoss: string
}

/** A packable piece of a page; height is in A4 design units (595 x 842 at 72 dpi). */
export type PdfBlock = {
  id: string
  html: string
  height: number
  breakBefore?: boolean
  keepWithNext?: boolean
  /**
   * Phase 33: a block with a page style is printed alone on its page with that page's chrome
   * (the cover or the one-page summary); no style is a plain body page. Read by `paginate.ts`.
   */
  pageStyle?: "cover" | "summary"
}

// The names sit in constants, not inline in the object: the structure gate reads a literal under a
// `title` or `label` key as user-facing text, and these are font names.
const SORA_EXTRA_BOLD = "Sora-ExtraBold"
const SORA_SEMI_BOLD = "Sora-SemiBold"
const SORA_MEDIUM = "Sora-Medium"
const SORA_LIGHT = "Sora-Light"
const JOST_REGULAR = "Jost-Regular"
const JOST_SEMI_BOLD = "Jost-SemiBold"

/** CSS family names, equal to the PostScript names of the bundled fonts. */
export const PDF_FONT_FAMILIES = {
  title: SORA_EXTRA_BOLD,
  heading: SORA_SEMI_BOLD,
  strong: SORA_MEDIUM,
  numeral: SORA_LIGHT,
  body: JOST_REGULAR,
  label: JOST_SEMI_BOLD,
} as const

/**
 * Phase 33: the complete PDF or the one-page summary, chosen in the export choice sheet. A summary
 * is never a draft (D-09): a draft always prints the complete PDF with its banner and watermark.
 */
export type ExportMode = "complete" | "summary"

/** What the screen hands over to the export. */
export type SurveyExportInput = {
  mode: ExportMode
  surveyId: string
  siteName: string
  parcelIds: string[]
  observationYear: number | null
  versionNumber: number | null
  dateIso: string
  isDraft: boolean
  observerName: string | null
  displayLocation: { lat: number; lng: number } | null
  method: ExportMethodContext
  scores: DisplayedScores | null
  factorEntries: Array<[string, DisplayedFactorResult]>
  apiUrl: string
  accessToken: string | null
}

/** What the loader builds once and every pure builder reads. */
export type SurveyExportData = Omit<
  SurveyExportInput,
  "apiUrl" | "accessToken" | "displayLocation"
> & {
  generatedAtIso: string
  coordinates: { lat: number; lng: number } | null
  rawFactors: Record<string, unknown>
  // The conditions of the survey (phase 27, D-17): its note and its weather, as stored on the phone.
  conditions: { note: string | null; weather: SurveyWeather | null }
  // The route used (phase 30, D-09), as stored on the phone; null for a survey recorded before the
  // phase or whose record cannot be read, which then prints exactly as it did before.
  route: SurveyRoute | null
  photos: { items: ExportPhoto[]; total: number; unavailable: number }
  map: ExportMap | null
  history: ExportHistory | null
  assets: PdfAssets
  layout: PdfLayout
}
