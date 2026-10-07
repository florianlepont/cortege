import React from "react"
import renderer, { act } from "react-test-renderer"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage"
import { SurveySearchScreen, type SurveySearchScreenProps } from "./SurveySearchScreen"

const t = fr.surveyList.search

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
  const mockComponent = (name: string) => {
    const Component = ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
    Component.displayName = name
    return Component
  }
  const FlatList = (props: {
    data: unknown[]
    renderItem: (info: { item: unknown; index: number }) => React.ReactNode
    keyExtractor: (item: unknown) => string
    ListHeaderComponent?: React.ReactElement
    ListFooterComponent?: React.ReactElement
  }) =>
    ReactRef.createElement(
      "FlatList",
      null,
      props.ListHeaderComponent,
      props.data.map((item, index) =>
        ReactRef.createElement(
          ReactRef.Fragment,
          { key: props.keyExtractor(item) },
          props.renderItem({ item, index }),
        ),
      ),
      props.ListFooterComponent,
    )
  return {
    FlatList,
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { ios?: unknown }) => options.ios },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useAppBottomTabBarHeight: () => 68 }))
jest.mock("../survey-list/SurveyRow", () => ({
  SurveyRow: (props: { survey: { id: string } }) => {
    const ReactRef = require("react") as typeof import("react")
    return ReactRef.createElement("SurveyRow", props)
  },
}))
jest.mock("../../ui/AppChoiceChip", () => ({
  AppChoiceChip: (props: { label: string }) => {
    const ReactRef = require("react") as typeof import("react")
    return ReactRef.createElement("AppChoiceChip", props)
  },
}))
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))

const mine = (id: string): LocalSurvey =>
  ({ id, site_name: `Site ${id}` }) as unknown as LocalSurvey
const community = (id: string, author: string | null): CommunitySurveyItem => ({
  survey_id: id,
  site_name: `Forêt ${id}`,
  author_name: author,
  submitted_at: "2026-09-28T09:41:00.000Z",
  ibp_total: 34,
})

function makeProps(overrides: Partial<SurveySearchScreenProps> = {}): SurveySearchScreenProps {
  return {
    query: "",
    onQueryChange: jest.fn(),
    scope: "mine",
    onScopeChange: jest.fn(),
    statusFilter: "all",
    onStatusFilterChange: jest.fn(),
    attachmentFilter: "all",
    onAttachmentFilterChange: jest.fn(),
    sortMode: "updated_desc",
    onSortModeChange: jest.fn(),
    surveys: [mine("a"), mine("b")],
    attachmentsBySurvey: {},
    surveyDetails: {},
    selectedSurveyId: null,
    community: { items: [], status: "idle" },
    onOpenSurvey: jest.fn(),
    onOpenCommunitySurvey: jest.fn(),
    onDeleteSurvey: jest.fn(),
    onCancel: jest.fn(),
    onEnsureAttachmentPreviews: jest.fn(),
    ...overrides,
  }
}

function render(props: SurveySearchScreenProps) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<SurveySearchScreen {...props} />)
  })
  return tree
}

const texts = (tree: renderer.ReactTestRenderer): string[] =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => node.props.children as string)
    .filter((child) => typeof child === "string")
const byType = (tree: renderer.ReactTestRenderer, type: string) =>
  tree.root.findAll((node) => (node.type as unknown) === type)
const press = (node: renderer.ReactTestInstance) => act(() => node.props.onPress())

describe("SurveySearchScreen, Mes relevés scope", () => {
  it("lists the surveys with a result count and the community hint, and the chips toggle the filters", () => {
    const props = makeProps({ query: "site" })
    const tree = render(props)
    expect(byType(tree, "SurveyRow").map((row) => row.props.survey.id)).toEqual(["a", "b"])
    expect(texts(tree)).toContain(t.results({ count: 2, query: "site" }))
    expect(texts(tree)).toContain(t.communityHint)

    const chips = byType(tree, "AppChoiceChip")
    expect(chips.map((chip) => chip.props.label)).toEqual([
      t.chips.drafts,
      t.chips.finished,
      t.chips.withPhoto,
      t.sort.updated_desc,
    ])
    press(chips[0])
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith("draft")
    press(chips[1])
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith("submitted")
    press(chips[2])
    expect(props.onAttachmentFilterChange).toHaveBeenLastCalledWith("with")
    press(chips[3])
    expect(props.onSortModeChange).toHaveBeenLastCalledWith("updated_asc")
  })

  it("a pressed active chip clears its filter and the sort cycles back to the first mode", () => {
    const props = makeProps({
      statusFilter: "draft",
      attachmentFilter: "with",
      sortMode: "site_asc",
    })
    const chips = byType(render(props), "AppChoiceChip")
    press(chips[0])
    expect(props.onStatusFilterChange).toHaveBeenLastCalledWith("all")
    press(chips[2])
    expect(props.onAttachmentFilterChange).toHaveBeenLastCalledWith("all")
    press(chips[3])
    expect(props.onSortModeChange).toHaveBeenLastCalledWith("updated_desc")
  })

  it("says when nothing matches", () => {
    expect(texts(render(makeProps({ surveys: [] })))).toContain(t.none)
  })

  it("types, clears and cancels", () => {
    const props = makeProps({ query: "bois" })
    const tree = render(props)
    const [input] = byType(tree, "TextInput")
    act(() => input.props.onChangeText("chêne"))
    expect(props.onQueryChange).toHaveBeenLastCalledWith("chêne")
    const clear = byType(tree, "Pressable").find(
      (node) => node.props.accessibilityLabel === t.clear,
    )
    press(clear!)
    expect(props.onQueryChange).toHaveBeenLastCalledWith("")
    const cancel = byType(tree, "Pressable").find(
      (node) => node.props.accessibilityLabel === t.cancel,
    )
    press(cancel!)
    expect(props.onCancel).toHaveBeenCalled()
  })

  it("has no clear button for an empty field, and switches scope through the tabs", () => {
    const props = makeProps()
    const tree = render(props)
    expect(
      byType(tree, "Pressable").some((node) => node.props.accessibilityLabel === t.clear),
    ).toBe(false)
    const tabs = byType(tree, "Pressable").filter((node) => node.props.accessibilityRole === "tab")
    expect(tabs).toHaveLength(2)
    press(tabs[1])
    expect(props.onScopeChange).toHaveBeenCalledWith("community")
  })
})

describe("SurveySearchScreen, Communauté scope", () => {
  it("lists the finished surveys of the others, hides the filters and shows no own survey", () => {
    const tree = render(
      makeProps({
        scope: "community",
        community: {
          items: [community("x", "Camille"), community("y", null)],
          status: "ready",
        },
      }),
    )
    expect(byType(tree, "SurveyRow")).toHaveLength(0)
    expect(byType(tree, "AppChoiceChip")).toHaveLength(0)
    expect(texts(tree)).toContain(t.results({ count: 2, query: "" }))
    const all = texts(tree).join(" | ")
    expect(all).toContain("Forêt x")
    expect(all).toContain("Camille")
    expect(all).toContain(fr.surveyList.community.unknownAuthor)
  })

  it("opens the page of a community survey when its row is pressed", () => {
    const props = makeProps({
      scope: "community",
      community: { items: [community("x", "Camille")], status: "ready" },
    })
    const tree = render(props)
    const ring = tree.root.findByType("ScoreRing" as never)
    expect(ring.props.score).toBe(34)
    const row = tree.root.findAll((n) => n.props.testID === "community-row-x")[0]
    act(() => row.props.onPress())
    expect(props.onOpenCommunitySurvey).toHaveBeenCalledWith("x")
  })

  it("tells the loading, error and empty states", () => {
    const loading = render(
      makeProps({ scope: "community", community: { items: [], status: "loading" } }),
    )
    expect(texts(loading)).toContain(t.communityLoading)
    const failed = render(
      makeProps({ scope: "community", community: { items: [], status: "error" } }),
    )
    expect(texts(failed)).toContain(t.communityError)
    const empty = render(
      makeProps({ scope: "community", community: { items: [], status: "ready" } }),
    )
    expect(texts(empty)).toContain(t.communityNone)
  })

  it("keeps showing the previous results while the next ones load", () => {
    const tree = render(
      makeProps({
        scope: "community",
        community: { items: [community("x", "Camille")], status: "loading" },
      }),
    )
    expect(texts(tree)).not.toContain(t.communityLoading)
    expect(texts(tree)).toContain(t.results({ count: 1, query: "" }))
  })
})
