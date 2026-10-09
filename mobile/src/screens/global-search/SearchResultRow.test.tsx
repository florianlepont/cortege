import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandRadius, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { RECENT_LAYOUT } from "../home/layout-budget"
import { SearchResultRow } from "./SearchResultRow"

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
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))

let tree: ReactTestRenderer

type Kind = "member" | "place" | "parcel"

function mount(
  extra: {
    kind?: Kind
    density?: "compact" | "regular"
    onPress?: () => void
  } = {},
) {
  const onPress = extra.onPress ?? jest.fn()
  act(() => {
    tree = renderer.create(
      <SearchResultRow
        kind={extra.kind ?? "member"}
        title="Camille"
        meta="3 relevés terminés"
        accessibilityLabel="Membre : Camille, 3 relevés terminés"
        onPress={onPress}
        density={extra.density}
        testID="result-row"
      />,
    )
  })
  return { onPress }
}

afterEach(() => {
  act(() => tree?.unmount())
})

const row = () =>
  tree.root.find(
    (node: ReactTestInstance) =>
      (node.type as unknown) === "Pressable" && node.props.testID === "result-row",
  )

const styleOf = (node: ReactTestInstance): Record<string, unknown> =>
  [node.props.style].flat(3).reduce(
    (acc: Record<string, unknown>, item: Record<string, unknown> | null | undefined) => ({
      ...acc,
      ...(item ?? {}),
    }),
    {},
  )

const texts = () => tree.root.findAll((node) => (node.type as unknown) === "Text")
const glyphs = () => tree.root.findAllByType("Ionicons" as never)

describe("SearchResultRow glyphs and text (25-04)", () => {
  test.each([
    ["member", "person-outline"],
    ["place", "location-outline"],
    ["parcel", "grid-outline"],
  ] as const)("a %s row shows the %s glyph, 18 pt, then the chevron", (kind, glyph) => {
    mount({ kind })
    const [lead, chevron] = glyphs()
    expect(lead.props.name).toBe(glyph)
    expect(lead.props.size).toBe(18)
    expect(lead.props.color).toBe(defaultTheme.visual.glass.iconTint)
    expect(chevron.props.name).toBe("chevron-forward-outline")
    expect(chevron.props.size).toBe(18)
    expect(chevron.props.color).toBe(defaultTheme.colors.textSecondary)
    expect(glyphs()).toHaveLength(2)
  })

  test("the glyph tile is 32 pt, rounded, filled with the glass icon tile colour, and hidden", () => {
    mount()
    const tile = glyphs()[0].parent as ReactTestInstance
    expect(styleOf(tile)).toMatchObject({
      width: 32,
      height: 32,
      borderRadius: brandRadius.badgeSm,
      backgroundColor: defaultTheme.visual.glass.iconTile,
    })
    expect(tile.props.accessibilityElementsHidden).toBe(true)
    expect(tile.props.importantForAccessibility).toBe("no-hide-descendants")
    const chevronBox = glyphs()[1].parent as ReactTestInstance
    expect(chevronBox.props.accessibilityElementsHidden).toBe(true)
  })

  test("title and meta are one line each, with tail truncation and the theme colours", () => {
    mount()
    const [title, meta] = texts()
    expect(title.props.children).toBe("Camille")
    expect(meta.props.children).toBe("3 relevés terminés")
    for (const node of [title, meta]) {
      expect(node.props.numberOfLines).toBe(1)
      expect(node.props.ellipsizeMode).toBe("tail")
    }
    expect(styleOf(title)).toMatchObject({
      fontSize: brandTypography.input.fontSize,
      color: defaultTheme.colors.textPrimary,
    })
    expect(styleOf(meta)).toMatchObject({
      fontSize: 13,
      color: defaultTheme.colors.textSecondary,
    })
  })
})

describe("SearchResultRow densities (25-04)", () => {
  test("compact (default) is a flat 52 pt row, 6 pt above and below, 16 pt on the sides", () => {
    mount()
    const style = styleOf(row())
    expect(style).toMatchObject({
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      paddingVertical: 6,
      paddingHorizontal: brandSpacing4.md,
      gap: brandSpacing4.smd,
    })
    expect(style.minHeight).toBe(RECENT_LAYOUT.rowHeight)
    expect(style.height).toBeUndefined()
    for (const key of ["borderWidth", "backgroundColor", "boxShadow", "borderRadius"]) {
      expect(style[key]).toBeUndefined()
    }
    const layer = row().find(
      (node) => (node.type as unknown) === "View" && node.props.testID === "ripple-layer",
    )
    expect(styleOf(layer).borderRadius).toBe(0)
  })

  test("the text lines fit the 52 pt of a survey row", () => {
    mount()
    const [title, meta] = texts()
    const lines =
      (styleOf(title).lineHeight as number) +
      brandSpacing4.xs +
      (styleOf(meta).lineHeight as number)
    expect(lines + 2 * 6).toBe(RECENT_LAYOUT.rowHeight)
  })

  test("regular is its own 56 pt glass card", () => {
    mount({ density: "regular" })
    const style = styleOf(row())
    expect(style).toMatchObject({
      minHeight: 56,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: defaultTheme.visual.glass.cardBorder,
      backgroundColor: defaultTheme.visual.glass.cardFill,
      boxShadow: defaultTheme.visual.glass.cardShadow,
    })
    expect(style.height).toBeUndefined()
    const layer = row().find(
      (node) => (node.type as unknown) === "View" && node.props.testID === "ripple-layer",
    )
    expect(styleOf(layer).borderRadius).toBe(brandRadius.card - 1)
  })
})

describe("SearchResultRow press and accessibility (25-04)", () => {
  test("the row is one button with the given label and test id", () => {
    mount()
    expect(row().props.accessibilityRole).toBe("button")
    expect(row().props.accessibilityLabel).toBe("Membre : Camille, 3 relevés terminés")
    expect(
      tree.root.findAll(
        (node) => node.props.testID === "result-row" && (node.type as unknown) === "Pressable",
      ),
    ).toHaveLength(1)
  })

  test("pressing calls onPress once", () => {
    const { onPress } = mount({ density: "regular" })
    act(() => row().props.onPress())
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("the press is the green wave", () => {
    mount()
    expect(
      row().findAll(
        (node) => (node.type as unknown) === "View" && node.props.testID === "ripple-layer",
      ),
    ).toHaveLength(1)
  })
})
