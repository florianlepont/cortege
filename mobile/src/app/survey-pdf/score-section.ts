import {
  ALLOWED_SCORES_BY_FACTOR,
  CONTEXT_BAND_CUT_OFFS,
  FACTOR_KEYS,
  IBP_MAX,
  STAND_BAND_CUT_OFFS,
  bandTone,
  contextBand,
  standBand,
  totalBand,
} from "@cortege/ibp-domain"
import type { ContextBand, ScoreTone, StandBand } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import type {
  DisplayedFactorResult,
  DisplayedScores,
} from "../../screens/survey-detail/useLocalDraftSummary"
import type { PdfPalette, SurveyExportData } from "./types"

// The score helpers of the sheet (phase 25.1, D-02, D-10; phase 33, D-01): the filled points of a
// factor, the count of missing factors, the tone colours and the three scores with their CNPF bands.
// The score card that printed them in the body is gone (phase 33): its content moved to the cover,
// and these helpers stay the one source of bands for the cover, the summary, the factor cards and
// the factor chart. Pure: the bands and their tones come from the domain, the band names from the
// catalogue the survey detail screen uses (`fr.surveyDetail.bands`); there is no threshold in this
// file. Phase 33 (D-28) adds the zones of the plane and the ring scores of the rose to the same
// one source: the cut points are the package's own constants (`STAND_BAND_CUT_OFFS`,
// `CONTEXT_BAND_CUT_OFFS`) and the ring scores are the scores every factor may take, so the charts
// can never draw a cut the band functions do not apply.

const bandNames = fr.surveyDetail.bands

// The printed sentinel of a factor without a retained class (as `useLocalDraftSummary` writes it).
// Not imported: that module pulls React and storage in, and this one must stay pure. Keep it in
// step with `NOT_FILLED_CLASS` there and in `factor-section.ts`.
const NOT_FILLED_CLASS = "Not filled"

type Entries = SurveyExportData["factorEntries"]
type Entry = DisplayedFactorResult | undefined

/** The points of a filled factor, or null when the entry is absent, the sentinel, or point-less. */
export function filledPoints(entry: Entry): number | null {
  if (!entry || entry.selected_class === NOT_FILLED_CLASS) return null
  return entry.score_points
}

/** How many of the factors A to J have no entry or the "Not filled" sentinel. */
export function countMissingFactors(entries: Entries): number {
  const byFactor = new Map(entries)
  let missing = 0
  for (const factor of FACTOR_KEYS) {
    const entry = byFactor.get(factor)
    if (!entry || entry.selected_class === NOT_FILLED_CLASS) missing += 1
  }
  return missing
}

/** The palette colour of a score tone (low, mid, high). */
export function toneColor(tone: ScoreTone, palette: PdfPalette): string {
  switch (tone) {
    case "low":
      return palette.bandLow
    case "mid":
      return palette.bandMid
    default:
      return palette.bandHigh
  }
}

/** One score with its CNPF band: points (null when not a number), maximum, band name and tone. */
export type ScoreBand = {
  points: number | null
  max: number
  bandName: string | null
  tone: ScoreTone | null
}

function isScore(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value)
}

function bandOf(
  value: number | null | undefined,
  max: number,
  band: (score: number) => { name: string; tone: ScoreTone },
): ScoreBand {
  if (!isScore(value)) return { points: null, max, bandName: null, tone: null }
  const { name, tone } = band(value)
  return { points: value, max, bandName: name, tone }
}

/**
 * The three scores of a survey with their band names and tones, the one source the cover tiles and
 * the summary read (phase 33): the bands come from the domain, the names from the
 * survey detail catalogue, and no threshold is written here. The total's band name keeps the stand
 * names, as the app's total does.
 */
export function scoreBands(scores: DisplayedScores | null): {
  total: ScoreBand
  stand: ScoreBand
  context: ScoreBand
} {
  return {
    total: bandOf(scores?.ibp_total, IBP_MAX.total, (score) => {
      const band = totalBand(score)
      return { name: bandNames.stand[band], tone: bandTone(band) }
    }),
    stand: bandOf(scores?.ibp_peuplement_gestion, IBP_MAX.stand, (score) => {
      const band = standBand(score)
      return { name: bandNames.stand[band], tone: bandTone(band) }
    }),
    context: bandOf(scores?.ibp_contexte, IBP_MAX.context, (score) => {
      const band = contextBand(score)
      return { name: bandNames.context[band], tone: bandTone(band) }
    }),
  }
}

/** One zone of a chart axis: its bounds, the band name and the band tone. */
export type ChartZone = { from: number; to: number; name: string; tone: ScoreTone }

function zonesOf<Band extends StandBand | ContextBand>(
  cutOffs: readonly number[],
  max: number,
  bandAt: (score: number) => Band,
  names: Readonly<Record<Band, string>>,
): ChartZone[] {
  const bounds = [0, ...cutOffs, max]
  return bounds.slice(0, -1).map((from, index) => {
    const band = bandAt(from)
    return { from, to: bounds[index + 1], name: names[band], tone: bandTone(band) }
  })
}

/** The five stand and management zones of the plane (/35), cut where `standBand` cuts. */
export function standZones(): ChartZone[] {
  return zonesOf(STAND_BAND_CUT_OFFS, IBP_MAX.stand, standBand, bandNames.stand)
}

/** The three context levels of the plane (/15), cut where `contextBand` cuts. */
export function contextLevels(): ChartZone[] {
  return zonesOf(CONTEXT_BAND_CUT_OFFS, IBP_MAX.context, contextBand, bandNames.context)
}

/** The scores every factor A to J may take, ascending: the rings of the rose (0, 2, 5 today). */
export function roseRingScores(): number[] {
  const [first, ...others] = FACTOR_KEYS.map((key) => ALLOWED_SCORES_BY_FACTOR[key])
  return first
    .filter((score) => others.every((scores) => scores.includes(score)))
    .sort((a, b) => a - b)
}
