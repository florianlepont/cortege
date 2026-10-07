import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import type { LocalSurvey } from "../../storage/types"
import { SurveyRow, type SurveyRowProps } from "./SurveyRow"

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
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("react-native-gesture-handler/Swipeable", () => {
  const ReactRef = require("react") as typeof import("react")
  const Swipeable = ReactRef.forwardRef(
    (
      {
        children,
        renderRightActions,
      }: { children?: React.ReactNode; renderRightActions: () => unknown },
      _ref,
    ) => ReactRef.createElement("Swipeable", { renderRightActions }, children),
  )
  Swipeable.displayName = "Swipeable"
  return { __esModule: true, default: Swipeable }
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
    ...overrides,
  }
}

function mount(overrides: Partial<SurveyRowProps> = {}) {
  const props: SurveyRowProps = {
    survey: makeSurvey(),
    preview: null,
    score: null,
    selected: false,
    onOpen: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  }
  act(() => {
    tree = renderer.create(<SurveyRow {...props} />)
  })
  const ring = tree.root.findByType("ScoreRing" as never)
  const card = tree.root.findAll(
    (node: ReactTestInstance) =>
      (node.type as unknown) === "Pressable" && node.props.accessibilityRole === "button",
  )[0]
  return { props, ring, card }
}

afterEach(() => {
  act(() => tree.unmount())
})

describe("SurveyRow score ring (12.2-11)", () => {
  test("a submitted survey with a total shows the ring with that score and a stable animation key", () => {
    const { ring } = mount({ survey: makeSurvey({ status: "submitted" }), score: 34 })
    expect(ring.props.score).toBe(34)
    expect(ring.props.animationKey).toBe("s1:34")
    expect(ring.props.completion).toBeUndefined()
  })

  test("a submitted survey without a score shows the dashed ring", () => {
    const { ring } = mount({ survey: makeSurvey({ status: "submitted" }), score: null })
    expect(ring.props.score).toBeNull()
    expect(ring.props.completion).toBeUndefined()
    expect(ring.props.animationKey).toBeUndefined()
  })

  test("a draft shows a neutral completion arc", () => {
    const { ring } = mount({ survey: makeSurvey({ completion_rate: 40 }) })
    expect(ring.props.score).toBeNull()
    expect(ring.props.completion).toBeCloseTo(0.4)
    expect(ring.props.animationKey).toBe("s1:draft:40")
  })

  test("the draft completion is clamped between 0 and 1", () => {
    expect(mount({ survey: makeSurvey({ completion_rate: 150 }) }).ring.props.completion).toBe(1)
    act(() => tree.unmount())
    expect(mount({ survey: makeSurvey({ completion_rate: -5 }) }).ring.props.completion).toBe(0)
  })

  test("the row index goes to the ring, defaulting to 0", () => {
    expect(mount({ index: 3 }).ring.props.index).toBe(3)
    act(() => tree.unmount())
    expect(mount().ring.props.index).toBe(0)
  })
})

describe("SurveyRow memoisation", () => {
  test("a changed index alone does not re-render the row, a changed score does", () => {
    const { props } = mount({ survey: makeSurvey({ status: "submitted" }), score: 34, index: 1 })
    act(() => tree.update(<SurveyRow {...props} index={2} />))
    expect(tree.root.findByType("ScoreRing" as never).props.index).toBe(1)
    act(() => tree.update(<SurveyRow {...props} index={2} score={35} />))
    const ring = tree.root.findByType("ScoreRing" as never)
    expect(ring.props.score).toBe(35)
    expect(ring.props.index).toBe(2)
  })
})

describe("SurveyRow glass card and interactions", () => {
  test("the card is a glass surface with the card radius and a 44 pt minimum height", () => {
    const { card } = mount()
    const style = card.props.style.filter(Boolean)[0]
    const { glass } = defaultTheme.visual
    expect(style).toMatchObject({
      backgroundColor: glass.cardFill,
      borderColor: glass.cardBorder,
      borderWidth: 1,
      boxShadow: glass.cardShadow,
      borderRadius: brandRadius.card,
      borderCurve: "continuous",
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
    })
    expect(brandRadius.card).toBe(22)
    expect(style.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(style).not.toHaveProperty("elevation")
  })

  test("the row carries the green wave: touching it starts no navigation, only pressing opens", () => {
    const { card, props } = mount()
    expect(
      tree.root.findAll((n) => (n.type as unknown) === "View" && n.props.testID === "ripple-layer"),
    ).toHaveLength(1)
    act(() => card.props.onPressIn({ nativeEvent: { locationX: 30, locationY: 10 } }))
    expect(props.onOpen).not.toHaveBeenCalled()
    // the pressed fill is gone: the wave is the feedback (D-21)
    expect(JSON.stringify(card.props.style)).not.toContain(defaultTheme.colors.surfaceSoft)
  })

  test("pressing the row opens the survey", () => {
    const { card, props } = mount()
    act(() => card.props.onPress())
    expect(props.onOpen).toHaveBeenCalledWith("s1")
  })

  test("the accessibility delete action deletes the survey", () => {
    const { card, props } = mount()
    act(() => card.props.onAccessibilityAction({ nativeEvent: { actionName: "delete" } }))
    expect(props.onDelete).toHaveBeenCalledWith("s1")
    act(() => card.props.onAccessibilityAction({ nativeEvent: { actionName: "other" } }))
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })

  test("the swipe action deletes the survey", () => {
    const { props } = mount()
    const swipeable = tree.root.findByType("Swipeable" as never)
    const deleteAction = swipeable.props.renderRightActions() as React.ReactElement<{
      onPress: () => void
    }>
    act(() => deleteAction.props.onPress())
    expect(props.onDelete).toHaveBeenCalledWith("s1")
  })
})
