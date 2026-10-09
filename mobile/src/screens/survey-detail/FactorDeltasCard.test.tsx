import React from "react"
import renderer, { act } from "react-test-renderer"

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
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", props, children),
  }
})

import { brandFontScaleCaps, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { deltaCardState } from "../../app/parcel-history"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { entry, factorResults } from "../../../test/parcel-history-fixtures"
import { FactorDeltasCard } from "./FactorDeltasCard"

const t = fr.parcelHistory.page.deltas
const theme = defaultTheme

type Style = Record<string, unknown>
const flat = (style: unknown): Style =>
  Array.isArray(style)
    ? style.reduce<Style>((acc, s) => ({ ...acc, ...flat(s) }), {})
    : ((style as Style | null | undefined) ?? {})

const SCORES_PREVIOUS = { ibp_peuplement_gestion: 20, ibp_contexte: 11, ibp_total: 31 }
const SCORES_CURRENT = { ibp_peuplement_gestion: 22, ibp_contexte: 12, ibp_total: 34 }

/**
 * Previous: A 1, B 5, C 3, D 2, E 4 and nothing else. Current: A 3 (+2), B 4 (-1), C 3 (=), D 0 (-2),
 * E 5 (+1), F 2 (no earlier F: n.d.), G missing in the current survey (n.d., no bar).
 */
function buildState() {
  const previous = entry("prev", {
    year: 2024,
    scores: SCORES_PREVIOUS,
    factors: factorResults({ A: 1, B: 5, C: 3, D: 2, E: 4 }),
    total: 31,
  })
  const current = entry("cur", {
    year: 2025,
    isCurrent: true,
    scores: SCORES_CURRENT,
    factors: factorResults({ A: 3, B: 4, C: 3, D: 0, E: 5, F: 2 }),
    total: 34,
  })
  const state = deltaCardState([previous, current])
  if (state.kind !== "card") throw new Error("expected a card")
  return state
}

function render(state = buildState()) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<FactorDeltasCard state={state} />)
  })
  const root = tree!.root
  const find = (type: string) => root.findAll((n) => (n.type as unknown) === type)
  const rows = Array.from({ length: 10 }, (_, i) =>
    root.findByProps({ testID: `factor-delta-${"ABCDEFGHIJ"[i]}` }),
  )
  const cells = (row: renderer.ReactTestInstance) =>
    row.findAll((n) => (n.type as unknown) === "Text")
  return { tree: tree!, root, find, rows, cells }
}

describe("FactorDeltasCard header", () => {
  test("a glass card padded 16 with the title and the total line", () => {
    const { find } = render()
    const card = find("AppCard")[0]
    expect(card.props.variant).toBe("glass")
    expect(card.props.padding).toBe(16)
    const texts = find("Text")
    expect(texts[0].props.children).toBe("Depuis 2024")
    expect(flat(texts[0].props.style)).toMatchObject({
      fontFamily: brandTypography.input.fontFamily,
      fontSize: brandTypography.input.fontSize,
      color: theme.colors.textPrimary,
    })
    expect(texts[1].props.children).toBe("Total : +3 (34 contre 31)")
    expect(flat(texts[1].props.style)).toMatchObject({
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: brandTypeScale.footnote.lineHeight,
      color: theme.colors.textSecondary,
      marginTop: 4,
    })
  })

  test("a null year says since the previous survey and an unchanged total says so", () => {
    const state = {
      ...buildState(),
      titleYear: null,
      total: { delta: 0, current: 34, previous: 34 },
    }
    const { find } = render(state)
    const texts = find("Text")
    expect(texts[0].props.children).toBe(t.title(null))
    expect(texts[1].props.children).toBe("Total : inchangé (34)")
  })
})

describe("FactorDeltasCard rows", () => {
  test("ten rows in factor order, each 32 high with a letter column of 20", () => {
    const { rows, cells } = render()
    expect(rows).toHaveLength(10)
    rows.forEach((row, i) => {
      expect(flat(row.props.style)).toMatchObject({ height: 32, flexDirection: "row", gap: 12 })
      const [letter] = cells(row)
      expect(letter.props.children).toBe("ABCDEFGHIJ"[i])
      expect(flat(letter.props.style)).toMatchObject({ width: 20, color: theme.colors.textPrimary })
      expect(letter.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.button)
    })
  })

  test("the track is 8 high on the score track colour and the delta column is 40 wide at least", () => {
    const { rows, cells } = render()
    const track = rows[0].findAll(
      (n) => (n.type as unknown) === "View" && flat(n.props.style).flex === 1,
    )[0]
    expect(flat(track.props.style)).toMatchObject({
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.visual.score.track,
    })
    const delta = cells(rows[0])[1]
    expect(flat(delta.props.style)).toMatchObject({ minWidth: 40, textAlign: "right" })
    expect(delta.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.button)
  })

  test("the bar fill is the share of five points in the factor tone", () => {
    const { root } = render()
    const fill = (key: string) =>
      flat(root.findByProps({ testID: `factor-delta-fill-${key}` }).props.style)
    // A: 3 points = mid, 60 percent
    expect(fill("A")).toMatchObject({
      width: "60%",
      height: 8,
      backgroundColor: theme.visual.factorBar.mid.base,
    })
    // B: 4 points = high, 80 percent
    expect(fill("B")).toMatchObject({
      width: "80%",
      backgroundColor: theme.visual.factorBar.high.base,
    })
    // F: 2 points = low, 40 percent
    expect(fill("F")).toMatchObject({
      width: "40%",
      backgroundColor: theme.visual.factorBar.low.base,
    })
    // E: 5 points = full width
    expect(fill("E").width).toBe("100%")
  })

  test("no fill for 0 points or a missing factor", () => {
    const { root } = render()
    // D has 0 points, G to J are missing in the current survey
    for (const key of ["D", "G", "H", "I", "J"]) {
      expect(root.findAllByProps({ testID: `factor-delta-fill-${key}` })).toHaveLength(0)
    }
  })

  test("deltas: plus in success, minus in danger, equal and n.d. in secondary text", () => {
    const { rows, cells } = render()
    const delta = (i: number) => cells(rows[i])[1]
    expect(delta(0).props.children).toBe("+2")
    expect(flat(delta(0).props.style).color).toBe(theme.onSurface.success)
    expect(delta(1).props.children).toBe("-1")
    expect(flat(delta(1).props.style).color).toBe(theme.onSurface.danger)
    expect(delta(2).props.children).toBe("=")
    expect(flat(delta(2).props.style).color).toBe(theme.colors.textSecondary)
    expect(delta(3).props.children).toBe("-2")
    expect(delta(4).props.children).toBe("+1")
    // F has no earlier points, G to J are missing on the current side
    for (const i of [5, 6, 7, 8, 9]) {
      expect(delta(i).props.children).toBe("n.d.")
      expect(flat(delta(i).props.style).color).toBe(theme.colors.textSecondary)
    }
  })

  test("each row is one accessible text with the catalogue label", () => {
    const { rows } = render()
    expect(rows[0].props.accessible).toBe(true)
    expect(rows[0].props.accessibilityLabel).toBe("Facteur A, 3 sur 5, plus 2")
    expect(rows[1].props.accessibilityLabel).toBe("Facteur B, 4 sur 5, moins 1")
    expect(rows[2].props.accessibilityLabel).toBe("Facteur C, 3 sur 5, inchangé")
    expect(rows[6].props.accessibilityLabel).toBe("Facteur G, non renseigné, pas de comparaison")
    rows.forEach((row, i) => {
      expect(row.props.accessibilityLabel).toContain(`Facteur ${"ABCDEFGHIJ"[i]}`)
    })
  })

  test("nothing in the card is pressable", () => {
    const { root } = render()
    const pressable = root.findAll(
      (n) => typeof n.props.onPress === "function" || n.props.accessibilityRole === "button",
    )
    expect(pressable).toHaveLength(0)
  })
})
