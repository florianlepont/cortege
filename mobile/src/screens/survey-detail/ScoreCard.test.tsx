import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import * as reanimated from "../../../test/react-native-reanimated.mock"
import { brandMotion, brandRadius } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { ScoreCard } from "./ScoreCard"

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
    FlatList: mockComponent("FlatList"),
    ScrollView: mockComponent("ScrollView"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("../../ui/ForestCard", () => ({ ForestCard: "ForestCard" }))
jest.mock("../../ui/GlowBar", () => ({ GlowBar: "GlowBar" }))
jest.mock("../../ui/HaloPulse", () => ({ HaloPulse: "HaloPulse" }))
jest.mock("../../ui/AnimatedNumber", () => ({ AnimatedNumber: "AnimatedNumber" }))
jest.mock("../../ui/GradientNumeral", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GradientNumeral: (props: { value: number | null }) =>
      props.value === null ? null : ReactRef.createElement("GradientNumeral", props),
  }
})

const withSpringSpy = jest.spyOn(reanimated, "withSpring")

afterEach(() => {
  reanimated.setReducedMotion(false)
  withSpringSpy.mockClear()
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

const t = fr.surveyDetail.scoreCard
const scores = { ibp_total: 34, ibp_peuplement_gestion: 24, ibp_contexte: 10 }

function render(props: Partial<React.ComponentProps<typeof ScoreCard>> = {}): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ScoreCard
        scores={scores}
        isDraftView={false}
        filledFactorCount={7}
        pulseTrigger={0}
        {...props}
      />,
    )
  })
  return tree!
}

const byType = (tree: ReactTestRenderer, type: string): ReactTestInstance[] =>
  tree.root.findAll((n) => (n.type as unknown) === type)

const texts = (tree: ReactTestRenderer): string[] =>
  byType(tree, "Text").map((n) => [n.props.children].flat().join(""))

describe("ScoreCard", () => {
  test("is the forest hero card with the numeral, the glow bar and the two tiles", () => {
    const tree = render()
    expect(byType(tree, "ForestCard")[0].props.variant).toBe("hero")
    const numeral = byType(tree, "GradientNumeral")[0]
    expect(numeral.props.value).toBe(34)
    expect(numeral.props.unit).toBe(fr.surveyDetail.metric.outOfTotal)
    const bar = byType(tree, "GlowBar")[0]
    expect(bar.props.ratio).toBeCloseTo(0.68)
    expect(bar.props.animate).toBe(true)
    expect(byType(tree, "AnimatedNumber").map((n) => n.props.value)).toEqual([24, 10])
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        fr.components.ibpFactorBars.standGroup,
        fr.components.ibpFactorBars.contextGroup,
        t.outOf({ max: 35 }),
        t.outOf({ max: 15 }),
      ]),
    )
  })

  test("the tile value keeps the width of its final digits", () => {
    const tree = render({ scores: { ...scores, ibp_contexte: 5 } })
    const [stand, context] = byType(tree, "AnimatedNumber")
    expect(flatten(stand.props.style).width).toBeGreaterThan(
      flatten(context.props.style).width as number,
    )
  })

  test("keeps one summary label for a score", () => {
    const root = byType(render(), "View")[0]
    expect(root.props.accessible).toBe(true)
    expect(root.props.accessibilityRole).toBe("summary")
    expect(root.props.accessibilityLabel).toBe(fr.surveyDetail.a11y.scoreSummary("34 / 50"))
  })

  test("without a score there is no numeral, bar or tile, only the caption and the hint", () => {
    const tree = render({ scores: null, isDraftView: true, filledFactorCount: 3 })
    expect(byType(tree, "GradientNumeral")).toHaveLength(0)
    expect(byType(tree, "GlowBar")).toHaveLength(0)
    expect(byType(tree, "AnimatedNumber")).toHaveLength(0)
    expect(texts(tree)).toEqual([t.draftCaption, t.factorsFilled(3)])
    const root = byType(tree, "View")[0]
    expect(root.props.accessibilityLabel).toBe(
      fr.surveyDetail.a11y.scoreSummary(fr.surveyDetail.metric.unknown),
    )
    expect(fr.surveyDetail.metric.unknown).toBe("Non renseigné")
  })

  test("the hint says the ten factors are filled, and is absent while the draft is read", () => {
    expect(texts(render({ filledFactorCount: 10 }))).toContain(t.allFilled)
    expect(texts(render({ filledFactorCount: null }))).toEqual([
      t.caption,
      fr.components.ibpFactorBars.standGroup,
      t.outOf({ max: 35 }),
      fr.components.ibpFactorBars.contextGroup,
      t.outOf({ max: 15 }),
    ])
  })

  test("draws the pulse layer with the card radius and shadow", () => {
    const halo = byType(render({ pulseTrigger: 2 }), "HaloPulse")[0]
    expect(halo.props).toMatchObject({
      trigger: 2,
      radius: brandRadius.forestHero,
      shadow: defaultTheme.visual.forest.shadow,
    })
  })

  test("the numeral springs in from 8 pt down and transparent", () => {
    const tree = render()
    const animated = byType(tree, "View").find((n) => {
      const style = flatten(n.props.style)
      return Array.isArray(style.transform) && style.opacity !== undefined
    })
    expect(flatten(animated?.props.style)).toMatchObject({
      opacity: 0,
      transform: [{ translateY: 8 }],
    })
    expect(withSpringSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ ...brandMotion.springs.snappy, reduceMotion: "system" }),
    )
  })

  test("under Reduce Motion the numeral starts in its final place", () => {
    reanimated.setReducedMotion(true)
    const animated = byType(render(), "View").find((n) => {
      const style = flatten(n.props.style)
      return Array.isArray(style.transform) && style.opacity !== undefined
    })
    expect(flatten(animated?.props.style)).toMatchObject({
      opacity: 1,
      transform: [{ translateY: 0 }],
    })
  })
})
