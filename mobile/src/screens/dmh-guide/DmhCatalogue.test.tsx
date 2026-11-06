import React from "react"
import renderer, { act } from "react-test-renderer"
import { DMH_GROUP_CODES } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { DmhCatalogue } from "./DmhCatalogue"

const mockAnnounce = jest.fn()
const mockDismiss = jest.fn()

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, flatten: (s: unknown) => s },
    useColorScheme: () => "light",
    AccessibilityInfo: { announceForAccessibility: (...args: unknown[]) => mockAnnounce(...args) },
    Keyboard: { dismiss: () => mockDismiss() },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Pressable", props, children),
  }
})

const t = fr.dmhGuide

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

beforeEach(() => {
  mockAnnounce.mockClear()
  mockDismiss.mockClear()
})

function render(query = "") {
  const handlers = {
    onChangeQuery: jest.fn(),
    onOpenGroup: jest.fn(),
    onOpenSources: jest.fn(),
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<DmhCatalogue query={query} {...handlers} />)
  })
  return { tree, handlers }
}

const textOf = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

const allTexts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((n) => (n.type as unknown) === "Text")
    .map((n) => textOf(n))
    .filter(Boolean)

const byTestId = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.type === "string")

describe("DmhCatalogue", () => {
  test("with an empty query shows the lead, seven form headers over fifteen rows and the sources link", () => {
    const { tree } = render()
    const texts = allTexts(tree)
    expect(texts).toContain(t.sheet.lead)
    for (const name of Object.values(t.forms)) expect(texts).toContain(name)
    expect(Object.keys(t.forms)).toHaveLength(7)
    for (const code of DMH_GROUP_CODES) {
      expect(byTestId(tree, `dmh-catalogue-row-${code}`)).toHaveLength(1)
    }
    expect(byTestId(tree, "dmh-sources-link")).toHaveLength(1)
    expect(byTestId(tree, "dmh-search-empty")).toHaveLength(0)
    expect(mockAnnounce).not.toHaveBeenCalled()
  })

  test("form headers come before their rows, in the order of the forms", () => {
    const { tree } = render()
    const headers = tree.root
      .findAll((n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header")
      .map((n) => textOf(n))
    expect(headers).toEqual(Object.values(t.forms))
  })

  test("a row has the button role, the hint and a 56 high target, and opens its group", () => {
    const { tree, handlers } = render()
    const row = byTestId(tree, "dmh-catalogue-row-dmh_05")[0]
    expect(row.props.accessibilityRole).toBe("button")
    expect(row.props.accessibilityHint).toBe(t.sheet.rowHint)
    const style = typeof row.props.style === "function" ? row.props.style({ pressed: false }) : []
    expect([style].flat(2).some((s: { minHeight?: number }) => s?.minHeight === 56)).toBe(true)
    act(() => row.props.onPress())
    expect(handlers.onOpenGroup).toHaveBeenCalledWith("dmh_05")
  })

  test("a row label is the medium 15 face, up to three lines, with no subtitle outside a search", () => {
    const { tree } = render()
    const row = byTestId(tree, "dmh-catalogue-row-dmh_05")[0]
    const label = row.findAll((n) => (n.type as unknown) === "Text")[0]
    expect(label.props.numberOfLines).toBe(3)
    expect([label.props.style].flat(2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontFamily: "Sora-Medium", fontSize: 15 }),
      ]),
    )
    expect(row.findAll((n) => (n.type as unknown) === "Text")).toHaveLength(1)
  })

  test("a search result shows its form as a subtitle under the label", () => {
    const { tree } = render("gui")
    const row = byTestId(tree, "dmh-catalogue-row-dmh_12")[0]
    const texts = row.findAll((n) => (n.type as unknown) === "Text").map((n) => textOf(n))
    expect(texts[1]).toBe(t.forms.epiphytic)
  })

  test("the sources link is a one-row group with the document tile", () => {
    const { tree } = render()
    const link = byTestId(tree, "dmh-sources-link")[0]
    expect(link.props.accessibilityLabel).toBe(t.sheet.sourcesLink)
    expect(
      link.findAll((n) => (n.type as unknown) === "Ionicons").map((n) => n.props.name),
    ).toContain("document-text-outline")
  })

  test("the sources link opens the sources page", () => {
    const { tree, handlers } = render()
    act(() => byTestId(tree, "dmh-sources-link")[0].props.onPress())
    expect(handlers.onOpenSources).toHaveBeenCalledTimes(1)
  })

  test("the search field is not focused on its own and the return key dismisses the keyboard", () => {
    const { tree } = render()
    const input = tree.root.findByProps({ testID: "search-field" })
    expect(input.props.autoFocus).toBeUndefined()
    expect(input.props.placeholder).toBe(t.search.placeholder)
    expect(input.props.accessibilityLabel).toBe(t.search.label)
    expect(byTestId(tree, "dmh-search")).toHaveLength(1)
    act(() => input.props.onSubmitEditing())
    expect(mockDismiss).toHaveBeenCalledTimes(1)
  })

  test("typing reaches the shell, and the clear cross empties the query", () => {
    const { tree, handlers } = render("gui")
    const input = tree.root.findByProps({ testID: "search-field" })
    act(() => input.props.onChangeText("gu"))
    expect(handlers.onChangeQuery).toHaveBeenCalledWith("gu")
    const clear = tree.root.findByProps({ testID: "search-clear" })
    expect(clear.props.accessibilityLabel).toBe(t.search.clear)
    act(() => clear.props.onPress())
    expect(handlers.onChangeQuery).toHaveBeenLastCalledWith("")
  })

  test("the query gui lists the mistletoe group flat, with its form as a caption, and announces the count", () => {
    const { tree } = render("gui")
    expect(byTestId(tree, "dmh-catalogue-row-dmh_12")).toHaveLength(1)
    expect(byTestId(tree, "dmh-catalogue-row-dmh_01")).toHaveLength(0)
    const texts = allTexts(tree)
    expect(texts).toContain(t.forms.epiphytic)
    expect(Object.values(t.forms).filter((name) => texts.includes(name))).toEqual([
      t.forms.epiphytic,
    ])
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    const rows = DMH_GROUP_CODES.filter(
      (code) => byTestId(tree, `dmh-catalogue-row-${code}`).length > 0,
    )
    expect(mockAnnounce).toHaveBeenCalledWith(t.search.found({ count: rows.length }))
  })

  test("accents and case do not matter", () => {
    const { tree: plain } = render("ecorce")
    const { tree: accented } = render("ÉCORCE")
    const ids = (tree: renderer.ReactTestRenderer) =>
      DMH_GROUP_CODES.filter((code) => byTestId(tree, `dmh-catalogue-row-${code}`).length > 0)
    expect(ids(plain).length).toBeGreaterThan(0)
    expect(ids(accented)).toEqual(ids(plain))
  })

  test("a query with no match shows the empty state, announces zero and its action clears the query", () => {
    const { tree, handlers } = render("zzzz")
    expect(byTestId(tree, "dmh-search-empty")).toHaveLength(1)
    // No card: the empty state has no fill, border or radius of its own.
    const empty = byTestId(tree, "dmh-search-empty")[0]
    expect(Object.keys(Object.assign({}, ...[empty.props.style].flat()))).not.toEqual(
      expect.arrayContaining(["backgroundColor"]),
    )
    const texts = allTexts(tree)
    expect(texts).toContain(t.search.emptyTitle)
    expect(texts).toContain(t.search.emptyBody)
    expect(texts).toContain(t.search.emptyAction)
    for (const code of DMH_GROUP_CODES) {
      expect(byTestId(tree, `dmh-catalogue-row-${code}`)).toHaveLength(0)
    }
    expect(mockAnnounce).toHaveBeenCalledWith(t.search.found({ count: 0 }))
    act(() => byTestId(tree, "dmh-search-empty-action")[0].props.onPress())
    expect(handlers.onChangeQuery).toHaveBeenCalledWith("")
    // The sources link stays at the foot.
    expect(byTestId(tree, "dmh-sources-link")).toHaveLength(1)
  })

  test("the count is announced again only when the folded query changes", () => {
    const { tree, handlers } = render("gui")
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    act(() => tree.update(<DmhCatalogue query="GUI " {...handlers} />))
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    act(() => tree.update(<DmhCatalogue query="pic" {...handlers} />))
    expect(mockAnnounce).toHaveBeenCalledTimes(2)
    act(() => tree.update(<DmhCatalogue query="" {...handlers} />))
    expect(mockAnnounce).toHaveBeenCalledTimes(2)
  })
})
