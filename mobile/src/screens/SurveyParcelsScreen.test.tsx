import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import type { SurveyRouteState } from "../hooks/useSurveyRoute"
import { fr } from "../i18n"
import type { LocalSurvey } from "../storage/types"
import { SurveyParcelsScreen } from "./SurveyParcelsScreen"
import type { SurveyParcelsScreenProps } from "./survey-detail/screen-props"

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
  const ScrollView = ReactRef.forwardRef(function ScrollView(
    { children, ...props }: { children?: React.ReactNode },
    _ref: React.Ref<unknown>,
  ) {
    return ReactRef.createElement("ScrollView", props, children)
  })
  return {
    View: mockComponent("View"),
    ScrollView,
    Text: mockComponent("Text"),
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("../ui/AppGroupedList", () => ({ AppGroupedList: "AppGroupedList" }))
jest.mock("../ui/PageTitle", () => ({ PageTitle: "PageTitle" }))
jest.mock("./public-map/GlassIconButton", () => ({ GlassIconButton: "GlassIconButton" }))
jest.mock("./survey-detail/ParcelMapCard", () => ({ ParcelMapCard: "ParcelMapCard" }))
jest.mock("./survey-detail/SurveyOfflineMapRow", () => ({
  SurveyOfflineMapRow: "SurveyOfflineMapRow",
}))
jest.mock("./survey-detail/route/RouteSection", () => ({ RouteSection: "RouteSection" }))
let mockRouteState: SurveyRouteState = { route: null, loaded: true }
const mockUseSurveyRoute = jest.fn((_survey: unknown) => mockRouteState)
jest.mock("../hooks/useSurveyRoute", () => ({
  useSurveyRoute: (survey: unknown) => mockUseSurveyRoute(survey),
}))
let mockLocal: {
  point: { lat: number; lng: number } | null
  bounds: { west: number; south: number; east: number; north: number } | null
} = { point: null, bounds: null }
jest.mock("./survey-detail/useLocalParcelGeometry", () => ({
  useLocalParcelGeometry: () => mockLocal,
}))

let mockCanEdit = true
let mockParcelIds: string[] = ["75056000AB0001", "75056000AB0002"]
let mockDetail: { display_location?: { lat: number; lng: number } } | undefined
jest.mock("./survey-detail/useSurveyDetailData", () => ({
  useSurveyDetailData: () => ({
    detail: mockDetail,
    canEditSurvey: mockCanEdit,
    activeSiteName: "Parcelle A",
    parcelIds: mockParcelIds,
  }),
}))

function render(over: Partial<SurveyParcelsScreenProps> = {}): ReactTestRenderer {
  const props = {
    apiUrl: "http://api",
    accessToken: null,
    selectedSurvey: { id: "survey-1", updated_at: "t1" } as unknown as LocalSurvey,
    surveyDetails: {},
    detailsLoadingSurveyId: null,
    onOpenParcels: jest.fn(),
    onEditRoute: jest.fn(),
    ...over,
  } as SurveyParcelsScreenProps
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<SurveyParcelsScreen {...props} />)
  })
  return tree as ReactTestRenderer
}

afterEach(() => {
  mockCanEdit = true
  mockParcelIds = ["75056000AB0001", "75056000AB0002"]
  mockDetail = undefined
  mockLocal = { point: null, bounds: null }
  mockRouteState = { route: null, loaded: true }
  mockUseSurveyRoute.mockClear()
})

describe("SurveyParcelsScreen (D-32)", () => {
  test("shows the map, the list of parcels, the route card, then the offline map row", () => {
    const tree = render()
    const scroll = tree.root.findByType("ScrollView" as never)
    const order = scroll.children.map((child) => (child as { type: unknown }).type)
    expect(order).toEqual([
      "PageTitle",
      "ParcelMapCard",
      "AppGroupedList",
      "RouteSection",
      "SurveyOfflineMapRow",
    ])
    expect(tree.root.findByType("PageTitle" as never).props.children).toBe("Parcelles")
  })

  test("lists one row per parcel under its heading", () => {
    const list = render().root.findByType("AppGroupedList" as never)
    const section = list.props.sections[0]
    expect(section.title).toBe(fr.surveyDetail.parcelsScreen.parcelsHeading(2))
    expect(section.rows.map((row: { label: string }) => row.label)).toEqual([
      "Parcelle 1",
      "Parcelle 2",
    ])
  })

  test("the pencil on the map edits the parcels while the survey can be edited", () => {
    const onOpenParcels = jest.fn()
    const tree = render({ onOpenParcels })
    const pencil = tree.root.findByType("GlassIconButton" as never)
    expect(pencil.props.icon).toBe("pencil-outline")
    act(() => pencil.props.onPress())
    expect(onOpenParcels).toHaveBeenCalledWith("survey-1")
  })

  test("a finished survey has no edit action on the map", () => {
    mockCanEdit = false
    expect(render().root.findAllByType("GlassIconButton" as never)).toHaveLength(0)
  })

  test("without parcel it says so instead of listing", () => {
    mockParcelIds = []
    const tree = render()
    expect(tree.root.findAllByType("AppGroupedList" as never)).toHaveLength(0)
    expect(JSON.stringify(tree.toJSON())).toContain("Aucune parcelle choisie")
  })

  test("the offline map row follows the server position, else the position kept on the phone (D-36)", () => {
    const row = (tree: ReactTestRenderer) => tree.root.findByType("SurveyOfflineMapRow" as never)

    mockDetail = { display_location: { lat: 1, lng: 2 } }
    mockLocal = { point: { lat: 3, lng: 4 }, bounds: null }
    expect(row(render()).props.displayLocation).toEqual({ lat: 1, lng: 2 })

    mockDetail = undefined
    expect(row(render()).props.displayLocation).toEqual({ lat: 3, lng: 4 })

    mockLocal = { point: null, bounds: { west: 2, south: 46, east: 2.2, north: 46.4 } }
    const centre = row(render()).props.displayLocation
    expect(centre.lat).toBeCloseTo(46.2, 9)
    expect(centre.lng).toBeCloseTo(2.1, 9)

    mockLocal = { point: null, bounds: null }
    expect(row(render()).props.displayLocation).toBeUndefined()
  })
})

describe("Parcours utilisé card (phase 30, D-09, moved here on 2026-10-14)", () => {
  const card = (tree: ReactTestRenderer) => tree.root.findByType("RouteSection" as never).props
  const ROUTE = {
    version: 1,
    method: "full",
    counting: "capped",
    zone_surface_ha: 2,
    guide: { chosen_by: "observer" },
  } as const

  test("reads the route of the selected survey and hands it to the card", () => {
    mockRouteState = { route: ROUTE, loaded: true }
    const survey = { id: "survey-9" } as unknown as LocalSurvey
    const props = card(render({ selectedSurvey: survey }))
    expect(mockUseSurveyRoute).toHaveBeenCalledWith(survey)
    expect(props.route).toBe(ROUTE)
    expect(props.loaded).toBe(true)
    expect(props.variant).toBe("detail")
  })

  test("is a draft and editable while the survey can be edited", () => {
    const props = card(render())
    expect([props.status, props.editable]).toEqual(["draft", true])
  })

  test("is read-only once the survey is submitted", () => {
    mockCanEdit = false
    const props = card(render())
    expect([props.status, props.editable]).toEqual(["readonly", false])
  })

  test("its link opens the chooser for this survey", () => {
    const onEditRoute = jest.fn()
    card(render({ onEditRoute })).onEdit()
    expect(onEditRoute).toHaveBeenCalledWith("survey-1")
  })

  test("is told the route is not read yet", () => {
    mockRouteState = { route: null, loaded: false }
    expect(card(render()).loaded).toBe(false)
  })
})
