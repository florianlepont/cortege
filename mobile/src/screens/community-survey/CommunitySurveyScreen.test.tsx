import React from "react"
import renderer, { act } from "react-test-renderer"
// The draft-summary module pulls in the whole storage layer; the view model only needs its marker.
jest.mock("../survey-detail/useLocalDraftSummary", () => ({ NOT_FILLED_CLASS: "Not filled" }))

import type { CommunitySurveyDetail } from "@cortege/ibp-domain"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { CommunitySurveyState } from "../../hooks/useCommunitySurvey"
import { fr } from "../../i18n"
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
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 44 }))
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
  parcel_count: 2,
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

function render(current: CommunitySurveyState, onOpenSurvey = jest.fn()) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <CommunitySurveyScreen
        apiUrl="http://api.test/v1"
        accessToken="token"
        state={current}
        onOpenSurvey={onOpenSurvey}
      />,
    )
  })
  return { tree, onOpenSurvey }
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
    expect(all).toContain(t.versionLine({ year: 2026, version: 2 }))
    expect(all).toContain(t.readOnly)

    expect(byType(tree, "ScoreBreakdown")[0].props.scores).toEqual({
      ibp_total: 31,
      ibp_peuplement_gestion: 22,
      ibp_contexte: 9,
    })
    const factors = byType(tree, "FactorsList")[0]
    expect(factors.props.canEditSurvey).toBe(false)
    expect(factors.props.factorEntries).toHaveLength(10)
    expect(byType(tree, "AppGroupedList")[0].props.sections[0].rows).toHaveLength(2)

    const map = byType(tree, "ParcelMapCard")[0]
    expect(map.props.parcelIds).toEqual([])
    expect(map.props.displayLocation).toEqual({ lat: 47.31, lng: 1.31 })
    expect(map.props.chipLabel).toBe(
      `${t.approximatePosition} · ${fr.surveyDetail.map.parcelCount(2)}`,
    )
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

  it("says when there is no photo, or when the photos failed to load", () => {
    expect(texts(render(state()).tree)).toContain(fr.surveyDetail.photos.emptyReadOnly)
    expect(texts(render(state({ photosFailed: true })).tree)).toContain(t.photosFailed)
  })

  it("lists the other surveys of the parcels and opens one, but not the current one", () => {
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
    const { tree, onOpenSurvey } = render(state({ detail: detail({ history }) }))
    const all = texts(tree).join(" | ")
    expect(all).toContain(t.history.title)
    expect(all).toContain(t.history.current)
    expect(all).toContain(t.history.total(24))

    const previous = tree.root.findAll((n) => n.props.testID === "community-history-s-1")[0]
    act(() => previous.props.onPress())
    expect(onOpenSurvey).toHaveBeenCalledWith("s-1")
    const current = tree.root.findAll((n) => n.props.testID === "community-history-s-2")[0]
    expect(current.props.disabled).toBe(true)
  })

  it("shows no history when the survey is alone on its parcels", () => {
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
    const { tree } = render(state({ detail: detail({ history: [only] }) }))
    expect(texts(tree)).not.toContain(t.history.title)
  })
})
