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
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Pressable: mockComponent("Pressable"),
    StyleSheet: { create: <T,>(value: T): T => value },
    Platform: { OS: "ios" },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
// The theme the legend reads, switchable per test (light by default).
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("automatic", "dark", () => {}),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import {
  brandColors,
  brandInteraction,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
import { ScoreLegend } from "./ScoreLegend"

const darkTheme = buildTheme("automatic", "dark", () => {})

afterEach(() => {
  mockScheme.current = "light"
})

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function textNode(tree: renderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    (node) => (node.type as unknown) === "Text" && node.props.children === label,
  )
}

const t = fr.publicMap

function render(loading = false) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<ScoreLegend bottom={40} count={12} loading={loading} />)
  })
  return tree!
}

function expand(tree: renderer.ReactTestRenderer) {
  act(() => tree.root.findByProps({ accessibilityLabel: t.a11y.showLegend }).props.onPress())
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

  test("the swatches are exactly the marker colours, and the draft swatch stays dashed", () => {
    const tree = render()
    expand(tree)
    const swatches = tree.root
      .findAll((node) => (node.type as unknown) === "View" && flat(node.props.style).width === 14)
      .map((node) => flat(node.props.style))
    expect(swatches.map((style) => style.backgroundColor)).toEqual([
      brandMapTokens.scoreMarker.high,
      brandMapTokens.scoreMarker.mid,
      brandMapTokens.scoreMarker.low,
      brandColors.white,
      brandMapTokens.parcelUnscored,
    ])
    expect(swatches[3].borderStyle).toBe("dashed")
    expect(swatches[3].borderColor).toBe(brandColors.forest)
    expect(swatches.slice(0, 3).every((style) => style.borderStyle === undefined)).toBe(true)
    expect(swatches[4].borderStyle).toBeUndefined()
  })

  test("the toggle keeps its 40 pt glass disc and a 44 pt target (D-05)", () => {
    const toggle = render().root.findByType("Pressable" as never)
    const style = flat(toggle.props.style)
    expect(style.width).toBe(40)
    expect(style.height).toBe(40)
    expect(40 + 2 * (toggle.props.hitSlop as number)).toBe(brandInteraction.hitTarget.min)
  })

  test("icon and spinner use the theme's accent text colour in light and dark (12.2-18)", () => {
    const light = render(true)
    expect(light.root.findByType("Ionicons" as never).props.color).toBe(
      defaultTheme.visual.accentText,
    )
    expect(light.root.findByType("ActivityIndicator" as never).props.color).toBe(
      defaultTheme.visual.accentText,
    )
    mockScheme.current = "dark"
    const dark = render(true)
    expect(dark.root.findByType("Ionicons" as never).props.color).toBe(darkTheme.visual.accentText)
    expect(dark.root.findByType("ActivityIndicator" as never).props.color).toBe(
      darkTheme.visual.accentText,
    )
    expect(darkTheme.visual.accentText).not.toBe(brandColors.forest)
  })

  test("the panel title is a section header and the row labels a secondary footnote", () => {
    const tree = render()
    expand(tree)
    const title = flat(textNode(tree, t.legend.title).props.style)
    expect(title.fontFamily).toBe(brandTypography.sectionHeader.fontFamily)
    expect(title.fontSize).toBe(brandTypography.sectionHeader.fontSize)
    const row = flat(textNode(tree, t.legend.high).props.style)
    expect(row.fontSize).toBe(brandTypeScale.footnote.fontSize)
    expect(row.lineHeight).toBe(brandTypeScale.footnote.lineHeight)
    expect(row.color).toBe(defaultTheme.colors.textSecondary)
  })
})
