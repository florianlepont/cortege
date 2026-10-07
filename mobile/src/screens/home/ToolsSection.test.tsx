/**
 * Tests for ToolsSection (OA-107): the photo identification launched from Accueil, whose genus goes
 * into a survey in progress or starts a survey.
 */
import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandRadius } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { HOME_GAPS, TOOL_ROW_MIN_HEIGHT } from "./layout-budget"
import { openDrafts, ToolsSection } from "./ToolsSection"

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
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./GenusTargetSheet", () => ({ GenusTargetSheet: "GenusTargetSheet" }))
jest.mock("../../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../../ui/AppSectionHeader", () => ({ AppSectionHeader: "AppSectionHeader" }))
jest.mock("../../ui/GenusRecognitionModal", () => ({
  GenusRecognitionModal: "GenusRecognitionModal",
}))

const t = fr.home.tools

let tree: ReactTestRenderer

function makeSurvey(overrides: Partial<LocalSurvey> = {}): LocalSurvey {
  return {
    id: "survey-1",
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
    // Deliberately not factors_filled * 10: the sheet shows the factor count, not the percentage.
    completion_rate: 64,
    factors_filled: 4,
    ...overrides,
  }
}

function mount(
  surveys: LocalSurvey[] = [makeSurvey()],
  handlers: Partial<React.ComponentProps<typeof ToolsSection>> = {},
) {
  const onAddGenusToSurvey = jest.fn(async () => true)
  const onStartSurveyWithGenus = jest.fn()
  act(() => {
    tree = renderer.create(
      <ToolsSection
        surveys={surveys}
        onAddGenusToSurvey={onAddGenusToSurvey}
        onStartSurveyWithGenus={onStartSurveyWithGenus}
        {...handlers}
      />,
    )
  })
  return { onAddGenusToSurvey, onStartSurveyWithGenus }
}

const byType = (type: string) =>
  tree.root.find((node) => (node.type as unknown) === type) as ReactTestInstance
const maybeByType = (type: string) =>
  tree.root.findAll((node) => (node.type as unknown) === type)[0] as ReactTestInstance | undefined
const modal = () => byType("GenusRecognitionModal")
const sheet = () => byType("GenusTargetSheet")

/** Photo tool open, a genus confirmed, the recognition sheet closed, the survey sheet delay run. */
function confirmFagus() {
  act(() => {
    byType("Pressable").props.onPress()
  })
  act(() => {
    modal().props.onConfirmGenus("Fagus")
    modal().props.onClose()
  })
  act(() => {
    jest.advanceTimersByTime(500)
  })
}

beforeEach(() => {
  tree = undefined as unknown as ReactTestRenderer
  jest.useFakeTimers()
})
afterEach(() => {
  if (tree) act(() => tree.unmount())
  jest.useRealTimers()
})

describe("openDrafts", () => {
  test("keeps the surveys still open, most recent first, at most five", () => {
    const surveys = [
      makeSurvey({ id: "old", updated_at: "2026-10-01T00:00:00.000Z" }),
      makeSurvey({ id: "sub", status: "submitted" }),
      ...["a", "b", "c", "d"].map((id, i) =>
        makeSurvey({ id: id, updated_at: `2026-10-0${i + 2}T00:00:00.000Z` }),
      ),
    ]
    expect(openDrafts(surveys).map((survey) => survey.id)).toEqual(["d", "c", "b", "a", "old"])
    expect(
      openDrafts([...surveys, makeSurvey({ id: "e", updated_at: "2026-10-06T00:00:00.000Z" })]),
    ).toHaveLength(5)
  })
})

describe("ToolsSection", () => {
  test("its gaps and row height are the ones the layout budget counts (12.2-14)", () => {
    mount()
    const flat = (node: ReactTestInstance) =>
      Object.assign({}, ...[node.props.style].flat()) as Record<string, unknown>
    const section = tree.root.find(
      (node) => (node.type as unknown) === "View" && flat(node).marginTop !== undefined,
    )
    expect(flat(section).marginTop).toBe(HOME_GAPS.section)
    expect(flat(byType("AppSectionHeader")).marginBottom).toBe(HOME_GAPS.sectionHeader)
    expect(flat(byType("Pressable")).minHeight).toBe(TOOL_ROW_MIN_HEIGHT)
  })

  test("shows the Outils section with the photo identification card, the tool closed", () => {
    mount()
    expect(byType("AppSectionHeader").props.title).toBe(t.title)
    expect(byType("Pressable").props.accessibilityLabel).toBe(t.identify.a11y)
    expect(modal().props.visible).toBe(false)
    expect(sheet().props.visible).toBe(false)
  })

  test("the identify card has the glass look and keeps its accessibility contract and hit area", () => {
    mount()
    const card = byType("Pressable")
    const style = Object.assign({}, ...[card.props.style].flat()) as Record<string, unknown>
    const { glass } = defaultTheme.visual
    expect(style.backgroundColor).toBe(glass.cardFill)
    expect(style.borderColor).toBe(glass.cardBorder)
    expect(style.borderWidth).toBe(1)
    expect(style.boxShadow).toBe(glass.cardShadow)
    expect(style.borderRadius).toBe(brandRadius.card)
    expect(card.props.accessibilityRole).toBe("button")
    expect(card.props.testID).toBe("tool-identify-tree")
    expect(style.minHeight as number).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
  })

  test("the identify entry is one slim full-width row of 56 to 64 pt (D-20d)", () => {
    mount()
    const card = byType("Pressable")
    const style = Object.assign({}, ...[card.props.style].flat()) as Record<string, unknown>
    // A row of icon tile, texts and chevron, not a half-width tile: it spans the page and has no
    // maximum width.
    expect(style.flexDirection).toBe("row")
    expect(style.alignItems).toBe("center")
    expect(style.maxWidth).toBeUndefined()
    expect(style.flex).toBeUndefined()
    const minHeight = style.minHeight as number
    expect(minHeight).toBeGreaterThanOrEqual(56)
    expect(minHeight).toBeLessThanOrEqual(64)
    expect(minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    // The 40 pt icon tile plus the vertical padding gives that height.
    const icon = card.findAll(
      (node) =>
        (node.type as unknown) === "View" && (node.props.style as { width?: number })?.width === 40,
    )
    expect(icon).toHaveLength(1)
    expect((style.paddingVertical as number) * 2 + 40).toBe(minHeight)
    expect((style.paddingVertical as number) % 4).toBe(0)
    // The title and the one-line subtitle are both there, and nothing else carries text (no tag).
    const texts = card
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String([node.props.children].flat().join("")))
    expect(texts).toEqual([t.identify.title, t.identify.body])
  })

  test("the card opens the photo tool", () => {
    mount()
    act(() => {
      byType("Pressable").props.onPress()
    })
    expect(modal().props.visible).toBe(true)
  })

  test("closing the tool without a genus opens nothing else", () => {
    mount()
    act(() => {
      byType("Pressable").props.onPress()
    })
    act(() => {
      modal().props.onClose()
    })
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(modal().props.visible).toBe(false)
    expect(sheet().props.visible).toBe(false)
  })

  test("a confirmed genus opens the choice of survey once the tool has closed", () => {
    mount([
      makeSurvey({ id: "s1", site_name: "Test OB" }),
      makeSurvey({ id: "s2", site_name: " " }),
    ])
    act(() => {
      byType("Pressable").props.onPress()
    })
    act(() => {
      modal().props.onConfirmGenus("Fagus")
    })
    // The tool is still open: the survey sheet waits for it to close.
    expect(sheet().props.visible).toBe(false)
    act(() => {
      modal().props.onClose()
    })
    expect(sheet().props.visible).toBe(false)
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(sheet().props.visible).toBe(true)
    expect(sheet().props.genusName).toBe(fr.genus.displayName.Fagus)
    expect(sheet().props.targets).toEqual([
      { id: "s1", name: "Test OB", progress: 4 },
      { id: "s2", name: fr.common.untitledSurvey, progress: 4 },
    ])
    // The photo result says a survey is chosen next (OA-114).
    expect(modal().props.confirmLabel).toBe(t.identify.confirm)
  })

  test("with no survey in progress the sheet has no survey to choose, only to start one", () => {
    mount([makeSurvey({ status: "submitted" })])
    confirmFagus()
    expect(sheet().props.targets).toEqual([])
  })

  test("choosing a survey adds the genus to it and confirms it", async () => {
    const { onAddGenusToSurvey } = mount([makeSurvey({ id: "s1", site_name: "Test OB" })])
    confirmFagus()
    await act(async () => {
      sheet().props.onChooseTarget("s1")
    })
    expect(onAddGenusToSurvey).toHaveBeenCalledWith("s1", "Fagus")
    expect(byType("AppNotice").props.tone).toBe("success")
    expect(byType("AppNotice").props.message).toBe(
      t.genusAdded({ genus: fr.genus.displayName.Fagus, name: "Test OB" }),
    )
  })

  test("a survey that refuses the genus shows a warning, not a confirmation", async () => {
    mount([makeSurvey({ id: "s1", site_name: null as unknown as string })], {
      onAddGenusToSurvey: jest.fn(async () => false),
    })
    confirmFagus()
    await act(async () => {
      sheet().props.onChooseTarget("s1")
    })
    expect(byType("AppNotice").props.tone).toBe("warning")
    expect(byType("AppNotice").props.message).toBe(t.addFailed)
  })

  test("'commencer un relevé' starts a survey with the genus", () => {
    const { onStartSurveyWithGenus } = mount()
    confirmFagus()
    act(() => {
      sheet().props.onStartSurvey()
    })
    expect(onStartSurveyWithGenus).toHaveBeenCalledWith("Fagus")
  })

  test("cancelling the choice closes the sheet and forgets the genus", () => {
    mount()
    confirmFagus()
    act(() => {
      sheet().props.onClose()
    })
    expect(sheet().props.visible).toBe(false)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(sheet().props.visible).toBe(false)
  })

  test("the confirmation goes away by itself, or when dismissed", async () => {
    mount()
    confirmFagus()
    await act(async () => {
      sheet().props.onChooseTarget("s1")
    })
    expect(maybeByType("AppNotice")).toBeDefined()
    act(() => {
      jest.advanceTimersByTime(5500)
    })
    expect(maybeByType("AppNotice")).toBeUndefined()

    confirmFagus()
    await act(async () => {
      sheet().props.onChooseTarget("s1")
    })
    act(() => {
      byType("AppNotice").props.action.onPress()
    })
    expect(maybeByType("AppNotice")).toBeUndefined()
  })
})
