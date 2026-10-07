import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
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
})
