import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: {
      create: <T,>(styles: T): T => styles,
      flatten: (style: unknown) => style,
      absoluteFill: {},
    },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))
jest.mock("../../ui/AppChoiceChip", () => ({ AppChoiceChip: "AppChoiceChip" }))

const mockCanAnimate = jest.fn(() => false)
const mockUseListEntrance = jest.fn(() => mockCanAnimate)
jest.mock("../../ui/useListEntrance", () => ({
  useListEntrance: () => mockUseListEntrance(),
}))
jest.mock("../../ui/ListEntranceRow", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    ListEntranceRow: ({
      index,
      canAnimate,
      children,
    }: {
      index: number
      canAnimate: unknown
      children?: React.ReactNode
    }) => ReactRef.createElement("ListEntranceRow", { index, canAnimate }, children),
  }
})

import { listRows } from "../../app/parcel-history"
import { fr } from "../../i18n"
import { entry, V32 } from "../../../test/parcel-history-fixtures"
import { HistoryList } from "./HistoryList"

const t = fr.parcelHistory
const list = t.page.list

const hostType = (node: ReactInstance): string => node.type as unknown as string
type ReactInstance = ReactTestInstance

const all = (root: ReactInstance, type: string) => root.findAll((n) => hostType(n) === type)
const textOf = (node: ReactInstance): string =>
  all(node, "Text")
    .map((n) => String(n.props.children))
    .join("|")

// Oldest first, as the API returns them: 2023 v1 (28), 2024 v2 (31, current), 2025 v3 (36).
const OWN = [
  entry("s1", { year: 2023, version: 1, total: 28 }),
  entry("s2", { year: 2024, version: 2, total: 31, isCurrent: true }),
  entry("s3", { year: 2025, version: 3, total: 36 }),
]

function render(
  rows = listRows(OWN),
  variant: "own" | "community" = "own",
  onOpenSurvey: (id: string) => void = jest.fn(),
) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <HistoryList rows={rows} variant={variant} onOpenSurvey={onOpenSurvey} />,
    )
  })
  const root = tree!.root
  const frames = all(root, "ListEntranceRow").map((entranceRow) => ({
    entrance: entranceRow,
    pressable: all(entranceRow, "Pressable")[0],
  }))
  return { tree: tree!, root, frames, onOpenSurvey }
}

beforeEach(() => {
  mockUseListEntrance.mockClear()
})

describe("HistoryList header and order", () => {
  test("the header counts the surveys and the rows are newest first", () => {
    const { root, frames } = render()
    expect(all(root, "Text")[0].props.children).toBe("Relevés · 3")
    expect(frames).toHaveLength(3)
    expect(frames.map(({ pressable }) => String(textOf(pressable)).split("|")[0])).toEqual([
      "2025 · version 3",
      "2024 · version 2",
      "2023 · version 1",
    ])
  })

  test("one useListEntrance call for the list, rows wrapped with their index", () => {
    const { frames } = render()
    expect(mockUseListEntrance).toHaveBeenCalledTimes(1)
    frames.forEach(({ entrance }, index) => {
      expect(entrance.props.index).toBe(index)
      expect(entrance.props.canAnimate).toBe(mockCanAnimate)
    })
  })

  test("an empty list shows only the header", () => {
    const { root, frames } = render([])
    expect(frames).toHaveLength(0)
    expect(all(root, "Text")[0].props.children).toBe("Relevés · 0")
  })
})

describe("HistoryList own rows", () => {
  test("title, total, change against the survey before and the ring", () => {
    const { frames } = render()
    const newest = frames[0].pressable
    expect(textOf(newest)).toBe("2025 · version 3|IBP 36/50|Total +5")
    const ring = all(newest, "ScoreRing")[0]
    expect(ring.props.score).toBe(36)
    expect(ring.props.index).toBe(0)
    expect(ring.props.animationKey).toBe("s3:36")
    expect(all(frames[1].pressable, "ScoreRing")[0].props.index).toBe(1)
  })

  test("the oldest row has no change", () => {
    const { frames } = render()
    expect(textOf(frames[2].pressable)).toBe("2023 · version 1|IBP 28/50")
  })

  test("a negative change keeps its sign", () => {
    const rows = listRows([entry("a", { total: 30 }), entry("b", { total: 27 })])
    expect(textOf(render(rows).frames[0].pressable)).toContain("Total -3")
  })

  test("a year or version that is missing falls back in the title", () => {
    const rows = listRows([
      entry("a", { year: null, version: 2 }),
      entry("b", { year: null, version: null }),
    ])
    const { frames } = render(rows)
    expect(textOf(frames[0].pressable)).toContain("Relevé")
    expect(textOf(frames[1].pressable)).toContain("Version 2")
  })
})

describe("HistoryList current row", () => {
  test("selected, not pressable, read as text, with the Ce relevé chip", () => {
    const { frames, onOpenSurvey } = render()
    const current = frames[1].pressable
    expect(current.props.disabled).toBe(true)
    expect(current.props.accessibilityRole).toBe("text")
    expect(current.props.accessibilityLabel).toBe(
      list.openCurrent({ entry: "2024 · version 2", total: 31 }),
    )
    expect(current.props.accessibilityLabel).toBe("2024 · version 2, 31 sur 50. Ce relevé")
    expect(current.props.testID).toBeUndefined()
    // The selected frame draws the checkmark glyph.
    expect(all(current, "Ionicons")[0].props.name).toBe("checkmark-circle-outline")
    const chip = all(current, "AppChoiceChip")[0]
    expect(chip.props).toMatchObject({ variant: "status", tone: "success", label: "Ce relevé" })
    // Pressing it does nothing.
    expect(current.props.onPress).toBeUndefined()
    expect(onOpenSurvey).not.toHaveBeenCalled()
  })

  test("only the current row carries the chip and the selected glyph", () => {
    const { frames } = render()
    expect(all(frames[0].pressable, "AppChoiceChip")).toHaveLength(0)
    expect(all(frames[0].pressable, "Ionicons")).toHaveLength(0)
    expect(all(frames[2].pressable, "AppChoiceChip")).toHaveLength(0)
  })
})

describe("HistoryList other rows", () => {
  test("a button with the open label and a testID that opens that survey", () => {
    const onOpenSurvey = jest.fn()
    const { frames } = render(listRows(OWN), "own", onOpenSurvey)
    const newest = frames[0].pressable
    expect(newest.props.accessibilityRole).toBe("button")
    expect(newest.props.accessibilityLabel).toBe("2025 · version 3, 36 sur 50. Ouvrir ce relevé")
    expect(newest.props.testID).toBe("parcel-history-row-s3")
    act(() => newest.props.onPress())
    expect(onOpenSurvey).toHaveBeenCalledWith("s3")
    act(() => frames[2].pressable.props.onPress())
    expect(onOpenSurvey).toHaveBeenLastCalledWith("s1")
    expect(onOpenSurvey).toHaveBeenCalledTimes(2)
  })
})

describe("HistoryList methods", () => {
  const MIXED = [
    entry("m1", { year: 2022, version: 1, total: 20, method: null }),
    entry("m2", { year: 2023, version: 2, total: 25, method: V32 }),
    entry("m3", { year: 2024, version: 3, total: 30, method: V32, isCurrent: true }),
  ]

  test("a mixed parcel labels each row with its method first", () => {
    const { frames } = render(listRows(MIXED))
    expect(textOf(frames[0].pressable)).toBe("2024 · version 3|Méthode v3.2|IBP 30/50|Total +5")
    expect(textOf(frames[2].pressable)).toBe("2022 · version 1|Méthode v3.0|IBP 20/50")
  })

  test("across a method change the comparison is unavailable", () => {
    const { frames } = render(listRows(MIXED))
    expect(textOf(frames[1].pressable)).toBe(
      "2023 · version 2|Méthode v3.2|IBP 25/50|Pas de comparaison possible",
    )
  })

  test("a single-method parcel shows no method label", () => {
    expect(textOf(render().frames[0].pressable)).not.toContain("Méthode")
  })
})

describe("HistoryList community variant", () => {
  const COMMUNITY = [
    entry("c1", { year: 2024, version: 1, total: 22, author: "Marie Lepont" }),
    entry("c2", { year: 2025, version: 2, total: 27, author: "  ", isCurrent: true }),
    entry("c3", { year: null, version: null, total: 30, author: null }),
  ]

  test("the author leads the title, with the fallback for a null or blank author", () => {
    const { frames } = render(listRows(COMMUNITY), "community")
    // newest first: c3, c2, c1
    expect(textOf(frames[0].pressable).split("|")[0]).toBe(
      fr.communitySurvey.history.row({
        author: fr.communitySurvey.unknownAuthor,
        year: null,
        version: null,
      }),
    )
    expect(textOf(frames[1].pressable).split("|")[0]).toBe("un ancien membre · 2025 · version 2")
    expect(textOf(frames[2].pressable).split("|")[0]).toBe("Marie Lepont · 2024 · version 1")
  })

  test("labels and presses use the community title", () => {
    const onOpenSurvey = jest.fn()
    const { frames } = render(listRows(COMMUNITY), "community", onOpenSurvey)
    expect(frames[2].pressable.props.accessibilityLabel).toBe(
      "Marie Lepont · 2024 · version 1, 22 sur 50. Ouvrir ce relevé",
    )
    expect(frames[1].pressable.props.accessibilityLabel).toBe(
      "un ancien membre · 2025 · version 2, 27 sur 50. Ce relevé",
    )
    act(() => frames[2].pressable.props.onPress())
    expect(onOpenSurvey).toHaveBeenCalledWith("c1")
  })
})
