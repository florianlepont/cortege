import {
  CNPF_FACTOR_A_GENUS_CODES,
  FACTOR_KEYS,
  IBP_METHOD_V3_2,
  type FactorKey,
  type SurveyRoute,
} from "@cortege/ibp-domain"
import { COVER_MAP_FRAME_SIZE, SUMMARY_MAP_FRAME_SIZE } from "../src/app/survey-pdf/export-settings"
import type { SurveyExportData } from "../src/app/survey-pdf/types"
import { ownItem } from "./parcel-history-fixtures"

// Typed export data for the PDF document tests (phase 25.1). Test helper only: nothing under src
// imports it, so it is neither bundled nor counted in coverage. The names are plain words, they
// are never shown in the app; images and fonts are tiny base64 placeholders.

type Entries = SurveyExportData["factorEntries"]
type Raw = SurveyExportData["rawFactors"]

const NOT_FILLED_CLASS = "Not filled"

// A few bytes of base64: the builders only check the shape of a data URI, never decode it.
const PLACEHOLDER_BASE64 = "QUJDREVGRw=="
const FONT_FAMILIES = [
  "Sora-ExtraBold",
  "Sora-SemiBold",
  "Sora-Medium",
  "Sora-Light",
  "Jost-Regular",
  "Jost-SemiBold",
] as const

const ASSETS: SurveyExportData["assets"] = {
  fonts: FONT_FAMILIES.map((family) => ({ family, base64: PLACEHOLDER_BASE64 })),
  logoDataUri: `data:image/png;base64,${PLACEHOLDER_BASE64}`,
}

const LAYOUT: SurveyExportData["layout"] = { platform: "ios", layoutScale: 1.2487 }

const POINTS: Record<FactorKey, number> = {
  A: 3,
  B: 2,
  C: 4,
  D: 1,
  E: 3,
  F: 2,
  G: 5,
  H: 4,
  I: 2,
  J: 1,
}

/**
 * One entry per factor A to J; a key in `missing` carries the "Not filled" sentinel. `points`
 * defaults to the standard fixture points; a fixture may pass its own map (the low-score survey).
 */
function entriesOf(
  missing: readonly FactorKey[] = [],
  points: Record<FactorKey, number> = POINTS,
): Entries {
  return FACTOR_KEYS.map((key) =>
    missing.includes(key)
      ? [key, { selected_class: NOT_FILLED_CLASS, warnings: [], score_points: null }]
      : [key, { selected_class: `S${points[key]}`, warnings: [], score_points: points[key] }],
  )
}

function rawFactorsOf(genera: readonly string[]): Raw {
  return {
    A: { genera: [...genera], native_cover_percent: 80 },
    B: { strata_count: 3, strata: ["low", "high"], native_cover_percent: 70 },
    C: { bmg_count: 1, bmm_count: 2, surface_ha: 1 },
    D: { bmg_count: 0, bmm_count: 1, surface_ha: 1 },
    E: { tgb_count: 1, gb_count: 2, surface_ha: 1 },
    F: { trees_per_ha: 4, dmh_groups: ["dmh_01"] },
    G: { open_flowering_percent: 3 },
    H: { class_score: 4, evidence: ["etat_major_map"] },
    I: { type_count: 1, types: ["spring_seep"] },
    J: { type_count: 0 },
  }
}

const SCORES = { ibp_total: 32, ibp_peuplement_gestion: 20, ibp_contexte: 12 }

/** A submitted v3.2 survey, cas 1, with every factor filled and nothing optional. */
export const exportFixtureV32Submitted: SurveyExportData = {
  mode: "complete",
  surveyId: "survey-v32",
  siteName: "Bois de la Colline",
  parcelIds: ["77186000AB0123"],
  observationYear: 2026,
  versionNumber: 2,
  dateIso: "2026-09-26T10:00:00.000Z",
  isDraft: false,
  observerName: "Camille Martin",
  method: {
    version: IBP_METHOD_V3_2,
    ibpCas: 1,
    ibpCas3Scale: false,
    regionVersion: null,
    vegetationStage: null,
  },
  scores: SCORES,
  factorEntries: entriesOf(),
  generatedAtIso: "2026-10-10T09:00:00.000Z",
  coordinates: { lat: 48.4005, lng: 2.701 },
  rawFactors: rawFactorsOf(CNPF_FACTOR_A_GENUS_CODES.slice(0, 5)),
  conditions: { note: null, weather: null },
  route: null,
  photos: { items: [], total: 0, unavailable: 0 },
  map: null,
  history: null,
  assets: ASSETS,
  layout: LAYOUT,
}

/**
 * Phase 33 (D-23): the submitted v3.2 survey on 30 parcels, with no map, no history and no photo.
 * It makes the identity card print a long parcel list (30 ids, "77186000AB0001" to
 * "77186000AB0030") so the line-counting estimate and the whole list can be checked.
 */
export const exportFixtureManyParcels: SurveyExportData = {
  ...exportFixtureV32Submitted,
  surveyId: "survey-many-parcels",
  parcelIds: Array.from(
    { length: 30 },
    (_, index) => `77186000AB${String(index + 1).padStart(4, "0")}`,
  ),
  map: null,
  history: null,
  photos: { items: [], total: 0, unavailable: 0 },
}

/** A draft of a legacy untagged (v3.0) survey, two factors still to fill, no cached data. */
export const exportFixtureV30Draft: SurveyExportData = {
  mode: "complete",
  surveyId: "survey-v30",
  siteName: "Foret de l'Etang",
  parcelIds: [],
  observationYear: null,
  versionNumber: null,
  dateIso: "2026-08-02T07:30:00.000Z",
  isDraft: true,
  observerName: null,
  method: {
    version: null,
    ibpCas: null,
    ibpCas3Scale: false,
    regionVersion: "ACA",
    vegetationStage: "collineen",
  },
  scores: { ibp_total: 24, ibp_peuplement_gestion: 20, ibp_contexte: 4 },
  factorEntries: entriesOf(["I", "J"]),
  generatedAtIso: "2026-10-10T09:00:00.000Z",
  coordinates: null,
  rawFactors: rawFactorsOf(CNPF_FACTOR_A_GENUS_CODES.slice(0, 3)),
  conditions: { note: null, weather: null },
  route: null,
  photos: { items: [], total: 0, unavailable: 0 },
  map: null,
  history: null,
  assets: ASSETS,
  layout: LAYOUT,
}

// Three adjacent parcels around Fontainebleau, one with a hole (as the map section tests).
const WORST_POLYGONS: NonNullable<SurveyExportData["map"]>["polygons"] = [
  {
    parcelId: "77186000AB0001",
    rings: [
      [
        [2.7, 48.4],
        [2.702, 48.4],
        [2.702, 48.401],
        [2.7, 48.401],
        [2.7, 48.4],
      ],
    ],
  },
  {
    parcelId: "77186000AB0002",
    rings: [
      [
        [2.702, 48.4],
        [2.704, 48.4],
        [2.704, 48.401],
        [2.702, 48.401],
        [2.702, 48.4],
      ],
      [
        [2.7025, 48.4003],
        [2.7035, 48.4003],
        [2.7035, 48.4007],
        [2.7025, 48.4007],
        [2.7025, 48.4003],
      ],
    ],
  },
  {
    parcelId: "77186000AB0003",
    rings: [
      [
        [2.7, 48.401],
        [2.704, 48.401],
        [2.704, 48.402],
        [2.7, 48.402],
        [2.7, 48.401],
      ],
    ],
  },
]

const WORST_PHOTO_COUNT = 24

// The fullest route (phase 30, D-09): partial by plot, uncapped on three factors, the complement
// done with its total surface, the guide's proposal accepted with answers. Every row of the
// "Parcours utilisé" block is printed and the "Choix" sentence is the long one.
export const WORST_ROUTE: SurveyRoute = {
  version: 1,
  method: "partial_plot",
  counting: "uncapped",
  uncapped_factors: ["C", "D", "E"],
  zone_surface_ha: 4,
  complement: { done: true, total_surface_ha: 12.5 },
  guide: {
    chosen_by: "guide",
    suggested: { method: "partial_plot", counting: "uncapped" },
    answers: {
      surface_ha: 12.5,
      homogeneity: "homogeneous",
      difficulty: false,
      narrow: false,
      experience: "regular",
    },
  },
}

/**
 * The fullest sheet: v3.2 cas 4 with all 34 genera, three parcels on a basemap, six history
 * points ending on this survey, 24 photos and the fullest route (phase 30).
 */
export const exportFixtureWorstCase: SurveyExportData = {
  ...exportFixtureV32Submitted,
  surveyId: "survey-worst",
  siteName: "Foret domaniale des trois parcelles de la grande colline du nord",
  parcelIds: WORST_POLYGONS.map((polygon) => polygon.parcelId),
  method: { ...exportFixtureV32Submitted.method, ibpCas: 4 },
  rawFactors: rawFactorsOf(CNPF_FACTOR_A_GENUS_CODES),
  route: WORST_ROUTE,
  photos: {
    items: Array.from({ length: WORST_PHOTO_COUNT }, (_, index) => ({
      id: `photo-${index + 1}`,
      dataUri: `data:image/jpeg;base64,${PLACEHOLDER_BASE64}`,
      width: index % 2 === 0 ? 800 : 600,
      height: index % 2 === 0 ? 600 : 800,
    })),
    total: WORST_PHOTO_COUNT,
    unavailable: 0,
  },
  map: {
    polygons: WORST_POLYGONS,
    basemap: {
      dataUri: `data:image/jpeg;base64,${PLACEHOLDER_BASE64}`,
      // Phase 33, D-24: the real frame of the complete PDF (its map is on the cover), like every other complete fixture.
      frame: { centerLng: 2.702, centerLat: 48.401, zoom: 16, ...COVER_MAP_FRAME_SIZE },
    },
    frameSize: { ...COVER_MAP_FRAME_SIZE },
  },
  history: {
    fetchedAt: "2026-10-09T12:00:00.000Z",
    items: [2019, 2020, 2021, 2023, 2024, 2026].map((year, index, years) =>
      ownItem(index === years.length - 1 ? "survey-worst" : `history-${year}`, {
        observation_year: year,
        version_number: index + 1,
        ibp_method_version: index < 2 ? null : IBP_METHOD_V3_2,
        scores: {
          ibp_peuplement_gestion: 14 + index * 3,
          ibp_contexte: 8 + index,
          ibp_total: 22 + index * 4,
        },
        submitted_at: `${year}-06-01T10:00:00.000Z`,
      }),
    ),
  },
}

// ---- Phase 33: typical and summary fixtures (page counts, one-page tests) -------------------------

type HistoryItems = NonNullable<SurveyExportData["history"]>["items"]

/** Six-point history shape of the worst case; `from` keeps the last points of it, `ownId` ends it. */
function historyOf(from: number, ownId: string): HistoryItems {
  const years = [2019, 2020, 2021, 2023, 2024, 2026]
  return years
    .map((year, index) =>
      ownItem(index === years.length - 1 ? ownId : `history-${year}`, {
        observation_year: year,
        version_number: index + 1,
        ibp_method_version: index < 2 ? null : IBP_METHOD_V3_2,
        scores: {
          ibp_peuplement_gestion: 14 + index * 3,
          ibp_contexte: 8 + index,
          ibp_total: 22 + index * 4,
        },
        submitted_at: `${year}-06-01T10:00:00.000Z`,
      }),
    )
    .slice(from)
}

function photosOf(count: number): SurveyExportData["photos"] {
  return {
    items: Array.from({ length: count }, (_, index) => ({
      id: `photo-${index + 1}`,
      dataUri: `data:image/jpeg;base64,${PLACEHOLDER_BASE64}`,
      width: index % 2 === 0 ? 800 : 600,
      height: index % 2 === 0 ? 600 : 800,
    })),
    total: count,
    unavailable: 0,
  }
}

/** A snapshot placeholder framed on the given centre at the given frame size. */
function basemapOf(
  size: { width: number; height: number },
  centre: { lng: number; lat: number },
): NonNullable<NonNullable<SurveyExportData["map"]>["basemap"]> {
  return {
    dataUri: `data:image/jpeg;base64,${PLACEHOLDER_BASE64}`,
    frame: { centerLng: centre.lng, centerLat: centre.lat, zoom: 16, ...size },
  }
}

/**
 * The typical complete export (research section 5): one parcel on a basemap of the real frame
 * size, three history points ending on this survey, six photos, no route.
 */
export const exportFixtureTypical: SurveyExportData = {
  ...exportFixtureV32Submitted,
  parcelIds: [WORST_POLYGONS[0].parcelId],
  photos: photosOf(6),
  map: {
    polygons: [WORST_POLYGONS[0]],
    basemap: basemapOf(COVER_MAP_FRAME_SIZE, { lng: 2.701, lat: 48.4005 }),
    frameSize: { ...COVER_MAP_FRAME_SIZE },
  },
  history: { fetchedAt: "2026-10-09T12:00:00.000Z", items: historyOf(3, "survey-v32") },
}

/** The typical export with a conditions note and the fullest route (the long "Conditions" page). */
export const exportFixtureTypicalConditioned: SurveyExportData = {
  ...exportFixtureTypical,
  conditions: { note: "Sol humide près du ruisseau.", weather: null },
  route: WORST_ROUTE,
}

/** The typical survey as a one-page summary: no photo, a map frame of the summary size. */
export const exportFixtureSummary: SurveyExportData = {
  ...exportFixtureTypical,
  mode: "summary",
  photos: { items: [], total: 0, unavailable: 0 },
  map: {
    polygons: [WORST_POLYGONS[0]],
    basemap: basemapOf(SUMMARY_MAP_FRAME_SIZE, { lng: 2.701, lat: 48.4005 }),
    frameSize: { ...SUMMARY_MAP_FRAME_SIZE },
  },
}

/** The fullest summary: the 64 character site name, three parcels, six history points. */
export const exportFixtureSummaryWorst: SurveyExportData = {
  ...exportFixtureSummary,
  surveyId: "survey-summary-worst",
  siteName: exportFixtureWorstCase.siteName,
  parcelIds: WORST_POLYGONS.map((polygon) => polygon.parcelId),
  map: {
    polygons: WORST_POLYGONS,
    basemap: basemapOf(SUMMARY_MAP_FRAME_SIZE, { lng: 2.702, lat: 48.401 }),
    frameSize: { ...SUMMARY_MAP_FRAME_SIZE },
  },
  history: { fetchedAt: "2026-10-09T12:00:00.000Z", items: historyOf(0, "survey-summary-worst") },
}

// ---- Phase 33 (plan 19): the low-score survey, the marker in the lowest band of the plane --------

const LOW_POINTS: Record<FactorKey, number> = {
  A: 0,
  B: 2,
  C: 0,
  D: 0,
  E: 2,
  F: 0,
  G: 2,
  H: 0,
  I: 2,
  J: 0,
}

/**
 * The submitted v3.2 survey with every factor at 0 or 2: total 8, stand and management 6 of 35,
 * context 2 of 15, so the plane's marker sits in the "faible" band and level, and the rose's
 * polygon hugs the hub.
 */
export const exportFixtureLowScore: SurveyExportData = {
  ...exportFixtureV32Submitted,
  surveyId: "survey-low-score",
  scores: { ibp_total: 8, ibp_peuplement_gestion: 6, ibp_contexte: 2 },
  factorEntries: entriesOf([], LOW_POINTS),
}

/** The low-score survey as a one-page summary: no photo, the map frame of the summary size. */
export const exportFixtureSummaryLowScore: SurveyExportData = {
  ...exportFixtureLowScore,
  mode: "summary",
  parcelIds: exportFixtureSummary.parcelIds,
  photos: { items: [], total: 0, unavailable: 0 },
  map: exportFixtureSummary.map,
  history: { fetchedAt: "2026-10-09T12:00:00.000Z", items: historyOf(3, "survey-low-score") },
}

export type SummaryVariantKind =
  | "noBasemap"
  | "noGeometry"
  | "noParcel"
  | "noHistory"
  | "firstSurvey"
  | "staleCache"

/** The summary fixture with one fallback of the page: what is missing is replaced by its note. */
export function summaryVariant(kind: SummaryVariantKind): SurveyExportData {
  const base = exportFixtureSummary
  const fetchedAt = "2026-10-09T12:00:00.000Z"
  switch (kind) {
    case "noBasemap":
      return { ...base, map: base.map ? { ...base.map, basemap: null } : null }
    case "noGeometry":
      return { ...base, map: null }
    case "noParcel":
      return { ...base, parcelIds: [], map: null }
    case "noHistory":
      return { ...base, history: null }
    case "firstSurvey":
      return { ...base, history: { fetchedAt, items: historyOf(5, base.surveyId) } }
    case "staleCache":
      return { ...base, history: { fetchedAt, items: historyOf(2, "survey-other").slice(0, 3) } }
  }
}
