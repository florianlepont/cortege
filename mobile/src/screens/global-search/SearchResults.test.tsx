import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import type {
  CommunitySurveyItem,
  SearchMemberItem,
  SearchParcelItem,
  SearchPlaceItem,
} from "@cortege/ibp-domain"
import type { BestResult, SearchGroupKey } from "../../app/global-search"
import type { SearchGroupState, SearchGroupStatus } from "../../hooks/useSearchGroup"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { SearchResults } from "./SearchResults"

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
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))
jest.mock("../survey-list/row-indicator", () => ({ RowIndicator: "RowIndicator" }))
jest.mock("../survey-list/CompactSurveyRow", () => ({ CompactSurveyRow: "CompactSurveyRow" }))
jest.mock("../community-survey/CommunityRow", () => ({ CommunityRow: "CommunityRow" }))
jest.mock("./SearchResultRow", () => ({ SearchResultRow: "SearchResultRow" }))
jest.mock("./SearchBestResult", () => ({ SearchBestResult: "SearchBestResult" }))

let tree: ReactTestRenderer

function makeSurvey(id: string, overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id,
    site_name: `Forêt ${id}`,
    status: "draft",
    visibility: "private",
    sync_version: 1,
    sync_state: "synced",
    last_sync_error: null,
    last_sync_error_code: null,
    last_sync_error_at: null,
    sync_blocked: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-10-05T10:00:00.000Z",
    completion_rate: 40,
    factors_filled: 0,
    ...overrides,
  }
}

const communitySurvey = (id: string): CommunitySurveyItem => ({
  survey_id: id,
  site_name: `Bois ${id}`,
  author_name: "Marie Dupont",
  submitted_at: "2026-09-01T10:00:00.000Z",
  ibp_total: 30,
})
const member = (name: string, count = 3): SearchMemberItem => ({
  author_name: name,
  survey_count: count,
})
const place = (id: string, name = `Lieu ${id}`): SearchPlaceItem => ({
  id,
  name,
  kind: "municipality",
  context: "Seine-et-Marne (77)",
  lat: 48.4,
  lng: 2.7,
  score: 0.9,
})
const parcel = (id: string): SearchParcelItem => ({
  parcel_id: id,
  commune_code: "77186",
  commune_name: "Fontainebleau",
  section: "AB",
  number: "0123",
  centroid: { lat: 48.4, lng: 2.7 },
  bbox: null,
  survey_count: 1,
})

type Group<T> = SearchGroupState<T> & { retry: jest.Mock }

function group<T>(
  data: T | null,
  status: SearchGroupStatus = data === null ? "idle" : "ready",
  error: "rateLimited" | "failed" | null = null,
): Group<T> {
  return { data, status, error, retry: jest.fn() }
}

type Props = React.ComponentProps<typeof SearchResults>

function defaults(overrides: Partial<Props> = {}) {
  const handlers = {
    onOpenOwn: jest.fn(),
    onOpenCommunity: jest.fn(),
    onOpenMember: jest.fn(),
    onOpenPlace: jest.fn(),
    onOpenParcel: jest.fn(),
    onSeeAll: jest.fn(),
  }
  const props: Props = {
    normalized: "foret",
    offline: false,
    mine: [],
    community: group(null),
    places: group(null),
    parcels: group(null),
    parcelsShown: false,
    best: null,
    order: ["mine", "community", "places", "parcels"],
    surveyDetails: {},
    ...handlers,
    ...overrides,
  }
  return { props, handlers }
}

function mount(overrides: Partial<Props> = {}) {
  const { props, handlers } = defaults(overrides)
  act(() => {
    tree = renderer.create(<SearchResults {...props} />)
  })
  return { props, handlers }
}

afterEach(() => {
  act(() => tree?.unmount())
})

const queryAll = (testID: string) =>
  tree.root.findAll(
    (node: ReactTestInstance) => typeof node.type === "string" && node.props.testID === testID,
  )
const byTestId = (testID: string) => {
  const found = queryAll(testID)
  if (found.length !== 1) throw new Error(`${found.length} nodes with testID ${testID}`)
  return found[0]
}
const groupIds = () =>
  tree.root
    .findAll(
      (node) =>
        typeof node.type === "string" &&
        typeof node.props.testID === "string" &&
        /^search-group-/.test(node.props.testID),
    )
    .map((node) => node.props.testID as string)
const texts = () =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat().join(""))
const hostsOf = (type: string) => tree.root.findAllByType(type as never)

describe("SearchResults best result and own surveys", () => {
  const first = makeSurvey("a")
  const second = makeSurvey("b")
  const third = makeSurvey("c")
  const fourth = makeSurvey("d")
  const fifth = makeSurvey("e", { status: "submitted", ibp_total: 31 })

  test("a promoted own survey opens from the best-result card and is not drawn twice", () => {
    const best: BestResult = { kind: "mine", survey: first }
    const { handlers } = mount({ mine: [first, second, third], best })
    const card = hostsOf("SearchBestResult")[0]
    expect(card.props.kind).toBe("mine")
    expect(card.props.title).toBe("Forêt a")
    act(() => card.props.onPress())
    expect(handlers.onOpenOwn).toHaveBeenCalledWith("a")
    const trailing = card.props.trailing as React.ReactElement
    expect(trailing.type).toBe("RowIndicator")
    expect(trailing.props).toMatchObject({ surveyId: "a", isSubmitted: false, completionRate: 40 })

    const rows = hostsOf("CompactSurveyRow")
    expect(rows.map((row) => row.props.survey.id)).toEqual(["b", "c"])
    // N counts every match, but nothing is left beyond the rows drawn: no "Voir les N".
    expect(queryAll("search-see-all-mine")).toHaveLength(0)
  })

  test("the ring of a submitted own best result takes the score of the stored total", () => {
    const best: BestResult = { kind: "mine", survey: fifth }
    mount({ mine: [fifth], best })
    const trailing = hostsOf("SearchBestResult")[0].props.trailing as React.ReactElement
    expect(trailing.props).toMatchObject({ isSubmitted: true, score: 31 })
  })

  test("'Voir les N' appears only when more rows exist than drawn, with N counting every match", () => {
    const best: BestResult = { kind: "mine", survey: first }
    const { handlers } = mount({ mine: [first, second, third, fourth, fifth], best })
    expect(hostsOf("CompactSurveyRow")).toHaveLength(3)
    const link = byTestId("search-see-all-mine")
    expect(link.props.accessibilityLabel).toBe(
      fr.search.seeAllA11y({ group: "Mes relevés", count: 5 }),
    )
    act(() => link.props.onPress())
    expect(handlers.onSeeAll).toHaveBeenCalledWith("mine")
  })

  test("a row press opens that survey", () => {
    const { handlers } = mount({ mine: [first, second] })
    act(() => hostsOf("CompactSurveyRow")[1].props.onOpen("b"))
    expect(handlers.onOpenOwn).toHaveBeenCalledWith("b")
    expect(hostsOf("SearchBestResult")).toHaveLength(0)
  })

  test("a group whose only match is the promoted survey is not drawn", () => {
    mount({ mine: [first], best: { kind: "mine", survey: first } })
    expect(groupIds()).toEqual([])
    expect(queryAll("search-no-result")).toHaveLength(0)
  })
})

describe("SearchResults groups and order", () => {
  test("groups render in the given order and empty ones are skipped", () => {
    mount({
      mine: [makeSurvey("a")],
      community: group({ members: [], surveys: [communitySurvey("s1")] }),
      places: group({ items: [place("p1")] }),
      parcels: group({ items: [parcel("x1")] }),
      parcelsShown: true,
      order: ["parcels", "mine", "community", "places"],
    })
    expect(groupIds()).toEqual([
      "search-group-parcels",
      "search-group-mine",
      "search-group-community",
      "search-group-places",
    ])
  })

  test("a parcel best result is drawn once, with its group order and open handler", () => {
    const item = parcel("x1")
    const { handlers } = mount({
      parcels: group({ items: [item, parcel("x2")] }),
      parcelsShown: true,
      best: { kind: "parcel", item },
      order: ["parcels", "mine", "community", "places"],
    })
    const card = hostsOf("SearchBestResult")[0]
    expect(card.props.kind).toBe("parcel")
    expect(card.props.title).toBe("Parcelle AB 0123")
    act(() => card.props.onPress())
    expect(handlers.onOpenParcel).toHaveBeenCalledWith(item)
    const rows = hostsOf("SearchResultRow")
    expect(rows).toHaveLength(1)
    expect(rows[0].props.testID).toBe("search-parcel-x2")
    act(() => rows[0].props.onPress())
    expect(handlers.onOpenParcel).toHaveBeenLastCalledWith(
      expect.objectContaining({ parcel_id: "x2" }),
    )
  })

  test("parcelsShown false hides Parcelles entirely, even with stale data", () => {
    mount({
      parcels: group({ items: [parcel("x1")] }),
      parcelsShown: false,
      mine: [makeSurvey("a")],
    })
    expect(groupIds()).toEqual(["search-group-mine"])
  })

  test("places: rows open the place; the cap adds a plus to 'Voir les N'", () => {
    const items = Array.from({ length: 10 }, (_, index) => place(`p${index}`))
    const { handlers } = mount({ places: group({ items }) })
    expect(hostsOf("SearchResultRow")).toHaveLength(3)
    expect(texts()).toContain("Voir les 10+")
    act(() => hostsOf("SearchResultRow")[0].props.onPress())
    expect(handlers.onOpenPlace).toHaveBeenCalledWith(items[0])
    act(() => byTestId("search-see-all-places").props.onPress())
    expect(handlers.onSeeAll).toHaveBeenCalledWith("places")
  })

  test("a place best result opens the place and is left out of the Lieux rows", () => {
    const items = [place("p1"), place("p2")]
    const { handlers } = mount({
      places: group({ items }),
      best: { kind: "place", item: items[0] },
    })
    const card = hostsOf("SearchBestResult")[0]
    expect(card.props.kind).toBe("place")
    act(() => card.props.onPress())
    expect(handlers.onOpenPlace).toHaveBeenCalledWith(items[0])
    expect(hostsOf("SearchResultRow").map((row) => row.props.title)).toEqual(["Lieu p2"])
  })

  test("parcel rows count, and a plain 'Voir les N' has no plus under the cap", () => {
    const items = Array.from({ length: 5 }, (_, index) => parcel(`x${index}`))
    mount({ parcels: group({ items }), parcelsShown: true })
    expect(texts()).toContain("Voir les 5")
  })

  test("parcels beside another kind of best result are all drawn", () => {
    const survey = makeSurvey("a")
    mount({
      mine: [survey],
      best: { kind: "mine", survey },
      parcels: group({ items: [parcel("x1")] }),
      parcelsShown: true,
    })
    expect(hostsOf("SearchResultRow")).toHaveLength(1)
  })

  test("a shown parcels group with no row and no notice is not drawn", () => {
    mount({ mine: [makeSurvey("a")], parcels: group({ items: [] }), parcelsShown: true })
    expect(groupIds()).toEqual(["search-group-mine"])
  })
})

describe("SearchResults Communauté", () => {
  test("lists one member first, then surveys, at most three rows", () => {
    const surveys = [communitySurvey("s1"), communitySurvey("s2"), communitySurvey("s3")]
    const { handlers } = mount({
      community: group({ members: [member("Marie Dupont"), member("Marielle")], surveys }),
    })
    const memberRows = hostsOf("SearchResultRow")
    expect(memberRows).toHaveLength(1)
    expect(memberRows[0].props).toMatchObject({
      kind: "member",
      title: "Marie Dupont",
      meta: "3 relevés terminés",
    })
    act(() => memberRows[0].props.onPress())
    expect(handlers.onOpenMember).toHaveBeenCalledWith("Marie Dupont")
    const rows = hostsOf("CommunityRow")
    expect(rows).toHaveLength(2)
    expect(rows[0].props.density).toBe("compact")
    act(() => rows[0].props.onOpen("s1"))
    expect(handlers.onOpenCommunity).toHaveBeenCalledWith("s1")
    // 2 members + 3 surveys, 3 rows drawn: "Voir les 5".
    expect(texts()).toContain("Voir les 5")
  })

  test("'Voir les N' shows a plus when the survey list reached the 50 request limit", () => {
    const surveys = Array.from({ length: 50 }, (_, index) => communitySurvey(`s${index}`))
    mount({ community: group({ members: [], surveys }) })
    expect(texts()).toContain("Voir les 50+")
  })

  test("a member best result opens that member and is not repeated in the group", () => {
    const marie = member("Marie Dupont")
    const { handlers } = mount({
      community: group({ members: [marie], surveys: [communitySurvey("s1")] }),
      best: { kind: "member", item: marie },
    })
    const card = hostsOf("SearchBestResult")[0]
    expect(card.props.kind).toBe("member")
    act(() => card.props.onPress())
    expect(handlers.onOpenMember).toHaveBeenCalledWith("Marie Dupont")
    expect(hostsOf("SearchResultRow")).toHaveLength(0)
    expect(hostsOf("CommunityRow")).toHaveLength(1)
  })

  test("a community survey best result carries a score ring and opens the survey", () => {
    const item = communitySurvey("s1")
    const { handlers } = mount({
      community: group({ members: [], surveys: [item, communitySurvey("s2")] }),
      best: { kind: "community", item },
    })
    const card = hostsOf("SearchBestResult")[0]
    expect(card.props.kind).toBe("community")
    expect((card.props.trailing as React.ReactElement).type).toBe("ScoreRing")
    act(() => card.props.onPress())
    expect(handlers.onOpenCommunity).toHaveBeenCalledWith("s1")
    expect(hostsOf("CommunityRow").map((row) => row.props.item.survey_id)).toEqual(["s2"])
  })
})

describe("SearchResults network notices (D-10, D-11)", () => {
  test("offline: own results show, the three network groups keep header and offline line", () => {
    mount({
      offline: true,
      mine: [makeSurvey("a")],
      community: group(null, "offline"),
      places: group(null, "offline"),
      parcels: group(null, "offline"),
      parcelsShown: true,
    })
    expect(groupIds()).toEqual([
      "search-group-mine",
      "search-group-community",
      "search-group-places",
      "search-group-parcels",
    ])
    expect(byTestId("search-offline-community")).toBeDefined()
    expect(byTestId("search-offline-places")).toBeDefined()
    expect(byTestId("search-offline-parcels")).toBeDefined()
    expect(texts()).toContain(fr.search.offline.community)
    expect(hostsOf("CompactSurveyRow")).toHaveLength(1)
    expect(queryAll("search-no-result")).toHaveLength(0)
  })

  test("offline with no own match: the offline no-result block, offline lines still below it", () => {
    mount({
      offline: true,
      normalized: "zzz",
      community: group(null, "offline"),
      places: group(null, "offline"),
      parcels: group(null, "offline"),
      parcelsShown: true,
    })
    const block = byTestId("search-no-result")
    expect(block.props.accessibilityLiveRegion).toBe("polite")
    expect(texts()).toContain(fr.search.noResult.offlineTitle("zzz"))
    expect(texts()).toContain(fr.search.noResult.offlineBody)
    expect(queryAll("search-offline-community")).toHaveLength(1)
    expect(queryAll("search-offline-places")).toHaveLength(1)
    expect(queryAll("search-offline-parcels")).toHaveLength(1)
  })

  test("an error line retries its own group only", () => {
    const community = group(null, "error", "failed")
    const places = group({ items: [place("p1")] })
    mount({ community, places })
    const retry = byTestId("search-retry-community")
    expect(retry.props.accessibilityLabel).toBe(fr.search.error.retryA11y("Communauté"))
    act(() => retry.props.onPress())
    expect(community.retry).toHaveBeenCalledTimes(1)
    expect(places.retry).not.toHaveBeenCalled()
    expect(texts()).toContain(fr.search.error.community)
    expect(hostsOf("SearchResultRow")).toHaveLength(1)
  })

  test("a rate-limited error shows the rate-limit sentence", () => {
    mount({ places: group(null, "error", "rateLimited") })
    expect(texts()).toContain(fr.search.error.rateLimited)
  })

  test("a first load shows the loading line; a later load keeps the rows", () => {
    mount({ community: group(null, "loading"), places: group({ items: [place("p1")] }, "loading") })
    expect(queryAll("search-loading-community")).toHaveLength(1)
    expect(queryAll("search-loading-places")).toHaveLength(0)
    expect(hostsOf("SearchResultRow")).toHaveLength(1)
    // Still waiting: no no-result block.
    expect(queryAll("search-no-result")).toHaveLength(0)
  })

  test("a waiting group with no data yet shows the loading line", () => {
    mount({ places: group(null, "waiting") })
    expect(queryAll("search-loading-places")).toHaveLength(1)
  })

  test("an idle group (no token) draws nothing", () => {
    mount({ community: group(null, "idle"), mine: [makeSurvey("a")] })
    expect(groupIds()).toEqual(["search-group-mine"])
  })
})

describe("SearchResults no-result block", () => {
  test("nothing loading and nothing matched: the online no-result block", () => {
    mount({
      normalized: "zzz",
      community: group({ members: [], surveys: [] }),
      places: group({ items: [] }),
    })
    const block = byTestId("search-no-result")
    expect(block.props.accessibilityLiveRegion).toBe("polite")
    expect(texts()).toContain(fr.search.noResult.title("zzz"))
    expect(texts()).toContain(fr.search.noResult.body)
    expect(groupIds()).toEqual([])
    expect(hostsOf("SearchBestResult")).toHaveLength(0)
  })

  test("groups in error show their line under the block, the title unchanged", () => {
    mount({
      normalized: "zzz",
      community: group(null, "error", "failed"),
      places: group({ items: [] }),
    })
    expect(texts()).toContain(fr.search.noResult.title("zzz"))
    expect(queryAll("search-retry-community")).toHaveLength(1)
  })

  test("no block while a group is still loading", () => {
    mount({ community: group({ members: [], surveys: [] }), places: group(null, "waiting") })
    expect(queryAll("search-no-result")).toHaveLength(0)
  })

  test("a loading parcels group counts only when the group is shown", () => {
    mount({
      community: group({ members: [], surveys: [] }),
      places: group({ items: [] }),
      parcels: group(null, "loading"),
      parcelsShown: false,
    })
    expect(queryAll("search-no-result")).toHaveLength(1)
  })

  test.each<[string, Partial<Parameters<typeof mount>[0]>]>([
    ["own survey", { mine: [makeSurvey("a")] }],
    ["member", { community: group({ members: [member("Marie")], surveys: [] }) }],
    ["community survey", { community: group({ members: [], surveys: [communitySurvey("s")] }) }],
    ["place", { places: group({ items: [place("p")] }) }],
    ["parcel", { parcels: group({ items: [parcel("x")] }), parcelsShown: true }],
  ])("a %s match hides the block", (_label, overrides) => {
    mount(overrides)
    expect(queryAll("search-no-result")).toHaveLength(0)
  })

  test("a match kept in a hidden parcels group does not count", () => {
    mount({ parcels: group({ items: [parcel("x")] }), parcelsShown: false })
    expect(queryAll("search-no-result")).toHaveLength(1)
  })
})

describe("SearchResults types", () => {
  test("every key of the order has a renderer", () => {
    const keys: SearchGroupKey[] = ["mine", "community", "places", "parcels"]
    expect(() => mount({ order: keys })).not.toThrow()
  })
})
