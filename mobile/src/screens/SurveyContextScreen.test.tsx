import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import type { LocalSurvey } from "../storage/types"
import { SurveyContextScreen } from "./SurveyContextScreen"
import { PAGE_END_MARGIN } from "./survey-detail/useSubPageContent"
import type { SurveyContextScreenProps } from "./survey-detail/screen-props"

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
    View: mockComponent("View"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("../ui/AppGroupedList", () => ({ AppGroupedList: "AppGroupedList" }))
jest.mock("../ui/PageTitle", () => ({ PageTitle: "PageTitle" }))
jest.mock("./public-map/MapChips", () => ({ MapActionPill: "MapActionPill" }))
jest.mock("./survey-detail/ParcelMapCard", () => ({ ParcelMapCard: "ParcelMapCard" }))
jest.mock("./survey-detail/ScoringContextEditor", () => ({
  ScoringContextEditor: "ScoringContextEditor",
}))

let mockCanEdit = true
let mockParcelIds: string[] = ["75056000AB0001"]
jest.mock("./survey-detail/useSurveyDetailData", () => ({
  useSurveyDetailData: () => ({
    detail: undefined,
    canEditSurvey: mockCanEdit,
    activeSiteName: "Parcelle A",
    parcelIds: mockParcelIds,
    scoringContext: { ibp_method_version: null, ibp_cas: null, ibp_cas3_scale: false },
    activeRegion: "ACA",
    activeVegetationStage: "collineen",
  }),
}))

function render(): ReactTestRenderer {
  const props = {
    apiUrl: "http://api",
    accessToken: null,
    selectedSurvey: { id: "survey-1" } as unknown as LocalSurvey,
    surveyDetails: {},
    detailsLoadingSurveyId: null,
    onOpenParcels: jest.fn(),
    onUpdateRegionVersion: jest.fn(),
    onUpdateVegetationStage: jest.fn(),
    onUpdateIbpCas: jest.fn(),
    onUpdateCas3Scale: jest.fn(),
    onSwitchToV32: jest.fn(),
  } as SurveyContextScreenProps
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<SurveyContextScreen {...props} />)
  })
  return tree as ReactTestRenderer
}

afterEach(() => {
  mockCanEdit = true
  mockParcelIds = ["75056000AB0001"]
})

describe("SurveyContextScreen (variant I)", () => {
  test("shows the map card, the parcels then the editor, with the outline pencil on the map", () => {
    const tree = render()
    const scroll = tree.root.findByType("ScrollView" as never)
    const order = scroll.children.map((child) => (child as { type: unknown }).type)
    expect(order).toEqual(["PageTitle", "ParcelMapCard", "AppGroupedList", "ScoringContextEditor"])
    expect(tree.root.findByType("MapActionPill" as never).props.icon).toBe("pencil-outline")
  })

  test("a finished survey has no edit action on the map", () => {
    mockCanEdit = false
    const tree = render()
    expect(tree.root.findAllByType("MapActionPill" as never)).toHaveLength(0)
  })

  test("without parcel it says so instead of listing", () => {
    mockParcelIds = []
    const tree = render()
    expect(tree.root.findAllByType("AppGroupedList" as never)).toHaveLength(0)
    expect(JSON.stringify(tree.toJSON())).toContain("Aucune parcelle choisie")
  })
})

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

describe("bottom clearance above the tab bar", () => {
  test("the scroll content ends above the floating tab bar, with a margin", () => {
    const scroll = render().root.findByType("ScrollView" as never)
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(90 + PAGE_END_MARGIN)
    expect(padding).toBeGreaterThanOrEqual(90)
  })
})
