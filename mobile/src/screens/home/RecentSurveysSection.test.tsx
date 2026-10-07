import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import { formatShortDateTime } from "../../app/formatters"
import { formatSurveyUiStatusLabel } from "../../app/survey-logic"
import { defaultTheme } from "../../app/theme"
import type { SurveyDetailResponse } from "../../app/types"
import { fr } from "../../i18n"
import { HOME_GAPS, RECENT_LAYOUT, recentSectionHeight } from "./layout-budget"
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
    factors_filled: 0,
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
    // The 44 pt header already holds 13 pt of air above its title: 12 on top (HOME_GAPS.recent).
    expect(style.marginTop).toBe(HOME_GAPS.recent)
    expect((style.marginTop as number) % 4).toBe(0)
  })

  describe("compact rows in one glass card (12.2-14)", () => {
    const card = () =>
      tree.root.find(
        (node: ReactTestInstance) =>
          (node.type as unknown) === "View" && node.props.testID === "home-recent-card",
      )
    const separators = () =>
      tree.root.findAll(
        (node: ReactTestInstance) =>
          (node.type as unknown) === "View" && node.props.testID === "home-recent-separator",
      )

    test("the three rows are inside one card, which carries the glass look", () => {
      mount([makeSurvey("a"), makeSurvey("b"), makeSurvey("c")])
      expect(
        tree.root.findAll(
          (node: ReactTestInstance) =>
            (node.type as unknown) === "View" && node.props.testID === "home-recent-card",
        ),
      ).toHaveLength(1)
      expect(card().findAll((node) => rows().includes(node))).toHaveLength(3)
      const style = styleOf(card())
      expect(style.borderRadius).toBe(brandRadius.card)
      expect(style.borderWidth).toBe(1)
      expect(style.borderColor).toBe(defaultTheme.visual.glass.cardBorder)
      expect(style.backgroundColor).toBe(defaultTheme.visual.glass.cardFill)
      expect(style.boxShadow).toBe(defaultTheme.visual.glass.cardShadow)
    })

    test("a row is flat: no card, border, fill or shadow of its own", () => {
      mount([makeSurvey("a"), makeSurvey("b"), makeSurvey("c")])
      for (const row of rows()) {
        const style = styleOf(row)
        expect(style.borderWidth).toBeUndefined()
        expect(style.backgroundColor).toBeUndefined()
        expect(style.boxShadow).toBeUndefined()
        expect(style.borderRadius).toBeUndefined()
      }
    })

    test("the card clips the wave to its corners, which the rows draw square", () => {
      mount([makeSurvey("a"), makeSurvey("b")])
      const clip = tree.root.find(
        (node: ReactTestInstance) =>
          (node.type as unknown) === "View" && styleOf(node).overflow === "hidden",
      )
      expect(styleOf(clip).borderRadius).toBe(brandRadius.card - 1)
      expect(card().findAll((node) => node === clip)).toHaveLength(1)
      for (const row of rows()) {
        const layer = row.find(
          (node) => (node.type as unknown) === "View" && node.props.testID === "ripple-layer",
        )
        expect(styleOf(layer).borderRadius).toBe(0)
      }
    })

    test("hairline rules divide the rows: one fewer than the rows, none above the first", () => {
      mount([makeSurvey("a"), makeSurvey("b"), makeSurvey("c")])
      expect(separators()).toHaveLength(2)
      for (const separator of separators()) {
        expect(styleOf(separator).height).toBe(1)
        expect(styleOf(separator).backgroundColor).toBe(defaultTheme.colors.divider)
      }
      // Row, rule, row, rule, row: a rule is never first or last in the card.
      const order = card()
        .findAll(
          (node: ReactTestInstance) =>
            (node.type as unknown) === "Pressable" ||
            ((node.type as unknown) === "View" && node.props.testID === "home-recent-separator"),
        )
        .filter((node) => node.props.testID?.startsWith("home-recent-"))
        .map((node) => (node.props.testID.startsWith("home-recent-row-") ? "row" : "rule"))
      expect(order).toEqual(["row", "rule", "row", "rule", "row"])
      act(() => tree.unmount())
      mount([makeSurvey("a")])
      expect(separators()).toHaveLength(0)
      act(() => tree.unmount())
      mount([makeSurvey("a"), makeSurvey("b")])
      expect(separators()).toHaveLength(1)
    })

    test("a row is 52 pt: at least a 44 pt hit area, no more than the compact height", () => {
      mount([makeSurvey("a"), makeSurvey("b"), makeSurvey("c")])
      for (const row of rows()) {
        const style = styleOf(row)
        expect(style.minHeight).toBe(RECENT_LAYOUT.rowHeight)
        expect(style.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
        expect(style.minHeight).toBeLessThanOrEqual(56)
        expect(style.height).toBeUndefined()
        // Two 20 pt lines between the vertical paddings give exactly that height.
        expect(2 * (style.paddingVertical as number) + 20 + 20).toBe(style.minHeight)
        expect(style.flexDirection).toBe("row")
      }
    })

    test("the title is one 20 pt line, the chip and date share the 20 pt second line", () => {
      mount([makeSurvey("a")])
      const row = rows()[0]
      const title = row
        .findAll((node) => (node.type as unknown) === "Text")
        .find((node) => String([node.props.children].flat().join("")) === "Parcelle a")
      expect(title?.props.numberOfLines).toBe(1)
      expect(styleOf(title as ReactTestInstance).lineHeight).toBe(20)
      const statusRow = row.find(
        (node) => (node.type as unknown) === "View" && styleOf(node).minHeight === 20,
      )
      expect(styleOf(statusRow).flexDirection).toBe("row")
      expect(styleOf(statusRow).flexWrap).toBeUndefined()
      const chip = row
        .findAll((node) => (node.type as unknown) === "View")
        .find((node) => styleOf(node).paddingVertical === RECENT_LAYOUT.chipPaddingY)
      expect(chip).toBeDefined()
    })

    test("the ring is on the trailing side, centred on the row, and the text keeps its room (D-27)", () => {
      mount([makeSurvey("a")])
      const row = rows()[0]
      const [accent, content, column, wave] = row.children as ReactTestInstance[]
      expect(styleOf(accent).width).toBe(4)
      expect(styleOf(content)).toMatchObject({ flex: 1, minWidth: 0 })
      expect(column.findAllByType("ScoreRing" as never)).toHaveLength(1)
      expect(content.findAllByType("ScoreRing" as never)).toHaveLength(0)
      expect(styleOf(column)).toMatchObject({ width: RECENT_LAYOUT.ringSize, flexShrink: 0 })
      expect(wave.props.testID).toBe("ripple-layer")
      // the row centres its children vertically, so the ring is centred in the 52 pt
      expect(styleOf(row).alignItems).toBe("center")
      expect(styleOf(row).paddingHorizontal).toBe(16)
    })

    test("the ring is the smaller 32 pt one, in a column of its own width", () => {
      mount([makeSurvey("a")])
      const ring = rows()[0].findByType("ScoreRing" as never)
      expect(ring.props.size).toBe(RECENT_LAYOUT.ringSize)
      expect(RECENT_LAYOUT.ringSize).toBeLessThan(38)
      const column = rows()[0].find(
        (node) =>
          (node.type as unknown) === "View" && styleOf(node).width === RECENT_LAYOUT.ringSize,
      )
      expect(column).toBeDefined()
    })

    test("a tone keeps its accent bar, like a Mes Relevés row", () => {
      mount([
        makeSurvey("a", { status: "submitted", sync_state: "synced" }),
        makeSurvey("b", { sync_state: "failed", sync_blocked: 0 }),
      ])
      const bar = (row: ReactTestInstance) =>
        row.find((node) => (node.type as unknown) === "View" && styleOf(node).width === 4)
      const colours = rows().map((row) => styleOf(bar(row)).backgroundColor)
      expect(colours[0]).not.toBe(colours[1])
      expect(colours[0]).not.toBe("transparent")
    })

    test("the section height is the one the budget counts", () => {
      expect(recentSectionHeight(3)).toBe(
        HOME_GAPS.recent +
          RECENT_LAYOUT.headerHeight +
          RECENT_LAYOUT.headerGap +
          2 * RECENT_LAYOUT.cardBorder +
          3 * RECENT_LAYOUT.rowHeight +
          2 * RECENT_LAYOUT.separator,
      )
      mount([makeSurvey("a")])
      const header = tree.root.find(
        (node: ReactTestInstance) =>
          (node.type as unknown) === "View" &&
          styleOf(node).marginBottom === RECENT_LAYOUT.headerGap,
      )
      expect(header).toBeDefined()
    })
  })
})
