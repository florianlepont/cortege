import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import type { SearchParcelItem, SearchPlaceItem } from "@cortege/ibp-domain"
import { SearchHomeRoute } from "./SearchHomeRoute"

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

const mockDismiss = jest.fn()
jest.mock("react-native", () => ({ Keyboard: { dismiss: () => mockDismiss() } }))

type Listener = () => void
const mockListeners: Record<string, Listener> = {}
const mockParentListeners: Record<string, Listener> = {}
const mockUnsubscribe = jest.fn()
const mockParentUnsubscribe = jest.fn()
const mockNavigation = {
  navigate: jest.fn(),
  isFocused: jest.fn(() => true),
  addListener: jest.fn((event: string, listener: Listener) => {
    mockListeners[event] = listener
    return mockUnsubscribe
  }),
  getParent: jest.fn(() => ({
    addListener: jest.fn((event: string, listener: Listener) => {
      mockParentListeners[event] = listener
      return mockParentUnsubscribe
    }),
  })),
}
jest.mock("@react-navigation/native", () => ({ useNavigation: () => mockNavigation }))

const mockSelection = jest.fn()
jest.mock("../../ui/feedback", () => ({ feedback: { selection: () => mockSelection() } }))
jest.mock("../../ui/ScreenFrame", () => ({
  ScreenFrame: ({ children }: { children: React.ReactNode }) => children,
}))

const mockSurveys = {
  state: { surveys: [{ id: "s-1" }], surveyDetails: { "s-1": { id: "s-1" } } },
  actions: { openSurvey: jest.fn() },
}
jest.mock("../../state/surveys-context", () => ({ useSurveys: () => mockSurveys }))
jest.mock("../../state/session-context", () => ({
  useSession: () => ({ state: { apiUrl: "https://api.test/v1" } }),
  useAccessToken: () => "token-1",
}))

const mockSearch = {
  normalized: "",
  active: false,
  offline: false,
  mine: [],
  community: { status: "idle" },
  places: { status: "idle" },
  parcels: { status: "idle" },
  parcelsShown: false,
  best: null,
  order: ["mine", "community", "places", "parcels"],
  busy: false,
  settled: true,
  resultCount: 0,
}
const mockGlobalSearch = jest.fn((_params: unknown) => mockSearch)
jest.mock("../../hooks/useGlobalSearch", () => ({
  useGlobalSearch: (params: unknown) => mockGlobalSearch(params),
}))

const mockRecents = {
  recents: ["Fontainebleau"],
  save: jest.fn(async () => undefined),
  remove: jest.fn(async () => undefined),
  clear: jest.fn(async () => undefined),
  reload: jest.fn(async () => undefined),
}
jest.mock("../../hooks/useSearchRecents", () => ({ useSearchRecents: () => mockRecents }))

type ScreenProps = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
let screenProps: ScreenProps = {}
jest.mock("../../screens/global-search/GlobalSearchScreen", () => ({
  GlobalSearchScreen: (props: ScreenProps) => {
    screenProps = props
    return null
  },
}))

let tree: ReactTestRenderer

function mount() {
  act(() => {
    tree = renderer.create(<SearchHomeRoute />)
  })
}

const type = (value: string) => act(() => screenProps.onChangeText(value))

beforeEach(() => {
  jest.clearAllMocks()
  mockSearch.active = false
  mockSearch.normalized = ""
  mockNavigation.isFocused.mockReturnValue(true)
  for (const key of Object.keys(mockListeners)) delete mockListeners[key]
  for (const key of Object.keys(mockParentListeners)) delete mockParentListeners[key]
})

afterEach(() => {
  act(() => tree?.unmount())
})

const lastSearchParams = () =>
  mockGlobalSearch.mock.calls[mockGlobalSearch.mock.calls.length - 1]?.[0] as Record<
    string,
    unknown
  >

describe("SearchHomeRoute", () => {
  test("keeps the query in its own state and feeds the search with the session and the surveys", () => {
    mount()
    expect(lastSearchParams()).toMatchObject({
      query: "",
      surveys: mockSurveys.state.surveys,
      apiUrl: "https://api.test/v1",
      accessToken: "token-1",
      immediate: false,
    })
    type("Forêt")
    expect(screenProps.query).toBe("Forêt")
    expect(lastSearchParams().query).toBe("Forêt")
    // Typing never reaches the shared surveys context.
    expect(mockSurveys.actions.openSurvey).not.toHaveBeenCalled()
  })

  test("passes the group states, the recents and the survey details to the screen", () => {
    mockSearch.active = true
    mockSearch.busy = true
    mount()
    expect(screenProps.active).toBe(true)
    expect(screenProps.busy).toBe(true)
    expect(screenProps.recents).toEqual(["Fontainebleau"])
    expect(screenProps.results.surveyDetails).toBe(mockSurveys.state.surveyDetails)
    expect(screenProps.results.order).toBe(mockSearch.order)
    mockSearch.busy = false
  })

  test("the return key saves the text and dismisses the keyboard, only when it is searchable", () => {
    mount()
    type("a")
    act(() => screenProps.onSubmit())
    expect(mockRecents.save).not.toHaveBeenCalled()
    expect(mockDismiss).toHaveBeenCalledTimes(1)

    mockSearch.active = true
    type("  Forêt ")
    act(() => screenProps.onSubmit())
    expect(mockRecents.save).toHaveBeenCalledWith("Forêt")
    expect(mockDismiss).toHaveBeenCalledTimes(2)
  })

  test("the cross empties the field", () => {
    mount()
    type("Forêt")
    act(() => screenProps.onClear())
    expect(screenProps.query).toBe("")
    expect(mockDismiss).not.toHaveBeenCalled()
  })

  test("a tapped recent fills the field, searches at once, saves and dismisses", () => {
    mount()
    act(() => screenProps.onOpenRecent("Fontainebleau"))
    expect(screenProps.query).toBe("Fontainebleau")
    expect(lastSearchParams().immediate).toBe(true)
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(mockRecents.save).toHaveBeenCalledWith("Fontainebleau")
    expect(mockDismiss).toHaveBeenCalledTimes(1)
    // The next keystroke is debounced again.
    type("Fontainebleau ")
    expect(lastSearchParams().immediate).toBe(false)
  })

  test("removes one recent or clears them all", () => {
    mount()
    act(() => screenProps.onRemoveRecent("Fontainebleau"))
    expect(mockRecents.remove).toHaveBeenCalledWith("Fontainebleau")
    act(() => screenProps.onClearRecents())
    expect(mockRecents.clear).toHaveBeenCalledTimes(1)
  })

  test("opens an own survey in the survey stack", () => {
    mockSearch.active = true
    mount()
    type("Forêt")
    act(() => screenProps.results.onOpenOwn("s-1"))
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(mockRecents.save).toHaveBeenCalledWith("Forêt")
    expect(mockSurveys.actions.openSurvey).toHaveBeenCalledWith("s-1")
    expect(mockNavigation.navigate).toHaveBeenCalledWith("surveys", {
      screen: "surveyDetail",
      initial: false,
    })
  })

  test("opens a community survey, read only", () => {
    mockSearch.active = true
    mount()
    type("Forêt")
    act(() => screenProps.results.onOpenCommunity("c-9"))
    expect(mockNavigation.navigate).toHaveBeenCalledWith("surveys", {
      screen: "communitySurvey",
      params: { surveyId: "c-9" },
      initial: false,
    })
  })

  test("opens a member as the community list filtered on that author", () => {
    mockSearch.active = true
    mount()
    type("Marie")
    act(() => screenProps.results.onOpenMember("Marie Dupont"))
    expect(mockNavigation.navigate).toHaveBeenCalledWith("search", {
      screen: "searchGroup",
      params: { group: "community", query: "Marie Dupont", memberName: "Marie Dupont" },
    })
    expect(mockSelection).toHaveBeenCalledTimes(1)
  })

  test("opens a place and a parcel in Explorer, centred there", () => {
    mockSearch.active = true
    mount()
    type("Fontainebleau")
    const place = { lat: 48.4, lng: 2.7, kind: "municipality" } as SearchPlaceItem
    act(() => screenProps.results.onOpenPlace(place))
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith("publicMap", {
      screen: "publicMapHome",
      params: {
        focus: expect.objectContaining({
          kind: "place",
          lat: 48.4,
          lng: 2.7,
          placeKind: "municipality",
          nonce: expect.any(Number),
        }),
      },
    })
    const parcel = {
      parcel_id: "77186000AB0012",
      centroid: { lat: 48.5, lng: 2.8 },
      bbox: [2.79, 48.49, 2.81, 48.51],
    } as SearchParcelItem
    act(() => screenProps.results.onOpenParcel(parcel))
    expect(mockNavigation.navigate).toHaveBeenLastCalledWith("publicMap", {
      screen: "publicMapHome",
      params: {
        focus: expect.objectContaining({ kind: "parcel", parcelId: "77186000AB0012" }),
      },
    })
  })

  test("'Voir les N' opens the full list of the group for the typed text", () => {
    mockSearch.active = true
    mount()
    type(" Forêt ")
    act(() => screenProps.results.onSeeAll("places"))
    expect(mockNavigation.navigate).toHaveBeenCalledWith("search", {
      screen: "searchGroup",
      params: { group: "places", query: "Forêt" },
    })
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(mockRecents.save).toHaveBeenCalledWith("Forêt")
  })

  test("the tab focus reads the recents and focuses an empty field only", () => {
    mount()
    const focus = jest.fn()
    ;(screenProps.fieldRef as { current: unknown }).current = { focus }
    act(() => mockListeners.focus())
    expect(focus).toHaveBeenCalledTimes(1)
    expect(mockRecents.reload).toHaveBeenCalledTimes(1)

    type("Forêt")
    act(() => mockListeners.focus())
    expect(focus).toHaveBeenCalledTimes(1)
    expect(mockRecents.reload).toHaveBeenCalledTimes(2)
  })

  test("pressing the active tab again scrolls to the top and focuses the field", () => {
    mount()
    const focus = jest.fn()
    const scrollTo = jest.fn()
    ;(screenProps.fieldRef as { current: unknown }).current = { focus }
    ;(screenProps.scrollRef as { current: unknown }).current = { scrollTo }
    act(() => mockParentListeners.tabPress())
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true })
    expect(focus).toHaveBeenCalledTimes(1)
  })

  test("pressing the tab from another tab does nothing here", () => {
    mount()
    const focus = jest.fn()
    ;(screenProps.fieldRef as { current: unknown }).current = { focus }
    mockNavigation.isFocused.mockReturnValue(false)
    act(() => mockParentListeners.tabPress())
    expect(focus).not.toHaveBeenCalled()
  })

  test("tolerates empty refs and removes its listeners on unmount", () => {
    mount()
    act(() => mockListeners.focus())
    act(() => mockParentListeners.tabPress())
    act(() => tree.unmount())
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    expect(mockParentUnsubscribe).toHaveBeenCalledTimes(1)
  })

  test("works when the navigator has no parent", () => {
    mockNavigation.getParent.mockReturnValueOnce(undefined as never)
    mount()
    act(() => tree.unmount())
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    expect(mockParentUnsubscribe).not.toHaveBeenCalled()
  })
})
