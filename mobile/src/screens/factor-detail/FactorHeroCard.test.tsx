import React from "react"
import renderer, { act } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { FactorKeyHero } from "./FactorKeyHero"
import { FactorHeroCard } from "./FactorHeroCard"

const t = fr.factorDetail.dmhList
const k = fr.factorDetail.keyFigure

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
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => "light",
  }
})

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

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? style.reduce<Record<string, unknown>>((acc, entry) => ({ ...acc, ...flat(entry) }), {})
    : ((style as Record<string, unknown> | null | undefined) ?? {})

const textOf = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

function mount(overrides: Partial<React.ComponentProps<typeof FactorHeroCard>> = {}) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FactorHeroCard
        value="6"
        pendingText="À calculer"
        label="genres autochtones"
        subLabel="d'après la liste ci-dessous"
        accessibilityLabel="genres autochtones, 6"
        topScore={false}
        {...overrides}
      />,
    )
  })
  const card = tree.root.findAll(
    (n) =>
      typeof n.type === "string" && n.props.testID === (overrides.testID ?? "factor-hero-value"),
  )[0]
  const trace = tree.root.findAll(
    (n) =>
      typeof n.type === "string" &&
      n.props.testID === (overrides.topScoreTestID ?? "factor-hero-top-score"),
  )
  return { tree, card, trace }
}

const textsOfCard = (card: renderer.ReactTestInstance) =>
  card.findAll((n) => (n.type as unknown) === "Text").map(textOf)

describe("FactorHeroCard", () => {
  test("a read-only card: the figure, its label and its origin, no input and no button", () => {
    const { tree, card } = mount()
    expect(textsOfCard(card)).toEqual(["6", "genres autochtones", "d'après la liste ci-dessous"])
    expect(tree.root.findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
    expect(tree.root.findAll((n) => (n.type as unknown) === "Pressable")).toHaveLength(0)
  })

  test("the figure is 44 pt, semibold, tabular, in the theme's forest ink", () => {
    const { card } = mount()
    const style = flat(card.findAll((n) => (n.type as unknown) === "Text")[0].props.style)
    expect(style.fontSize).toBe(44)
    expect(style.fontFamily).toBe("Sora-SemiBold")
    expect(style.fontVariant).toEqual(["tabular-nums"])
    expect(style.color).toBe(defaultTheme.semanticColors.textStrong)
  })

  test("one spoken element with the given label; the max hint only at the top", () => {
    const { card } = mount()
    expect(card.props.accessible).toBe(true)
    expect(card.props.accessibilityRole).toBe("text")
    expect(card.props.accessibilityLabel).toBe("genres autochtones, 6")
    expect(card.props.accessibilityHint).toBeUndefined()
    expect(mount({ topScore: true }).card.props.accessibilityHint).toBe(t.topScoreHint)
  })

  test("no figure: the pending word stands in its place at the title size", () => {
    const { card } = mount({ value: null })
    const words = card.findAll((n) => (n.type as unknown) === "Text")[0]
    expect(textOf(words)).toBe("À calculer")
    expect(flat(words.props.style).fontSize).toBe(22)
  })

  test("a textual figure (a word) is set at the title size too", () => {
    const { card } = mount({ value: "Partielle", textual: true })
    const words = card.findAll((n) => (n.type as unknown) === "Text")[0]
    expect(textOf(words)).toBe("Partielle")
    expect(flat(words.props.style).fontSize).toBe(22)
  })

  test("the quiet Maximum pill with a check shows only at the top score", () => {
    const top = mount({ topScore: true })
    expect(top.trace).toHaveLength(1)
    expect(textOf(top.trace[0])).toBe("Maximum")
    expect(top.trace[0].findByType(Ionicons).props.name).toBe("checkmark-circle-outline")
    expect(flat(top.trace[0].props.style).backgroundColor).toBe(defaultTheme.visual.control.fill)
    expect(mount().trace).toHaveLength(0)
  })

  test("the test ids can be given (factor F keeps its own)", () => {
    const { card, trace } = mount({
      testID: "trees-per-ha-value",
      topScoreTestID: "trees-top-score-trace",
      topScore: true,
    })
    expect(card).toBeDefined()
    expect(trace).toHaveLength(1)
  })
})

describe("FactorKeyHero", () => {
  const figure = {
    value: "1,5",
    unitKey: "standingDeadwoodPerHa",
    subLabelKind: "fromDescribedSurface",
    topScore: true,
    textual: false,
    pending: "compute",
  } as const

  test("dresses the figure with the catalogue words and a 'label, value' spoken form", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<FactorKeyHero figure={figure} />)
    })
    const card = tree.root.findAll(
      (n) => typeof n.type === "string" && n.props.testID === "factor-hero-value",
    )[0]
    expect(textsOfCard(card)).toEqual([
      "1,5",
      k.label.standingDeadwoodPerHa,
      k.sub.fromDescribedSurface,
      t.topScoreTrace,
    ])
    expect(card.props.accessibilityLabel).toBe(`${k.label.standingDeadwoodPerHa}, 1,5`)
    expect(card.props.accessibilityHint).toBe(t.topScoreHint)
  })

  test("a figure not given yet reads its pending word, also when spoken", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<FactorKeyHero figure={{ ...figure, value: null, topScore: false }} />)
    })
    const card = tree.root.findAll(
      (n) => typeof n.type === "string" && n.props.testID === "factor-hero-value",
    )[0]
    expect(textsOfCard(card)[0]).toBe("À calculer")
    expect(card.props.accessibilityLabel).toBe(`${k.label.standingDeadwoodPerHa}, À calculer`)
  })
})
