import type {
  CommunitySurveyItem,
  SearchMemberItem,
  SearchParcelItem,
  SearchPlaceItem,
} from "@cortege/ibp-domain"
import type { LocalSurvey } from "../storage/types"
import {
  COMMUNITY_RESULT_LIMIT,
  PARCELS_RESULT_LIMIT,
  PLACES_MIN_LENGTH,
  PLACES_RESULT_LIMIT,
  PLACE_CONFIDENCE_MIN,
  SEARCH_MIN_LENGTH,
  SUMMARY_ROW_COUNT,
  communitySummary,
  groupOrder,
  isCapped,
  isSearchActive,
  looksLikeParcelQuery,
  matchOwnSurveys,
  memberMatches,
  pickBestResult,
  summaryRows,
} from "./global-search"

function survey(id: string, siteName: string, extra: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id,
    site_name: siteName,
    status: "draft",
    visibility: "private",
    sync_version: 0,
    sync_state: "synced",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: "2026-10-01T10:00:00.000Z",
    updated_at: "2026-10-02T10:00:00.000Z",
    completion_rate: 0,
    factors_filled: 0,
    ...extra,
  }
}

function member(name: string, count = 1): SearchMemberItem {
  return { author_name: name, survey_count: count }
}

function place(
  id: string,
  kind: SearchPlaceItem["kind"],
  score: number,
  name = id,
): SearchPlaceItem {
  return { id, name, kind, context: null, lat: 48.4, lng: 2.7, score }
}

function parcel(id = "77186000AB0123"): SearchParcelItem {
  return {
    parcel_id: id,
    commune_code: "77186",
    commune_name: "Fontainebleau",
    section: "AB",
    number: "0123",
    centroid: { lat: 48.4, lng: 2.7 },
    bbox: null,
    survey_count: 0,
  }
}

function communitySurvey(id: string, siteName = id): CommunitySurveyItem {
  return {
    survey_id: id,
    site_name: siteName,
    author_name: "Marie Dupont",
    submitted_at: "2026-10-01T10:00:00.000Z",
    ibp_total: 30,
  }
}

const NONE = {
  parcels: [] as SearchParcelItem[],
  members: [] as SearchMemberItem[],
  places: [] as SearchPlaceItem[],
  mine: [] as LocalSurvey[],
  community: [] as CommunitySurveyItem[],
}

describe("constants", () => {
  it("holds the documented limits", () => {
    expect(SEARCH_MIN_LENGTH).toBe(2)
    expect(PLACES_MIN_LENGTH).toBe(3)
    expect(SUMMARY_ROW_COUNT).toBe(3)
    expect(PLACE_CONFIDENCE_MIN).toBe(0.85)
    expect(COMMUNITY_RESULT_LIMIT).toBe(50)
    expect(PLACES_RESULT_LIMIT).toBe(10)
    expect(PARCELS_RESULT_LIMIT).toBe(10)
  })
})

describe("isSearchActive", () => {
  it("needs two characters once trimmed", () => {
    expect(isSearchActive(" a ")).toBe(false)
    expect(isSearchActive("ab")).toBe(true)
    expect(isSearchActive("")).toBe(false)
  })
})

describe("matchOwnSurveys", () => {
  const surveys = [
    survey("s1", "Forêt de Rambouillet"),
    survey("s2", "Prairie du Nord"),
    survey("s3", "FORET communale"),
    survey("foret-id", "Sans rapport"),
    survey("s5", "", { last_sync_error: "foret introuvable" }),
  ]

  it("matches the survey name, any case and accent, keeping the input order", () => {
    expect(matchOwnSurveys(surveys, "foret").map((s) => s.id)).toEqual(["s1", "s3"])
    expect(matchOwnSurveys(surveys, "FORÊT").map((s) => s.id)).toEqual(["s1", "s3"])
  })

  it("never matches a survey id, a sync error or a blank name", () => {
    expect(matchOwnSurveys(surveys, "foret-id")).toEqual([])
    expect(matchOwnSurveys(surveys, "introuvable")).toEqual([])
  })

  it("returns nothing under two characters", () => {
    expect(matchOwnSurveys(surveys, "f")).toEqual([])
    expect(matchOwnSurveys(surveys, "  ")).toEqual([])
  })

  it("collapses inner whitespace of the query", () => {
    expect(matchOwnSurveys(surveys, "  forêt   de ").map((s) => s.id)).toEqual(["s1"])
  })
})

describe("looksLikeParcelQuery", () => {
  it.each([
    "77186 AB 0123",
    "AB 123",
    "Fontainebleau AB 123",
    "77186000AB0123",
    "75112BL0010",
    "12 rue de la paix",
  ])("accepts %s", (query) => {
    expect(looksLikeParcelQuery(query)).toBe(true)
  })

  it.each(["Fontainebleau", "Marie", "forêt de Rambouillet", "1234", ""])("rejects %s", (query) => {
    expect(looksLikeParcelQuery(query)).toBe(false)
  })
})

describe("memberMatches", () => {
  it.each([
    ["Marie Dupont", "dup", true],
    ["Marie Dupont", "marie", true],
    ["Anne-Marie Roy", "marie", true],
    ["Rosemarie", "marie", false],
    ["Élodie", "elo", true],
    ["Jean d'Arc", "arc", true],
    ["Marie Dupont", "", false],
  ])("memberMatches(%s, %s) is %s", (name, query, expected) => {
    expect(memberMatches(name, query)).toBe(expected)
  })
})

describe("pickBestResult", () => {
  const marie = member("Marie Dupont")
  const rosemarie = member("Rosemarie")
  const commune = place("p1", "municipality", 0.9)
  const own = survey("s1", "Marie en forêt")
  const community = communitySurvey("c1")

  it("returns a parcel whatever else is present", () => {
    const found = parcel()
    expect(
      pickBestResult({
        ...NONE,
        query: "marie",
        parcels: [found],
        members: [marie],
        places: [commune],
        mine: [own],
        community: [community],
      }),
    ).toEqual({ kind: "parcel", item: found })
  })

  it("prefers a matching member over a place scoring 0.97", () => {
    expect(
      pickBestResult({
        ...NONE,
        query: "marie",
        members: [marie],
        places: [place("p2", "municipality", 0.97)],
      }),
    ).toEqual({ kind: "member", item: marie })
  })

  it("skips a member that matches only by substring", () => {
    expect(
      pickBestResult({ ...NONE, query: "marie", members: [rosemarie], places: [commune] }),
    ).toEqual({ kind: "place", item: commune })
  })

  it("takes the first matching member among several", () => {
    expect(pickBestResult({ ...NONE, query: "marie", members: [rosemarie, marie] })).toEqual({
      kind: "member",
      item: marie,
    })
  })

  it("takes a strong point of interest, and skips a street or a weak place", () => {
    const poi = place("p3", "other", 0.85)
    expect(
      pickBestResult({
        ...NONE,
        query: "fontainebleau",
        places: [
          place("street", "street", 0.96),
          place("weak", "municipality", 0.84),
          place("locality", "locality", 0.99),
          poi,
        ],
      }),
    ).toEqual({ kind: "place", item: poi })
  })

  it("falls back to the first own survey, then the first community survey", () => {
    const places = [place("street", "street", 0.96)]
    expect(
      pickBestResult({ ...NONE, query: "foret", places, mine: [own], community: [community] }),
    ).toEqual({ kind: "mine", survey: own })
    expect(pickBestResult({ ...NONE, query: "foret", places, community: [community] })).toEqual({
      kind: "community",
      item: community,
    })
  })

  it("returns null when nothing qualifies", () => {
    expect(pickBestResult({ ...NONE, query: "zzz" })).toBeNull()
  })
})

describe("groupOrder", () => {
  it("is fixed, with parcels first when a parcel was found", () => {
    expect(groupOrder(false)).toEqual(["mine", "community", "places", "parcels"])
    expect(groupOrder(true)).toEqual(["parcels", "mine", "community", "places"])
  })
})

describe("summaryRows", () => {
  const items = ["a", "b", "c", "d", "e"]

  it("shows at most three rows and reports the rest", () => {
    expect(summaryRows(items, null)).toEqual({
      rows: ["a", "b", "c"],
      total: 5,
      hasMore: true,
    })
  })

  it("never repeats the promoted item", () => {
    expect(summaryRows(items, "b")).toEqual({ rows: ["a", "c", "d"], total: 5, hasMore: true })
  })

  it("has no more when everything but the promoted item is drawn", () => {
    expect(summaryRows(["a", "b", "c", "d"], "d")).toEqual({
      rows: ["a", "b", "c"],
      total: 4,
      hasMore: false,
    })
    expect(summaryRows(["a"], null)).toEqual({ rows: ["a"], total: 1, hasMore: false })
  })

  it("honours a custom limit and an empty list", () => {
    expect(summaryRows(items, null, 1).rows).toEqual(["a"])
    expect(summaryRows([], null)).toEqual({ rows: [], total: 0, hasMore: false })
  })

  it("compares by identity, not by value", () => {
    const first = { id: 1 }
    const twin = { id: 1 }
    expect(summaryRows([first, twin], first).rows).toEqual([twin])
  })
})

describe("communitySummary", () => {
  const marie = member("Marie Dupont")
  const anne = member("Anne Roy")
  const surveys = [communitySurvey("c1"), communitySurvey("c2"), communitySurvey("c3")]
  const surveys2 = [...surveys, communitySurvey("c4")]

  it("lists one member first, then surveys, at most three rows", () => {
    const summary = communitySummary([marie, anne], surveys2, null)
    expect(summary.rows).toEqual([
      { kind: "member", item: marie },
      { kind: "community", item: surveys2[0] },
      { kind: "community", item: surveys2[1] },
    ])
    expect(summary.total).toBe(6)
    expect(summary.hasMore).toBe(true)
    expect(summary.capped).toBe(false)
  })

  it("skips a promoted member and a promoted survey", () => {
    const bestMember = communitySummary([marie, anne], [], { kind: "member", item: marie })
    expect(bestMember.rows).toEqual([{ kind: "member", item: anne }])
    expect(bestMember.hasMore).toBe(false)

    const bestSurvey = communitySummary([], surveys, { kind: "community", item: surveys[0] })
    expect(bestSurvey.rows.map((row) => row.item)).toEqual([surveys[1], surveys[2]])
    expect(bestSurvey.total).toBe(3)
    expect(bestSurvey.hasMore).toBe(false)
  })

  it("ignores a best result of another kind", () => {
    const summary = communitySummary([], surveys, { kind: "mine", survey: survey("s1", "x") })
    expect(summary.rows).toHaveLength(3)
  })

  it("is capped when the survey count reaches the limit", () => {
    const many = Array.from({ length: COMMUNITY_RESULT_LIMIT }, (_, i) => communitySurvey(`c${i}`))
    expect(communitySummary([], many, null).capped).toBe(true)
  })

  it("handles an empty community", () => {
    expect(communitySummary([], [], null)).toEqual({
      rows: [],
      total: 0,
      hasMore: false,
      capped: false,
    })
  })
})

describe("isCapped", () => {
  it("is true from the limit upward", () => {
    expect(isCapped(9, 10)).toBe(false)
    expect(isCapped(10, 10)).toBe(true)
    expect(isCapped(11, 10)).toBe(true)
  })
})
