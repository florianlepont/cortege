import type { SurveyDetailResponse } from "../app/types"
import { ownDraftMapItems } from "./own-drafts"

const detail = (overrides: Partial<SurveyDetailResponse>): SurveyDetailResponse => ({
  id: "s1",
  status: "draft",
  display_location: { lat: 46.5, lng: 2.1 },
  created_at: "2026-10-01T09:30:00.000Z",
  factor_results: {},
  scores: { ibp_peuplement_gestion: 10, ibp_contexte: 5, ibp_total: 15 },
  ...overrides,
})

describe("ownDraftMapItems", () => {
  it("turns a located draft into a map item", () => {
    expect(
      ownDraftMapItems({ s1: detail({ ibp_method_version: "v", ibp_cas: 2 }) }, new Set()),
    ).toEqual([
      {
        survey_id: "s1",
        display_location: { lat: 46.5, lng: 2.1 },
        survey_date: "2026-10-01",
        region_code: "",
        ibp_total: 15,
        ibp_method_version: "v",
        ibp_cas: 2,
      },
    ])
  })

  it("keeps the v3.0 region and a missing date empty", () => {
    const items = ownDraftMapItems(
      { s1: detail({ region_version: "ACA", created_at: undefined }) },
      new Set(),
    )
    expect(items[0]).toMatchObject({ region_code: "ACA", survey_date: "" })
  })

  it("skips submitted surveys, published ones and drafts without a position or a score", () => {
    const items = ownDraftMapItems(
      {
        done: detail({ id: "done", status: "submitted" }),
        known: detail({ id: "known" }),
        nowhere: detail({ id: "nowhere", display_location: null }),
        noscore: detail({ id: "noscore", scores: undefined as never }),
      },
      new Set(["known"]),
    )
    expect(items).toEqual([])
  })
})
