import { readFileSync } from "fs"
import { join } from "path"
import React from "react"
import renderer, { act } from "react-test-renderer"
// The draft-summary module pulls in the whole storage layer; the view model only needs its marker.
jest.mock("../survey-detail/useLocalDraftSummary", () => ({ NOT_FILLED_CLASS: "Not filled" }))

import type { CommunitySurveyDetail } from "@cortege/ibp-domain"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { CommunitySurveyState } from "../../hooks/useCommunitySurvey"
import { fr } from "../../i18n"
import { PAGE_END_MARGIN } from "../survey-detail/useSubPageContent"
import { FrameLargeTitleContext } from "../../ui/frame-large-title"
import { CommunitySurveyScreen } from "./CommunitySurveyScreen"

const t = fr.communitySurvey

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
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios" },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 44 }))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("expo-image", () => {
  const ReactRef = require("react") as typeof import("react")
  return { Image: (props: object) => ReactRef.createElement("ExpoImage", props) }
})
jest.mock("../../ui/AppText", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppText: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Text", props, children),
  }
})
jest.mock("../../ui/AppButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return { AppButton: (props: object) => ReactRef.createElement("AppButton", props) }
})
jest.mock("../../ui/AppGroupedList", () => {
  const ReactRef = require("react") as typeof import("react")
  return { AppGroupedList: (props: object) => ReactRef.createElement("AppGroupedList", props) }
})
jest.mock("../survey-detail/ScoreBreakdown", () => {
  const ReactRef = require("react") as typeof import("react")
  return { ScoreBreakdown: (props: object) => ReactRef.createElement("ScoreBreakdown", props) }
})
jest.mock("../survey-detail/FactorsList", () => {
  const ReactRef = require("react") as typeof import("react")
  return { FactorsList: (props: object) => ReactRef.createElement("FactorsList", props) }
})
jest.mock("../survey-detail/ParcelMapCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return { ParcelMapCard: (props: object) => ReactRef.createElement("ParcelMapCard", props) }
})

const detail = (overrides: Partial<CommunitySurveyDetail> = {}): CommunitySurveyDetail => ({
  survey_id: "s-2",
  site_name: "Bois du Second",
  author_name: "Camille",
  submitted_at: "2026-09-28T09:41:00.000Z",
  observation_year: 2026,
  version_number: 2,
  region_version: null,
  vegetation_stage: null,
  ibp_method_version: IBP_METHOD_V3_2,
  ibp_cas: 2,
  ibp_cas3_scale: false,
  scores: { ibp_total: 31, ibp_peuplement_gestion: 22, ibp_contexte: 9 },
  factor_results: {},
  parcel_ids: ["75101AB0123", "75101AB0124"],
  display_location: { lat: 47.31, lng: 1.31 },
  history: [],
  ...overrides,
})

const state = (overrides: Partial<CommunitySurveyState> = {}): CommunitySurveyState => ({
  detail: detail(),
  photos: [],
  status: "ready",
  photosFailed: false,
  reload: jest.fn(),
  ...overrides,
})

function render(current: CommunitySurveyState, onOpenHistory = jest.fn()) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <CommunitySurveyScreen
        apiUrl="http://api.test/v1"
        accessToken="token"
        state={current}
        onOpenHistory={onOpenHistory}
      />,
    )
  })
  return { tree, onOpenHistory }
}

const byType = (tree: renderer.ReactTestRenderer, type: string) =>
  tree.root.findAll((node) => (node.type as unknown) === type)
const texts = (tree: renderer.ReactTestRenderer): string[] =>
  byType(tree, "Text")
    .flatMap((node) => React.Children.toArray(node.props.children))
    .filter((child): child is string => typeof child === "string")

describe("CommunitySurveyScreen", () => {
  it("shows a spinner while loading and an error with a retry when it failed", () => {
    const loading = render(state({ detail: null, status: "loading" }))
    expect(byType(loading.tree, "ActivityIndicator")).toHaveLength(1)
    expect(texts(loading.tree)).toContain(t.loading)

    const reload = jest.fn()
    const failed = render(state({ detail: null, status: "error", reload }))
    expect(texts(failed.tree)).toContain(t.error)
    act(() => byType(failed.tree, "AppButton")[0].props.onPress())
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("shows who made the survey, its score, factors, context and an approximate position", () => {
    const { tree } = render(state())
    const all = texts(tree).join(" | ")
    expect(all).toContain("Bois du Second")
    expect(all).toContain("Camille")
    // OA-115: a status line in words, the year, the version and the method as chips.
    expect(all).toContain("2026")
    expect(all).toContain(t.versionChip(2))
    expect(all).toContain("Terminé · Camille")
    expect(all).not.toMatch(/\d{4}-\d{2}-\d{2} \d{2}:/)
    expect(all).toContain(t.readOnly)

    expect(byType(tree, "ScoreBreakdown")[0].props.scores).toEqual({
      ibp_total: 31,
      ibp_peuplement_gestion: 22,
      ibp_contexte: 9,
    })
    const factors = byType(tree, "FactorsList")[0]
    expect(factors.props.canEditSurvey).toBe(false)
    expect(factors.props.factorEntries).toHaveLength(10)
    const lists = byType(tree, "AppGroupedList")
    // The context rows, then the parcels with their cadastral references.
    expect(lists[0].props.sections[0].rows).toHaveLength(2)
    expect(lists[1].props.sections[0].rows).toEqual([
      {
        key: "75101AB0123",
        label: fr.surveyDetail.contextScreen.parcelLabel(1),
        value: "75101AB0123",
      },
      {
        key: "75101AB0124",
        label: fr.surveyDetail.contextScreen.parcelLabel(2),
        value: "75101AB0124",
      },
    ])

    const map = byType(tree, "ParcelMapCard")[0]
    expect(map.props.parcelIds).toEqual(["75101AB0123", "75101AB0124"])
    expect(map.props.displayLocation).toEqual({ lat: 47.31, lng: 1.31 })
  })

  it("names an unknown author and an unnamed survey, and shows no map position when there is none", () => {
    const { tree } = render(
      state({ detail: detail({ author_name: null, site_name: "  ", display_location: null }) }),
    )
    const all = texts(tree).join(" | ")
    expect(all).toContain(t.unknownAuthor)
    expect(all).toContain(fr.common.untitledSurvey)
    expect(byType(tree, "ParcelMapCard")[0].props.displayLocation).toBeUndefined()
  })

  it("shows no parcel list when the survey has no parcel", () => {
    const { tree } = render(state({ detail: detail({ parcel_ids: [] }) }))
    expect(byType(tree, "AppGroupedList")).toHaveLength(1)
  })

  it("leaves the version line out when the survey has neither year nor version", () => {
    const { tree } = render(
      state({ detail: detail({ observation_year: null, version_number: null }) }),
    )
    expect(texts(tree)).not.toContain("")
    expect(texts(tree).join(" | ")).not.toContain("Année")
  })

  it("shows the photos with the token for those the API serves", () => {
    const { tree } = render(
      state({
        photos: [
          { id: "a-1", uri: "https://files.example/a-1" },
          { id: "a-2", uri: "http://api.test/v1/x", headers: { Authorization: "Bearer token" } },
        ],
      }),
    )
    const images = byType(tree, "ExpoImage")
    expect(images.map((image) => image.props.source)).toEqual([
      { uri: "https://files.example/a-1", headers: undefined },
      { uri: "http://api.test/v1/x", headers: { Authorization: "Bearer token" } },
    ])
  })

  it("draws one photo full width at 16:10 and several as a 4:3 strip of 78 percent tiles", () => {
    const one = render(state({ photos: [{ id: "a-1", uri: "https://files.example/a-1" }] }))
    const [single] = byType(one.tree, "ExpoImage")
    expect(single).toBeDefined()
    const imageBoxes = (tree: renderer.ReactTestRenderer) =>
      byType(tree, "View").filter((node) => node.props.accessibilityRole === "image")
    const singleBox = imageBoxes(one.tree)[0].props.style
    const box = (style: unknown) =>
      Object.assign({}, ...(style as object[])) as Record<string, number>
    expect(box(singleBox).width).toBe(390 - 32)
    expect(box(singleBox).width / box(singleBox).height).toBeCloseTo(1.6)

    const many = render(
      state({
        photos: [
          { id: "a-1", uri: "https://files.example/a-1" },
          { id: "a-2", uri: "https://files.example/a-2" },
        ],
      }),
    )
    const boxes = imageBoxes(many.tree)
    expect(boxes).toHaveLength(2)
    const tile = box(boxes[0].props.style)
    expect(tile.width).toBeCloseTo((390 - 32) * 0.78)
    expect(tile.width / tile.height).toBeCloseTo(4 / 3)
  })

  it("says when there is no photo, or when the photos failed to load", () => {
    expect(texts(render(state()).tree)).toContain(fr.surveyDetail.photos.emptyReadOnly)
    expect(texts(render(state({ photosFailed: true })).tree)).toContain(t.photosFailed)
  })

  it("shows one 'Historique de la parcelle' row when the parcels have other surveys", () => {
    const history = [
      {
        survey_id: "s-1",
        site_name: "Bois du Premier",
        author_name: null,
        observation_year: 2025,
        version_number: 1,
        ibp_total: 24,
        submitted_at: "2025-06-10T09:00:00.000Z",
        is_current: false,
      },
      {
        survey_id: "s-2",
        site_name: "",
        author_name: "Camille",
        observation_year: null,
        version_number: null,
        ibp_total: 31,
        submitted_at: "2026-09-28T09:41:00.000Z",
        is_current: true,
      },
    ]
    const { tree, onOpenHistory } = render(state({ detail: detail({ history }) }))
    const lists = byType(tree, "AppGroupedList")
    // Context rows, parcels, then the history row, after the factors list.
    expect(lists).toHaveLength(3)
    const [row] = lists[2].props.sections[0].rows
    expect(row).toMatchObject({
      label: fr.surveyDetail.rows.history,
      multiline: true,
      value: "24 → 31",
      accessibilityLabel: "Historique de la parcelle. de 24 à 31 sur 50",
    })
    const all = tree.root.findAll((node) => node.type !== undefined)
    const order = all
      .map((node) => node.type as unknown)
      .filter((type) => type === "FactorsList" || type === "AppGroupedList")
    expect(order[order.length - 1]).toBe("AppGroupedList")
    expect(order[order.length - 2]).toBe("FactorsList")
    act(() => row.onPress())
    expect(onOpenHistory).toHaveBeenCalledTimes(1)
    // The old inline list is gone.
    expect(
      tree.root.findAll((n) => String(n.props.testID ?? "").startsWith("community-history-")),
    ).toHaveLength(0)
  })

  it("shows no history row when the survey is alone on its parcels or has no history", () => {
    const only = {
      survey_id: "s-2",
      site_name: "Bois",
      author_name: "Camille",
      observation_year: 2026,
      version_number: 1,
      ibp_total: 31,
      submitted_at: "2026-09-28T09:41:00.000Z",
      is_current: true,
    }
    expect(
      byType(render(state({ detail: detail({ history: [only] }) })).tree, "AppGroupedList"),
    ).toHaveLength(2)
    expect(byType(render(state()).tree, "AppGroupedList")).toHaveLength(2)
  })

  it("never reaches the change log of another member's survey (T-24-06)", () => {
    const source = readFileSync(join(__dirname, "CommunitySurveyScreen.tsx"), "utf8")
    for (const forbidden of [
      "EventsTab",
      "SurveyJournal",
      "surveyJournal",
      "useSurveyDetailHeader",
      "surveyEvents",
    ]) {
      expect(source).not.toContain(forbidden)
    }
  })
})

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

describe("bottom clearance above the tab bar", () => {
  it("the scroll content ends above the floating tab bar, with a margin", () => {
    const { tree } = render(state())
    const scroll = byType(tree, "ScrollView")[0]
    const padding = flattenStyle(scroll.props.contentContainerStyle).paddingBottom as number
    expect(padding).toBe(90 + PAGE_END_MARGIN)
    expect(padding).toBeGreaterThanOrEqual(90)
  })
})

describe("under the native large title (12.2-17)", () => {
  function renderLarge(current: CommunitySurveyState) {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <FrameLargeTitleContext.Provider value>
          <CommunitySurveyScreen
            apiUrl="http://api.test/v1"
            accessToken="token"
            state={current}
            onOpenHistory={jest.fn()}
          />
        </FrameLargeTitleContext.Provider>,
      )
    })
    return tree
  }

  it("the header names the survey: no in-page title, the author line and chips stay", () => {
    const tree = renderLarge(state())
    const headers = byType(tree, "Text").filter((node) => node.props.accessibilityRole === "header")
    expect(headers).toHaveLength(0)
    const all = texts(tree).join(" | ")
    expect(all).toContain("Terminé · Camille")
    expect(all).toContain(t.versionChip(2))
  })

  it("iOS insets the page: automatic insets, only the margin under the last item", () => {
    const scroll = byType(renderLarge(state()), "ScrollView")[0]
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("automatic")
    expect(flattenStyle(scroll.props.contentContainerStyle).paddingBottom).toBe(PAGE_END_MARGIN)
  })

  it("elsewhere the page draws its own title", () => {
    const { tree } = render(state())
    const headers = byType(tree, "Text").filter((node) => node.props.accessibilityRole === "header")
    expect(headers).toHaveLength(1)
    expect(byType(tree, "ScrollView")[0].props.contentInsetAdjustmentBehavior).toBe("never")
  })
})
