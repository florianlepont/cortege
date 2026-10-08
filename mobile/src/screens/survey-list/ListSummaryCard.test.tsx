import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { ListSummaryCard } from "./ListSummaryCard"

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
jest.mock("../../ui/ForestCard", () => ({ ForestCard: "ForestCard" }))
jest.mock("../../ui/EntranceView", () => ({ EntranceView: "EntranceView" }))

const t = fr.surveyList.intro
const forest = defaultTheme.visual.forest

let tree: ReactTestRenderer

function mount(total: number, toFinish: number) {
  act(() => {
    tree = renderer.create(<ListSummaryCard total={total} toFinish={toFinish} />)
  })
  return tree.root
}

afterEach(() => {
  act(() => tree.unmount())
})

const textsOf = (root: ReactTestInstance) =>
  root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => ({ text: String(node.props.children), style: node.props.style }))

describe("ListSummaryCard (D-22)", () => {
  test("is one compact forest card in the Accueil family, entering with the screen", () => {
    const root = mount(12, 3)
    const entrance = root.findByType("EntranceView" as never)
    expect(entrance.props.index).toBe(0)
    const cards = root.findAllByType("ForestCard" as never)
    expect(cards).toHaveLength(1)
    expect(cards[0].props.variant).toBe("resume")
    expect(cards[0].props.testID).toBe("list-summary-card")
    // The aurora is the ForestCard default (12.2-19 fifth round) and is not switched off.
    expect(cards[0].props.motion).toBeUndefined()
    expect(cards[0].props.shield).toBeUndefined()
  })

  test("the aurora's clear zone starts a gap right of the two figures, the whole height", () => {
    const root = mount(12, 3)
    const card = () => root.findByType("ForestCard" as never)
    // Until the figures are measured nothing is drawn.
    expect(card().props.zone).toBeNull()
    const stats = root.findByProps({ testID: "list-summary-stats" })
    act(() =>
      stats.props.onLayout({ nativeEvent: { layout: { x: 16, y: 16, width: 180, height: 50 } } }),
    )
    expect(card().props.zone).toEqual({ left: 16 + 180 + brandSpacing4.md })
  })

  test("shows the same two figures and labels as before, nothing new, no tag pill", () => {
    const texts = textsOf(mount(12, 3)).map((entry) => entry.text)
    expect(texts).toEqual(["12", t.total(12), "3", t.toFinish])
  })

  test("uses the singular label for one survey", () => {
    expect(textsOf(mount(1, 1)).map((entry) => entry.text)).toContain(t.total(1))
    expect(t.total(1)).toBe("relevé au total")
  })

  test("reads as one sentence for a screen reader", () => {
    const stats = mount(12, 3).findByProps({ testID: "list-summary-stats" })
    expect(stats.props.accessible).toBe(true)
    expect(stats.props.accessibilityLabel).toBe("12 relevés au total, 3 à terminer")
  })

  test("keeps text on the base forest: figures white and light green, labels in the body tint", () => {
    const entries = textsOf(mount(12, 3))
    const flat = (style: unknown) => Object.assign({}, ...(style as object[]).flat())
    expect(flat(entries[0].style).color).toBe(forest.title)
    expect(flat(entries[2].style).color).toBe(forest.titleAccent)
    expect(flat(entries[1].style).color).toBe(forest.body)
  })

  test("sets the two figures apart by a rule and spaces them on the 4 grid", () => {
    const root = mount(12, 3)
    const stats = root.findByProps({ testID: "list-summary-stats" })
    expect(stats.props.style.gap).toBe(brandSpacing4.md)
    const rule = root
      .findAll((node) => (node.type as unknown) === "View")
      .find((node) => node.props.style?.width === 1)
    expect(rule?.props.style.backgroundColor).toBe(forest.tagBorder)
    expect(brandSpacing4.md % 4).toBe(0)
    expect(root.findByType("ForestCard" as never).props.contentStyle.padding).toBe(brandSpacing4.md)
  })
})
