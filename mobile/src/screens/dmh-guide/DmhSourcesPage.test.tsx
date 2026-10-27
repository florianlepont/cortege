import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"
import { DmhSourcesPage } from "./DmhSourcesPage"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => "light",
  }
})

jest.mock("../../ui/AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Pressable", props, children),
  }
})

// The real drawings module, unless a test empties it.
const mockDrawingState: { empty: boolean } = { empty: false }
jest.mock("../../app/dmh-guide/drawings", () => {
  const actual = jest.requireActual("../../app/dmh-guide/drawings")
  return {
    ...actual,
    get DMH_DRAWINGS() {
      return mockDrawingState.empty ? {} : actual.DMH_DRAWINGS
    },
  }
})

const s = fr.dmhGuide.sources

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

beforeEach(() => {
  mockDrawingState.empty = false
})

const textOf = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

function render(titleRef?: React.Ref<unknown>) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<DmhSourcesPage titleRef={titleRef as never} />, {
      createNodeMock: () => ({ node: "title" }),
    })
  })
  return tree
}

const allTexts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((n) => (n.type as unknown) === "Text")
    .map((n) => textOf(n))
    .filter(Boolean)

describe("DmhSourcesPage", () => {
  test("shows the title, the lead, three documents with four labelled lines, and the closing lines", () => {
    const tree = render()
    const texts = allTexts(tree)
    expect(tree.root.findAll((n) => n.props.testID === "dmh-sources-page").length).toBeGreaterThan(
      0,
    )
    expect(texts).toContain(s.title)
    expect(texts).toContain(s.lead)
    expect(s.documents).toHaveLength(3)
    for (const doc of s.documents) {
      expect(texts).toContain(doc.title)
      expect(texts).toContain(`${s.authors} : ${doc.authors}`)
      expect(texts).toContain(`${s.publisher} : ${doc.publisher}`)
      expect(texts).toContain(`${s.year} : ${doc.year}`)
      expect(texts).toContain(`${s.usedFor} : ${doc.usedFor}`)
    }
    expect(texts.some((text) => text.includes(s.precedence))).toBe(true)
    expect(texts).toContain(s.offline)
    expect(texts).toContain(s.consulted)
  })

  test("the title is a header and the ref lands on the title", () => {
    const titleRef = React.createRef<unknown>()
    const tree = render(titleRef)
    const headers = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header",
    )
    expect(headers.map((n) => textOf(n))).toContain(s.title)
    expect(titleRef.current).toEqual({ node: "title" })
  })

  test("the precedence notice comes after the documents", () => {
    const texts = allTexts(render())
    const last = texts.indexOf(`${s.usedFor} : ${s.documents[2].usedFor}`)
    const notice = texts.findIndex((text) => text.includes(s.precedence))
    expect(notice).toBeGreaterThan(last)
  })

  test("with the real drawings module the drawings sentence is shown", () => {
    expect(allTexts(render())).toContain(s.drawings)
  })

  test("with no drawing in the module the drawings sentence is not shown", () => {
    mockDrawingState.empty = true
    expect(allTexts(render())).not.toContain(s.drawings)
  })

  test("plain text only: no web address and nothing to press", () => {
    const tree = render()
    const all = allTexts(tree).join("\n")
    expect(all).not.toMatch(/https?:|www\./i)
    expect(tree.root.findAll((n) => typeof n.props.onPress === "function")).toHaveLength(0)
  })
})
