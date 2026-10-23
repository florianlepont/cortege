import React from "react"
import renderer, { act, ReactTestInstance } from "react-test-renderer"
import { ROUTE_REASON_CODES } from "@cortege/ibp-domain"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    Modal: mockComponent("Modal"),
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
      style?: unknown
    }) =>
      ReactRef.createElement(
        "Pressable",
        { ...props, style: typeof style === "function" ? style({ pressed: false }) : style },
        typeof children === "function" ? children({ pressed: false }) : children,
      ),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
    AccessibilityInfo: {
      announceForAccessibility: (...args: unknown[]) => mockAnnounce(...args),
    },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/useScreenVisible", () => ({ useScreenVisible: () => true }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/ForestCard", () => ({ ForestCard: "ForestCard" }))
jest.mock("../../ui/AppCard", () => ({ AppCard: "AppCard" }))

const mockAnnounce = jest.fn()

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { formatHectares, routeSheetText } from "../../app/route-text"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { LargeStandOptions } from "./LargeStandOptions"
import { ReasonsInfo } from "./ReasonsInfo"
import { SuggestionCard } from "./SuggestionCard"

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
  setReducedMotion(false)
  mockAnnounce.mockClear()
})

const guide = fr.routeGuide

function textsOf(root: ReactTestInstance): string[] {
  return root
    .findAll((node) => (node.type as unknown) === "Text")
    .flatMap((node) => React.Children.toArray(node.props.children).map(String))
}

function byId(root: ReactTestInstance, id: string): ReactTestInstance[] {
  return root.findAll((node) => node.props.testID === id && typeof node.type === "string")
}

function mount(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return {
    tree,
    texts: () => textsOf(tree.root),
    byId: (id: string) => byId(tree.root, id),
    one: (id: string) => {
      const found = byId(tree.root, id)
      expect(found).toHaveLength(1)
      return found[0]
    },
    rerender: (next: React.ReactElement) => act(() => tree.update(next)),
  }
}

type CardProps = React.ComponentProps<typeof SuggestionCard>

const baseProps: CardProps = {
  method: "full",
  counting: "capped",
  uncappedFactors: [],
  zoneHa: 2.4,
  chosenBy: "guide",
  onChange: jest.fn(),
  onRestore: jest.fn(),
}

const card = (props: Partial<CardProps> = {}) =>
  React.createElement(SuggestionCard, { ...baseProps, ...props })

describe("SuggestionCard: what it shows", () => {
  it("shows the eyebrow, the parcours with its explanation, what the observer does, the mode and the surface", () => {
    const { texts, one } = mount(card())
    expect(one("route-suggestion")).toBeDefined()
    expect(texts()).toEqual(
      expect.arrayContaining([
        guide.suggestion.eyebrowSuggested,
        guide.routes.full.name,
        guide.routes.full.short,
        guide.counting.caption,
        guide.counting.capped.name,
        guide.counting.capped.short,
        guide.suggestion.surfaceLine(formatHectares(2.4)),
        guide.suggestion.change,
      ]),
    )
  })

  it("shows one short line per parcours and mode, the full words stay behind the glyphs", () => {
    const { texts, tree } = mount(card())
    expect(texts()).not.toContain(guide.routes.full.explanation)
    expect(texts()).not.toContain(guide.routes.full.does)
    expect(texts()).not.toContain(guide.counting.capped.explanation)
    const glyphs = tree.root.findAll((node) => node.props.term === "parcoursEnPlein")
    expect(glyphs[0].props.text).toBe(routeSheetText("full"))
  })

  it("puts a glossary glyph after the parcours and after the mode, in the forest ink", () => {
    const { one } = mount(card({ method: "partial_plot", counting: "capped" }))
    const parcours = one("glossary-info-parPlacette")
    const mode = one("glossary-info-relevePlafonne")
    const ink = defaultTheme.visual.forest.titleAccent
    for (const trigger of [parcours, mode]) {
      const glyph = trigger.findAll((node) => (node.type as unknown) === "Ionicons")[0]
      expect(glyph.props.color).toBe(ink)
    }
  })

  it("uses the words of each parcours and of the mode déplafonné", () => {
    const strip = mount(
      card({ method: "partial_strip", counting: "uncapped", uncappedFactors: ["A"] }),
    )
    expect(strip.texts()).toEqual(
      expect.arrayContaining([
        guide.routes.partialStrip.name,
        guide.routes.partialStrip.short,
        guide.counting.uncapped.name,
        guide.counting.uncapped.short,
      ]),
    )
    expect(strip.byId("glossary-info-parBande")).toHaveLength(1)
    expect(strip.byId("glossary-info-releveDeplafonne")).toHaveLength(1)
  })

  it("lists the factors counted in full as chips, only for a relevé déplafonné", () => {
    const capped = mount(card())
    expect(capped.byId("route-counted-factors")).toHaveLength(0)

    const uncapped = mount(card({ counting: "uncapped", uncappedFactors: ["A", "F"] }))
    const chips = uncapped.one("route-counted-factors")
    const labels = chips
      .findAll((node) => node.type === AppChoiceChip)
      .map((node) => node.props.label)
    expect(labels).toEqual([
      fr.surveyDetail.route.factorItem({ letter: "A", title: fr.labels.factorTitles.A }),
      fr.surveyDetail.route.factorItem({ letter: "F", title: fr.labels.factorTitles.F }),
    ])
  })

  it("leaves the surface line out when no surface can be told", () => {
    const { texts } = mount(card({ zoneHa: null }))
    expect(texts().some((text) => text.startsWith(guide.suggestion.surfaceLine("")))).toBe(false)
  })

  it("never mentions a group, a name field or a time-based parcours", () => {
    const { texts } = mount(card({ method: "partial_plot" }))
    const all = texts().join(" ").toLowerCase()
    expect(all).not.toContain("groupe")
  })
})

describe("SuggestionCard: eyebrow, change and restore", () => {
  it("says the parcours is the guide's and offers only 'Changer de parcours'", () => {
    const { texts, byId: find } = mount(card({ chosenBy: "guide" }))
    expect(texts()).toContain(guide.suggestion.eyebrowSuggested)
    expect(find("route-restore")).toHaveLength(0)
    expect(find("route-change")).toHaveLength(1)
  })

  it("says the parcours is the observer's and offers the way back", () => {
    const onRestore = jest.fn()
    const { texts, one } = mount(card({ chosenBy: "observer", onRestore }))
    expect(texts()).toContain(guide.suggestion.eyebrowChosen)
    expect(texts()).not.toContain(guide.suggestion.eyebrowSuggested)
    act(() => one("route-restore").props.onPress())
    expect(onRestore).toHaveBeenCalledTimes(1)
  })

  it("has no way back when there is nothing to go back to", () => {
    const { byId: find } = mount(card({ chosenBy: "observer", onRestore: undefined }))
    expect(find("route-restore")).toHaveLength(0)
  })

  it("calls onChange from the change link, a 44 pt button", () => {
    const onChange = jest.fn()
    const { one } = mount(card({ onChange }))
    const link = one("route-change")
    expect(link.props.accessibilityRole).toBe("button")
    expect(link.props.accessibilityLabel).toBe(guide.suggestion.change)
    const style = ([] as Record<string, unknown>[])
      .concat(link.props.style)
      .flat(2)
      .reduce((acc, item) => ({ ...acc, ...item }), {})
    expect(Number(style.minHeight)).toBeGreaterThanOrEqual(44)
    act(() => link.props.onPress())
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe("SuggestionCard: accessibility", () => {
  it("reads as one element, with the links as their own buttons outside it", () => {
    const { one, tree } = mount(card({ chosenBy: "observer" }))
    const summary = one("route-suggestion-summary")
    expect(summary.props.accessible).toBe(true)
    expect(summary.props.accessibilityLabel).toBe(
      guide.a11y.suggestionCard({
        eyebrow: guide.suggestion.eyebrowChosen,
        route: guide.routes.full.name,
        counting: guide.counting.capped.name,
        hectares: formatHectares(2.4),
      }),
    )
    // The links are not inside the summary: a screen reader reaches them one by one.
    expect(byId(summary, "route-change")).toHaveLength(0)
    expect(byId(summary, "route-restore")).toHaveLength(0)
    expect(byId(tree.root, "route-change")).toHaveLength(1)
  })

  it("keeps what the observer will do in the hint of the summary", () => {
    const { one } = mount(card())
    const hint = one("route-suggestion-summary").props.accessibilityHint as string
    expect(hint).toContain(guide.routes.full.does)
    expect(hint).toContain(guide.counting.capped.explanation)
  })

  it("reads without a surface when none can be told", () => {
    const { one } = mount(card({ zoneHa: null }))
    expect(one("route-suggestion-summary").props.accessibilityLabel).toBe(
      guide.a11y.suggestionCardNoZone({
        eyebrow: guide.suggestion.eyebrowSuggested,
        route: guide.routes.full.name,
        counting: guide.counting.capped.name,
      }),
    )
  })

  it("announces the suggestion once, and again only when it changes", () => {
    const view = mount(card())
    const expected = guide.a11y.suggestionChanged({
      route: guide.routes.full.name,
      counting: guide.counting.capped.name,
    })
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith(expected)

    // The same suggestion again (a new object, same values): nothing more is said.
    view.rerender(card({ uncappedFactors: [] }))
    expect(mockAnnounce).toHaveBeenCalledTimes(1)

    view.rerender(card({ method: "partial_strip", zoneHa: 1 }))
    expect(mockAnnounce).toHaveBeenCalledTimes(2)
    expect(mockAnnounce).toHaveBeenLastCalledWith(
      guide.a11y.suggestionChanged({
        route: guide.routes.partialStrip.name,
        counting: guide.counting.capped.name,
      }),
    )
  })

  it("does not announce the observer's own pick as a suggestion", () => {
    mount(card({ chosenBy: "observer" }))
    expect(mockAnnounce).not.toHaveBeenCalled()
  })
})

describe("SuggestionCard: the forest card's text blocks", () => {
  const layout = (x: number, y: number, width: number, height: number) => ({
    nativeEvent: { layout: { x, y, width, height } },
  })

  it("passes no block until the three text blocks are measured, then the three in the card's space", () => {
    const { one } = mount(card({ chosenBy: "observer" }))
    expect(one("route-suggestion").props.blocks).toBeNull()

    act(() => one("route-suggestion-method").props.onLayout(layout(0, 0, 300, 120)))
    act(() => one("route-suggestion-mode").props.onLayout(layout(0, 140, 300, 90)))
    expect(one("route-suggestion").props.blocks).toBeNull()
    act(() => one("route-suggestion-foot").props.onLayout(layout(0, 250, 200, 70)))

    const blocks = one("route-suggestion").props.blocks as {
      x: number
      y: number
      width: number
      height: number
    }[]
    expect(blocks).toHaveLength(3)
    // The card's padding is added: the blocks sit inside it.
    expect(blocks[0].x).toBeGreaterThan(0)
    expect(blocks[0].y).toBeGreaterThan(0)
    expect(blocks[1].y).toBe(blocks[0].y + 140)
    expect(blocks[2].width).toBe(200)
  })
})

describe("SuggestionCard: entrance", () => {
  it("renders the same content under Reduce Motion", () => {
    setReducedMotion(true)
    const { texts } = mount(card())
    expect(texts()).toContain(guide.routes.full.name)
  })
})

describe("LargeStandOptions", () => {
  const options = (selected: "subdivide" | "partial", onChoose = jest.fn()) =>
    React.createElement(LargeStandOptions, {
      options: ["subdivide", "partial"],
      preselected: "subdivide",
      selected,
      onChoose,
    })

  it("shows exactly two options, subdivide first, tagged 'Conseillé', and no third", () => {
    const { byId: find, one } = mount(options("subdivide"))
    const radios = [find("route-large-option-subdivide"), find("route-large-option-partial")]
    expect(radios[0]).toHaveLength(1)
    expect(radios[1]).toHaveLength(1)
    expect(
      one("route-large-stand").findAll(
        (node) => typeof node.type === "string" && node.props.accessibilityRole === "radio",
      ),
    ).toHaveLength(2)
    expect(one("route-large-option-subdivide").props.accessibilityLabel).toBe(
      guide.a11y.optionLabelTagged({
        label: guide.largeStand.subdivide.title,
        tag: guide.largeStand.recommended,
        caption: guide.largeStand.subdivide.caption,
      }),
    )
    expect(one("route-large-option-partial").props.accessibilityLabel).toBe(
      guide.a11y.optionLabel({
        label: guide.largeStand.partial.title,
        caption: guide.largeStand.partial.caption,
      }),
    )
  })

  it("has the subdivide option selected by default and its notice", () => {
    const { one, texts, byId: find } = mount(options("subdivide"))
    expect(one("route-large-option-subdivide").props.accessibilityState.selected).toBe(true)
    expect(one("route-large-option-partial").props.accessibilityState.selected).toBe(false)
    expect(find("route-subdivide-notice")).toHaveLength(1)
    expect(texts()).toContain(guide.largeStand.subdivideNotice)
  })

  it("shows no notice once the partial parcours is selected, and reports the choice", () => {
    const onChoose = jest.fn()
    const { one, byId: find } = mount(options("partial", onChoose))
    expect(one("route-large-option-partial").props.accessibilityState.selected).toBe(true)
    expect(find("route-subdivide-notice")).toHaveLength(0)
    act(() => one("route-large-option-subdivide").props.onPress())
    expect(onChoose).toHaveBeenCalledWith("subdivide")
  })

  it("is a radio group with the title of the large stand", () => {
    const { one, texts } = mount(options("subdivide"))
    const groups = one("route-large-stand").findAll(
      (node) => typeof node.type === "string" && node.props.accessibilityRole === "radiogroup",
    )
    expect(groups).toHaveLength(1)
    expect(texts()).toContain(guide.largeStand.title)
  })
})

describe("ReasonsInfo", () => {
  it("is one glyph; the sheet lists one sentence per reason code, in the package order", () => {
    const { one, texts } = mount(
      React.createElement(ReasonsInfo, { reasons: ["whole_stand_small", "capped_default"] }),
    )
    expect(one("route-reasons-info").props.accessibilityLabel).toBe(guide.suggestion.reasonsTitle)
    act(() => one("route-reasons-info").props.onPress())
    expect(texts()).toContain(
      [guide.reasons.wholeStandSmall, guide.reasons.cappedDefault].join("\n\n"),
    )
  })

  it("shows at most four reasons", () => {
    const { one, texts } = mount(
      React.createElement(ReasonsInfo, { reasons: [...ROUTE_REASON_CODES] }),
    )
    act(() => one("route-reasons-info").props.onPress())
    const body = texts().find((text) => text.includes("\n\n"))
    expect(body?.split("\n\n")).toHaveLength(4)
  })

  it("draws nothing without a reason", () => {
    const { tree } = mount(React.createElement(ReasonsInfo, { reasons: [] }))
    expect(tree.toJSON()).toBeNull()
  })
})
