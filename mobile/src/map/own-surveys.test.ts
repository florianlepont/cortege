import type { PublicParcelStatusItem, SurveyDetailResponse } from "../app/types"
import {
  computeIbpTotalsFromRetainedScores,
  computeRetainedScoresFromRawFactors,
} from "../app/ibp-scoring"
import type { LocalSurveyMapSource } from "../storage/types"
import { cachedParcelCentre, localSurveyTotal, ownSurveyMapItems } from "./own-surveys"

type Ring = Array<[number, number]>

const square = (west: number, south: number, east: number, north: number): Ring => [
  [west, south],
  [east, south],
  [east, north],
  [west, north],
  [west, south],
]

function parcel(id: string, rings: Ring[]): PublicParcelStatusItem {
  return {
    parcel_id: id,
    study_status: "not_studied",
    geometry: { type: "Polygon", coordinates: rings },
  }
}

function multiParcel(id: string, polygons: Ring[][]): PublicParcelStatusItem {
  return {
    parcel_id: id,
    study_status: "not_studied",
    geometry: { type: "MultiPolygon", coordinates: polygons },
  }
}

function source(overrides: Partial<LocalSurveyMapSource> = {}): LocalSurveyMapSource {
  return {
    id: "s1",
    status: "draft",
    created_at: "2026-10-01T09:30:00.000Z",
    updated_at: "2026-10-03T10:00:00.000Z",
    payload: { id: "s1", sync_version: 1, site_name: "Site", parcel_ids: ["P1"], factors: {} },
    ...overrides,
  }
}

const P1 = parcel("P1", [square(2.0, 46.0, 2.2, 46.4)])

function details(location: { lat: number; lng: number } | null | undefined) {
  return { s1: { id: "s1", display_location: location } as unknown as SurveyDetailResponse }
}

describe("localSurveyTotal", () => {
  it("uses the server total the pull stored when it is finite", () => {
    expect(
      localSurveyTotal({
        id: "s1",
        sync_version: 1,
        site_name: "Site",
        scores: { ibp_total: 31 },
        factors: { A: { native_genus_count: 4 } },
      }),
    ).toBe(31)
  })

  it("computes the total from the factors and method context otherwise", () => {
    const factors = {
      A: { native_genus_count: 4 },
      H: { connectivity_class: 3 },
    }
    const payload = {
      id: "s1",
      sync_version: 1,
      site_name: "Site",
      region_version: "ACA",
      vegetation_stage: "jeune",
      scores: { ibp_total: Number.NaN },
      factors,
    }
    const expected = computeIbpTotalsFromRetainedScores(
      computeRetainedScoresFromRawFactors(factors, {
        region_version: "ACA",
        vegetation_stage: "jeune",
      }),
    ).ibp_total

    expect(localSurveyTotal(payload)).toBe(expected)
    expect(expected).toBeGreaterThan(0)
  })

  it("scores the same with a non numeric stored total", () => {
    const factors = { A: { native_genus_count: 4 } }
    const withText = {
      id: "s1",
      sync_version: 1,
      site_name: "S",
      scores: { ibp_total: "12" },
      factors,
    }
    const without = { id: "s1", sync_version: 1, site_name: "S", factors }
    expect(localSurveyTotal(withText)).toBe(localSurveyTotal(without))
  })

  it("gives 0 for a payload with no factors", () => {
    expect(localSurveyTotal({ id: "s1", sync_version: 1, site_name: "Site" })).toBe(0)
    expect(localSurveyTotal({ id: "s1", sync_version: 1, site_name: "Site", factors: {} })).toBe(0)
  })
})

describe("cachedParcelCentre", () => {
  it("is null with no cached parcel or no wanted id", () => {
    expect(cachedParcelCentre([], ["P1"])).toBeNull()
    expect(cachedParcelCentre([P1], [])).toBeNull()
    expect(cachedParcelCentre([P1], ["P9"])).toBeNull()
  })

  it("is the centre of the bounds, ids matched without regard to case", () => {
    const centre = cachedParcelCentre([P1], ["p1"])
    expect(centre?.lat).toBeCloseTo(46.2, 6)
    expect(centre?.lng).toBeCloseTo(2.1, 6)
  })

  it("covers the union of a MultiPolygon and of several parcels", () => {
    const multi = multiParcel("M1", [[square(0, 0, 1, 1)], [square(3, 2, 4, 3)]])
    const other = parcel("P2", [square(-2, -1, -1, 0)])
    const centre = cachedParcelCentre([multi, other], ["M1", "P2"])
    expect(centre?.lng).toBeCloseTo((-2 + 4) / 2, 6)
    expect(centre?.lat).toBeCloseTo((-1 + 3) / 2, 6)
  })
})

describe("ownSurveyMapItems", () => {
  const base = { parcels: [P1], surveyDetails: {}, publishedIds: new Set<string>() }

  it("puts a draft in drafts at the cached parcel centre", () => {
    const { drafts, own } = ownSurveyMapItems({
      ...base,
      sources: [
        source({
          payload: {
            id: "s1",
            sync_version: 1,
            site_name: "Site",
            parcel_ids: ["P1"],
            region_version: "ACA",
            ibp_method_version: "3.2",
            ibp_cas: 2,
            factors: {},
          },
        }),
      ],
    })

    expect(own).toEqual([])
    expect(drafts).toHaveLength(1)
    const item = drafts[0]
    expect(item.survey_id).toBe("s1")
    expect(item.display_location.lat).toBeCloseTo(46.2, 6)
    expect(item.display_location.lng).toBeCloseTo(2.1, 6)
    expect(item).toMatchObject({
      survey_date: "2026-10-01",
      region_code: "ACA",
      ibp_total: 0,
      ibp_method_version: "3.2",
      ibp_cas: 2,
    })
  })

  it("defaults the region to empty and the method fields to null", () => {
    const { drafts } = ownSurveyMapItems({ ...base, sources: [source()] })
    expect(drafts[0]).toMatchObject({
      region_code: "",
      ibp_method_version: null,
      ibp_cas: null,
    })
  })

  it("puts any status other than draft in own, dated from updated_at, with the server total", () => {
    const stored = {
      id: "s2",
      sync_version: 2,
      site_name: "Site",
      parcel_ids: ["P1"],
      scores: { ibp_total: 31 },
    }
    const { drafts, own } = ownSurveyMapItems({
      ...base,
      sources: [
        source({ id: "s2", status: "submitted", payload: stored }),
        source({ id: "s3", status: "synced", payload: { ...stored, id: "s3" } }),
      ],
    })

    expect(drafts).toEqual([])
    expect(own.map((item) => item.survey_id)).toEqual(["s2", "s3"])
    expect(own[0]).toMatchObject({ survey_date: "2026-10-03", ibp_total: 31 })
  })

  it("skips a survey already drawn from the API", () => {
    const result = ownSurveyMapItems({
      ...base,
      sources: [source()],
      publishedIds: new Set(["s1"]),
    })
    expect(result).toEqual({ drafts: [], own: [] })
  })

  it("skips a survey whose parcel is not cached or that has no parcel", () => {
    const result = ownSurveyMapItems({
      ...base,
      sources: [
        source({
          id: "far",
          payload: { id: "far", sync_version: 1, site_name: "S", parcel_ids: ["P9"] },
        }),
        source({
          id: "none",
          payload: { id: "none", sync_version: 1, site_name: "S", parcel_ids: [] },
        }),
        source({ id: "unset", payload: { id: "unset", sync_version: 1, site_name: "S" } }),
      ],
    })
    expect(result).toEqual({ drafts: [], own: [] })
  })

  it("uses the server position in memory first, also when the parcel is not cached", () => {
    const known = details({ lat: 47.5, lng: 3.5 })
    const cached = ownSurveyMapItems({ ...base, sources: [source()], surveyDetails: known })
    expect(cached.drafts[0].display_location).toEqual({ lat: 47.5, lng: 3.5 })

    const uncached = ownSurveyMapItems({
      ...base,
      parcels: [],
      sources: [source()],
      surveyDetails: known,
    })
    expect(uncached.drafts[0].display_location).toEqual({ lat: 47.5, lng: 3.5 })
  })

  it("falls back to the cached centre when the in-memory position is unusable", () => {
    for (const location of [
      null,
      undefined,
      { lat: Number.NaN, lng: 3.5 },
      { lat: 47.5, lng: Number.POSITIVE_INFINITY },
    ]) {
      const { drafts } = ownSurveyMapItems({
        ...base,
        sources: [source()],
        surveyDetails: details(location),
      })
      expect(drafts[0].display_location.lat).toBeCloseTo(46.2, 6)
    }
  })
})
