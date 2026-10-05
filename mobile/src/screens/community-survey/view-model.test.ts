// The draft-summary module pulls in the whole storage layer; the view model only needs its marker.
jest.mock("../survey-detail/useLocalDraftSummary", () => ({ NOT_FILLED_CLASS: "Not filled" }))

import type { CommunitySurveyDetail } from "@cortege/ibp-domain"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { NOT_FILLED_CLASS } from "../survey-detail/useLocalDraftSummary"
import { toContextRows, toDisplayedScores, toFactorEntries } from "./view-model"

const survey = (overrides: Partial<CommunitySurveyDetail> = {}): CommunitySurveyDetail => ({
  survey_id: "s-1",
  site_name: "Bois",
  author_name: "Camille",
  submitted_at: "2026-09-28T09:41:00.000Z",
  observation_year: 2026,
  version_number: 1,
  region_version: null,
  vegetation_stage: null,
  ibp_method_version: IBP_METHOD_V3_2,
  ibp_cas: 2,
  ibp_cas3_scale: false,
  scores: { ibp_total: 31, ibp_peuplement_gestion: 22, ibp_contexte: 9 },
  factor_results: {
    A: { selected_class: "S2", score_points: 4 },
    B: { selected_class: "S1" },
  },
  parcel_ids: ["75101AB0123"],
  display_location: { lat: 47.3, lng: 1.3 },
  history: [],
  ...overrides,
})

describe("toDisplayedScores", () => {
  it("reads the three scores, zero for a missing one", () => {
    expect(toDisplayedScores(survey())).toEqual({
      ibp_total: 31,
      ibp_peuplement_gestion: 22,
      ibp_contexte: 9,
    })
    expect(toDisplayedScores(survey({ scores: { ibp_total: "x" } }))).toEqual({
      ibp_total: 0,
      ibp_peuplement_gestion: 0,
      ibp_contexte: 0,
    })
  })
})

describe("toFactorEntries", () => {
  it("lists the ten factors in order, with the points of those the survey has", () => {
    const entries = toFactorEntries(survey())
    expect(entries.map(([code]) => code)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
    ])
    expect(entries[0][1]).toEqual({ selected_class: "S2", warnings: [], score_points: 4 })
    // A factor without points keeps its class; a missing one reads as not filled.
    expect(entries[1][1]).toEqual({ selected_class: "S1", warnings: [], score_points: null })
    expect(entries[2][1]).toEqual({
      selected_class: NOT_FILLED_CLASS,
      warnings: [],
      score_points: null,
    })
  })
})

describe("toContextRows", () => {
  it("names the method and the cas of a v3.2 survey", () => {
    expect(toContextRows(survey())).toEqual([
      {
        key: "method",
        label: fr.communitySurvey.rows.method,
        value: fr.ibpMethod.versions[IBP_METHOD_V3_2],
      },
      { key: "cas", label: fr.communitySurvey.rows.cas, value: fr.ibpMethod.casLabels[2] },
    ])
  })

  it("has no cas row when a v3.2 survey lacks one", () => {
    expect(toContextRows(survey({ ibp_cas: null }))).toHaveLength(1)
    expect(toContextRows(survey({ ibp_cas: 9 }))).toHaveLength(1)
  })

  it("names the region and the stage of a v3.0 survey", () => {
    expect(
      toContextRows(
        survey({
          ibp_method_version: IBP_METHOD_V3_0,
          region_version: "ACA",
          vegetation_stage: "collineen",
          ibp_cas: null,
        }),
      ),
    ).toEqual([
      {
        key: "method",
        label: fr.communitySurvey.rows.method,
        value: fr.ibpMethod.versions[IBP_METHOD_V3_0],
      },
      { key: "region", label: fr.communitySurvey.rows.region, value: fr.labels.regions.ACA },
      {
        key: "stage",
        label: fr.communitySurvey.rows.stage,
        value: fr.labels.vegetationStages.collineen,
      },
    ])
  })

  it("calls an untagged or unknown method the legacy one, and skips an unknown region or stage", () => {
    const untagged = toContextRows(
      survey({ ibp_method_version: null, region_version: "??", vegetation_stage: "nope" }),
    )
    expect(untagged).toEqual([
      {
        key: "method",
        label: fr.communitySurvey.rows.method,
        value: fr.ibpMethod.legacyVersionLabel,
      },
    ])
    expect(
      toContextRows(survey({ ibp_method_version: "unsupported", vegetation_stage: null }))[0].value,
    ).toBe(fr.ibpMethod.legacyVersionLabel)
  })
})
