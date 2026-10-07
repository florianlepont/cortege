import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
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
    completion_rate: 40,
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
  const links = tree.root.findAll(
    (node: ReactTestInstance) =>
      (node.type as unknown) === "Pressable" && node.props.accessibilityLabel === t.newSurveyButton,
  )
  return { onResume, onCreateSurvey, texts, button, segments, links }
}

afterEach(() => {
  act(() => tree.unmount())
})

describe("ResumeCard", () => {
  test("without a draft: the start card, a glow button, no progress and no link", () => {
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

  test("with a draft: resume texts, progress segments, resume button and new survey link", () => {
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

    expect(links).toHaveLength(1)
    const style = (
      Array.isArray(links[0].props.style) ? links[0].props.style : [links[0].props.style]
    )
      .flat()
      .reduce(
        (acc: Record<string, unknown>, item: Record<string, unknown>) => ({ ...acc, ...item }),
        {},
      )
    expect(style.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    act(() => links[0].props.onPress())
    expect(onCreateSurvey).toHaveBeenCalledTimes(1)
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

  test("a full-width rule and a footer band of their own separate the link (D-20a)", () => {
    mount(makeSurvey())
    const footer = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.testID === "home-resume-footer",
    )
    const footerStyle = styleOf(footer)
    const forest = defaultTheme.visual.forest
    expect(footerStyle.borderTopWidth).toBeGreaterThanOrEqual(1)
    expect(footerStyle.borderTopColor).toBe(forest.tagBorder)
    expect(footerStyle.backgroundColor).toBe(forest.tileFill)
    // The footer is a direct child of the card content (not of the padded body): the rule is edge
    // to edge, and the link is the only thing in it.
    const card = tree.root.findByType("ForestCard" as never)
    const children = React.Children.toArray(card.props.children) as React.ReactElement[]
    expect(children).toHaveLength(2)
    expect(card.props.contentStyle).toBeUndefined()
    const link = footer.findAll(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        node.props.accessibilityLabel === t.newSurveyButton,
    )
    expect(link).toHaveLength(1)
    expect(styleOf(link[0]).minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(((footerStyle.paddingVertical as number) ?? 0) % 4).toBe(0)
  })

  test("the link is not inside the padded body, the progress is", () => {
    mount(makeSurvey())
    const footer = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.testID === "home-resume-footer",
    )
    const progress = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.accessible === false,
    )
    expect(footer.findAll((node) => node === progress)).toHaveLength(0)
    const body = tree.root.find(
      (node) =>
        (node.type as unknown) === "View" &&
        styleOf(node).padding === brandSpacing4.md &&
        node.findAll((inner) => inner === progress).length > 0,
    )
    expect(body).toBeDefined()
  })

  test("without a draft there is no footer and no rule", () => {
    mount(null)
    expect(
      tree.root.findAll(
        (node) => (node.type as unknown) === "View" && node.props.testID === "home-resume-footer",
      ),
    ).toHaveLength(0)
  })

  test("the ten segments share the inner width exactly: equal flex, 4 pt gap, no minimum width", () => {
    const { segments } = mount(makeSurvey({ completion_rate: 30 }))
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

  test("the card is a resume forest card with contours", () => {
    mount(null)
    const card = tree.root.findByType("ForestCard" as never)
    expect(card.props.variant).toBe("resume")
    expect(card.props.testID).toBe("home-resume-card")
    expect(card.props.contours).not.toBe(false)
  })

  test("the completion is clamped to the ten segments", () => {
    const { segments } = mount(makeSurvey({ completion_rate: 250 }))
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
    // 6 pt segments and the 1 pt rule over the 44 pt link.
    expect(styleOf(progress).marginTop).toBe(24)
    expect(styleOf(progress).marginTop).toBe(RESUME_LAYOUT.progressGap)
    const segment = tree.root.findAll(
      (node) => (node.type as unknown) === "View" && node.props.testID === "hero-progress-todo",
    )[0]
    expect(styleOf(segment).height).toBe(RESUME_LAYOUT.progressHeight)
    const footer = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.testID === "home-resume-footer",
    )
    expect(styleOf(footer).borderTopWidth).toBe(RESUME_LAYOUT.footerRule)
    expect(styleOf(footer).paddingVertical).toBe(RESUME_LAYOUT.footerPaddingY)
    // The band is the 44 pt link: rule plus link plus the card's two hairlines, plus the body.
    expect(resumeCardHeight(true, 1, 1)).toBe(
      2 * RESUME_LAYOUT.border +
        (2 * RESUME_LAYOUT.padding +
          52 +
          RESUME_LAYOUT.progressGap +
          RESUME_LAYOUT.progressHeight) +
        (RESUME_LAYOUT.footerRule + 2 * RESUME_LAYOUT.footerPaddingY + 44),
    )
  })
})
