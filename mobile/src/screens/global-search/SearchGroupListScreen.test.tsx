import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import type {
  CommunitySurveyItem,
  SearchMemberItem,
  SearchParcelItem,
  SearchPlaceItem,
} from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import {
  SearchGroupListScreen,
  type MineListProps,
  type SearchGroupListScreenProps,
} from "./SearchGroupListScreen"

const t = fr.search
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

// Every collaborator is a host element that keeps its props: the test reads what the screen asked
// for (each one has its own test).
function mockHostFor(name: string) {
  const Component = (props: { children?: React.ReactNode }) =>
    React.createElement(name, props, props.children)
  Component.displayName = name
  return Component
}

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockHost = (name: string) => {
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
    ListEmptyComponent?: React.ReactElement
    [key: string]: unknown
  }) =>
    ReactRef.createElement(
      "FlatList",
      { testID: props.testID, contentContainerStyle: props.contentContainerStyle },
      props.ListHeaderComponent,
      props.data.length === 0
        ? props.ListEmptyComponent
        : props.data.map((item, index) =>
            ReactRef.createElement(
              ReactRef.Fragment,
              { key: props.keyExtractor(item) },
              props.renderItem({ item, index }),
            ),
          ),
    )
  return {
    FlatList,
    View: mockHost("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("../../ui/AppText", () => ({ AppText: mockHostFor("Text") }))
jest.mock("../../ui/PageTitle", () => ({ PageTitle: mockHostFor("PageTitle") }))
jest.mock("../../ui/Skeleton", () => ({ SkeletonRow: mockHostFor("SkeletonRow") }))
jest.mock("../../ui/AppButton", () => ({ AppButton: mockHostFor("AppButton") }))
jest.mock("../../ui/ListEntranceRow", () => ({ ListEntranceRow: mockHostFor("ListEntranceRow") }))
jest.mock("../../ui/useListEntrance", () => ({ useListEntrance: () => () => true }))
jest.mock("../../ui/frame-large-title", () => ({
  useFrameInsetBehavior: () => "never",
  useFrameLargeTitle: () => mockLargeTitle,
}))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 68 }))
jest.mock("../survey-list/SurveyRow", () => ({ SurveyRow: mockHostFor("SurveyRow") }))
jest.mock("../community-survey/CommunityRow", () => ({ CommunityRow: mockHostFor("CommunityRow") }))
jest.mock("./SearchResultRow", () => ({ SearchResultRow: mockHostFor("SearchResultRow") }))
jest.mock("./OwnSurveyChips", () => ({ OwnSurveyChips: mockHostFor("OwnSurveyChips") }))

let mockLargeTitle = false

let tree: ReactTestRenderer

const survey = (id: string): LocalSurvey =>
  ({ id, site_name: `Site ${id}`, status: "draft" }) as unknown as LocalSurvey
const communitySurvey = (id: string): CommunitySurveyItem => ({
  survey_id: id,
  site_name: `Forêt ${id}`,
  author_name: "Marie Dupont",
  submitted_at: "2026-09-28T09:41:00.000Z",
  ibp_total: 34,
})
const member: SearchMemberItem = { author_name: "Marie Dupont", survey_count: 3 }
const place: SearchPlaceItem = {
  id: "p1",
  name: "Fontainebleau",
  kind: "municipality",
  context: "Seine-et-Marne (77)",
  lat: 48.4,
  lng: 2.7,
  score: 0.97,
}
const parcel: SearchParcelItem = {
  parcel_id: "77186000AB0123",
  commune_code: "77186",
  commune_name: "Fontainebleau",
  section: "AB",
  number: "0123",
  centroid: { lat: 48.4, lng: 2.7 },
  bbox: null,
  survey_count: 1,
}

function mineProps(overrides: Partial<MineListProps> = {}): MineListProps {
  return {
    surveys: [survey("a"), survey("b")],
    matchCount: 2,
    surveyDetails: {},
    selectedSurveyId: "a",
    statusFilter: "all",
    attachmentFilter: "all",
    sortMode: "updated_desc",
    onStatusFilterChange: jest.fn(),
    onAttachmentFilterChange: jest.fn(),
    onSortModeChange: jest.fn(),
    onDeleteSurvey: jest.fn(),
    ...overrides,
  }
}

function makeProps(
  overrides: Partial<SearchGroupListScreenProps> = {},
): SearchGroupListScreenProps {
  return {
    group: "mine",
    query: "foret",
    count: 2,
    status: "ready",
    mine: mineProps(),
    onOpenOwn: jest.fn(),
    onOpenCommunity: jest.fn(),
    onOpenMember: jest.fn(),
    onOpenPlace: jest.fn(),
    onOpenParcel: jest.fn(),
    ...overrides,
  }
}

function mount(overrides: Partial<SearchGroupListScreenProps> = {}) {
  const props = makeProps(overrides)
  act(() => {
    tree = renderer.create(<SearchGroupListScreen {...props} />)
  })
  return props
}

const all = (type: string) => tree.root.findAll((node) => String(node.type) === type)
const byTestId = (id: string) => tree.root.findAll((node) => node.props.testID === id)[0]
const texts = (): string[] =>
  all("Text").map((node) => {
    const child = node.props.children
    return Array.isArray(child) ? child.join("") : String(child)
  })

beforeEach(() => {
  mockLargeTitle = false
})

afterEach(() => {
  act(() => tree?.unmount())
})

describe("SearchGroupListScreen header", () => {
  test("draws the title with the group and the count, and the caption for the query", () => {
    mount({ group: "community", query: "forêt", count: 6, community: { members: [], surveys: [] } })
    expect(all("PageTitle")[0].props.children).toBe(
      t.list.title({ group: t.groups.community, count: 6 }),
    )
    expect(texts()).toContain(t.list.caption("forêt"))
  })

  test("the title is the group name until the count is known", () => {
    mount({ group: "places", mine: undefined, status: "loading", count: null })
    expect(all("PageTitle")[0].props.children).toBe(t.groups.places)
  })

  test("a member list captions the member's name instead of the query", () => {
    mount({
      group: "community",
      query: "Marie Dupont",
      memberName: "Marie Dupont",
      count: 1,
      community: { members: [member], surveys: [communitySurvey("c1")] },
    })
    expect(texts()).toContain(t.list.memberCaption("Marie Dupont"))
    expect(texts()).not.toContain(t.list.caption("Marie Dupont"))
  })

  test("only Mes relevés draws the chips, wired to the filters", () => {
    const props = mount()
    const chips = all("OwnSurveyChips")[0]
    expect(chips.props.statusFilter).toBe("all")
    expect(chips.props.sortMode).toBe("updated_desc")
    expect(chips.props.onStatusFilterChange).toBe(props.mine?.onStatusFilterChange)
    expect(chips.props.onAttachmentFilterChange).toBe(props.mine?.onAttachmentFilterChange)
    expect(chips.props.onSortModeChange).toBe(props.mine?.onSortModeChange)
    act(() => tree.unmount())

    mount({ group: "places", places: [place], mine: undefined })
    expect(all("OwnSurveyChips")).toHaveLength(0)
  })
})

describe("SearchGroupListScreen rows", () => {
  test("Mes relevés: survey rows with the score, the selection and the swipe delete", () => {
    const props = mount()
    const rows = all("SurveyRow")
    expect(rows.map((row) => row.props.survey.id)).toEqual(["a", "b"])
    expect(rows[0].props.selected).toBe(true)
    expect(rows[1].props.selected).toBe(false)
    expect(rows[0].props.index).toBe(0)
    expect(rows[0].props.onOpen).toBe(props.onOpenOwn)
    expect(rows[0].props.onDelete).toBe(props.mine?.onDeleteSurvey)
  })

  test("every row sits in a ListEntranceRow with its index", () => {
    mount()
    expect(all("ListEntranceRow").map((row) => row.props.index)).toEqual([0, 1])
  })

  test("Communauté: member rows first, then community survey rows", () => {
    const props = mount({
      group: "community",
      mine: undefined,
      count: 3,
      community: { members: [member], surveys: [communitySurvey("c1"), communitySurvey("c2")] },
    })
    const order = tree.root
      .findAll((node) => ["SearchResultRow", "CommunityRow"].includes(String(node.type)))
      .map((node) => String(node.type))
    expect(order).toEqual(["SearchResultRow", "CommunityRow", "CommunityRow"])

    const memberRow = all("SearchResultRow")[0]
    expect(memberRow.props.kind).toBe("member")
    expect(memberRow.props.density).toBe("regular")
    expect(memberRow.props.title).toBe("Marie Dupont")
    expect(memberRow.props.meta).toBe(t.rows.memberMeta({ count: 3 }))
    act(() => memberRow.props.onPress())
    expect(props.onOpenMember).toHaveBeenCalledWith("Marie Dupont")

    const communityRow = all("CommunityRow")[1]
    expect(communityRow.props.item.survey_id).toBe("c2")
    expect(communityRow.props.onOpen).toBe(props.onOpenCommunity)
  })

  test("a member's list holds the community surveys only", () => {
    mount({
      group: "community",
      mine: undefined,
      memberName: "Marie Dupont",
      query: "Marie Dupont",
      count: 1,
      community: { members: [member], surveys: [communitySurvey("c1")] },
    })
    expect(all("SearchResultRow")).toHaveLength(0)
    expect(all("CommunityRow")).toHaveLength(1)
  })

  test("Lieux: regular place rows that open the place", () => {
    const props = mount({ group: "places", mine: undefined, count: 1, places: [place] })
    const row = all("SearchResultRow")[0]
    expect(row.props).toMatchObject({
      kind: "place",
      density: "regular",
      title: "Fontainebleau",
      meta: t.rows.placeMeta({
        kind: t.rows.placeKind.municipality,
        context: "Seine-et-Marne (77)",
      }),
    })
    act(() => row.props.onPress())
    expect(props.onOpenPlace).toHaveBeenCalledWith(place)
  })

  test("Parcelles: regular parcel rows that open the parcel", () => {
    const props = mount({ group: "parcels", mine: undefined, count: 1, parcels: [parcel] })
    const row = all("SearchResultRow")[0]
    expect(row.props).toMatchObject({
      kind: "parcel",
      density: "regular",
      title: t.rows.parcelTitle({ section: "AB", number: "0123" }),
    })
    act(() => row.props.onPress())
    expect(props.onOpenParcel).toHaveBeenCalledWith(parcel)
  })

  test("the list leaves the tab bar clear, plus 24, and 24 only under the native large title", () => {
    mount()
    const padding = (byTestId("search-group-list").props.contentContainerStyle as unknown[])[1]
    expect(padding).toEqual({ paddingBottom: 68 + 24 })
    act(() => tree.unmount())

    mockLargeTitle = true
    mount()
    const native = (byTestId("search-group-list").props.contentContainerStyle as unknown[])[1]
    expect(native).toEqual({ paddingBottom: 24 })
  })
})

describe("SearchGroupListScreen states", () => {
  test("loading with no rows shows three skeleton rows", () => {
    mount({ group: "community", mine: undefined, status: "loading", community: null, count: 0 })
    expect(all("SkeletonRow")).toHaveLength(3)
    expect(byTestId("search-list-loading").props.accessibilityLabel).toBe(t.field.busy)
    expect(all("SurveyRow")).toHaveLength(0)
  })

  test("waiting for the typing pause also shows the skeleton rows", () => {
    mount({ group: "places", mine: undefined, status: "waiting", count: 0 })
    expect(all("SkeletonRow")).toHaveLength(3)
  })

  test("loading again keeps the rows that are already there", () => {
    mount({ group: "places", mine: undefined, status: "loading", places: [place], count: 1 })
    expect(all("SkeletonRow")).toHaveLength(0)
    expect(all("SearchResultRow")).toHaveLength(1)
  })

  test("offline shows the group's connection sentence", () => {
    mount({ group: "parcels", mine: undefined, status: "offline", count: 0 })
    expect(texts()).toContain(t.offline.parcels)
    expect(all("AppButton")).toHaveLength(0)
  })

  test("error shows the group's sentence and a Réessayer button", () => {
    const onRetry = jest.fn()
    mount({ group: "places", mine: undefined, status: "error", error: "failed", onRetry, count: 0 })
    expect(texts()).toContain(t.error.places)
    const button = all("AppButton")[0]
    expect(button.props.label).toBe(t.error.retry)
    expect(button.props.variant).toBe("secondary")
    act(() => button.props.onPress())
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test("a rate limit has its own sentence", () => {
    mount({
      group: "community",
      mine: undefined,
      status: "error",
      error: "rateLimited",
      count: 0,
    })
    expect(texts()).toContain(t.error.rateLimited)
  })

  test("retry does nothing harmful when the route gave no handler", () => {
    mount({ group: "places", mine: undefined, status: "error", error: "failed", count: 0 })
    expect(() => act(() => all("AppButton")[0].props.onPress())).not.toThrow()
  })

  test("empty shows 'Aucun résultat pour' the query", () => {
    mount({ group: "places", query: "zzz", mine: undefined, count: 0, places: [] })
    expect(texts()).toContain(t.noResult.title("zzz"))
  })

  test("an empty member list names the member", () => {
    mount({
      group: "community",
      mine: undefined,
      query: "Marie Dupont",
      memberName: "Marie Dupont",
      count: 0,
      community: { members: [], surveys: [] },
    })
    expect(texts()).toContain(t.noResult.title("Marie Dupont"))
  })

  test("Mes relevés with matches that the chips filter out says no survey matches", () => {
    mount({ count: 0, mine: mineProps({ surveys: [], matchCount: 2, statusFilter: "submitted" }) })
    expect(texts()).toContain(fr.surveyList.search.none)
    expect(all("OwnSurveyChips")).toHaveLength(1)
  })

  test("Mes relevés with no match at all says no result", () => {
    mount({ count: 0, mine: mineProps({ surveys: [], matchCount: 0 }) })
    expect(texts()).toContain(t.noResult.title("foret"))
  })

  test("Mes relevés without its data draws an empty list", () => {
    mount({ count: 0, mine: undefined })
    expect(texts()).toContain(t.noResult.title("foret"))
  })

  test("an offline or failed 'Mes relevés' is treated as an empty list (the group never needs a network)", () => {
    mount({ status: "offline", count: 0, mine: mineProps({ surveys: [], matchCount: 0 }) })
    expect(texts()).toContain(t.noResult.title("foret"))
    act(() => tree.unmount())
    mount({ status: "error", count: 0, mine: mineProps({ surveys: [], matchCount: 0 }) })
    expect(texts()).toContain(t.noResult.title("foret"))
  })
})
