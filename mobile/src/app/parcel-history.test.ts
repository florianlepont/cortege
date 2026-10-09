import { FACTOR_KEYS } from "@cortege/ibp-domain"
import {
  communityItem,
  entry,
  factorResults,
  ownItem,
  V30,
  V32,
} from "../../test/parcel-history-fixtures"
import {
  DRAWN_POINTS,
  buildEntriesFromCommunity,
  buildEntriesFromOwn,
  buildParcelHistory,
  deltaCardState,
  drawnWindow,
  historyRowState,
  listRows,
  methodKeys,
  methodShortLabel,
  trailingRunStart,
  trendSummary,
  type HistoryEntry,
} from "./parcel-history"

const withScores = (id: string, total: number, overrides: Partial<HistoryEntry> = {}) =>
  entry(id, {
    total,
    scores: { ibp_peuplement_gestion: total - 10, ibp_contexte: 10, ibp_total: total },
    factors: factorResults({ A: 3, B: 5 }),
    ...overrides,
  })

/** `count` entries of one method with totals 20, 21, ... and years 2010, 2011, ... */
const run = (count: number, method: string | null = V32): HistoryEntry[] =>
  Array.from({ length: count }, (_, index) =>
    entry(`s${index}`, { total: 20 + index, year: 2010 + index, method }),
  )

const ONLINE = { hasParcel: true, loading: false, error: false, offline: false }

describe("DRAWN_POINTS", () => {
  test("is 8", () => {
    expect(DRAWN_POINTS).toBe(8)
  })
})

describe("methodKeys", () => {
  test("null, empty and the v3.0 tag are one method", () => {
    const keys = methodKeys([
      entry("a", { method: null }),
      entry("b", { method: "" }),
      entry("c", { method: V30 }),
    ])
    expect(new Set(keys).size).toBe(1)
  })

  test("null then the v3.2 tag gives two keys", () => {
    const keys = methodKeys([entry("a", { method: null }), entry("b", { method: V32 })])
    expect(keys[0]).not.toBe(keys[1])
  })

  test("undefined between two v3.2 inherits v3.2", () => {
    const keys = methodKeys([
      entry("a", { method: V32 }),
      entry("b", { method: undefined }),
      entry("c", { method: V32 }),
    ])
    expect(new Set(keys).size).toBe(1)
  })

  test("undefined after v3.0 inherits v3.0 and is not turned into a method change", () => {
    const keys = methodKeys([entry("a", { method: V30 }), entry("b", { method: undefined })])
    expect(keys[0]).toBe(keys[1])
  })

  test("a leading undefined takes the first known key", () => {
    const keys = methodKeys([
      entry("a", { method: undefined }),
      entry("b", { method: V32 }),
      entry("c", { method: V30 }),
    ])
    expect(keys[0]).toBe(keys[1])
    expect(keys[2]).not.toBe(keys[1])
  })

  test("all undefined gives one key", () => {
    const keys = methodKeys([entry("a", { method: undefined }), entry("b", { method: undefined })])
    expect(new Set(keys).size).toBe(1)
  })

  test("an empty list gives no key", () => {
    expect(methodKeys([])).toEqual([])
  })

  test("an unsupported tag is its own key, distinct from v3.0 and from another unsupported tag", () => {
    const keys = methodKeys([
      entry("a", { method: null }),
      entry("b", { method: "cnpf_unknown" }),
      entry("c", { method: V30 }),
    ])
    expect(keys[1]).not.toBe(keys[0])
    expect(keys[1]).not.toBe(keys[2])
    expect(keys[0]).toBe(keys[2])
  })
})

describe("methodShortLabel", () => {
  test("labels the two package methods", () => {
    const [v30, v32] = methodKeys([entry("a", { method: V30 }), entry("b", { method: V32 })])
    expect(methodShortLabel(v30)).toBe("v3.0")
    expect(methodShortLabel(v32)).toBe("v3.2")
  })

  test("any other key has no label", () => {
    expect(methodShortLabel("unsupported")).toBeNull()
    expect(methodShortLabel("unknown")).toBeNull()
    expect(methodShortLabel("")).toBeNull()
  })
})

describe("trailingRunStart", () => {
  test.each([
    [["a"], 0],
    [["a", "a", "a"], 0],
    [["a", "a", "b"], 2],
    [["a", "b", "a"], 2],
    [["a", "b", "b"], 1],
  ])("%j starts at %d", (keys, expected) => {
    expect(trailingRunStart(keys)).toBe(expected)
  })

  test("an empty list starts at 0", () => {
    expect(trailingRunStart([])).toBe(0)
  })
})

describe("drawnWindow", () => {
  test.each([0, 1, 7, 8, 9, 20])("%d entries give the latest min(n, 8)", (count) => {
    const entries = run(count)
    const drawn = drawnWindow(entries)
    expect(drawn).toHaveLength(Math.min(count, 8))
    if (count > 0) expect(drawn[drawn.length - 1]).toBe(entries[count - 1])
  })
})

describe("trendSummary", () => {
  test.each([0, 1])("%d entries give no trend", (count) => {
    expect(trendSummary(run(count))).toEqual({ kind: "none" })
  })

  test("a rise over one method is a change since the first year of the run", () => {
    const entries = [
      entry("a", { total: 21, year: 2023 }),
      entry("b", { total: 27, year: 2024 }),
      entry("c", { total: 31, year: 2025 }),
      entry("d", { total: 34, year: 2026 }),
    ]
    expect(trendSummary(entries)).toEqual({
      kind: "change",
      delta: 13,
      sinceYear: 2023,
      mixed: false,
    })
  })

  test("a decrease gives a negative delta", () => {
    const entries = [entry("a", { total: 30, year: 2023 }), entry("b", { total: 26, year: 2024 })]
    expect(trendSummary(entries)).toMatchObject({ kind: "change", delta: -4, sinceYear: 2023 })
  })

  test("equal totals give a delta of 0", () => {
    const entries = [entry("a", { total: 30, year: 2023 }), entry("b", { total: 30, year: 2024 })]
    expect(trendSummary(entries)).toMatchObject({ kind: "change", delta: 0 })
  })

  test("a null first year gives no year", () => {
    const entries = [entry("a", { total: 20, year: null }), entry("b", { total: 24, year: 2024 })]
    expect(trendSummary(entries)).toMatchObject({ kind: "change", delta: 4, sinceYear: null })
  })

  test("a first year equal to the latest year gives no year", () => {
    const entries = [entry("a", { total: 20, year: 2024 }), entry("b", { total: 24, year: 2024 })]
    expect(trendSummary(entries)).toMatchObject({ kind: "change", delta: 4, sinceYear: null })
  })

  test("a method change before the latest survey makes the trend mixed and counts the last run only", () => {
    const entries = [
      entry("a", { total: 10, year: 2021, method: null }),
      entry("b", { total: 40, year: 2022, method: null }),
      entry("c", { total: 20, year: 2023, method: V32 }),
      entry("d", { total: 25, year: 2024, method: V32 }),
    ]
    expect(trendSummary(entries)).toEqual({
      kind: "change",
      delta: 5,
      sinceYear: 2023,
      mixed: true,
    })
  })

  test("a method change at the latest survey is a new method", () => {
    const entries = [
      entry("a", { total: 30, year: 2023, method: null }),
      entry("b", { total: 28, year: 2026, method: V32 }),
    ]
    expect(trendSummary(entries)).toEqual({
      kind: "newMethod",
      method: "v3.2",
      year: 2026,
      mixed: true,
    })
  })

  test("a new method with an unsupported tag has no label", () => {
    const entries = [
      entry("a", { total: 30, year: 2023, method: null }),
      entry("b", { total: 28, year: null, method: "cnpf_unknown" }),
    ]
    expect(trendSummary(entries)).toEqual({
      kind: "newMethod",
      method: null,
      year: null,
      mixed: true,
    })
  })

  test("two method changes in the window keep only the final run", () => {
    const entries = [
      entry("a", { total: 10, year: 2020, method: null }),
      entry("b", { total: 15, year: 2021, method: V32 }),
      entry("c", { total: 20, year: 2022, method: null }),
      entry("d", { total: 33, year: 2023, method: null }),
    ]
    expect(trendSummary(entries)).toEqual({
      kind: "change",
      delta: 13,
      sinceYear: 2022,
      mixed: true,
    })
  })

  test("nine entries of one method use the latest eight", () => {
    const entries = run(9)
    expect(trendSummary(entries)).toEqual({
      kind: "change",
      delta: 7,
      sinceYear: 2011,
      mixed: false,
    })
  })

  test("a method change older than the window does not make the trend mixed", () => {
    const entries = [entry("old", { total: 10, year: 2000, method: null }), ...run(8, V32)]
    expect(trendSummary(entries)).toMatchObject({ kind: "change", mixed: false })
  })

  test("a missing method field on an older server never invents a method change", () => {
    const entries = [
      entry("a", { total: 20, year: 2023, method: V32 }),
      entry("b", { total: 25, year: 2024, method: undefined }),
    ]
    expect(trendSummary(entries)).toMatchObject({ kind: "change", delta: 5, mixed: false })
  })
})

describe("historyRowState", () => {
  test("no parcel wins over offline", () => {
    expect(
      historyRowState({ hasParcel: false, loading: false, error: true, offline: true }, run(3)),
    ).toEqual({ kind: "noParcel" })
  })

  test.each([
    ["offline", { ...ONLINE, offline: true }],
    ["error", { ...ONLINE, error: true }],
  ])("%s is unavailable, even with items", (_name, input) => {
    expect(historyRowState(input, run(3))).toEqual({ kind: "unavailable" })
  })

  test("loading with no items is loading", () => {
    expect(historyRowState({ ...ONLINE, loading: true }, [])).toEqual({ kind: "loading" })
  })

  test("loading WITH items is computed from the items", () => {
    expect(historyRowState({ ...ONLINE, loading: true }, run(3))).toEqual({
      kind: "range",
      first: 20,
      latest: 22,
    })
  })

  test("zero entries is first", () => {
    expect(historyRowState(ONLINE, [])).toEqual({ kind: "first" })
  })

  test("one entry that is the current survey is first", () => {
    expect(historyRowState(ONLINE, [entry("a", { isCurrent: true })])).toEqual({ kind: "first" })
  })

  test("one entry that is not the current survey (a draft is open) is a count of 1", () => {
    expect(historyRowState(ONLINE, [entry("a")])).toEqual({ kind: "count", count: 1 })
  })

  test("a trailing run of two or more is a range from the run's first total to the latest", () => {
    const entries = [
      entry("a", { total: 10, method: null }),
      entry("b", { total: 21, method: V32 }),
      entry("c", { total: 34, method: V32 }),
    ]
    expect(historyRowState(ONLINE, entries)).toEqual({ kind: "range", first: 21, latest: 34 })
  })

  test("a method change at the latest survey is a count of n", () => {
    const entries = [
      entry("a", { method: null }),
      entry("b", { method: null }),
      entry("c", { method: V32 }),
    ]
    expect(historyRowState(ONLINE, entries)).toEqual({ kind: "count", count: 3 })
  })

  test("nine entries of one method: the row ranges over all, the trend title over the latest 8", () => {
    const entries = run(9)
    expect(historyRowState(ONLINE, entries)).toEqual({ kind: "range", first: 20, latest: 28 })
    expect(trendSummary(entries)).toMatchObject({ kind: "change", delta: 7, sinceYear: 2011 })
  })
})

describe("deltaCardState", () => {
  test("no current survey in the list (a draft) is hidden", () => {
    expect(deltaCardState([withScores("a", 24), withScores("b", 28)])).toEqual({ kind: "hidden" })
  })

  test("the current survey first in the list is hidden", () => {
    expect(deltaCardState([withScores("a", 24, { isCurrent: true }), withScores("b", 28)])).toEqual(
      { kind: "hidden" },
    )
  })

  test("an empty list is hidden", () => {
    expect(deltaCardState([])).toEqual({ kind: "hidden" })
  })

  test("compares with the survey just before the current one, not the last other survey", () => {
    const card = deltaCardState([
      withScores("a", 24, { year: 2023 }),
      withScores("cur", 28, { year: 2024, isCurrent: true }),
      withScores("c", 31, { year: 2025 }),
    ])
    expect(card).toMatchObject({
      kind: "card",
      titleYear: 2023,
      total: { delta: 4, current: 28, previous: 24 },
    })
  })

  test("a previous survey with another method is a different method", () => {
    expect(
      deltaCardState([
        withScores("a", 24, { method: null }),
        withScores("cur", 28, { method: V32, isCurrent: true }),
      ]),
    ).toEqual({ kind: "differentMethod" })
  })

  test("community entries (no factors) are hidden even with mixed methods", () => {
    expect(
      deltaCardState([
        entry("a", { method: null }),
        entry("cur", { method: V32, isCurrent: true }),
      ]),
    ).toEqual({ kind: "hidden" })
  })

  test("a current survey without scores is hidden", () => {
    expect(
      deltaCardState([
        withScores("a", 24),
        withScores("cur", 28, { isCurrent: true, scores: undefined }),
      ]),
    ).toEqual({ kind: "hidden" })
  })

  test("a previous survey without factors is hidden", () => {
    expect(
      deltaCardState([
        withScores("a", 24, { factors: undefined }),
        withScores("cur", 28, { isCurrent: true }),
      ]),
    ).toEqual({ kind: "hidden" })
  })

  test("rows are always the ten factors in order, with the current survey's points", () => {
    const card = deltaCardState([
      withScores("a", 24, { factors: factorResults({ A: 3, B: 5, C: 2 }) }),
      withScores("cur", 28, { isCurrent: true, factors: factorResults({ A: 5, B: 5, D: 1 }) }),
    ])
    if (card.kind !== "card") throw new Error("expected a card")
    expect(card.rows.map((row) => row.factor)).toEqual([...FACTOR_KEYS])
    const byFactor = Object.fromEntries(card.rows.map((row) => [row.factor, row]))
    expect(byFactor.A).toEqual({ factor: "A", points: 5, delta: 2 })
    expect(byFactor.B).toEqual({ factor: "B", points: 5, delta: 0 })
    // C only on the previous side, D only on the current one: no delta either way
    expect(byFactor.C).toEqual({ factor: "C", points: null, delta: null })
    expect(byFactor.D).toEqual({ factor: "D", points: 1, delta: null })
    expect(byFactor.J).toEqual({ factor: "J", points: null, delta: null })
  })

  test("the total delta goes through computeIbpTotalDelta", () => {
    const card = deltaCardState([withScores("a", 31), withScores("cur", 28, { isCurrent: true })])
    expect(card).toMatchObject({ kind: "card", total: { delta: -3, current: 28, previous: 31 } })
  })

  test("titleYear is null when the previous year is null or equals the current one", () => {
    expect(
      deltaCardState([
        withScores("a", 24, { year: null }),
        withScores("cur", 28, { year: 2024, isCurrent: true }),
      ]),
    ).toMatchObject({ kind: "card", titleYear: null })
    expect(
      deltaCardState([
        withScores("a", 24, { year: 2024 }),
        withScores("cur", 28, { year: 2024, isCurrent: true }),
      ]),
    ).toMatchObject({ kind: "card", titleYear: null })
  })

  test("a non-numeric score_points on the current side gives a null points value", () => {
    const factors = factorResults({ A: 3 })
    ;(factors.A as { score_points: unknown }).score_points = "x"
    const card = deltaCardState([
      withScores("a", 24),
      withScores("cur", 28, { isCurrent: true, factors }),
    ])
    if (card.kind !== "card") throw new Error("expected a card")
    expect(card.rows[0]).toEqual({ factor: "A", points: null, delta: null })
  })
})

describe("listRows", () => {
  test("is empty for no entries", () => {
    expect(listRows([])).toEqual([])
  })

  test("is newest first with the delta against the item before it in API order", () => {
    const rows = listRows([
      entry("a", { total: 20 }),
      entry("b", { total: 26 }),
      entry("c", { total: 24 }),
    ])
    expect(rows.map((row) => row.entry.surveyId)).toEqual(["c", "b", "a"])
    expect(rows.map((row) => row.deltaVsPrevious)).toEqual([-2, 6, null])
  })

  test("the delta is unavailable across a method change", () => {
    const rows = listRows([
      entry("a", { total: 20, method: null }),
      entry("b", { total: 26, method: V32 }),
      entry("c", { total: 30, method: V32 }),
    ])
    expect(rows.map((row) => row.deltaVsPrevious)).toEqual([4, "unavailable", null])
  })

  test("a method label is on every row of a mixed parcel and nowhere else", () => {
    const mixed = listRows([
      entry("a", { method: null }),
      entry("b", { method: V32 }),
      entry("c", { method: V32 }),
    ])
    expect(mixed.map((row) => row.methodLabel)).toEqual(["v3.2", "v3.2", "v3.0"])
    const single = listRows([entry("a", { method: V32 }), entry("b", { method: V32 })])
    expect(single.map((row) => row.methodLabel)).toEqual([null, null])
  })

  test("an unsupported tag on a mixed parcel has no label", () => {
    const rows = listRows([entry("a", { method: null }), entry("b", { method: "cnpf_unknown" })])
    expect(rows.map((row) => row.methodLabel)).toEqual([null, "v3.0"])
  })
})

describe("buildEntriesFromOwn", () => {
  test("maps the wire items", () => {
    const entries = buildEntriesFromOwn(
      [
        ownItem("a", { observation_year: 2023, version_number: 1, ibp_method_version: null }),
        ownItem("b", {
          observation_year: 2024,
          version_number: 2,
          ibp_method_version: V32,
          scores: { ibp_peuplement_gestion: 25, ibp_contexte: 9, ibp_total: 34 },
          factor_results: factorResults({ A: 5 }),
        }),
      ],
      "b",
    )
    expect(entries[0]).toMatchObject({
      surveyId: "a",
      year: 2023,
      version: 1,
      total: 30,
      method: null,
      isCurrent: false,
    })
    expect(entries[1]).toMatchObject({
      surveyId: "b",
      year: 2024,
      version: 2,
      total: 34,
      method: V32,
      isCurrent: true,
    })
    expect(entries[1].factors).toEqual(factorResults({ A: 5 }))
    expect(entries[1].scores).toEqual({
      ibp_peuplement_gestion: 25,
      ibp_contexte: 9,
      ibp_total: 34,
    })
  })

  test("an absent method field stays undefined, not null", () => {
    const item = ownItem("a")
    delete item.ibp_method_version
    expect(buildEntriesFromOwn([item], null)[0].method).toBeUndefined()
  })

  test("a non-finite or missing total becomes 0 and the scores are dropped", () => {
    const garbage = ownItem("a", {
      scores: { ibp_peuplement_gestion: 1, ibp_contexte: 1, ibp_total: Number.NaN },
    })
    const missing = ownItem("b", { scores: undefined as never })
    const text = ownItem("c", {
      scores: { ibp_peuplement_gestion: 1, ibp_contexte: 1, ibp_total: "12" as unknown as number },
    })
    const [a, b, c] = buildEntriesFromOwn([garbage, missing, text], null)
    expect(a.total).toBe(0)
    expect(b.total).toBe(0)
    expect(c.total).toBe(0)
    expect(a.scores).toBeUndefined()
    expect(b.scores).toBeUndefined()
    expect(c.scores).toBeUndefined()
  })

  test("years and versions that are not numbers become null", () => {
    const [a] = buildEntriesFromOwn(
      [
        ownItem("a", {
          observation_year: "2024" as unknown as number,
          version_number: Number.NaN,
        }),
      ],
      null,
    )
    expect(a.year).toBeNull()
    expect(a.version).toBeNull()
  })

  test("factor results that are not an object are dropped", () => {
    const [a, b] = buildEntriesFromOwn(
      [
        ownItem("a", { factor_results: null as never }),
        ownItem("b", { factor_results: [] as never }),
      ],
      null,
    )
    expect(a.factors).toBeUndefined()
    expect(b.factors).toBeUndefined()
  })

  test("no current survey id marks nothing as current", () => {
    const entries = buildEntriesFromOwn([ownItem("a"), ownItem("b")], null)
    expect(entries.some((item) => item.isCurrent)).toBe(false)
  })
})

describe("buildEntriesFromCommunity", () => {
  test("maps the wire items without scores or factors", () => {
    const entries = buildEntriesFromCommunity([
      communityItem("a", { author_name: "Marie", ibp_total: 22, is_current: false }),
      communityItem("b", {
        author_name: null,
        observation_year: null,
        version_number: null,
        ibp_method_version: V32,
        ibp_total: 31,
        is_current: true,
      }),
    ])
    expect(entries[0]).toEqual({
      surveyId: "a",
      year: 2024,
      version: 1,
      total: 22,
      method: null,
      author: "Marie",
      isCurrent: false,
    })
    expect(entries[1]).toMatchObject({
      surveyId: "b",
      year: null,
      version: null,
      total: 31,
      method: V32,
      author: null,
      isCurrent: true,
    })
    expect(entries[1].scores).toBeUndefined()
    expect(entries[1].factors).toBeUndefined()
  })

  test("a non-finite total becomes 0 and an absent method stays undefined", () => {
    const item = communityItem("a", { ibp_total: Number.POSITIVE_INFINITY })
    delete item.ibp_method_version
    const [entryA] = buildEntriesFromCommunity([item])
    expect(entryA.total).toBe(0)
    expect(entryA.method).toBeUndefined()
  })
})

describe("buildParcelHistory", () => {
  test.each([
    ["zero entries", [], true],
    ["one current entry", [entry("a", { isCurrent: true })], true],
    ["one entry that is not current", [entry("a")], false],
    ["two entries", [entry("a"), entry("b", { isCurrent: true })], false],
  ])("isFirst for %s", (_name, entries, expected) => {
    expect(buildParcelHistory(entries).isFirst).toBe(expected)
  })

  test("drawn is the latest 8 entries with method keys computed on the FULL list", () => {
    const entries = [
      entry("lead", { method: V32 }),
      ...Array.from({ length: 8 }, (_, index) =>
        entry(`s${index}`, { total: 20 + index, year: 2015 + index, method: undefined }),
      ),
    ]
    const model = buildParcelHistory(entries)
    expect(model.drawn).toHaveLength(8)
    expect(model.drawn[0].surveyId).toBe("s0")
    expect(new Set(model.drawn.map((point) => point.methodKey)).size).toBe(1)
    expect(model.drawn[0]).toEqual({
      surveyId: "s0",
      total: 20,
      year: 2015,
      isCurrent: false,
      methodKey: methodKeys(entries)[1],
    })
  })

  test("carries the trend, the delta card and the list rows", () => {
    const entries = [
      withScores("a", 24, { year: 2023 }),
      withScores("b", 28, { year: 2024, isCurrent: true }),
    ]
    const model = buildParcelHistory(entries)
    expect(model.trend).toEqual(trendSummary(entries))
    expect(model.deltaCard).toEqual(deltaCardState(entries))
    expect(model.rows).toEqual(listRows(entries))
    expect(model.rows.map((row) => row.entry.surveyId)).toEqual(["b", "a"])
  })

  test("an empty parcel has an empty model", () => {
    expect(buildParcelHistory([])).toEqual({
      isFirst: true,
      drawn: [],
      trend: { kind: "none" },
      deltaCard: { kind: "hidden" },
      rows: [],
    })
  })
})
