import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandSpacing4 } from "../../app/brand-tokens"
import { formatShortDateTime } from "../../app/formatters"
import { formatSurveyUiStatusLabel } from "../../app/survey-logic"
import { defaultTheme } from "../../app/theme"
import type { SurveyDetailResponse } from "../../app/types"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import * as feedbackModule from "../../ui/feedback"
import {
  RECENT_SURVEYS_COUNT,
  RecentSurveysSection,
  pickRecentSurveys,
} from "./RecentSurveysSection"

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
jest.mock("../../ui/EntranceView", () => ({ EntranceView: "EntranceView" }))

let tree: ReactTestRenderer

function makeSurvey(id: string, overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id,
    site_name: `Parcelle ${id}`,
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
    ...overrides,
  }
}

function mount(
  surveys: LocalSurvey[],
  extra: {
    surveyDetails?: Record<string, SurveyDetailResponse | undefined>
    onOpenSurvey?: (id: string) => void
    onSeeAll?: () => void
    firstIndex?: number
  } = {},
) {
  const onOpenSurvey = extra.onOpenSurvey ?? jest.fn()
  const onSeeAll = extra.onSeeAll ?? jest.fn()
  act(() => {
    tree = renderer.create(
      <RecentSurveysSection
        surveys={surveys}
        surveyDetails={extra.surveyDetails ?? {}}
        onOpenSurvey={onOpenSurvey}
        onSeeAll={onSeeAll}
        firstIndex={extra.firstIndex ?? 1}
      />,
    )
  })
  return { onOpenSurvey, onSeeAll }
}

afterEach(() => {
  act(() => tree?.unmount())
})

const rows = () =>
  tree.root.findAll(
    (node: ReactTestInstance) =>
      (node.type as unknown) === "Pressable" &&
      typeof node.props.testID === "string" &&
      node.props.testID.startsWith("home-recent-row-"),
  )

const styleOf = (node: ReactTestInstance): Record<string, unknown> =>
  [node.props.style].flat(3).reduce(
    (acc: Record<string, unknown>, item: Record<string, unknown> | null | undefined) => ({
      ...acc,
      ...(item ?? {}),
    }),
    {},
  )

describe("pickRecentSurveys (D-20c)", () => {
  test("keeps the three latest, any status, newest first, without touching the input", () => {
    const surveys = [
      makeSurvey("old", { updated_at: "2026-09-01T10:00:00.000Z" }),
      makeSurvey("new", { updated_at: "2026-10-06T10:00:00.000Z", status: "submitted" }),
      makeSurvey("mid", { updated_at: "2026-10-03T10:00:00.000Z" }),
      makeSurvey("older", { updated_at: "2026-08-01T10:00:00.000Z" }),
    ]
    const copy = [...surveys]
    expect(RECENT_SURVEYS_COUNT).toBe(3)
    expect(pickRecentSurveys(surveys).map((survey) => survey.id)).toEqual(["new", "mid", "old"])
    expect(surveys).toEqual(copy)
  })

  test("a broken date counts as the oldest", () => {
    const picked = pickRecentSurveys([
      makeSurvey("broken", { updated_at: "not a date" }),
      makeSurvey("ok", { updated_at: "2026-10-03T10:00:00.000Z" }),
    ])
    expect(picked.map((survey) => survey.id)).toEqual(["ok", "broken"])
  })

  test("fewer than three surveys are all shown", () => {
    expect(pickRecentSurveys([makeSurvey("a")])).toHaveLength(1)
    expect(pickRecentSurveys([])).toHaveLength(0)
  })
})

describe("RecentSurveysSection (D-20c)", () => {
  test("shows the three latest surveys in order, from the catalogue title", () => {
    mount([
      makeSurvey("a", { updated_at: "2026-10-01T10:00:00.000Z" }),
      makeSurvey("d", { updated_at: "2026-10-06T10:00:00.000Z" }),
      makeSurvey("b", { updated_at: "2026-10-02T10:00:00.000Z" }),
      makeSurvey("c", { updated_at: "2026-10-03T10:00:00.000Z" }),
    ])
    expect(rows().map((row) => row.props.testID)).toEqual([
      "home-recent-row-d",
      "home-recent-row-c",
      "home-recent-row-b",
    ])
    const titles = tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    expect(titles).toContain(fr.home.recent.title)
    expect(fr.home.recent.title).toBe("Mes relevés récents")
  })

  test("renders nothing, not even the header, without a survey", () => {
    mount([])
    expect(tree.toJSON()).toBeNull()
    expect(tree.root.findAll((node) => (node.type as unknown) === "Text")).toHaveLength(0)
  })

  test("a row is the Mes Relevés box: ring, title, status chip and date, no photo", () => {
    const survey = makeSurvey("a", { updated_at: "2026-10-05T10:00:00.000Z" })
    mount([survey])
    const row = rows()[0]
    expect(row.props.accessibilityRole).toBe("button")
    expect(styleOf(row).minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(row.findAllByType("ScoreRing" as never)).toHaveLength(1)
    expect(row.findAll((node) => (node.type as unknown) === "Image")).toHaveLength(0)
    const texts = row
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    const updatedAt = formatShortDateTime(survey.updated_at)
    expect(texts).toContain("Parcelle a")
    expect(texts).toContain(formatSurveyUiStatusLabel("draft"))
    expect(texts).toContain(fr.surveyList.row.updatedMeta(updatedAt))
    expect(row.props.accessibilityLabel).toBe(
      fr.surveyList.a11y.openSurvey({
        name: "Parcelle a",
        status: formatSurveyUiStatusLabel("draft"),
        updatedAt,
      }),
    )
  })

  test("an unnamed survey reads the untitled name, in the title and for a screen reader", () => {
    mount([makeSurvey("a", { site_name: "  " })])
    const row = rows()[0]
    const texts = row
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    expect(texts).toContain(fr.common.untitledSurvey)
    expect(String(row.props.accessibilityLabel)).toContain(fr.common.untitledSurvey)
  })

  describe("the ring score", () => {
    const ringOf = () => rows()[0].findByType("ScoreRing" as never)

    test("a draft shows how many of the ten factors are filled", () => {
      mount([makeSurvey("a", { completion_rate: 40 })])
      expect(ringOf().props.score).toBeNull()
      expect(ringOf().props.completion).toBe(0.4)
    })

    test("a submitted survey shows its loaded total first, then the stored one, then the dashed ring", () => {
      const detail = { scores: { ibp_total: 41 } } as unknown as SurveyDetailResponse
      mount([makeSurvey("a", { status: "submitted", ibp_total: 30 })], {
        surveyDetails: { a: detail },
      })
      expect(ringOf().props.score).toBe(41)
      act(() => tree.unmount())
      mount([makeSurvey("a", { status: "submitted", ibp_total: 30 })])
      expect(ringOf().props.score).toBe(30)
      act(() => tree.unmount())
      mount([makeSurvey("a", { status: "submitted" })])
      expect(ringOf().props.score).toBeNull()
      expect(ringOf().props.completion).toBeUndefined()
    })
  })

  test("a sync error shows as a danger chip like in Mes Relevés", () => {
    mount([makeSurvey("a", { sync_state: "failed", sync_blocked: 0 })])
    const texts = rows()[0]
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    expect(texts).toContain(formatSurveyUiStatusLabel("sync_error"))
  })

  test("pressing a row opens that survey, with the selection haptic", () => {
    const selection = jest.spyOn(feedbackModule.feedback, "selection").mockImplementation(() => {})
    const { onOpenSurvey } = mount([
      makeSurvey("a", { updated_at: "2026-10-01T10:00:00.000Z" }),
      makeSurvey("b", { updated_at: "2026-10-02T10:00:00.000Z" }),
    ])
    act(() => rows()[0].props.onPress())
    expect(onOpenSurvey).toHaveBeenCalledTimes(1)
    expect(onOpenSurvey).toHaveBeenLastCalledWith("b")
    act(() => rows()[1].props.onPress())
    expect(onOpenSurvey).toHaveBeenLastCalledWith("a")
    expect(selection).toHaveBeenCalledTimes(2)
    selection.mockRestore()
  })

  test("each row carries the green wave of RipplePressable", () => {
    mount([makeSurvey("a"), makeSurvey("b")])
    for (const row of rows()) {
      expect(
        row.findAll(
          (node) => (node.type as unknown) === "View" && node.props.testID === "ripple-layer",
        ),
      ).toHaveLength(1)
    }
  })

  describe("the Tout voir link", () => {
    const link = () =>
      tree.root.find(
        (node: ReactTestInstance) =>
          (node.type as unknown) === "Pressable" && node.props.testID === "home-recent-see-all",
      )

    test("goes to Mes Relevés, with its own screen-reader label", () => {
      const { onSeeAll } = mount([makeSurvey("a")])
      expect(link().props.accessibilityRole).toBe("button")
      expect(link().props.accessibilityLabel).toBe(fr.home.recent.seeAllLabel)
      const label = link().findByType("Text" as never)
      expect(label.props.children).toBe(fr.home.recent.seeAll)
      expect(fr.home.recent.seeAll).toBe("Tout voir")
      act(() => link().props.onPress())
      expect(onSeeAll).toHaveBeenCalledTimes(1)
    })

    test("is a 44 pt target with the accent text colour", () => {
      mount([makeSurvey("a")])
      const style = styleOf(link())
      expect(style.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
      expect(style.minWidth).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
      expect(styleOf(link().findByType("Text" as never)).color).toBe(defaultTheme.visual.accentText)
    })
  })

  test("the header and the rows enter one after the other, from the first index", () => {
    mount([makeSurvey("a"), makeSurvey("b"), makeSurvey("c"), makeSurvey("d")], { firstIndex: 2 })
    const indexes = tree.root
      .findAll((node) => (node.type as unknown) === "EntranceView")
      .map((node) => node.props.index as number)
    expect(indexes).toEqual([2, 3, 4, 5])
  })

  test("the section keeps the page margin and 4 grid spacing", () => {
    mount([makeSurvey("a"), makeSurvey("b")])
    const section = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.testID === "home-recent-surveys",
    )
    const style = styleOf(section)
    expect(style.marginHorizontal).toBe(brandSpacing4.md)
    expect(style.marginTop).toBe(brandSpacing4.lg)
    const gap = styleOf(
      tree.root.find(
        (node) => (node.type as unknown) === "View" && styleOf(node).gap === brandSpacing4.sm,
      ),
    ).gap as number
    expect(gap % 4).toBe(0)
  })
})
