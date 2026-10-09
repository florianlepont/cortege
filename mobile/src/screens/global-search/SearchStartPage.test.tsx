import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SearchStartPage } from "./SearchStartPage"

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
jest.mock("../../ui/EntranceView", () => ({ EntranceView: "EntranceView" }))

let tree: ReactTestRenderer

function mount(recents: readonly string[]) {
  const handlers = {
    onOpenRecent: jest.fn(),
    onRemoveRecent: jest.fn(),
    onClearRecents: jest.fn(),
  }
  act(() => {
    tree = renderer.create(<SearchStartPage recents={recents} {...handlers} />)
  })
  return handlers
}

afterEach(() => {
  act(() => tree?.unmount())
})

const byTestId = (testID: string) =>
  tree.root.find(
    (node: ReactTestInstance) => typeof node.type === "string" && node.props.testID === testID,
  )
const queryAll = (testID: string) =>
  tree.root.findAll(
    (node: ReactTestInstance) => typeof node.type === "string" && node.props.testID === testID,
  )
const styleOf = (node: ReactTestInstance): Record<string, unknown> =>
  [node.props.style].flat(3).reduce(
    (acc: Record<string, unknown>, item: Record<string, unknown> | null | undefined) => ({
      ...acc,
      ...(item ?? {}),
    }),
    {},
  )
const texts = () =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => ({ node, text: [node.props.children].flat().join("") }))
const textNode = (value: string) => {
  const found = texts().find((entry) => entry.text === value)
  if (!found) throw new Error(`no text "${value}"`)
  return found.node
}
const glyphs = () => tree.root.findAllByType("Ionicons" as never)

describe("SearchStartPage with recent searches (25-11, D-02b)", () => {
  const recents = ["Fontainebleau", "Marie"]

  test("the header names the list and 'Effacer' clears it at once, as a 44 pt target", () => {
    const handlers = mount(recents)
    expect(textNode(fr.search.start.recentTitle).props.accessibilityRole).toBe("header")
    const clear = byTestId("search-recents-clear")
    expect(clear.props.accessibilityLabel).toBe(fr.search.start.recentClearA11y)
    expect(clear.props.accessibilityRole).toBe("button")
    expect(styleOf(clear).minHeight).toBe(brandInteraction.hitTarget.min)
    expect(styleOf(textNode(fr.search.start.recentClear)).color).toBe(
      defaultTheme.visual.accentText,
    )
    act(() => clear.props.onPress())
    expect(handlers.onClearRecents).toHaveBeenCalledTimes(1)
  })

  test("one row per recent, labelled with the query, a press opens it", () => {
    const handlers = mount(recents)
    expect(queryAll("search-recent-0")).toHaveLength(1)
    expect(queryAll("search-recent-1")).toHaveLength(1)
    expect(queryAll("search-recent-2")).toHaveLength(0)
    const first = byTestId("search-recent-0")
    expect(first.props.accessibilityLabel).toBe(fr.search.start.recentOpenA11y("Fontainebleau"))
    expect(first.props.accessibilityRole).toBe("button")
    act(() => first.props.onPress())
    expect(handlers.onOpenRecent).toHaveBeenCalledWith("Fontainebleau")
    act(() => byTestId("search-recent-1").props.onPress())
    expect(handlers.onOpenRecent).toHaveBeenLastCalledWith("Marie")
  })

  test("the remove button removes that entry only, as a 44 x 44 target with an 18 pt cross", () => {
    const handlers = mount(recents)
    const remove = byTestId("search-recent-remove-1")
    expect(remove.props.accessibilityLabel).toBe(fr.search.start.recentRemoveA11y("Marie"))
    expect(styleOf(remove).width).toBe(brandInteraction.hitTarget.min)
    expect(styleOf(remove).height).toBe(brandInteraction.hitTarget.min)
    act(() => remove.props.onPress())
    expect(handlers.onRemoveRecent).toHaveBeenCalledTimes(1)
    expect(handlers.onRemoveRecent).toHaveBeenCalledWith("Marie")
    expect(handlers.onOpenRecent).not.toHaveBeenCalled()
    const cross = glyphs().find((node) => node.props.name === "close-outline")
    expect(cross?.props.size).toBe(18)
  })

  test("each row has the clock tile and a one-line 16 SemiBold query; rows are 52 pt high", () => {
    mount(recents)
    const clocks = glyphs().filter((node) => node.props.name === "time-outline")
    expect(clocks).toHaveLength(2)
    expect(clocks[0].props.size).toBe(18)
    expect(clocks[0].props.color).toBe(defaultTheme.visual.glass.iconTint)
    const query = textNode("Fontainebleau")
    expect(query.props.numberOfLines).toBe(1)
    expect(styleOf(query).fontFamily).toBe(brandTypography.input.fontFamily)
    expect(styleOf(query).fontSize).toBe(brandTypography.input.fontSize)
    expect(styleOf(byTestId("search-recent-0")).minHeight).toBe(52)
  })

  test("the rows share one glass card divided by a hairline, with no intro", () => {
    mount(recents)
    const separators = tree.root.findAll(
      (node) =>
        (node.type as unknown) === "View" &&
        styleOf(node).height === 1 &&
        styleOf(node).backgroundColor === defaultTheme.colors.divider,
    )
    expect(separators).toHaveLength(1)
    expect(queryAll("search-intro-tile")).toHaveLength(0)
    expect(texts().some((entry) => entry.text === fr.search.start.introTitle)).toBe(false)
  })

  test("the sections slide in through EntranceView, in order", () => {
    mount(recents)
    const entrances = tree.root.findAllByType("EntranceView" as never)
    expect(entrances.map((node) => node.props.index)).toEqual([0, 1])
  })
})

describe("SearchStartPage without recent searches (25-11, D-02b)", () => {
  test("shows the centred intro: 96 pt round tile with a 48 pt magnifier, title and body", () => {
    mount([])
    const tile = byTestId("search-intro-tile")
    expect(styleOf(tile).width).toBe(96)
    expect(styleOf(tile).height).toBe(96)
    expect(styleOf(tile).borderRadius).toBe(48)
    expect(styleOf(tile).backgroundColor).toBe(defaultTheme.visual.glass.iconTile)
    const glyph = glyphs().find((node) => node.props.name === "search-outline")
    expect(glyph?.props.size).toBe(48)
    expect(glyph?.props.color).toBe(defaultTheme.visual.glass.iconTint)

    const title = textNode(fr.search.start.introTitle)
    expect(styleOf(title).fontSize).toBe(brandTypography.input.fontSize)
    expect(styleOf(title).textAlign).toBe("center")
    const body = textNode(fr.search.start.introBody)
    expect(styleOf(body).fontSize).toBe(brandTypeScale.footnote.fontSize)
    expect(styleOf(body).maxWidth).toBe(280)
    expect(styleOf(body).color).toBe(defaultTheme.colors.textSecondary)
  })

  test("the block sits 32 pt under the field and shows no list, header or clear link", () => {
    mount([])
    const entrance = tree.root.findByType("EntranceView" as never)
    expect(styleOf(entrance).paddingTop).toBe(32)
    expect(styleOf(entrance).alignItems).toBe("center")
    expect(queryAll("search-recents-clear")).toHaveLength(0)
    expect(queryAll("search-recent-0")).toHaveLength(0)
  })
})
