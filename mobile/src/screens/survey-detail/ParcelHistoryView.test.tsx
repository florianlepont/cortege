import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("./TrendCard", () => ({ TrendCard: "TrendCard" }))
jest.mock("./FactorDeltasCard", () => ({ FactorDeltasCard: "FactorDeltasCard" }))
jest.mock("./HistoryList", () => ({ HistoryList: "HistoryList" }))
jest.mock("../../ui/EntranceView", () => ({ EntranceView: "EntranceView" }))
jest.mock("../../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))

import { buildEntriesFromCommunity, buildEntriesFromOwn } from "../../app/parcel-history"
import { fr } from "../../i18n"
import {
  communityItem,
  factorResults,
  ownItem,
  V30,
  V32,
} from "../../../test/parcel-history-fixtures"
import { ParcelHistoryView } from "./ParcelHistoryView"

const page = fr.parcelHistory.page

const SCORES = (total: number) => ({
  ibp_peuplement_gestion: total - 10,
  ibp_contexte: 10,
  ibp_total: total,
})

const own = (id: string, total: number, extra = {}) =>
  ownItem(id, {
    ibp_method_version: V32,
    scores: SCORES(total),
    factor_results: factorResults({ A: total % 5, B: 3 }),
    ...extra,
  })

const FOUR = [
  own("s1", 20, { observation_year: 2022 }),
  own("s2", 24, { observation_year: 2023 }),
  own("s3", 27, { observation_year: 2024 }),
  own("s4", 31, { observation_year: 2025 }),
]

function render(
  items: ReturnType<typeof ownItem>[],
  currentId: string | null,
  variant: "own" | "community" = "own",
  onOpenSurvey: (surveyId: string) => void = jest.fn(),
): renderer.ReactTestRenderer {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ParcelHistoryView
        entries={buildEntriesFromOwn(items, currentId)}
        variant={variant}
        onOpenSurvey={onOpenSurvey}
      />,
    )
  })
  return tree
}

type Block = { index: number; child: string; props: Record<string, unknown> }

/** The blocks in order: the entrance index and the host type it wraps. */
function blocks(tree: renderer.ReactTestRenderer): Block[] {
  return tree.root
    .findAll((n) => (n.type as unknown as string) === "EntranceView")
    .map((wrapper: ReactTestInstance) => {
      const child = wrapper.children[0] as ReactTestInstance
      return {
        index: wrapper.props.index as number,
        child: child.type as unknown as string,
        props: child.props,
      }
    })
}

describe("ParcelHistoryView, own variant", () => {
  test("shows the trend, the deltas and the list in order with indices 0, 1, 2", () => {
    const list = blocks(render(FOUR, "s4"))
    expect(list.map((b) => [b.index, b.child])).toEqual([
      [0, "TrendCard"],
      [1, "FactorDeltasCard"],
      [2, "HistoryList"],
    ])
    expect(list[1].props.state).toMatchObject({ kind: "card" })
  })

  test("a first survey shows the notice and no trend or delta card", () => {
    const first = blocks(render([], null))
    expect(first.map((b) => b.child)).toEqual(["AppNotice"])
    expect(first[0].props).toMatchObject({ tone: "info", message: page.first })
  })

  test("a first survey that is the current one also shows its single list row", () => {
    const list = blocks(render([own("s1", 20)], "s1"))
    expect(list.map((b) => [b.index, b.child])).toEqual([
      [0, "AppNotice"],
      [1, "HistoryList"],
    ])
    expect((list[1].props.rows as unknown[]).length).toBe(1)
  })

  test("a previous survey of another method shows the notice instead of the delta card", () => {
    const items = [...FOUR.slice(0, 3), own("s4", 31, { ibp_method_version: V30 })]
    const list = blocks(render(items, "s4"))
    expect(list.map((b) => b.child)).toEqual(["TrendCard", "AppNotice", "HistoryList"])
    expect(list[1].props).toMatchObject({
      tone: "info",
      icon: "git-compare-outline",
      message: page.deltas.differentMethod,
    })
  })

  test("a draft current survey shows the trend and the list, no delta block", () => {
    const list = blocks(render(FOUR.slice(0, 2), "draft-1"))
    expect(list.map((b) => [b.index, b.child])).toEqual([
      [0, "TrendCard"],
      [1, "HistoryList"],
    ])
    const rows = list[1].props.rows as Array<{ entry: { isCurrent: boolean } }>
    expect(rows.some((row) => row.entry.isCurrent)).toBe(false)
  })

  test("passes the model, the variant and onOpenSurvey through", () => {
    const onOpenSurvey = jest.fn()
    const list = blocks(render(FOUR, "s4", "own", onOpenSurvey))
    expect(list[0].props.points).toHaveLength(4)
    expect(list[2].props.variant).toBe("own")
    expect(list[2].props.onOpenSurvey).toBe(onOpenSurvey)
  })
})

describe("ParcelHistoryView, community variant", () => {
  const history = [
    communityItem("c1", { observation_year: 2023, ibp_method_version: V30, ibp_total: 22 }),
    communityItem("c2", { observation_year: 2025, ibp_method_version: V32, ibp_total: 30 }),
    communityItem("c3", { observation_year: 2026, ibp_method_version: V32, ibp_total: 33 }),
  ]
  const renderCommunity = (onOpenSurvey = jest.fn()) => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <ParcelHistoryView
          entries={buildEntriesFromCommunity(
            history.map((h, i) => ({ ...h, is_current: i === 2 })),
          )}
          variant="community"
          onOpenSurvey={onOpenSurvey}
        />,
      )
    })
    return tree
  }

  test("never renders the delta block, even across methods, and passes the community variant", () => {
    const onOpenSurvey = jest.fn()
    const list = blocks(renderCommunity(onOpenSurvey))
    expect(list.map((b) => [b.index, b.child])).toEqual([
      [0, "TrendCard"],
      [1, "HistoryList"],
    ])
    expect(list[1].props.variant).toBe("community")
    expect(list[1].props.onOpenSurvey).toBe(onOpenSurvey)
  })

  test("a community first survey shows only the notice and its row", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <ParcelHistoryView
          entries={buildEntriesFromCommunity([{ ...history[0], is_current: true }])}
          variant="community"
          onOpenSurvey={jest.fn()}
        />,
      )
    })
    expect(blocks(tree).map((b) => b.child)).toEqual(["AppNotice", "HistoryList"])
  })
})
