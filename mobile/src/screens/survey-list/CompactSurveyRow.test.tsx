import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { formatShortDateTime } from "../../app/formatters"
import { formatSurveyUiStatusLabel } from "../../app/survey-logic"
import type { SurveyDetailResponse } from "../../app/types"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { RECENT_LAYOUT } from "../home/layout-budget"
import { CompactSurveyRow } from "./CompactSurveyRow"

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
jest.mock("../../ui/ScoreRing", () => ({ ScoreRing: "ScoreRing" }))

let tree: ReactTestRenderer

function makeSurvey(overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id: "s1",
    site_name: "Parcelle A",
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

function mount(
  survey: LocalSurvey,
  extra: {
    surveyDetails?: Record<string, SurveyDetailResponse | undefined>
    onOpen?: (id: string) => void
  } = {},
) {
  const onOpen = extra.onOpen ?? jest.fn()
  act(() => {
    tree = renderer.create(
      <CompactSurveyRow
        survey={survey}
        surveyDetails={extra.surveyDetails ?? {}}
        index={0}
        onOpen={onOpen}
        testID="row"
      />,
    )
  })
  return { onOpen }
}

afterEach(() => {
  act(() => tree?.unmount())
})

const row = () =>
  tree.root.find(
    (node: ReactTestInstance) =>
      (node.type as unknown) === "Pressable" && node.props.testID === "row",
  )

const textsOf = (node: ReactTestInstance) =>
  node
    .findAll((child) => (child.type as unknown) === "Text")
    .map((child) => String([child.props.children].flat().join("")))

describe("CompactSurveyRow (25-04)", () => {
  test("is the slim 52 pt row with the 32 pt ring", () => {
    mount(makeSurvey())
    const style = [row().props.style].flat(3).reduce((acc, item) => ({ ...acc, ...item }), {})
    expect(style.minHeight).toBe(RECENT_LAYOUT.rowHeight)
    expect(row().findByType("ScoreRing" as never).props.size).toBe(RECENT_LAYOUT.ringSize)
  })

  test("shows the title, the status label and the short date", () => {
    const survey = makeSurvey()
    mount(survey)
    const texts = textsOf(row())
    expect(texts).toContain("Parcelle A")
    expect(texts).toContain(formatSurveyUiStatusLabel("draft"))
    expect(texts).toContain(fr.surveyList.row.updatedMeta(formatShortDateTime(survey.updated_at)))
  })

  test("an unnamed survey reads the untitled name", () => {
    mount(makeSurvey({ site_name: "  " }))
    expect(textsOf(row())).toContain(fr.common.untitledSurvey)
    expect(String(row().props.accessibilityLabel)).toContain(fr.common.untitledSurvey)
  })

  test("the accessibility label names the survey, its status and its date", () => {
    const survey = makeSurvey()
    mount(survey)
    expect(row().props.accessibilityRole).toBe("button")
    expect(row().props.accessibilityLabel).toBe(
      fr.surveyList.a11y.openSurvey({
        name: "Parcelle A",
        status: formatSurveyUiStatusLabel("draft"),
        updatedAt: formatShortDateTime(survey.updated_at),
      }),
    )
  })

  test("a draft ring shows the completion, a submitted one its loaded total", () => {
    mount(makeSurvey({ completion_rate: 40 }))
    expect(row().findByType("ScoreRing" as never).props.score).toBeNull()
    expect(row().findByType("ScoreRing" as never).props.completion).toBe(0.4)
    act(() => tree.unmount())
    const detail = { scores: { ibp_total: 41 } } as unknown as SurveyDetailResponse
    mount(makeSurvey({ status: "submitted", ibp_total: 30 }), { surveyDetails: { s1: detail } })
    expect(row().findByType("ScoreRing" as never).props.score).toBe(41)
  })

  test("a sync error shows the danger label", () => {
    mount(makeSurvey({ sync_state: "failed", sync_blocked: 0 }))
    expect(textsOf(row())).toContain(formatSurveyUiStatusLabel("sync_error"))
  })

  test("pressing the row opens that survey", () => {
    const { onOpen } = mount(makeSurvey())
    act(() => row().props.onPress())
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith("s1")
  })

  test("the row carries the green wave", () => {
    mount(makeSurvey())
    expect(
      row().findAll(
        (node) => (node.type as unknown) === "View" && node.props.testID === "ripple-layer",
      ),
    ).toHaveLength(1)
  })
})
