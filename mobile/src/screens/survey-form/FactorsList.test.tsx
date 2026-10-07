import React from "react"
import renderer, { act } from "react-test-renderer"
import { FACTOR_TITLES } from "../../app/constants"
import { FactorField, FactorKey, FactorRetainedScore } from "../../app/types"
import { fr } from "../../i18n"
import { FACTOR_KEYS } from "@cortege/ibp-domain"
import { FACTOR_ORDER } from "./components"
import { defaultTheme } from "../../app/theme"
import { FACTOR_TILE_MIN_HEIGHT } from "./factors.styles"
import { computeFactorProgress, FactorProgress, FactorsList } from "./FactorsList"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) {
      return
    }
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const mockComponent = (name: string) => {
    const ReactRef = require("react") as typeof import("react")
    return ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  }
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})

jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})

jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
      ReactRef.createElement("AppSectionHeader", { title, subtitle }),
  }
})

jest.mock("../../ui/AppChoiceChip", () => ({ AppChoiceChip: () => null }))

jest.mock("../../ui/FactorProgressRing", () => ({ FactorProgressRing: () => null }))

type Node = renderer.ReactTestInstance

const progressFor = (overrides: Partial<FactorProgress> = {}): FactorProgress => ({
  complete: false,
  filled: 0,
  total: 3,
  invalid: 0,
  ...overrides,
})

const buildProgress = (): Record<FactorKey, FactorProgress> => {
  const progress = {} as Record<FactorKey, FactorProgress>
  for (const factor of FACTOR_ORDER) progress[factor] = progressFor()
  progress.B = progressFor({ complete: true, filled: 3 })
  return progress
}

const buildScores = (): Record<FactorKey, FactorRetainedScore | null> => {
  const scores = {} as Record<FactorKey, FactorRetainedScore | null>
  for (const factor of FACTOR_ORDER) scores[factor] = null
  scores.A = { selected_class: "S5", score: 5 }
  return scores
}

const renderList = (onOpenFactor = jest.fn()) => {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FactorsList
        factorProgress={buildProgress()}
        factorRetainedScores={buildScores()}
        scoreTotals={
          {
            ibp_total: 12,
            ibp_peuplement_gestion: 8,
            ibp_contexte: 4,
            completed_factors: 2,
            factor_scores: {},
          } as unknown as Parameters<typeof FactorsList>[0]["scoreTotals"]
        }
        onOpenFactor={onOpenFactor}
      />,
    )
  })
  return tree
}

const textOf = (node: Node): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

describe("FactorsList", () => {
  test("every factor tile is a button with the catalogue label for its name and state", () => {
    const tree = renderList()
    const tiles = tree.root.findAllByType("Pressable" as unknown as React.ElementType)
    expect(tiles).toHaveLength(FACTOR_ORDER.length)

    const expected = FACTOR_ORDER.map((factor) => {
      const state =
        factor === "A"
          ? fr.surveyForm.factors.retainedScore({ selectedClass: "S5", score: 5 })
          : factor === "B"
            ? fr.surveyForm.factors.ready
            : fr.surveyForm.factors.pending
      return fr.surveyForm.a11y.factorTile({ factor, title: FACTOR_TITLES[factor], state })
    })

    tiles.forEach((tile, index) => {
      expect(tile.props.accessibilityRole).toBe("button")
      expect(tile.props.accessibilityLabel).toBe(expected[index])
    })
    expect(tiles[0].props.accessibilityLabel).toContain("Facteur A")
  })

  test("pressing a tile opens that factor", () => {
    const onOpenFactor = jest.fn()
    const tree = renderList(onOpenFactor)
    const tiles = tree.root.findAllByType("Pressable" as unknown as React.ElementType)
    act(() => {
      tiles[2].props.onPress()
    })
    expect(onOpenFactor).toHaveBeenCalledWith("C")
  })

  test("renders no English text from the former screen", () => {
    const tree = renderList()
    const texts = tree.root
      .findAllByType("Text" as unknown as React.ElementType)
      .map((node) => textOf(node))
    const headers = tree.root
      .findAllByType("AppSectionHeader" as unknown as React.ElementType)
      .flatMap((node) => [node.props.title as string, node.props.subtitle as string])
    const rendered = [...texts, ...headers].join("\n")

    for (const english of [
      "fields",
      "Ready",
      "Pending",
      "IBP total in progress",
      "factors currently scoreable",
      "Factor scoring",
      "Open each factor",
    ]) {
      expect(rendered).not.toContain(english)
    }
    expect(rendered).toContain(fr.surveyForm.factors.sectionTitle)
  })
})

describe("totals out of 50 (D-03)", () => {
  test("the live total reads '12 / 50' and the factor count stays out of 10", () => {
    const tree = renderList()
    const texts = tree.root
      .findAllByType("Text" as unknown as React.ElementType)
      .map((node) => textOf(node))
    expect(texts).toContain("12 / 50")
    expect(texts).toContain(fr.surveyForm.factors.scoreableCount({ count: 2 }))
    expect(fr.surveyForm.factors.scoreableCount({ count: 2 })).toContain("2/10 facteurs")
  })

  test("the factor order is the package's factor keys", () => {
    expect(FACTOR_ORDER).toEqual([...FACTOR_KEYS])
  })
})

describe("computeFactorProgress (FLOW-02: untouched is neutral, not a warning)", () => {
  const untouchedField = (error: string | null): FactorField => ({
    label: "x",
    value: "",
    onChange: jest.fn(),
    required: true,
    error,
    touched: false,
    onTouch: jest.fn(),
  })

  const sections = (fields: FactorField[]): Record<FactorKey, FactorField[]> =>
    FACTOR_ORDER.reduce(
      (acc, factor) => ({ ...acc, [factor]: factor === "A" ? fields : [] }),
      {} as Record<FactorKey, FactorField[]>,
    )

  test("an untouched, empty required field is neither complete nor invalid", () => {
    const progress = computeFactorProgress(sections([untouchedField("Champ obligatoire")]))
    expect(progress.A).toEqual({ complete: false, filled: 0, total: 1, invalid: 0 })
  })

  test("a touched field with an error counts as invalid", () => {
    const progress = computeFactorProgress(
      sections([{ ...untouchedField("Champ obligatoire"), touched: true }]),
    )
    expect(progress.A.invalid).toBe(1)
  })
})

describe("factor tiles in variant I glass (12.2-15)", () => {
  type Style = Record<string, unknown>
  const flat = (style: unknown): Style =>
    Array.isArray(style)
      ? style.reduce<Style>((acc, part) => ({ ...acc, ...flat(part) }), {})
      : ((style ?? {}) as Style)
  const tiles = () => renderList().root.findAllByType("Pressable" as unknown as React.ElementType)
  const glass = defaultTheme.visual.glass

  test("each tile is a glass card: translucent fill, hairline, radius 22, no blur", () => {
    const style = flat(tiles()[3].props.style)
    expect(style.backgroundColor).toBe(glass.cardFill)
    expect(style.borderColor).toBe(glass.cardBorder)
    expect(style.boxShadow).toBe(glass.cardShadow)
    expect(style.borderRadius).toBe(22)
    expect(style.borderWidth).toBe(1)
  })

  test("the tone is the hairline: complete in the score green, the fill stays glass", () => {
    const complete = flat(tiles()[1].props.style)
    expect(complete.borderColor).toBe(defaultTheme.visual.score.high)
    expect(complete.backgroundColor).toBe(glass.cardFill)
  })

  test("sizes and touch targets keep their values: at least 44 pt, same width rule, 4-grid gaps", () => {
    const style = flat(tiles()[0].props.style)
    expect(FACTOR_TILE_MIN_HEIGHT).toBeGreaterThanOrEqual(44)
    expect(style.minHeight).toBe(FACTOR_TILE_MIN_HEIGHT)
    expect(style.width).toBe("30.5%")
    expect(style.minWidth).toBe(92)
    expect(style.paddingVertical).toBe(8)
    expect(style.paddingHorizontal).toBe(8)
    expect((style.gap as number) % 4).toBe(0)
  })
})
