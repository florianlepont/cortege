import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import * as reanimated from "../../../test/react-native-reanimated.mock"
import { brandMotion, brandRadius, brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { glowBarGeometry, numeralGeometry } from "../../app/visual-tokens"
import { fr } from "../../i18n"
import { FINISH_POP_SCALE, ScoreCard } from "./ScoreCard"
import { createSummaryScreenStyles } from "./summary-screen.styles"

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
jest.mock("../../ui/ProgressBar", () => ({ ProgressBar: "ProgressBar" }))
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
    const bar = byType(tree, "ProgressBar")[0]
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

  test("the tiles' units read in the body tint, 4.5:1 under the mist (12.2-19)", () => {
    const tree = render()
    const units = byType(tree, "Text").filter((n) =>
      [t.outOf({ max: 35 }), t.outOf({ max: 15 })].includes([n.props.children].flat().join("")),
    )
    expect(units).toHaveLength(2)
    for (const unit of units) {
      expect(flatten(unit.props.style).color).toBe(defaultTheme.visual.forest.body)
    }
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
    expect(byType(tree, "ProgressBar")).toHaveLength(0)
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

  // 12.2-19 (owner): the score card carries the mist too, its text measured in blocks.
  describe("blocks of text for the mist's shield", () => {
    const blocksOf = (tree: ReactTestRenderer) => byType(tree, "ForestCard")[0].props.blocks
    const lay = (node: ReactTestInstance, layout: Record<string, number>) =>
      act(() => node.props.onLayout({ nativeEvent: { layout } }))

    test("the darker score shield, and nothing drawn until the text is measured", () => {
      const tree = render()
      const card = byType(tree, "ForestCard")[0]
      expect(card.props.shield).toBe("score")
      expect(card.props.motion).toBeUndefined()
      expect(blocksOf(tree)).toBeNull()
    })

    test("the caption with the numeral, then the bar, the tiles and the hint under them", () => {
      const tree = render()
      const caption = byType(tree, "Text").find((n) => n.props.children === t.caption)!
      expect(flatten(caption.props.style).alignSelf).toBe("flex-start")
      const numeral = byType(tree, "View").find(
        (n) =>
          n.props.onLayout !== undefined &&
          n.props.testID !== "score-card-lower" &&
          n.findAll((inner) => (inner.type as unknown) === "GradientNumeral").length === 1,
      )!
      const lower = byType(tree, "View").find((n) => n.props.testID === "score-card-lower")!
      // The bar, the tiles and the hint are all in the band.
      expect(lower.findAll((n) => (n.type as unknown) === "ProgressBar")).toHaveLength(1)
      expect(lower.findAll((n) => (n.type as unknown) === "AnimatedNumber")).toHaveLength(2)
      expect(
        lower.findAll(
          (n) => (n.type as unknown) === "Text" && n.props.children === t.factorsFilled(7),
        ),
      ).toHaveLength(1)
      lay(caption, { x: 16, y: 16, width: 70, height: 16 })
      lay(numeral, { x: 16, y: 36, width: 134, height: 62 })
      expect(blocksOf(tree)).toBeNull()
      lay(lower, { x: 16, y: 98, width: 329, height: 110 })
      expect(blocksOf(tree)).toEqual([
        { x: 16, y: 16, width: 134, height: 82 },
        { x: 16, y: 98, width: 329, height: 110 },
      ])
      // A longer caption widens the first block; an empty lower part is no block.
      lay(caption, { x: 16, y: 16, width: 180, height: 16 })
      lay(lower, { x: 16, y: 98, width: 329, height: 0 })
      expect(blocksOf(tree)).toEqual([{ x: 16, y: 16, width: 180, height: 82 }])
    })
  })

  test("draws the pulse layer with the card radius and shadow", () => {
    const halo = byType(render({ pulseTrigger: 2 }), "HaloPulse")[0]
    expect(halo.props).toMatchObject({
      trigger: 2,
      radius: brandRadius.forestHero,
      shadow: defaultTheme.visual.forest.shadow,
    })
  })

  describe("finish pop (D-25)", () => {
    const rerender = (tree: ReactTestRenderer, pulseTrigger: number) =>
      act(() => {
        tree.update(
          <ScoreCard
            scores={scores}
            isDraftView={false}
            filledFactorCount={10}
            pulseTrigger={pulseTrigger}
          />,
        )
      })
    const popCalls = () =>
      withSpringSpy.mock.calls.filter(([toValue]) => toValue === FINISH_POP_SCALE)

    test("the card rests at its size and does not pop on mount", () => {
      const tree = render({ pulseTrigger: 3 })
      expect(flatten(byType(tree, "View")[0].props.style).transform).toEqual([{ scale: 1 }])
      expect(popCalls()).toHaveLength(0)
    })

    test("pops once, about 3 percent, with brand springs and the system reduce motion", () => {
      const tree = render({ pulseTrigger: 0 })
      rerender(tree, 1)
      expect(FINISH_POP_SCALE).toBeGreaterThan(1)
      expect(FINISH_POP_SCALE).toBeLessThanOrEqual(1.04)
      expect(popCalls()).toEqual([
        [
          FINISH_POP_SCALE,
          expect.objectContaining({ ...brandMotion.springs.snappy, reduceMotion: "system" }),
        ],
      ])
      expect(withSpringSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ ...brandMotion.springs.gentle, reduceMotion: "system" }),
      )
      // Back to its size: no loop.
      expect(flatten(byType(tree, "View")[0].props.style).transform).toEqual([{ scale: 1 }])
      rerender(tree, 1)
      expect(popCalls()).toHaveLength(1)
    })

    test("under Reduce Motion the card does not move", () => {
      reanimated.setReducedMotion(true)
      const tree = render({ pulseTrigger: 0 })
      rerender(tree, 1)
      expect(popCalls()).toHaveLength(0)
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

describe("ScoreCard height (D-24)", () => {
  const styles = createSummaryScreenStyles(defaultTheme)
  const num = (value: unknown): number => (typeof value === "number" ? value : 0)
  const footnoteLine = 18

  // The vertical stack of the card, from its styles (the Jest renderer does not run Yoga).
  function stackHeight(withHint: boolean): number {
    const tile =
      2 * num(styles.scoreTile.paddingVertical) +
      footnoteLine +
      num(styles.scoreTile.gap) +
      brandTypography.input.lineHeight
    return (
      2 * num(styles.scoreContent.padding) +
      brandTypography.label.lineHeight +
      num(styles.scoreNumeral.marginTop) +
      numeralGeometry.height +
      num(styles.scoreBar.marginTop) +
      glowBarGeometry.height +
      num(styles.scoreTiles.marginTop) +
      tile +
      (withHint ? num(styles.scoreHint.marginTop) + brandTypography.meta.lineHeight : 0)
    )
  }

  // Before the correction: 24 pt padding, 68 pt numeral (76 pt box), 12 and 16 pt gaps, 12 pt tiles.
  const PREVIOUS_WITH_HINT = 272
  const PREVIOUS_WITHOUT_HINT = 244

  test("is 15 to 20 percent shorter than before, with and without the hint", () => {
    const withHint = stackHeight(true)
    const withoutHint = stackHeight(false)
    expect(1 - withHint / PREVIOUS_WITH_HINT).toBeGreaterThanOrEqual(0.15)
    expect(1 - withHint / PREVIOUS_WITH_HINT).toBeLessThanOrEqual(0.2)
    expect(1 - withoutHint / PREVIOUS_WITHOUT_HINT).toBeGreaterThanOrEqual(0.15)
    expect(1 - withoutHint / PREVIOUS_WITHOUT_HINT).toBeLessThanOrEqual(0.2)
  })

  test("keeps the 4 grid and a legible numeral", () => {
    for (const value of [
      styles.scoreContent.padding,
      styles.scoreBar.marginTop,
      styles.scoreTiles.marginTop,
      styles.scoreTile.paddingVertical,
      styles.scoreHint.marginTop,
    ]) {
      expect(num(value) % 4).toBe(0)
    }
    expect(brandTypography.numeralCard.fontSize).toBeGreaterThanOrEqual(52)
    expect(brandTypography.numeralCard.fontFamily).toBe("Sora-Light")
  })
})
