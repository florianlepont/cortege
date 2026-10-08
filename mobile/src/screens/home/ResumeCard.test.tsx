import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandSpacing4 } from "../../app/brand-tokens"
import { forestAurora } from "../../app/forest-aurora-tokens"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { RESUME_LAYOUT, resumeCardHeight } from "./layout-budget"
import { ResumeCard } from "./ResumeCard"

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
jest.mock("../../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../../ui/ForestCard", () => ({ ForestCard: "ForestCard" }))

const t = fr.home.hero

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
    // Deliberately not factors_filled * 10: the card reads the factor count, not the percentage.
    completion_rate: 71,
    factors_filled: 4,
    ...overrides,
  }
}

function mount(resumeDraft: LocalSurvey | null) {
  const onResume = jest.fn()
  const onCreateSurvey = jest.fn()
  act(() => {
    tree = renderer.create(
      <ResumeCard resumeDraft={resumeDraft} onResume={onResume} onCreateSurvey={onCreateSurvey} />,
    )
  })
  const texts = tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  const button = tree.root.findByType("AppButton" as never)
  const segments = (testID: string) =>
    tree.root.findAll((node) => (node.type as unknown) === "View" && node.props.testID === testID)
  // Any second action: a pressable, or anything named "Nouveau relevé" (12.2-19 fix round).
  const links = tree.root.findAll(
    (node: ReactTestInstance) =>
      (node.type as unknown) === "Pressable" ||
      node.props.accessibilityLabel === fr.home.newSurvey.label,
  )
  return { onResume, onCreateSurvey, texts, button, segments, links }
}

afterEach(() => {
  act(() => tree.unmount())
})

describe("ResumeCard", () => {
  test("without a draft: the start card, a glow button, no progress and no second action", () => {
    const { texts, button, segments, links, onCreateSurvey } = mount(null)
    expect(texts).toEqual(expect.arrayContaining([t.title, t.body]))
    expect(button.props.label).toBe(t.button)
    expect(button.props.variant).toBe("glow")
    expect(segments("hero-progress-done")).toHaveLength(0)
    expect(segments("hero-progress-todo")).toHaveLength(0)
    expect(links).toHaveLength(0)
    act(() => button.props.onPress())
    expect(onCreateSurvey).toHaveBeenCalledTimes(1)
  })

  test("with a draft: resume texts, progress segments and the resume button", () => {
    const { texts, button, segments, links, onResume, onCreateSurvey } = mount(makeSurvey())
    expect(texts).toEqual(
      expect.arrayContaining([
        t.resumeTitle({ name: "Parcelle A" }),
        t.resumeBody({ completed: 4 }),
      ]),
    )
    expect(segments("hero-progress-done")).toHaveLength(4)
    expect(segments("hero-progress-todo")).toHaveLength(6)
    expect(button.props.label).toBe(t.resumeButton)
    expect(button.props.variant).toBe("glow")
    act(() => button.props.onPress())
    expect(onResume).toHaveBeenCalledWith("survey-1")
    expect(links).toHaveLength(0)
    expect(onCreateSurvey).not.toHaveBeenCalled()
  })

  test("there is no tag pill: its text is gone in both states (owner check on the iPhone)", () => {
    for (const draft of [null, makeSurvey()]) {
      const { texts } = mount(draft)
      expect(texts).not.toContain("REPRENDRE")
      expect(texts).not.toContain("COMMENCER")
      expect(Object.keys(t)).not.toEqual(expect.arrayContaining(["eyebrow"]))
      expect(Object.keys(t)).not.toEqual(expect.arrayContaining(["resumeEyebrow"]))
      act(() => tree.unmount())
    }
    mount(null)
  })

  test("the progress sits well under the button row, on the 4 grid (owner check on the iPhone)", () => {
    mount(makeSurvey())
    const progress = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.accessible === false,
    )
    const style = [progress.props.style]
      .flat()
      .reduce(
        (acc: Record<string, unknown>, item: Record<string, unknown>) => ({ ...acc, ...item }),
        {},
      )
    expect(style.marginTop).toBeGreaterThanOrEqual(brandSpacing4.md)
    expect((style.marginTop as number) % 4).toBe(0)
  })

  function styleOf(node: ReactTestInstance): Record<string, unknown> {
    return [node.props.style].flat(3).reduce(
      (acc: Record<string, unknown>, item: Record<string, unknown> | null | undefined) => ({
        ...acc,
        ...(item ?? {}),
      }),
      {},
    )
  }

  test("with a draft the card only resumes: no footer, no second action (12.2-19 fix round)", () => {
    const { links } = mount(makeSurvey())
    expect(links).toHaveLength(0)
    expect(
      tree.root.findAll(
        (node) => (node.type as unknown) === "View" && node.props.testID === "home-resume-footer",
      ),
    ).toHaveLength(0)
    // The card holds the padded body alone, the progress inside it; the one button is "Reprendre".
    const card = tree.root.findByType("ForestCard" as never)
    expect(React.Children.toArray(card.props.children)).toHaveLength(1)
    const progress = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.accessible === false,
    )
    const body = tree.root.find(
      (node) =>
        (node.type as unknown) === "View" &&
        styleOf(node).padding === brandSpacing4.md &&
        node.findAll((inner) => inner === progress).length > 0,
    )
    expect(body).toBeDefined()
    expect(tree.root.findAllByType("AppButton" as never)).toHaveLength(1)
    expect(Object.keys(t)).not.toContain("newSurveyButton")
  })

  test("the ten segments share the inner width exactly: equal flex, 4 pt gap, no minimum width", () => {
    const { segments } = mount(makeSurvey({ factors_filled: 3 }))
    const all = [...segments("hero-progress-done"), ...segments("hero-progress-todo")]
    expect(all).toHaveLength(10)
    const first = styleOf(all[0])
    for (const segment of all) {
      const style = styleOf(segment)
      expect(style.flexGrow).toBe(1)
      expect(style.flexShrink).toBe(1)
      expect(style.flexBasis).toBe(0)
      expect(style.minWidth).toBe(0)
      expect(style.width).toBeUndefined()
      expect(style.height).toBe(first.height)
    }
    const row = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.accessible === false,
    )
    const rowStyle = styleOf(row)
    expect(rowStyle.flexDirection).toBe("row")
    expect(rowStyle.gap).toBe(brandSpacing4.xs)
    expect(rowStyle.alignSelf).toBe("stretch")
    expect(row.children).toHaveLength(10)
  })

  test("an unnamed draft reads the unnamed title", () => {
    const { texts } = mount(makeSurvey({ site_name: "" }))
    expect(texts).toContain(t.resumeTitleUnnamed)
  })

  test("the card is a resume forest card with the aurora, the standard shield (12.2-19)", () => {
    mount(null)
    const card = tree.root.findByType("ForestCard" as never)
    expect(card.props.variant).toBe("resume")
    expect(card.props.testID).toBe("home-resume-card")
    // The aurora is the card's default backdrop: nothing switches it off or replaces it.
    expect(card.props.motion).toBeUndefined()
    expect(card.props.shield).toBeUndefined()
    expect(card.props).not.toHaveProperty("backdrop")
  })

  const blocks = () => tree.root.findByType("ForestCard" as never).props.blocks
  const layoutOf = (testID: string, layout: Record<string, number>) => {
    const node = tree.root.find(
      (inner) => (inner.type as unknown) === "View" && inner.props.testID === testID,
    )
    act(() => node.props.onLayout({ nativeEvent: { layout } }))
    return node
  }
  const COPY = { x: 0, y: 0, width: 200, height: 52 }
  // The row sits at the card's padding: the copy's place in the card.
  const COPY_IN_CARD = {
    x: RESUME_LAYOUT.padding,
    y: RESUME_LAYOUT.padding,
    width: 200,
    height: 52,
  }

  test("the start card's block of text is its title and line, measured in the card", () => {
    mount(null)
    // Until the text is measured nothing is drawn.
    expect(blocks()).toBeNull()
    expect(
      tree.root
        .find(
          (node) => (node.type as unknown) === "View" && node.props.testID === "home-resume-button",
        )
        .findByType("AppButton" as never),
    ).toBeTruthy()
    layoutOf("home-resume-copy", COPY)
    expect(blocks()).toEqual([COPY_IN_CARD])
    const row = tree.root.find(
      (node) => (node.type as unknown) === "View" && styleOf(node).alignItems === "center",
    )
    expect(styleOf(row).gap).toBe(brandSpacing4.smd)
  })

  test("with a draft the segments are a block too, and nothing is drawn before both", () => {
    mount(makeSurvey())
    layoutOf("home-resume-copy", COPY)
    // The segments are not measured yet: nothing drawn, so they never show unshielded.
    expect(blocks()).toBeNull()
    layoutOf("home-resume-progress", { x: 16, y: 92, width: 330, height: 6 })
    expect(blocks()).toEqual([
      COPY_IN_CARD,
      { x: 16, y: 92, width: 330, height: 6, tone: "graphic" },
    ])
  })

  test("the filled segments are the pale forest green that keeps 3:1 over the aurora", () => {
    const { segments } = mount(makeSurvey())
    expect(styleOf(segments("hero-progress-done")[0]).backgroundColor).toBe(
      forestAurora.progressDone,
    )
  })

  test("six factors with four context slots filled read 6, not the 71 percent rounded to 7 (12.2-14)", () => {
    const { texts, segments } = mount(makeSurvey({ completion_rate: 71, factors_filled: 6 }))
    expect(texts).toContain(t.resumeBody({ completed: 6 }))
    expect(texts).not.toContain(t.resumeBody({ completed: 7 }))
    expect(segments("hero-progress-done")).toHaveLength(6)
    expect(segments("hero-progress-todo")).toHaveLength(4)
  })

  test("the completion is clamped to the ten segments", () => {
    const { segments } = mount(makeSurvey({ factors_filled: 25 }))
    expect(segments("hero-progress-done")).toHaveLength(10)
    expect(segments("hero-progress-todo")).toHaveLength(0)
  })

  test("the paddings and gaps are the ones the layout budget counts (12.2-14)", () => {
    mount(makeSurvey())
    const body = tree.root.find(
      (node) =>
        (node.type as unknown) === "View" && styleOf(node).padding === RESUME_LAYOUT.padding,
    )
    expect(body).toBeDefined()
    const progress = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.accessible === false,
    )
    // The 24 pt between the button and the segments stays (owner check on the iPhone), as do the
    // 6 pt segments.
    expect(styleOf(progress).marginTop).toBe(24)
    expect(styleOf(progress).marginTop).toBe(RESUME_LAYOUT.progressGap)
    const segment = tree.root.findAll(
      (node) => (node.type as unknown) === "View" && node.props.testID === "hero-progress-todo",
    )[0]
    expect(styleOf(segment).height).toBe(RESUME_LAYOUT.progressHeight)
    // The body alone: no footer band any more (12.2-19 fix round). The card's hairline is an
    // inset ring inside the box (12.2-17), so it adds no height.
    expect(resumeCardHeight(true, 1, 1)).toBe(
      2 * RESUME_LAYOUT.padding + 52 + RESUME_LAYOUT.progressGap + RESUME_LAYOUT.progressHeight,
    )
  })
})
