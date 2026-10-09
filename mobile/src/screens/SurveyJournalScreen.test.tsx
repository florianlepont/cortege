import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import type { LocalSurvey } from "../storage/types"
import { FrameLargeTitleContext } from "../ui/frame-large-title"
import { SurveyJournalScreen } from "./SurveyJournalScreen"
import type { SurveyJournalScreenProps } from "./survey-detail/screen-props"
import { PAGE_END_MARGIN } from "./survey-detail/useSubPageContent"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
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
    View: mockComponent("View"),
    ScrollView: mockComponent("ScrollView"),
    RefreshControl: mockComponent("RefreshControl"),
    Text: mockComponent("Text"),
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../ui/PageTitle", () => ({ PageTitle: "PageTitle" }))
jest.mock("../ui/EntranceView", () => ({ EntranceView: "EntranceView" }))
jest.mock("./survey-detail/EventsTab", () => ({ EventsTab: "EventsTab" }))

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

const EVENTS = [{ id: "e1", event_type: "created", created_at: "2026-01-01T10:00:00.000Z" }]

function makeProps(overrides: Partial<SurveyJournalScreenProps> = {}): SurveyJournalScreenProps {
  return {
    selectedSurvey: { id: "survey-1" } as unknown as LocalSurvey,
    surveyEvents: { "survey-1": EVENTS, "survey-2": [] },
    eventsLoadingSurveyId: null,
    onLoadSurveyEvents: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as SurveyJournalScreenProps
}

function build(props: SurveyJournalScreenProps, largeTitle: boolean) {
  return (
    <FrameLargeTitleContext.Provider value={largeTitle}>
      <SurveyJournalScreen {...props} />
    </FrameLargeTitleContext.Provider>
  )
}

function render(
  props: SurveyJournalScreenProps = makeProps(),
  largeTitle = false,
): renderer.ReactTestRenderer {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(build(props, largeTitle))
  })
  return tree
}

/** The ScrollView takes its RefreshControl as a prop, not as a child. */
function refreshControlOf(tree: renderer.ReactTestRenderer) {
  const scroll = tree.root.findByType("ScrollView" as never)
  return scroll.props.refreshControl as React.ReactElement<{
    refreshing: boolean
    tintColor: string
    onRefresh: () => void
  }>
}

describe("SurveyJournalScreen", () => {
  test("shows the title, the subtitle, then the change log without its own header", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    const order = scroll.children.map((child) => (child as { type: unknown }).type)
    expect(order).toEqual(["PageTitle", "Text", "EntranceView"])

    const title = scroll.findByType("PageTitle" as never)
    expect(title.props.children).toBe(fr.navigation.headers.surveyJournal)
    expect(fr.navigation.headers.surveyJournal).toBe("Journal du relevé")

    const subtitle = scroll.findByType("Text" as never)
    expect(subtitle.props.children).toBe("Ce qui s'est passé sur ce relevé.")

    const entrance = scroll.findByType("EntranceView" as never)
    expect(entrance.props.index).toBe(0)
    const events = entrance.findByType("EventsTab" as never)
    expect(events.props.hideHeader).toBe(true)
    expect(events.props.events).toBe(EVENTS)
    expect(events.props.isLoading).toBe(false)
  })

  test("a survey without events gets an empty list; the loading id drives isLoading", () => {
    const props = makeProps({
      selectedSurvey: { id: "survey-3" } as unknown as LocalSurvey,
      eventsLoadingSurveyId: "survey-3",
    })
    const events = render(props).root.findByType("EventsTab" as never)
    expect(events.props.events).toEqual([])
    expect(events.props.isLoading).toBe(true)
  })

  test("the subtitle is a footnote in the secondary text colour", () => {
    const subtitle = render().root.findByType("Text" as never)
    const style = flattenStyle(subtitle.props.style)
    expect(style.fontSize).toBe(13)
    expect(style.lineHeight).toBe(18)
    expect(style.color).toBe(defaultTheme.colors.textSecondary)
  })

  test("loads the events once on mount and not again for the same survey", () => {
    const props = makeProps()
    const tree = render(props)
    expect(props.onLoadSurveyEvents).toHaveBeenCalledTimes(1)
    expect(props.onLoadSurveyEvents).toHaveBeenCalledWith("survey-1")
    act(() => {
      tree.update(build({ ...props, eventsLoadingSurveyId: "survey-1" }, false))
    })
    expect(props.onLoadSurveyEvents).toHaveBeenCalledTimes(1)
  })

  test("pull to refresh loads again; the spinner follows the loading id", () => {
    const props = makeProps({ eventsLoadingSurveyId: "survey-1" })
    const refresh = refreshControlOf(render(props))
    expect(refresh.props.refreshing).toBe(true)
    expect(refresh.props.tintColor).toBe(defaultTheme.colors.forest)
    act(() => {
      refresh.props.onRefresh()
    })
    expect(props.onLoadSurveyEvents).toHaveBeenCalledTimes(2)
    expect(props.onLoadSurveyEvents).toHaveBeenLastCalledWith("survey-1")
  })

  test("the spinner is off when another survey is loading", () => {
    const refresh = refreshControlOf(render(makeProps({ eventsLoadingSurveyId: "survey-9" })))
    expect(refresh.props.refreshing).toBe(false)
  })

  test("the scroll content ends above the floating tab bar, with a margin", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(90 + PAGE_END_MARGIN)
    expect(padding).toBeGreaterThanOrEqual(90)
  })
})

describe("under the native large title (12.2-17)", () => {
  test("iOS insets the page: automatic insets, only the margin under the last item", () => {
    const scroll = render(makeProps(), true).root.findByType("ScrollView" as never)
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("automatic")
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(PAGE_END_MARGIN)
  })

  test("elsewhere the page keeps its own insets", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("never")
  })
})
