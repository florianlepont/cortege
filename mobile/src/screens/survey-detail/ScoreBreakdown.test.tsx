import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { ScoreBreakdown } from "./ScoreBreakdown"

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
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(styles: T) => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})
jest.mock("../../ui/AppCard", () => ({ AppCard: "AppCard" }))

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

const t = fr.surveyDetail.scoreScreen
const m = fr.surveyDetail.metric
const textOf = (node: ReactTestInstance): string => [node.props.children].flat().join("")

function render(scores: React.ComponentProps<typeof ScoreBreakdown>["scores"]): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<ScoreBreakdown scores={scores} />)
  })
  return tree as ReactTestRenderer
}

const fillOf = (tree: ReactTestRenderer, testID: string) =>
  flatten(tree.root.findByProps({ testID: `${testID}-fill` }).props.style)

describe("ScoreBreakdown (variant I, Score page)", () => {
  test("sits in a glass card", () => {
    const tree = render({ ibp_total: 28, ibp_peuplement_gestion: 24, ibp_contexte: 4 })
    expect(tree.root.findByType("AppCard" as never).props.variant).toBe("glass")
  })

  test("the total is the thin large numeral with its unit", () => {
    const tree = render({ ibp_total: 28, ibp_peuplement_gestion: 24, ibp_contexte: 4 })
    const texts = tree.root.findAllByType("Text" as never)
    const total = texts.find((node) => textOf(node) === "28")
    expect(flatten(total?.props.style)).toMatchObject({
      fontFamily: brandTypography.numeral.fontFamily,
      fontSize: brandTypography.numeral.fontSize,
      color: defaultTheme.colors.textPrimary,
    })
    const unit = texts.find((node) => textOf(node) === m.outOfTotal)
    expect(flatten(unit?.props.style)).toMatchObject({
      fontFamily: brandTypography.numeralUnit.fontFamily,
      color: defaultTheme.colors.textSecondary,
    })
  })

  test("sub-score tracks take the tone of their own band (stand 24 is high, context 4 is low)", () => {
    const tree = render({ ibp_total: 28, ibp_peuplement_gestion: 24, ibp_contexte: 4 })
    expect(fillOf(tree, "score-stand")).toMatchObject({
      backgroundColor: defaultTheme.visual.score.high,
      width: "69%",
    })
    expect(fillOf(tree, "score-context")).toMatchObject({
      backgroundColor: defaultTheme.visual.score.low,
      width: "27%",
    })
  })

  test("band edges follow the shared package: stand 14 is mid, 7 is low, context 5 is mid, 10 is high", () => {
    const mid = render({ ibp_total: 19, ibp_peuplement_gestion: 14, ibp_contexte: 5 })
    expect(fillOf(mid, "score-stand").backgroundColor).toBe(defaultTheme.visual.score.mid)
    expect(fillOf(mid, "score-context").backgroundColor).toBe(defaultTheme.visual.score.mid)
    const low = render({ ibp_total: 7, ibp_peuplement_gestion: 6, ibp_contexte: 1 })
    expect(fillOf(low, "score-stand").backgroundColor).toBe(defaultTheme.visual.score.low)
    const high = render({ ibp_total: 40, ibp_peuplement_gestion: 30, ibp_contexte: 10 })
    expect(fillOf(high, "score-context").backgroundColor).toBe(defaultTheme.visual.score.high)
  })

  test("tracks use the track colour and the sub-score texts are shown", () => {
    const tree = render({ ibp_total: 28, ibp_peuplement_gestion: 24, ibp_contexte: 4 })
    const track = tree.root
      .findAllByType("View" as never)
      .find((node) => flatten(node.props.style).backgroundColor === defaultTheme.visual.score.track)
    expect(track).toBeDefined()
    const texts = tree.root.findAllByType("Text" as never).map(textOf)
    expect(texts).toContain(t.pointsOf({ points: 24, max: 35 }))
    expect(texts).toContain(t.pointsOf({ points: 4, max: 15 }))
  })

  test("without scores the card says Non renseigné and draws no sub-score", () => {
    const tree = render(null)
    const texts = tree.root.findAllByType("Text" as never).map(textOf)
    expect(texts).toContain(m.unknown)
    expect(texts).not.toContain(m.outOfTotal)
    expect(tree.root.findAllByProps({ testID: "score-stand" })).toHaveLength(0)
  })
})
