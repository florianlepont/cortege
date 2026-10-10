import {
  CNPF_FACTOR_A_GENUS_CODES,
  FACTOR_KEYS,
  IBP_METHOD_V3_2,
  type FactorKey,
} from "@cortege/ibp-domain"
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

/** One entry per factor A to J; a key in `missing` carries the "Not filled" sentinel. */
function entriesOf(missing: readonly FactorKey[] = []): Entries {
  return FACTOR_KEYS.map((key) =>
    missing.includes(key)
      ? [key, { selected_class: NOT_FILLED_CLASS, warnings: [], score_points: null }]
      : [key, { selected_class: `S${POINTS[key]}`, warnings: [], score_points: POINTS[key] }],
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
  photos: { items: [], total: 0, unavailable: 0 },
  map: null,
  history: null,
  assets: ASSETS,
  layout: LAYOUT,
}

/** A draft of a legacy untagged (v3.0) survey, two factors still to fill, no cached data. */
export const exportFixtureV30Draft: SurveyExportData = {
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

/**
 * The fullest sheet: v3.2 cas 4 with all 34 genera, three parcels on a basemap, six history
 * points ending on this survey, and 24 photos.
 */
export const exportFixtureWorstCase: SurveyExportData = {
  ...exportFixtureV32Submitted,
  surveyId: "survey-worst",
  siteName: "Foret domaniale des trois parcelles de la grande colline du nord",
  parcelIds: WORST_POLYGONS.map((polygon) => polygon.parcelId),
  method: { ...exportFixtureV32Submitted.method, ibpCas: 4 },
  rawFactors: rawFactorsOf(CNPF_FACTOR_A_GENUS_CODES),
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
      frame: { centerLng: 2.702, centerLat: 48.401, zoom: 16, width: 515, height: 340 },
    },
    frameSize: { width: 515, height: 340 },
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
