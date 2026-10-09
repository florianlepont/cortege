import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandRadius, brandTypography } from "../../app/brand-tokens"
import type { SearchGroupKey } from "../../app/global-search"
import { defaultTheme } from "../../app/theme"
import { SearchGroupCard } from "./SearchGroupCard"

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

let tree: ReactTestRenderer

type SeeAll = { count: number; capped: boolean; onPress: () => void } | null

function mount(group: SearchGroupKey, seeAll: SeeAll | undefined, children: React.ReactNode) {
  act(() => {
    tree = renderer.create(
      <SearchGroupCard group={group} seeAll={seeAll}>
        {children}
      </SearchGroupCard>,
    )
  })
}

afterEach(() => {
  act(() => tree?.unmount())
})

const styleOf = (node: ReactTestInstance): Record<string, unknown> =>
  [node.props.style].flat(3).reduce(
    (acc: Record<string, unknown>, item: Record<string, unknown> | null | undefined) => ({
      ...acc,
      ...(item ?? {}),
    }),
    {},
  )

const byTestId = (testID: string) =>
  tree.root.find(
    (node: ReactTestInstance) => typeof node.type === "string" && node.props.testID === testID,
  )
const queryAll = (testID: string) =>
  tree.root.findAll(
    (node: ReactTestInstance) => typeof node.type === "string" && node.props.testID === testID,
  )
const texts = () => tree.root.findAll((node) => (node.type as unknown) === "Text")

const hostParent = (node: ReactTestInstance): ReactTestInstance => {
  let current = node.parent as ReactTestInstance
  while (typeof current.type !== "string") current = current.parent as ReactTestInstance
  return current
}
const rowView = (id: string) => React.createElement("View", { key: id, testID: `row-${id}` })

describe("SearchGroupCard header (25-09)", () => {
  test.each([
    ["mine", "Mes relevés"],
    ["community", "Communauté"],
    ["places", "Lieux"],
    ["parcels", "Parcelles"],
  ] as const)(
    "the %s group is titled %s, as a header, in a container with its test id",
    (key, title) => {
      mount(key, null, rowView("a"))
      expect(byTestId(`search-group-${key}`)).toBeTruthy()
      const [heading] = texts()
      expect(heading.props.children).toBe(title)
      expect(heading.props.accessibilityRole).toBe("header")
      expect(styleOf(heading)).toMatchObject({
        fontSize: brandTypography.sectionHeader.fontSize,
        color: defaultTheme.colors.textPrimary,
      })
    },
  )

  test("a link shows 'Voir les 6' with a 44 pt target, a group-naming label and the accent colour", () => {
    const onPress = jest.fn()
    mount("community", { count: 6, capped: false, onPress }, rowView("a"))
    const link = byTestId("search-see-all-community")
    expect(link.props.accessibilityRole).toBe("button")
    expect(link.props.accessibilityLabel).toBe("Voir les 6 résultats : Communauté")
    expect(styleOf(link)).toMatchObject({ minHeight: 44, minWidth: 44 })
    const label = texts()[1]
    expect(label.props.children).toBe("Voir les 6")
    expect(styleOf(label)).toMatchObject({
      fontSize: 13,
      color: defaultTheme.visual.accentText,
    })
    act(() => link.props.onPress())
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("a capped group reads 'Voir les 50+'", () => {
    mount("community", { count: 50, capped: true, onPress: jest.fn() }, rowView("a"))
    expect(texts()[1].props.children).toBe("Voir les 50+")
    expect(byTestId("search-see-all-community").props.accessibilityLabel).toBe(
      "Voir les 50 résultats : Communauté",
    )
  })

  test.each([[undefined], [null]])("without 'seeAll' (%s) there is no link", (seeAll) => {
    mount("places", seeAll, rowView("a"))
    expect(queryAll("search-see-all-places")).toHaveLength(0)
    expect(texts()).toHaveLength(1)
  })
})

describe("SearchGroupCard shell (25-09)", () => {
  test("rows sit in one glass card with the card radius, a hairline and an inner clip", () => {
    mount("mine", null, rowView("a"))
    const first = byTestId("row-a")
    const clip = hostParent(first)
    const shell = hostParent(clip)
    expect(styleOf(shell)).toMatchObject({
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: defaultTheme.visual.glass.cardBorder,
      backgroundColor: defaultTheme.visual.glass.cardFill,
      boxShadow: defaultTheme.visual.glass.cardShadow,
    })
    expect(styleOf(clip)).toMatchObject({
      overflow: "hidden",
      borderRadius: brandRadius.card - 1,
    })
  })

  test("1 pt dividers separate consecutive rows only, and skip null children", () => {
    mount("mine", null, [rowView("a"), null, rowView("b"), false, rowView("c")])
    const clip = hostParent(byTestId("row-a"))
    const separators = clip.children.filter(
      (child): child is ReactTestInstance =>
        typeof child !== "string" && styleOf(child).height === 1,
    )
    expect(separators).toHaveLength(2)
    for (const separator of separators) {
      expect(styleOf(separator).backgroundColor).toBe(defaultTheme.colors.divider)
    }
    expect(clip.children).toHaveLength(5)
  })

  test("a single row has no divider", () => {
    mount("places", null, rowView("a"))
    const clip = hostParent(byTestId("row-a"))
    expect(clip.children).toHaveLength(1)
  })
})
