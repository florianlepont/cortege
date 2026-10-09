import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SearchGroupNotice } from "./SearchGroupNotice"

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
jest.mock("../../ui/Skeleton", () => ({ Skeleton: "Skeleton" }))

let tree: ReactTestRenderer

type Props = React.ComponentProps<typeof SearchGroupNotice>

function mount(props: Props) {
  act(() => {
    tree = renderer.create(<SearchGroupNotice {...props} />)
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
const texts = () => tree.root.findAll((node) => (node.type as unknown) === "Text")
const glyphs = () => tree.root.findAllByType("Ionicons" as never)
const skeletons = () => tree.root.findAllByType("Skeleton" as never)

describe("SearchGroupNotice loading (25-09)", () => {
  test("is one 52 pt row with a round 32 pt skeleton and two lines, labelled 'Recherche en cours'", () => {
    mount({ group: "places", variant: "loading" })
    const row = byTestId("search-loading-places")
    expect(row.props.accessible).toBe(true)
    expect(row.props.accessibilityLabel).toBe(fr.search.field.busy)
    expect(styleOf(row).minHeight).toBe(52)
    const [disc, long, short] = skeletons()
    expect(disc.props).toMatchObject({ width: 32, height: 32, borderRadius: 16 })
    expect(long.props).toMatchObject({ width: "60%", height: 14 })
    expect(short.props).toMatchObject({ width: "40%", height: 12 })
    expect(texts()).toHaveLength(0)
    expect(glyphs()).toHaveLength(0)
  })
})

describe("SearchGroupNotice offline (25-09)", () => {
  test.each(["community", "places", "parcels"] as const)(
    "%s: cloud glyph and the plain sentence, no button, polite live region",
    (group) => {
      mount({ group, variant: "offline" })
      const row = byTestId(`search-offline-${group}`)
      expect(row.props.accessibilityLiveRegion).toBe("polite")
      expect(styleOf(row).minHeight).toBe(52)
      const [glyph] = glyphs()
      expect(glyph.props).toMatchObject({
        name: "cloud-offline-outline",
        size: 18,
        color: defaultTheme.colors.textSecondary,
      })
      expect(glyph.parent?.props.accessibilityElementsHidden).toBe(true)
      const [text] = texts()
      expect(text.props.children).toBe(fr.search.offline[group])
      expect(text.props.numberOfLines).toBe(2)
      expect(styleOf(text)).toMatchObject({
        fontSize: 13,
        color: defaultTheme.colors.textSecondary,
      })
      expect(tree.root.findAll((node) => (node.type as unknown) === "Pressable")).toHaveLength(0)
    },
  )
})

describe("SearchGroupNotice error (25-09)", () => {
  test("shows the danger glyph, the group sentence and a retry link that retries once", () => {
    const onRetry = jest.fn()
    mount({ group: "community", variant: "error", error: "failed", onRetry })
    const row = byTestId("search-error-community")
    expect(row.props.accessibilityLiveRegion).toBe("polite")
    const [glyph] = glyphs()
    expect(glyph.props).toMatchObject({
      name: "alert-circle-outline",
      size: 18,
      color: defaultTheme.onSurface.danger,
    })
    const [message, retryLabel] = texts()
    expect(message.props.children).toBe(fr.search.error.community)
    expect(styleOf(message).color).toBe(defaultTheme.colors.textSecondary)
    expect(retryLabel.props.children).toBe("Réessayer")
    expect(styleOf(retryLabel)).toMatchObject({
      fontSize: brandTypography.sectionHeader.fontSize,
      color: defaultTheme.visual.accentText,
    })
    const retry = byTestId("search-retry-community")
    expect(retry.props.accessibilityRole).toBe("button")
    expect(retry.props.accessibilityLabel).toBe("Réessayer la recherche : Communauté")
    expect(styleOf(retry)).toMatchObject({ minHeight: 44, minWidth: 44 })
    act(() => retry.props.onPress())
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test.each(["community", "places", "parcels"] as const)("%s uses its own sentence", (group) => {
    mount({ group, variant: "error", error: "failed", onRetry: jest.fn() })
    expect(texts()[0].props.children).toBe(fr.search.error[group])
    expect(byTestId(`search-retry-${group}`)).toBeTruthy()
  })

  test("a rate limit shows the rate-limit sentence", () => {
    mount({ group: "places", variant: "error", error: "rateLimited", onRetry: jest.fn() })
    expect(texts()[0].props.children).toBe(fr.search.error.rateLimited)
    expect(byTestId("search-retry-places").props.accessibilityLabel).toBe(
      "Réessayer la recherche : Lieux",
    )
  })

  test("without an error kind the group sentence shows", () => {
    mount({ group: "parcels", variant: "error", error: null })
    expect(texts()[0].props.children).toBe(fr.search.error.parcels)
  })
})
