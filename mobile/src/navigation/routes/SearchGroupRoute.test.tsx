import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import type { SearchParcelItem, SearchPlaceItem } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { SearchGroupRoute } from "./SearchGroupRoute"

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

const mockNavigation = {
  navigate: jest.fn(),
  push: jest.fn(),
  setOptions: jest.fn(),
}
jest.mock("@react-navigation/native", () => ({ useNavigation: () => mockNavigation }))

const mockSelection = jest.fn()
jest.mock("../../ui/feedback", () => ({ feedback: { selection: () => mockSelection() } }))

let frameProps: Record<string, unknown> = {}
jest.mock("../../ui/ScreenFrame", () => ({
  ScreenFrame: (props: { children: React.ReactNode }) => {
    frameProps = props
    return props.children
  },
}))
let mockLargeTitle = false
jest.mock("../large-title", () => ({ usesNativeLargeTitle: () => mockLargeTitle }))

const mockSaveRecent = jest.fn(async (_query: string) => [] as string[])
jest.mock("../../storage/search-recents", () => ({
  saveSearchRecent: (query: string) => mockSaveRecent(query),
}))

const mockSearchCommunity = jest.fn(async (..._args: unknown[]) => ({ members: [], surveys: [] }))
const mockSearchPlaces = jest.fn(async (..._args: unknown[]) => ({ items: [] }))
const mockSearchParcels = jest.fn(async (..._args: unknown[]) => ({ items: [] }))
jest.mock("../../api/ibp-api", () => ({
  searchCommunity: (...args: unknown[]) => mockSearchCommunity(...args),
  searchPlaces: (...args: unknown[]) => mockSearchPlaces(...args),
  searchParcels: (...args: unknown[]) => mockSearchParcels(...args),
}))

let mockOffline = false
jest.mock("../../hooks/useIsOffline", () => ({ useIsOffline: () => mockOffline }))

type GroupParams = {
  query: string
  enabled: boolean
  offline: boolean
  immediate?: boolean
  fetcher: (query: string) => Promise<unknown>
}
const mockRetry = jest.fn()
let mockGroupState: { data: unknown; status: string; error: string | null } = {
  data: null,
  status: "ready",
  error: null,
}
const mockUseSearchGroup = jest.fn((_params: GroupParams) => ({
  ...mockGroupState,
  retry: mockRetry,
}))
jest.mock("../../hooks/useSearchGroup", () => ({
  useSearchGroup: (params: GroupParams) => mockUseSearchGroup(params),
}))

const survey = (id: string, name: string) => ({ id, site_name: name })
const mockSurveys = {
  state: {
    surveys: [survey("a", "Forêt A"), survey("b", "Forêt B"), survey("c", "Prairie")],
    visibleSurveys: [survey("a", "Forêt A"), survey("c", "Prairie")],
    surveyDetails: { a: { id: "a" } },
    selectedSurveyId: "a",
    statusFilter: "draft",
    attachmentFilter: "all",
    sortMode: "site_asc",
  },
  actions: {
    openSurvey: jest.fn(),
    resetFilters: jest.fn(),
    setStatusFilter: jest.fn(),
    setAttachmentFilter: jest.fn(),
    setSortMode: jest.fn(),
    confirmDeleteSurvey: jest.fn(),
  },
}
jest.mock("../../state/surveys-context", () => ({ useSurveys: () => mockSurveys }))
let mockToken: string | null = "token-1"
jest.mock("../../state/session-context", () => ({
  useSession: () => ({ state: { apiUrl: "https://api.test/v1" } }),
  useAccessToken: () => mockToken,
}))

type ScreenProps = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
let screenProps: ScreenProps = {}
jest.mock("../../screens/global-search/SearchGroupListScreen", () => ({
  SearchGroupListScreen: (props: ScreenProps) => {
    screenProps = props
    return null
  },
}))

type Params = {
  group: "mine" | "community" | "places" | "parcels"
  query: string
  memberName?: string
}

let tree: ReactTestRenderer

function mount(params: Params) {
  act(() => {
    tree = renderer.create(<SearchGroupRoute route={{ params }} />)
  })
}

const lastGroupParams = (): GroupParams =>
  mockUseSearchGroup.mock.calls[mockUseSearchGroup.mock.calls.length - 1][0]

const place: SearchPlaceItem = {
  id: "p1",
  name: "Fontainebleau",
  kind: "municipality",
  context: null,
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

beforeEach(() => {
  jest.clearAllMocks()
  mockOffline = false
  mockToken = "token-1"
  mockLargeTitle = false
  mockGroupState = { data: null, status: "ready", error: null }
  frameProps = {}
})

afterEach(() => {
  act(() => tree?.unmount())
})

describe("SearchGroupRoute: Mes relevés", () => {
  test("lists the matches among the chip-filtered surveys, never asking the API", () => {
    mount({ group: "mine", query: "foret" })
    expect(lastGroupParams().enabled).toBe(false)
    expect(screenProps.group).toBe("mine")
    expect(screenProps.mine.surveys.map((s: { id: string }) => s.id)).toEqual(["a"])
    expect(screenProps.count).toBe(1)
    expect(screenProps.status).toBe("ready")
    expect(mockSearchCommunity).not.toHaveBeenCalled()
  })

  test("tells matches from filtered-out matches, and passes the chip state and handlers", () => {
    mount({ group: "mine", query: "foret" })
    expect(screenProps.mine.matchCount).toBe(2)
    expect(screenProps.mine).toMatchObject({
      statusFilter: "draft",
      attachmentFilter: "all",
      sortMode: "site_asc",
      selectedSurveyId: "a",
      surveyDetails: mockSurveys.state.surveyDetails,
      onStatusFilterChange: mockSurveys.actions.setStatusFilter,
      onAttachmentFilterChange: mockSurveys.actions.setAttachmentFilter,
      onSortModeChange: mockSurveys.actions.setSortMode,
      onDeleteSurvey: mockSurveys.actions.confirmDeleteSurvey,
    })
  })

  test("names the page with the group and the count", () => {
    mount({ group: "mine", query: "foret" })
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({
      title: t.list.title({ group: t.groups.mine, count: 1 }),
    })
  })

  test("resets the chips when the page closes", () => {
    mount({ group: "mine", query: "foret" })
    expect(mockSurveys.actions.resetFilters).not.toHaveBeenCalled()
    act(() => tree.unmount())
    expect(mockSurveys.actions.resetFilters).toHaveBeenCalledTimes(1)
  })

  test("opening an own survey selects it and goes to its page, without a second haptic", () => {
    mount({ group: "mine", query: "foret" })
    act(() => screenProps.onOpenOwn("a"))
    expect(mockSurveys.actions.openSurvey).toHaveBeenCalledWith("a")
    expect(mockNavigation.navigate).toHaveBeenCalledWith("surveys", {
      screen: "surveyDetail",
      initial: false,
    })
    expect(mockSaveRecent).toHaveBeenCalledWith("foret")
    expect(mockSelection).not.toHaveBeenCalled()
  })
})

describe("SearchGroupRoute: network groups", () => {
  test("Communauté fetches the surveys and members of the query, up to 50", async () => {
    mount({ group: "community", query: "  Forêt   noire " })
    expect(lastGroupParams()).toMatchObject({
      query: "Forêt noire",
      enabled: true,
      offline: false,
      immediate: true,
    })
    await lastGroupParams().fetcher("Forêt noire")
    expect(mockSearchCommunity).toHaveBeenCalledWith("https://api.test/v1", "token-1", {
      q: "Forêt noire",
      limit: 50,
    })
  })

  test("a member's list asks for that author's surveys only and counts them alone", async () => {
    mockGroupState = {
      data: {
        members: [{ author_name: "Marie Dupont", survey_count: 2 }],
        surveys: [{ survey_id: "c1" }, { survey_id: "c2" }],
      },
      status: "ready",
      error: null,
    }
    mount({ group: "community", query: "Marie Dupont", memberName: "Marie Dupont" })
    await lastGroupParams().fetcher("Marie Dupont")
    expect(mockSearchCommunity).toHaveBeenCalledWith("https://api.test/v1", "token-1", {
      q: "Marie Dupont",
      author: "Marie Dupont",
      limit: 50,
    })
    expect(screenProps.memberName).toBe("Marie Dupont")
    expect(screenProps.count).toBe(2)
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({
      title: t.list.title({ group: t.groups.community, count: 2 }),
    })
  })

  test("without a member the count holds members and surveys", () => {
    mockGroupState = {
      data: {
        members: [{ author_name: "Marie Dupont", survey_count: 2 }],
        surveys: [{ survey_id: "c1" }],
      },
      status: "ready",
      error: null,
    }
    mount({ group: "community", query: "Marie" })
    expect(screenProps.count).toBe(2)
    expect(screenProps.community).toBe(mockGroupState.data)
    expect(screenProps.memberName).toBeUndefined()
  })

  test("a blank member name is no member", () => {
    mount({ group: "community", query: "Marie", memberName: "   " })
    expect(screenProps.memberName).toBeUndefined()
  })

  test("Lieux fetches up to 10 places, and nothing under three characters", async () => {
    mount({ group: "places", query: "Fontainebleau" })
    await lastGroupParams().fetcher("Fontainebleau")
    expect(mockSearchPlaces).toHaveBeenCalledWith("https://api.test/v1", "token-1", {
      q: "Fontainebleau",
      limit: 10,
    })
    mockSearchPlaces.mockClear()
    await expect(lastGroupParams().fetcher("Fo")).resolves.toEqual({ items: [] })
    expect(mockSearchPlaces).not.toHaveBeenCalled()
  })

  test("Lieux and Parcelles hand their items to the screen and count them", () => {
    mockGroupState = { data: { items: [place, place] }, status: "ready", error: null }
    mount({ group: "places", query: "Fontainebleau" })
    expect(screenProps.places).toEqual([place, place])
    expect(screenProps.count).toBe(2)
    act(() => tree.unmount())

    mockGroupState = { data: { items: [parcel] }, status: "ready", error: null }
    mount({ group: "parcels", query: "77186 AB 123" })
    expect(screenProps.parcels).toEqual([parcel])
    expect(screenProps.count).toBe(1)
  })

  test("Parcelles fetches the parcels of the query", async () => {
    mount({ group: "parcels", query: "77186 AB 123" })
    await lastGroupParams().fetcher("77186 AB 123")
    expect(mockSearchParcels).toHaveBeenCalledWith("https://api.test/v1", "token-1", {
      q: "77186 AB 123",
    })
  })

  test("the status, the error and the retry reach the screen; the title is the group name until the count is known", () => {
    mockGroupState = { data: null, status: "error", error: "rateLimited" }
    mount({ group: "places", query: "Fontainebleau" })
    expect(screenProps.status).toBe("error")
    expect(screenProps.error).toBe("rateLimited")
    expect(screenProps.count).toBeNull()
    act(() => screenProps.onRetry())
    expect(mockRetry).toHaveBeenCalledTimes(1)
    expect(mockNavigation.setOptions).toHaveBeenLastCalledWith({ title: t.groups.places })
  })

  test("offline is passed to the group", () => {
    mockOffline = true
    mount({ group: "community", query: "Marie" })
    expect(lastGroupParams().offline).toBe(true)
  })

  test("nothing is requested without a token or for text under two characters", () => {
    mockToken = null
    mount({ group: "community", query: "Marie" })
    expect(lastGroupParams().enabled).toBe(false)
    act(() => tree.unmount())

    mockToken = "token-1"
    mount({ group: "community", query: "M" })
    expect(lastGroupParams().enabled).toBe(false)
  })

  test("a missing token sends an empty one that the disabled group never uses", async () => {
    mockToken = null
    mount({ group: "community", query: "Marie" })
    await lastGroupParams().fetcher("Marie")
    expect(mockSearchCommunity).toHaveBeenCalledWith("https://api.test/v1", "", {
      q: "Marie",
      limit: 50,
    })
  })

  test("closing a network list leaves the surveys' chips alone", () => {
    mount({ group: "places", query: "Fontainebleau" })
    act(() => tree.unmount())
    expect(mockSurveys.actions.resetFilters).not.toHaveBeenCalled()
  })
})

describe("SearchGroupRoute: opening a result", () => {
  beforeEach(() => mount({ group: "community", query: "Marie" }))

  test("a community survey opens its read-only page", () => {
    act(() => screenProps.onOpenCommunity("c1"))
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(mockSaveRecent).toHaveBeenCalledWith("Marie")
    expect(mockNavigation.navigate).toHaveBeenCalledWith("surveys", {
      screen: "communitySurvey",
      params: { surveyId: "c1" },
      initial: false,
    })
  })

  test("a member pushes the community list filtered on that author", () => {
    act(() => screenProps.onOpenMember("Marie Dupont"))
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(mockNavigation.push).toHaveBeenCalledWith("searchGroup", {
      group: "community",
      query: "Marie Dupont",
      memberName: "Marie Dupont",
    })
  })

  test("a place opens Explorer centred on it", () => {
    act(() => screenProps.onOpenPlace(place))
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(mockNavigation.navigate).toHaveBeenCalledWith("publicMap", {
      screen: "publicMapHome",
      params: {
        focus: expect.objectContaining({
          kind: "place",
          lat: 48.4,
          lng: 2.7,
          nonce: expect.any(Number),
        }),
      },
    })
  })

  test("a parcel opens Explorer on that parcel", () => {
    act(() => screenProps.onOpenParcel(parcel))
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(mockNavigation.navigate).toHaveBeenCalledWith("publicMap", {
      screen: "publicMapHome",
      params: {
        focus: expect.objectContaining({ kind: "parcel", parcelId: "77186000AB0123" }),
      },
    })
  })
})

describe("SearchGroupRoute: frame", () => {
  test("the frame uses the native large title where the tab tree has it", () => {
    mockLargeTitle = true
    mount({ group: "mine", query: "foret" })
    expect(frameProps.largeTitle).toBe(true)
  })

  test("the frame has no large title elsewhere", () => {
    mount({ group: "mine", query: "foret" })
    expect(frameProps.largeTitle).toBe(false)
  })
})
