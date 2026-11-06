import React from "react"
import renderer, { act } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { DmhHeroCard } from "./DmhHeroCard"

const t = fr.factorDetail.dmhList

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

function mount(overrides: Partial<React.ComponentProps<typeof DmhHeroCard>> = {}) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <DmhHeroCard
        treesPerHaText="9"
        counted
        countedInFull={false}
        topScoreReached={false}
        {...overrides}
      />,
    )
  })
  const card = tree.root.findAll(
    (n) => typeof n.type === "string" && n.props.testID === "trees-per-ha-value",
  )[0]
  const trace = tree.root.findAll(
    (n) => typeof n.type === "string" && n.props.testID === "trees-top-score-trace",
  )
  return { tree, card, trace }
}

describe("DmhHeroCard", () => {
  test("a read-only card: the big figure, then its label and where it comes from, no input", () => {
    const { tree, card } = mount()
    const texts = card.findAll((n) => (n.type as unknown) === "Text").map(textOf)
    expect(texts).toEqual(["9", "arbres par hectare", "somme des groupes comptés"])
    expect(tree.root.findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
    expect(tree.root.findAll((n) => (n.type as unknown) === "Pressable")).toHaveLength(0)
  })

  test("counted in full the sub-label says the figure follows the described surface", () => {
    const { card } = mount({ countedInFull: true })
    const texts = card.findAll((n) => (n.type as unknown) === "Text").map(textOf)
    expect(texts[2]).toBe("calculé d'après la surface décrite")
  })

  test("the figure is 44 pt, semibold, tabular, in the theme's forest ink; the label hugs it", () => {
    const { card } = mount()
    const figure = card.findAll((n) => (n.type as unknown) === "Text")[0]
    const style = flat(figure.props.style)
    expect(style.fontSize).toBe(44)
    expect(style.fontFamily).toBe("Sora-SemiBold")
    expect(style.fontVariant).toEqual(["tabular-nums"])
    expect(style.color).toBe(defaultTheme.semanticColors.textStrong)
    const row = flat(card.props.style)
    expect(row.flexDirection).toBe("row")
    expect(row.justifyContent).toBeUndefined()
    expect(row.columnGap).toBeLessThanOrEqual(12)
  })

  test("one spoken element, 'Arbres par hectare, N', with the max hint only at the top", () => {
    const { card } = mount({ treesPerHaText: "6" })
    expect(card.props.accessible).toBe(true)
    expect(card.props.accessibilityRole).toBe("text")
    expect(card.props.accessibilityLabel).toBe("Arbres par hectare, 6")
    expect(card.props.accessibilityHint).toBeUndefined()
    const top = mount({ treesPerHaText: "9", topScoreReached: true })
    expect(top.card.props.accessibilityLabel).toBe("Arbres par hectare, 9")
    expect(top.card.props.accessibilityHint).toBe(t.topScoreHint)
  })

  test("empty figure: 0 while nothing is counted, 'À calculer' once a count has no figure", () => {
    const none = mount({ treesPerHaText: "", counted: false })
    expect(none.card.props.accessibilityLabel).toBe("Arbres par hectare, 0")
    const pending = mount({ treesPerHaText: " ", counted: true })
    expect(pending.card.props.accessibilityLabel).toBe(`Arbres par hectare, ${t.treesPerHaPending}`)
    const words = pending.card.findAll((n) => (n.type as unknown) === "Text")[0]
    expect(textOf(words)).toBe("À calculer")
    expect(flat(words.props.style).fontSize).toBe(22)
  })

  test("the quiet Maximum pill with a check shows only at the top score", () => {
    const top = mount({ topScoreReached: true })
    expect(top.trace).toHaveLength(1)
    expect(textOf(top.trace[0])).toBe("Maximum")
    expect(top.trace[0].findByType(Ionicons).props.name).toBe("checkmark-circle-outline")
    expect(flat(top.trace[0].props.style).backgroundColor).toBe(defaultTheme.visual.control.fill)
    expect(mount().trace).toHaveLength(0)
  })
})
