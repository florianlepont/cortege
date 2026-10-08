import fs from "fs"
import path from "path"
import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { scoreRingGeometry } from "../../app/visual-tokens"
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
    factors_filled: 0,
    ...overrides,
  }
}

function mount(overrides: Partial<SurveyRowProps> = {}) {
  const props: SurveyRowProps = {
    survey: makeSurvey(),
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
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
    })
    expect(brandRadius.card).toBe(22)
    expect(style.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    expect(style).not.toHaveProperty("elevation")
    // 12.2-17: circular corners (RN on iOS draws the shadow and the hairline with circular arcs).
    expect(style).not.toHaveProperty("borderCurve")
  })

  test("the press wave layer sits inside the hairline with the card's inner radius (12.2-17)", () => {
    const { card } = mount()
    const style = card.props.style.filter(Boolean)[0]
    const wave = (card.children as ReactTestInstance[]).at(-1) as ReactTestInstance
    expect(wave.props.testID).toBe("ripple-layer")
    const layer = Object.assign({}, ...[wave.props.style].flat(2).filter(Boolean))
    expect(layer.borderRadius).toBe(style.borderRadius - style.borderWidth)
    expect(layer).not.toHaveProperty("borderCurve")
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

  test("shows no photo thumbnail: the row is the ring, the title, the status chip and the date", () => {
    const { card } = mount({ survey: makeSurvey({ status: "submitted" }), score: 34 })
    // accent bar, text column and ring column, then the wave layer: no thumbnail anywhere
    expect(card.children).toHaveLength(4)
    expect(tree.root.findAllByType("ScoreRing" as never)).toHaveLength(1)
    const texts = tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => String(node.props.children))
    expect(texts).toContain("Parcelle A")
  })

  test("the ring is on the trailing side, vertically centred, and the text column reserves its width (D-27)", () => {
    const { card } = mount({ survey: makeSurvey({ status: "submitted" }), score: 34 })
    const [accent, content, indicator, wave] = card.children as ReactTestInstance[]
    expect(accent.props.style[0].width).toBe(4)
    expect(wave.props.testID).toBe("ripple-layer")
    // the ring is the last child before the wave layer, after the title and the status line
    expect(indicator.findAllByType("ScoreRing" as never)).toHaveLength(1)
    expect(content.findAllByType("ScoreRing" as never)).toHaveLength(0)
    const column = indicator.props.style
    expect(column).toMatchObject({ alignSelf: "center", flexShrink: 0, width: 40 })
    // 44 pt hit area, 38 pt ring in a 40 pt column, one card padding from the trailing edge
    expect(column.width).toBeGreaterThanOrEqual(scoreRingGeometry.size)
    // the text column takes the rest and may shrink below its content: a long title wraps
    // (two lines) and truncates before it reaches the ring, also at a large text size
    expect(content.props.style).toMatchObject({ flex: 1, minWidth: 0 })
    const title = content
      .findAll((node) => (node.type as unknown) === "Text" && node.props.numberOfLines === 2)
      .at(0)
    expect(Object.assign({}, ...[title?.props.style].flat(3))).toMatchObject({ flex: 1 })
    const cardStyle = card.props.style.filter(Boolean)[0]
    expect(cardStyle.paddingHorizontal).toBe(brandSpacing4.md)
    expect(cardStyle.paddingHorizontal % 4).toBe(0)
  })

  test("no row code loads a photo any more", () => {
    for (const file of [
      "SurveyRow.tsx",
      "SurveyRowFrame.tsx",
      "../survey-search/CommunityRow.tsx",
    ]) {
      const source = fs.readFileSync(path.join(__dirname, file), "utf8")
      expect(source).not.toMatch(/expo-image|ActivityIndicator|attachmentId|image-outline/)
    }
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
