import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandMapTokens } from "../../app/brand-tokens"
import { fr } from "../../i18n"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    if (message.includes("not configured to support act")) return
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
    Pressable: mockComponent("Pressable"),
    StyleSheet: { create: <T,>(value: T): T => value },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))

import { ScoreLegend } from "./ScoreLegend"

const t = fr.publicMap

function render() {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<ScoreLegend bottom={40} count={12} />)
  })
  return tree!
}

describe("ScoreLegend (MAP-03: collapsible score-band legend)", () => {
  test("starts collapsed: only the toggle button, no rows", () => {
    const tree = render()
    expect(tree.root.findAll((node) => (node.type as unknown) === "Pressable")).toHaveLength(1)
    expect(
      tree.root.findAll(
        (node) => (node.type as unknown) === "Text" && node.props.children === t.legend.title,
      ),
    ).toHaveLength(0)
  })

  test("expands to show the title and the three score-band rows with their colors", () => {
    const tree = render()
    const toggle = tree.root.findByProps({ accessibilityLabel: t.a11y.showLegend })
    act(() => toggle.props.onPress())

    expect(
      tree.root.findAll(
        (node) => (node.type as unknown) === "Text" && node.props.children === t.legend.title,
      ),
    ).toHaveLength(1)
    for (const label of [t.legend.high, t.legend.mid, t.legend.low]) {
      expect(
        tree.root.findAll(
          (node) => (node.type as unknown) === "Text" && node.props.children === label,
        ),
      ).toHaveLength(1)
    }
    expect(tree.root.findByProps({ accessibilityLabel: t.a11y.hideLegend })).toBeTruthy()
  })

  test("also explains the dashed marker of the author's own draft (OA-59)", () => {
    const tree = render()
    act(() => tree.root.findByProps({ accessibilityLabel: t.a11y.showLegend }).props.onPress())
    expect(
      tree.root.findAll(
        (node) => (node.type as unknown) === "Text" && node.props.children === t.legend.draft,
      ),
    ).toHaveLength(1)
  })

  test("each row's swatch uses the score-band's marker color", () => {
    const tree = render()
    const toggle = tree.root.findByProps({ accessibilityLabel: t.a11y.showLegend })
    act(() => toggle.props.onPress())

    for (const tone of ["high", "mid", "low"] as const) {
      const views = tree.root.findAll(
        (node) =>
          (node.type as unknown) === "View" &&
          [node.props.style]
            .flat(2)
            .some(
              (style: Record<string, unknown>) =>
                style?.backgroundColor === brandMapTokens.scoreMarker[tone],
            ),
      )
      expect(views.length).toBeGreaterThan(0)
    }
  })
})
