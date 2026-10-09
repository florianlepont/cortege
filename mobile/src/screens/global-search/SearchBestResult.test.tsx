import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandRadius, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { SearchBestResult } from "./SearchBestResult"

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
jest.mock("../../ui/ContourLines", () => ({ ContourLines: "ContourLines" }))

let tree: ReactTestRenderer

type Kind = React.ComponentProps<typeof SearchBestResult>["kind"]

function mount(
  extra: {
    kind?: Kind
    trailing?: React.ReactNode
    onPress?: () => void
  } = {},
) {
  const onPress = extra.onPress ?? jest.fn()
  act(() => {
    tree = renderer.create(
      <SearchBestResult
        kind={extra.kind ?? "member"}
        title="Marie Dupont"
        meta="3 relevés terminés"
        trailing={extra.trailing}
        onPress={onPress}
      />,
    )
  })
  return { onPress }
}

afterEach(() => {
  act(() => tree?.unmount())
})

const card = () =>
  tree.root.find(
    (node: ReactTestInstance) =>
      (node.type as unknown) === "Pressable" && node.props.testID === "search-best-result",
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
const strips = () => tree.root.findAllByType("ContourLines" as never)

describe("SearchBestResult card (25-09)", () => {
  test("the whole card is one button with the 'Meilleur résultat' sentence, pressing calls onPress once", () => {
    const { onPress } = mount()
    expect(card().props.accessibilityRole).toBe("button")
    expect(card().props.accessibilityLabel).toBe(
      "Meilleur résultat : Marie Dupont, 3 relevés terminés",
    )
    expect(
      tree.root.findAll(
        (node) =>
          (node.type as unknown) === "Pressable" && node.props.testID === "search-best-result",
      ),
    ).toHaveLength(1)
    act(() => card().props.onPress())
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("the ripple is clipped to the inner radius of the glass card", () => {
    mount()
    const layer = card().find(
      (node) => (node.type as unknown) === "View" && node.props.testID === "ripple-layer",
    )
    expect(styleOf(layer).borderRadius).toBe(brandRadius.card - 1)
  })

  test("is a glass card with 16 pt padding and clipped corners (not a forest card)", () => {
    mount()
    expect(styleOf(card())).toMatchObject({ padding: 16 })
    let node: ReactTestInstance | null = card()
    let shell: Record<string, unknown> = {}
    while (node) {
      node = node.parent
      if (node && typeof node.type === "string" && styleOf(node).overflow === "hidden") {
        shell = styleOf(node)
        break
      }
    }
    expect(shell).toMatchObject({
      overflow: "hidden",
      borderRadius: brandRadius.card,
      backgroundColor: defaultTheme.visual.glass.cardFill,
      borderColor: defaultTheme.visual.glass.cardBorder,
      boxShadow: defaultTheme.visual.glass.cardShadow,
    })
  })

  test("shows the eyebrow, the title and the meta, both up to 2 lines, in the theme colours", () => {
    mount()
    const [eyebrow, title, meta] = texts()
    expect(eyebrow.props.children).toBe("Meilleur résultat")
    expect(styleOf(eyebrow)).toMatchObject({
      fontSize: brandTypography.sectionHeader.fontSize,
      color: defaultTheme.colors.textSecondary,
    })
    expect(title.props.children).toBe("Marie Dupont")
    expect(title.props.numberOfLines).toBe(2)
    expect(styleOf(title)).toMatchObject({
      fontSize: brandTypeScale.title3.fontSize,
      lineHeight: brandTypeScale.title3.lineHeight,
      fontFamily: "Sora-SemiBold",
      color: defaultTheme.colors.textPrimary,
    })
    expect(meta.props.children).toBe("3 relevés terminés")
    expect(meta.props.numberOfLines).toBe(2)
    expect(styleOf(meta)).toMatchObject({
      fontSize: 13,
      color: defaultTheme.colors.textSecondary,
    })
  })
})

describe("SearchBestResult type glyph and trailing (25-09)", () => {
  test.each([
    ["mine", "leaf-outline"],
    ["community", "people-outline"],
    ["member", "person-outline"],
    ["place", "location-outline"],
    ["parcel", "grid-outline"],
  ] as const)("a %s result shows the %s glyph in a 40 pt tile", (kind, glyph) => {
    mount({ kind })
    const [lead] = glyphs()
    expect(lead.props.name).toBe(glyph)
    expect(lead.props.color).toBe(defaultTheme.visual.glass.iconTint)
    const tile = lead.parent as ReactTestInstance
    expect(styleOf(tile)).toMatchObject({
      width: 40,
      height: 40,
      backgroundColor: defaultTheme.visual.glass.iconTile,
    })
    expect(tile.props.accessibilityElementsHidden).toBe(true)
  })

  test("the default trailing is the 18 pt chevron, hidden from accessibility", () => {
    mount()
    const chevron = glyphs()[1]
    expect(chevron.props).toMatchObject({
      name: "chevron-forward-outline",
      size: 18,
      color: defaultTheme.colors.textSecondary,
    })
    expect(chevron.parent?.props.accessibilityElementsHidden).toBe(true)
  })

  test("a given trailing node replaces the chevron", () => {
    mount({ kind: "mine", trailing: React.createElement("ScoreRing", { score: 31 }) })
    expect(tree.root.findAllByType("ScoreRing" as never)).toHaveLength(1)
    expect(glyphs().map((glyph) => glyph.props.name)).toEqual(["leaf-outline"])
  })
})

describe("SearchBestResult map line (25-09)", () => {
  test.each(["place", "parcel"] as const)(
    "a %s result adds a static 48 pt contour strip and 'Voir sur la carte'",
    (kind) => {
      mount({ kind })
      expect(strips()).toHaveLength(1)
      expect(strips()[0].props.animated).toBe(false)
      const strip = strips()[0].parent as ReactTestInstance
      expect(styleOf(strip)).toMatchObject({ height: 48, overflow: "hidden" })
      expect(strip.props.accessibilityElementsHidden).toBe(true)
      expect(strip.props.importantForAccessibility).toBe("no-hide-descendants")
      const mapGlyph = glyphs().find((glyph) => glyph.props.name === "map-outline")
      expect(mapGlyph?.props).toMatchObject({ size: 18, color: defaultTheme.visual.accentText })
      const line = texts().find((text) => text.props.children === "Voir sur la carte")
      expect(line).toBeTruthy()
      expect(styleOf(line as ReactTestInstance).color).toBe(defaultTheme.visual.accentText)
    },
  )

  test.each(["mine", "community", "member"] as const)(
    "a %s result has neither strip nor map line",
    (kind) => {
      mount({ kind })
      expect(strips()).toHaveLength(0)
      expect(glyphs().some((glyph) => glyph.props.name === "map-outline")).toBe(false)
      expect(texts().some((text) => text.props.children === "Voir sur la carte")).toBe(false)
    },
  )
})
