/**
 * Tests for GlossaryInfo: the info glyph that explains a word of the method in place.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Modal: mockComponent("Modal"),
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppText", () => ({ AppText: "Text" }))

import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import { GlossaryInfo, type GlossaryTermId } from "./GlossaryInfo"

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

function mount(term: GlossaryTermId = "parPlacette", testID?: string, color?: string) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<GlossaryInfo term={term} testID={testID} color={color} />)
  })
  const byType = (type: string) => tree.root.findAll((node) => (node.type as unknown) === type)
  const trigger = () => tree.root.findAll((node) => node.props.testID !== undefined)[0]
  const texts = () =>
    byType("Text").flatMap((node) => React.Children.toArray(node.props.children) as string[])
  return { tree, byType, trigger, texts }
}

describe("GlossaryInfo", () => {
  it("is one 44 pt button with the 20 pt outline info glyph in the accent, labelled by the term", () => {
    const { byType, trigger } = mount()
    const button = trigger()
    expect(button.props.testID).toBe("glossary-info-parPlacette")
    expect(button.props.accessibilityRole).toBe("button")
    expect(button.props.accessibilityLabel).toBe(
      fr.routeGuide.a11y.glossaryInfo(fr.routeGuide.glossary.terms.parPlacette.term),
    )
    const slop = button.props.hitSlop
    for (const side of ["top", "bottom", "left", "right"]) {
      expect(20 + 2 * slop[side]).toBe(44)
    }
    const glyph = byType("Ionicons")[0]
    expect(glyph.props.name).toBe("information-circle-outline")
    expect(glyph.props.size).toBe(20)
    expect(glyph.props.color).toBe(defaultTheme.semanticColors.accent)
  })

  it("takes the ink of a dark surface when given one (the suggestion's forest card)", () => {
    const { byType } = mount("parPlacette", undefined, defaultTheme.visual.forest.titleAccent)
    expect(byType("Ionicons")[0].props.color).toBe(defaultTheme.visual.forest.titleAccent)
  })

  it("mounts no Modal until pressed, then shows the term and its plain-French sentence", () => {
    const { byType, trigger, texts } = mount("relevePlafonne")
    expect(byType("Modal")).toHaveLength(0)
    act(() => trigger().props.onPress())
    expect(byType("Modal")).toHaveLength(1)
    const entry = fr.routeGuide.glossary.terms.relevePlafonne
    expect(texts()).toEqual(expect.arrayContaining([entry.term, entry.text]))
    const header = byType("Text").find((node) => node.props.accessibilityRole === "header")
    expect(header?.props.children).toBe(entry.term)
    const closeButton = byType("Pressable").find(
      (node) => node.props.accessibilityLabel === fr.routeGuide.glossary.close,
    )
    expect(closeButton).toBeDefined()
  })

  it("closes, and leaves no Modal mounted", () => {
    const { byType, trigger } = mount()
    act(() => trigger().props.onPress())
    const closeButton = byType("Pressable").find(
      (node) => node.props.accessibilityLabel === fr.routeGuide.glossary.close,
    )
    act(() => closeButton?.props.onPress())
    expect(byType("Modal")).toHaveLength(0)
  })

  it("every term of the glossary opens its own sentence", () => {
    for (const id of Object.keys(fr.routeGuide.glossary.terms) as GlossaryTermId[]) {
      const { trigger, texts } = mount(id)
      act(() => trigger().props.onPress())
      expect(texts()).toContain(fr.routeGuide.glossary.terms[id].text)
    }
  })

  it("takes a custom test id", () => {
    expect(mount("peuplement", "custom").trigger().props.testID).toBe("custom")
  })

  it("rejects a key that is not a term at compile time", () => {
    // @ts-expect-error a wrong key is not a GlossaryTermId
    const wrong: GlossaryTermId = "nope"
    expect(wrong).toBe("nope")
  })
})
