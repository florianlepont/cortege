import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { PublicMapItem } from "../../app/types"

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
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))
jest.mock("../../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))
jest.mock("../../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
// The theme the card reads, switchable per test (light by default).
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("automatic", "dark", () => {}),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandInteraction, brandRadius } from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SelectedSurveyCard } from "./SelectedSurveyCard"
import { SHEET_CLOSE_HIT_SLOP, SHEET_CLOSE_ICON_SIZE } from "./SheetCloseButton"
import { SELECTED_OUTLINE_WIDTH } from "./styles"
import { SURVEY_ROW_RING_COLUMN } from "../survey-list/row-styles"

const t = fr.publicMap
const darkTheme = buildTheme("automatic", "dark", () => {})

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

afterEach(() => {
  mockScheme.current = "light"
})

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function makeItem(overrides: Partial<PublicMapItem> = {}): PublicMapItem {
  return {
    survey_id: "s-9",
    display_location: { lat: 45.76, lng: 4.84 },
    survey_date: "2026-05-01",
    region_code: "ARA",
    ibp_total: 31,
    ...overrides,
  }
}

function render(
  props: Partial<React.ComponentProps<typeof SelectedSurveyCard>> = {},
): ReactTestRenderer {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <SelectedSurveyCard
        item={makeItem()}
        isOwnSurvey={false}
        onOpenSurvey={jest.fn()}
        onClose={jest.fn()}
        {...props}
      />,
    )
  })
  return tree
}

const summaryOf = (tree: ReactTestRenderer) =>
  tree.root.find(
    (node) => (node.type as unknown) === "View" && node.props.testID === "selected-survey-summary",
  )

const texts = (tree: ReactTestRenderer): string[] =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat().join(""))

describe("SelectedSurveyCard (Explorer, 12.2-18)", () => {
  test("shows a score ring with the survey's total, first-row stagger and a stable key", () => {
    const ring = render().root.findByType("ScoreRing" as never)
    expect(ring.props.score).toBe(31)
    expect(ring.props.index).toBe(0)
    expect(ring.props.animationKey).toBe("s-9:31")
  })

  test("the ring is on the trailing side of the summary, centred in the ring column", () => {
    const tree = render()
    const summary = summaryOf(tree)
    const style = flat(summary.props.style)
    expect(style.flexDirection).toBe("row")
    expect(style.alignItems).toBe("center")
    const children = summary.children as ReactTestRenderer["root"][]
    const last = children[children.length - 1]
    expect(last.findByType("ScoreRing" as never)).toBeTruthy()
    const column = flat(last.props.style)
    expect(column.width).toBe(SURVEY_ROW_RING_COLUMN)
    expect(column.flexShrink).toBe(0)
    expect(column.justifyContent).toBe("center")
    expect(children[0].findAllByType("ScoreRing" as never)).toHaveLength(0)
  })

  test("the summary has a 2 pt accent outline in light and dark, circular corners, no gradient", () => {
    const light = flat(summaryOf(render()).props.style)
    expect(SELECTED_OUTLINE_WIDTH).toBe(2)
    expect(light.borderWidth).toBe(2)
    expect(light.borderColor).toBe(defaultTheme.visual.accentText)
    expect(light.borderRadius).toBe(brandRadius.card)
    expect(light.backgroundColor).toBe(defaultTheme.visual.glass.cardFill)
    expect(light.borderCurve).toBeUndefined()
    expect(light.experimental_backgroundImage).toBeUndefined()
    expect(light.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    mockScheme.current = "dark"
    const dark = flat(summaryOf(render()).props.style)
    expect(dark.borderColor).toBe(darkTheme.visual.accentText)
  })

  test("keeps the title, the place and date and the method, in that order of the header", () => {
    const tree = render({ item: makeItem({ ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 3 }) })
    const shown = texts(tree)
    expect(shown[0]).toBe(t.selected.title(31))
    expect(shown).toContain(t.selected.meta({ region: "Cas 3", date: "2026-05-01" }))
    expect(shown).toContain("IBP v3.2")
  })

  test("the open action is the small glass call to action and opens the survey", () => {
    const onOpenSurvey = jest.fn()
    const tree = render({ onOpenSurvey })
    const button = tree.root.findByType("GlassButton" as never)
    expect(button.props.label).toBe(t.selected.openSurvey)
    expect(button.props.size).toBe("sm")
    expect(button.props.testID).toBe("selected-survey-open")
    act(() => button.props.onPress())
    expect(onOpenSurvey).toHaveBeenCalledWith("s-9")
    expect(tree.root.findAllByType("AppNotice" as never)).toHaveLength(0)
  })

  test("a draft reads as a draft, opens with its own label and shows no own-survey notice", () => {
    const tree = render({ isDraft: true, isOwnSurvey: true })
    const shown = texts(tree)
    expect(shown).toContain(t.draft.title(31))
    expect(shown).toContain(t.draft.meta)
    expect(tree.root.findByType("GlassButton" as never).props.label).toBe(t.draft.open)
    expect(tree.root.findAllByType("AppNotice" as never)).toHaveLength(0)
  })

  test("an own finished survey shows the notice", () => {
    const tree = render({ isOwnSurvey: true })
    expect(tree.root.findByType("AppNotice" as never).props.message).toBe(t.selected.ownSurvey)
  })

  test("the close button has a 44 pt target, a neutral readable glyph, and closes", () => {
    const onClose = jest.fn()
    const tree = render({ onClose })
    const close = tree.root.find(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        node.props.accessibilityLabel === t.a11y.closeSelection,
    )
    expect(close.props.accessibilityRole).toBe("button")
    expect(SHEET_CLOSE_ICON_SIZE + 2 * close.props.hitSlop).toBe(brandInteraction.hitTarget.min)
    expect(close.props.hitSlop).toBe(SHEET_CLOSE_HIT_SLOP)
    expect(close.findByType("Ionicons" as never).props.color).toBe(
      defaultTheme.colors.textSecondary,
    )
    act(() => close.props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
