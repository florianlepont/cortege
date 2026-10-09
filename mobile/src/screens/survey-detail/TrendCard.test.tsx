import React from "react"
import renderer, { act } from "react-test-renderer"

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

jest.mock("@expo/vector-icons", () => {
  const ReactRef = require("react") as typeof import("react")
  return { Ionicons: (props: object) => ReactRef.createElement("Ionicons", props) }
})

jest.mock("../../ui/ForestCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    ForestCard: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("ForestCard", props, children),
  }
})

jest.mock("./TrendCurve", () => {
  const ReactRef = require("react") as typeof import("react")
  return { TrendCurve: (props: object) => ReactRef.createElement("TrendCurve", props) }
})

import { brandFontScaleCaps, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import type { TrendSummary } from "../../app/parcel-history"
import { defaultTheme } from "../../app/theme"
import type { TrendInputPoint } from "../../app/trend-geometry"
import { fr } from "../../i18n"
import { TrendCard } from "./TrendCard"

const forest = defaultTheme.visual.forest
const t = fr.parcelHistory.page.trend

const POINTS: TrendInputPoint[] = [
  { surveyId: "a", total: 21, year: 2023, isCurrent: false, methodKey: "v3.2" },
  { surveyId: "b", total: 34, year: 2025, isCurrent: true, methodKey: "v3.2" },
]

type Style = Record<string, unknown>
const hostParent = (node: renderer.ReactTestInstance) => {
  let parent = node.parent
  while (parent && (parent.type as unknown) !== "View") parent = parent.parent
  return parent!
}
const flat = (style: unknown): Style =>
  Array.isArray(style)
    ? style.reduce<Style>((acc, s) => ({ ...acc, ...flat(s) }), {})
    : ((style as Style | null | undefined) ?? {})

function render(trend: TrendSummary, points: TrendInputPoint[] = POINTS) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<TrendCard trend={trend} points={points} />)
  })
  const root = tree!.root
  const find = (type: string) => root.findAll((n) => (n.type as unknown) === type)
  const title = find("Text")[0]
  const parts = title ? find("Text").slice(1, 3) : []
  return { tree: tree!, root, find, title, parts }
}

describe("TrendCard frame", () => {
  test("a hero forest card without its own motion, padded 16", () => {
    const { find } = render({ kind: "change", delta: 13, sinceYear: 2023, mixed: false })
    const card = find("ForestCard")[0]
    expect(card.props.variant).toBe("hero")
    expect(card.props.motion).toBe(false)
    expect(flat(card.props.contentStyle).padding).toBe(16)
  })

  test("renders nothing for a trend of kind none", () => {
    expect(render({ kind: "none" }).tree.toJSON()).toBeNull()
  })
})

describe("TrendCard title", () => {
  test("a gain reads +13 points, then since 2023 in the accent colour", () => {
    const { title, parts } = render({ kind: "change", delta: 13, sinceYear: 2023, mixed: false })
    expect(parts.map((part) => part.props.children)).toEqual(["+13 points", " depuis 2023"])
    expect(flat(parts[0].props.style).color).toBe(forest.title)
    expect(flat(parts[1].props.style).color).toBe(forest.titleAccent)
    expect(flat(title.props.style)).toMatchObject({
      fontSize: brandTypography.screenTitle.fontSize,
      lineHeight: brandTypography.screenTitle.lineHeight,
      fontFamily: brandTypography.screenTitle.fontFamily,
    })
    expect(title.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.title)
    expect(title.props.numberOfLines).toBe(2)
  })

  test("a loss and a single point", () => {
    expect(
      render({ kind: "change", delta: -1, sinceYear: 2024, mixed: false }).parts[0].props.children,
    ).toBe("-1 point")
  })

  test("no known year falls back to the first survey", () => {
    const { parts } = render({ kind: "change", delta: 4, sinceYear: null, mixed: false })
    expect(parts[1].props.children).toBe(" depuis le premier relevé")
  })

  test("no change says so and keeps the since part", () => {
    const { parts } = render({ kind: "change", delta: 0, sinceYear: 2023, mixed: false })
    expect(parts[0].props.children).toBe("Aucun changement")
    expect(parts[1].props.children).toBe(" depuis 2023")
  })

  test("a new method with its year", () => {
    const { parts } = render({ kind: "newMethod", method: "v3.2", year: 2025, mixed: true })
    expect(parts.map((part) => part.props.children)).toEqual([
      "Passage à la méthode v3.2",
      " en 2025",
    ])
    expect(flat(parts[1].props.style).color).toBe(forest.titleAccent)
  })

  test("a new method without a year has no accent part", () => {
    const { find, title } = render({ kind: "newMethod", method: "v3.0", year: null, mixed: true })
    expect(find("Text").filter((n) => n.props.style === title.props.style)).toHaveLength(1)
    expect(title.findAll((n) => (n.type as unknown) === "Text")).toHaveLength(2)
    expect(title.findAll((n) => (n.type as unknown) === "Text")[1].props.children).toBe(
      "Passage à la méthode v3.0",
    )
  })

  test("an unknown method uses the catalogue fallback", () => {
    const { parts } = render({ kind: "newMethod", method: null, year: 2025, mixed: true })
    expect(parts[0].props.children).toBe(t.newMethodUnknown)
    expect(parts[1].props.children).toBe(" en 2025")
  })
})

describe("TrendCard curve and notice", () => {
  test("the curve gets the points and the catalogue label, 12 below the title", () => {
    const { find } = render({ kind: "change", delta: 13, sinceYear: 2023, mixed: false })
    const curve = find("TrendCurve")[0]
    expect(curve.props.points).toBe(POINTS)
    expect(curve.props.accessibilityLabel).toBe(t.a11y(POINTS))
    expect(curve.props.accessibilityLabel).toBe(
      "Évolution du total IBP. 2023, 21 sur 50. 2025, 34 sur 50.",
    )
    const wrapper = hostParent(curve)
    expect(flat(wrapper.props.style).marginTop).toBe(12)
  })

  test("not mixed: no notice", () => {
    const { find } = render({ kind: "change", delta: 13, sinceYear: 2023, mixed: false })
    expect(find("Ionicons")).toHaveLength(0)
    expect(find("Text").some((n) => n.props.children === t.mixed)).toBe(false)
  })

  test("mixed: the label gains the cut suffix and the notice shows below", () => {
    const { find } = render({ kind: "change", delta: 13, sinceYear: 2023, mixed: true })
    expect(find("TrendCurve")[0].props.accessibilityLabel).toBe(t.a11y(POINTS) + t.a11yMixed)
    const icon = find("Ionicons")[0]
    expect(icon.props.name).toBe("information-circle-outline")
    expect(icon.props.size).toBe(16)
    expect(icon.props.color).toBe(forest.body)
    const text = find("Text").find((n) => n.props.children === t.mixed)!
    expect(flat(text.props.style)).toMatchObject({
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: brandTypeScale.footnote.lineHeight,
      color: forest.body,
    })
    expect(text.props.numberOfLines).toBe(2)
    expect(flat(hostParent(icon).props.style)).toMatchObject({ marginTop: 8, flexDirection: "row" })
  })

  test("a new-method trend is always mixed", () => {
    const { find } = render({ kind: "newMethod", method: "v3.2", year: 2025, mixed: true })
    expect(find("TrendCurve")[0].props.accessibilityLabel).toContain(t.a11yMixed)
    expect(find("Ionicons")).toHaveLength(1)
  })
})
