import React, { createRef } from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_2, type DmhGroupCode } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { DmhGroupPage } from "./DmhGroupPage"

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

// Keep the real drawings module; each test can make drawingFor answer null.
const mockDrawingFor = jest.fn()
jest.mock("../../app/dmh-guide/drawings", () => {
  const actual = jest.requireActual("../../app/dmh-guide/drawings")
  return { ...actual, drawingFor: (code: string) => mockDrawingFor(code) }
})

const t = fr.dmhGuide

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

beforeEach(() => {
  const actual = jest.requireActual("../../app/dmh-guide/drawings")
  mockDrawingFor.mockReset()
  mockDrawingFor.mockImplementation(actual.drawingFor)
})

function render(
  code: DmhGroupCode,
  methodVersion: string | null,
  extra: { onOpenSources?: () => void; titleRef?: React.Ref<unknown> } = {},
) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <DmhGroupPage
        code={code}
        methodVersion={methodVersion as never}
        onOpenSources={extra.onOpenSources ?? (() => undefined)}
        titleRef={extra.titleRef as never}
      />,
      { createNodeMock: () => ({ node: "title" }) },
    )
  })
  return tree
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

describe("DmhGroupPage", () => {
  test("shows the blocks of dmh_05 in the order of the sheet", () => {
    const tree = render("dmh_05", IBP_METHOD_V3_2)
    const texts = allTexts(tree)
    const at = (needle: string) => texts.findIndex((text) => text === needle)
    const order = [
      t.group.form({ form: t.forms.wounds }),
      t.group.definitionTitle,
      t.group.ibpTitle,
      t.group.recogniseTitle,
      t.group.confusionsTitle,
      t.group.typesTitle,
      t.group.differenceTitle,
      t.sheet.sourcesLink,
    ].map(at)
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)

    const content = t.groups.dmh_05
    expect(texts).toEqual(expect.arrayContaining([content.definition, content.recognise]))
    expect(texts.indexOf(content.definition)).toBeLessThan(texts.indexOf(content.ibpRule))
    expect(texts.indexOf(content.ibpRule)).toBeLessThan(texts.indexOf(content.recognise))
    // testIDs of the contract, in the tree.
    for (const id of [
      "dmh-group-page",
      "dmh-ibp-rule",
      "dmh-types-counted",
      "dmh-difference",
      "dmh-sources-link",
    ]) {
      expect(byTestId(tree, id).length).toBeGreaterThan(0)
    }
    // One element per confusion bullet.
    for (const confusion of content.confusions) expect(texts).toContain(confusion)
    // The difference sentence follows the fixed lead.
    const notice = textOf(byTestId(tree, "dmh-difference")[0])
    expect(notice).toContain(t.group.differenceTitle)
    expect(notice).toContain(`${t.group.differenceLead} ${content.difference}`)
    // The footer is plain text above the link.
    expect(texts).toContain(t.group.footer)
    // No type number and no group code is rendered.
    expect(texts.join(" ")).not.toMatch(/dmh_\d\d/)
  })

  test("the IBP rule of group 12 follows the method of the survey", () => {
    const old = render("dmh_12", null)
    const oldTexts = allTexts(old)
    expect(oldTexts).toContain(t.groups.dmh_12.ibpRuleV30)
    expect(oldTexts).toContain(t.group.methodNote.v30)
    expect(oldTexts).not.toContain(t.group.methodNote.v32)

    const current = render("dmh_12", IBP_METHOD_V3_2)
    const currentTexts = allTexts(current)
    expect(currentTexts).toContain(t.groups.dmh_12.ibpRule)
    expect(currentTexts).toContain(t.group.methodNote.v32)
    expect(currentTexts).not.toContain(t.group.methodNote.v30)
  })

  test("a group with one wording shows no method caption", () => {
    const texts = allTexts(render("dmh_01", IBP_METHOD_V3_2))
    expect(texts).not.toContain(t.group.methodNote.v30)
    expect(texts).not.toContain(t.group.methodNote.v32)
    expect(texts).toContain(t.groups.dmh_01.ibpRule)
  })

  test("a group with no difference shows no notice", () => {
    const tree = render("dmh_01", IBP_METHOD_V3_2)
    expect(byTestId(tree, "dmh-difference")).toHaveLength(0)
    expect(allTexts(tree)).not.toContain(t.group.differenceTitle)
  })

  test("dmh_11 shows both type lists with their sub-titles", () => {
    const tree = render("dmh_11", IBP_METHOD_V3_2)
    expect(byTestId(tree, "dmh-types-counted").length).toBeGreaterThan(0)
    expect(byTestId(tree, "dmh-types-not-counted").length).toBeGreaterThan(0)
    const texts = allTexts(tree)
    expect(texts).toContain(t.group.typesCounted)
    expect(texts).toContain(t.group.typesNotCounted)
  })

  test("a group with no type outside the IBP shows one list without a sub-title", () => {
    const tree = render("dmh_01", IBP_METHOD_V3_2)
    expect(byTestId(tree, "dmh-types-counted").length).toBeGreaterThan(0)
    expect(byTestId(tree, "dmh-types-not-counted")).toHaveLength(0)
    const texts = allTexts(tree)
    expect(texts).not.toContain(t.group.typesCounted)
    expect(texts).not.toContain(t.group.typesNotCounted)
  })

  test("each type is one accessible text", () => {
    const tree = render("dmh_11", IBP_METHOD_V3_2)
    const counted = byTestId(tree, "dmh-types-counted")[0]
    const rows = counted.findAll((n) => typeof n.props.accessibilityLabel === "string")
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].props.accessibilityLabel).toMatch(/Compté par l'IBP$/)
    const notCounted = byTestId(tree, "dmh-types-not-counted")[0]
    const outside = notCounted.findAll((n) => typeof n.props.accessibilityLabel === "string")
    expect(outside[0].props.accessibilityLabel).toMatch(/Non compté par l'IBP$/)
  })

  test("the recognise block opens with the drawing of the group, labelled by its alt sentence", () => {
    const tree = render("dmh_05", IBP_METHOD_V3_2)
    const [drawing] = byTestId(tree, "dmh-drawing")
    expect(drawing).toBeDefined()
    expect(drawing.props.accessibilityLabel).toBe(t.groups.dmh_05.illustrationAlt)
    // The drawing sits after the recognise title and before the recognise text.
    const flat: string[] = []
    const walk = (node: renderer.ReactTestInstance | string) => {
      if (typeof node === "string") return
      if (node.props.testID === "dmh-drawing" && typeof node.type === "string") {
        flat.push("DRAWING")
        return
      }
      if ((node.type as unknown) === "Text") {
        flat.push(textOf(node))
        return
      }
      node.children.forEach(walk)
    }
    walk(tree.root)
    const title = flat.indexOf(t.group.recogniseTitle)
    const drawingAt = flat.indexOf("DRAWING")
    const text = flat.indexOf(t.groups.dmh_05.recognise)
    expect(title).toBeLessThan(drawingAt)
    expect(drawingAt).toBeLessThan(text)
    // And after the rule block, so blocks 1 to 3 stay visible at the low detent.
    expect(flat.indexOf(t.groups.dmh_05.ibpRule)).toBeLessThan(drawingAt)
  })

  test("the real drawing module holds a drawing for the group", () => {
    render("dmh_05", IBP_METHOD_V3_2)
    expect(mockDrawingFor).toHaveBeenCalledWith("dmh_05")
  })

  test("a group without drawing data shows no slot and the text opens the block", () => {
    mockDrawingFor.mockReturnValue(null)
    const tree = render("dmh_05", IBP_METHOD_V3_2)
    expect(byTestId(tree, "dmh-drawing")).toHaveLength(0)
    expect(allTexts(tree)).toContain(t.groups.dmh_05.recognise)
  })

  test("pressing the sources link opens the sources, and the title receives the ref", () => {
    const onOpenSources = jest.fn()
    const titleRef = createRef<unknown>()
    const tree = render("dmh_05", IBP_METHOD_V3_2, { onOpenSources, titleRef })
    const [link] = byTestId(tree, "dmh-sources-link")
    act(() => link.props.onPress())
    expect(onOpenSources).toHaveBeenCalledTimes(1)
    expect(titleRef.current).toEqual({ node: "title" })
  })

  test("the block titles and the group label are headers", () => {
    const tree = render("dmh_05", IBP_METHOD_V3_2)
    const headers = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header",
    )
    const texts = headers.map((n) => textOf(n))
    expect(texts).toEqual(
      expect.arrayContaining([
        t.group.definitionTitle,
        t.group.ibpTitle,
        t.group.recogniseTitle,
        t.group.confusionsTitle,
        t.group.typesTitle,
      ]),
    )
  })
})
