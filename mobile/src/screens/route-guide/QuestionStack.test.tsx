import React from "react"
import renderer, { act, ReactTestInstance } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    Modal: mockComponent("Modal"),
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
      style?: unknown
    }) =>
      ReactRef.createElement(
        "Pressable",
        { ...props, style: typeof style === "function" ? style({ pressed: false }) : style },
        typeof children === "function" ? children({ pressed: false }) : children,
      ),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
    AccessibilityInfo: { setAccessibilityFocus: (...args: unknown[]) => mockFocus(...args) },
    findNodeHandle: () => 7,
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))

const mockFocus = jest.fn()

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { fr } from "../../i18n"
import { QuestionStack } from "./QuestionStack"
import { useRouteGuideState, type RouteGuideState } from "./useRouteGuideState"

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

afterEach(() => {
  setReducedMotion(false)
  mockFocus.mockClear()
})

const guide = fr.routeGuide

function mount(prefill: number | null) {
  let latest!: RouteGuideState
  function Harness() {
    const state = useRouteGuideState({ surfaceHaPrefill: prefill })
    latest = state
    return React.createElement(QuestionStack, { state })
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(React.createElement(Harness))
  })
  const byId = (id: string): ReactTestInstance[] =>
    tree.root.findAll((node) => node.props.testID === id && typeof node.type === "string")
  const one = (id: string): ReactTestInstance => {
    const found = byId(id)
    expect(found).toHaveLength(1)
    return found[0]
  }
  const press = (id: string) => act(() => one(id).props.onPress())
  const texts = () =>
    tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .flatMap((node) => React.Children.toArray(node.props.children).map(String))
  return { tree, state: () => latest, byId, one, press, texts }
}

describe("QuestionStack: the open card", () => {
  it("opens on the surface card with only the question, the field and Suivant", () => {
    const { one, byId, texts } = mount(2.4)
    expect(byId("route-answer-surface")).toHaveLength(0)
    const title = one("route-question-surface")
    expect(title).toBeDefined()
    const field = one("route-surface-field")
    expect(field.props.value).toBe("2,4")
    expect(field.props.keyboardType).toBe("decimal-pad")
    expect(field.props.returnKeyType).toBe("done")
    expect(field.props.accessibilityLabel).toBe(guide.a11y.surfaceField)
    expect(texts()).toEqual(
      expect.arrayContaining([
        guide.questions.surface.title,
        guide.questions.surface.label,
        guide.questions.surface.suffix,
      ]),
    )
    // The helper sentences live in the information sheet, not on the card.
    for (const text of [
      guide.questions.surface.why,
      guide.questions.surface.estimated,
      guide.questions.surface.aid,
      guide.questions.surface.linearHelp,
    ]) {
      expect(texts()).not.toContain(text)
    }
    expect(one("route-next-surface").props.accessibilityState).toMatchObject({ disabled: false })
    expect(one("route-next-surface").props.accessibilityRole).toBe("button")
    const nextStyle = ([] as Record<string, unknown>[])
      .concat(one("route-next-surface").props.style)
      .flat(2)
      .reduce((acc, style) => ({ ...acc, ...style }), {})
    expect(Number(nextStyle.minHeight)).toBeGreaterThanOrEqual(44)
    expect(nextStyle.alignSelf).toBe("stretch")
    expect(byId("route-question-stack")).toHaveLength(1)
  })

  it("titles are headers; one information sheet holds the helper, the hectare and the hedge limit", () => {
    const { tree, one, byId, texts, press } = mount(2.4)
    const headers = tree.root.findAll(
      (node) => (node.type as unknown) === "Text" && node.props.accessibilityRole === "header",
    )
    expect(headers.map((node) => node.props.children)).toEqual([guide.questions.surface.title])
    const info = one("route-question-info-surface")
    expect(info.props.accessibilityLabel).toBe(
      guide.a11y.questionInfo(guide.questions.surface.title),
    )
    expect(byId("route-question-info-homogeneity")).toHaveLength(0)
    press("route-question-info-surface")
    const body = [
      guide.questions.surface.why,
      guide.questions.surface.estimated,
      guide.questions.surface.aid,
      guide.questions.surface.linearHelp,
    ].join("\n\n")
    expect(texts()).toContain(body)
  })

  it("opens empty with its explanation when no surface could be estimated", () => {
    const { one, texts } = mount(null)
    expect(one("route-surface-field").props.value).toBe("")
    expect(texts()).toContain(guide.questions.surface.unknown)
    expect(texts()).not.toContain(guide.questions.surface.estimated)
  })

  it("shows the field error and disables Suivant until the text changes", () => {
    const { one, byId, texts } = mount(null)
    act(() => one("route-surface-field").props.onChangeText("abc"))
    act(() => one("route-surface-field").props.onBlur())
    expect(texts()).toContain(guide.surfaceErrors.invalid)
    expect(one("route-next-surface").props.accessibilityState).toMatchObject({ disabled: true })
    expect(one("route-next-surface").props.disabled).toBe(true)
    act(() => one("route-surface-field").props.onChangeText("2"))
    expect(texts()).not.toContain(guide.surfaceErrors.invalid)
    expect(one("route-next-surface").props.disabled).toBe(false)
    expect(byId("route-answer-surface")).toHaveLength(0)
  })

  it("an empty surface asks for it when Suivant is pressed", () => {
    const { press, texts } = mount(null)
    press("route-next-surface")
    expect(texts()).toContain(guide.surfaceErrors.missing)
  })
})

describe("QuestionStack: answering and rows", () => {
  it("Suivant collapses the surface to a row and opens the homogeneity question with its choices", () => {
    const { press, one, byId, state, texts } = mount(2.4)
    expect(mockFocus).not.toHaveBeenCalled()
    press("route-next-surface")
    const row = one("route-answer-surface")
    expect(row.props.accessibilityRole).toBe("button")
    expect(row.props.accessibilityLabel).toBe(
      guide.a11y.answerRow({ question: "Surface", answer: "2,4 ha, estimée" }),
    )
    expect(row.props.accessibilityHint).toBe(guide.a11y.answerRowHint)
    expect(byId("route-surface-field")).toHaveLength(0)
    expect(state().view.open?.id).toBe("homogeneity")
    expect(texts()).toEqual(
      expect.arrayContaining([
        guide.questions.homogeneity.title,
        guide.questions.homogeneity.options.homogeneous.caption,
        guide.questions.homogeneity.options.heterogeneous.caption,
      ]),
    )
    // The reason it is asked is in the question's information sheet only.
    expect(texts()).not.toContain(guide.questions.homogeneity.why)
    press("route-question-info-homogeneity")
    expect(texts()).toContain(guide.questions.homogeneity.why)
    const homogeneous = one("route-choice-homogeneity-homogeneous")
    expect(homogeneous.props.accessibilityRole).toBe("radio")
    expect(homogeneous.props.accessibilityLabel).toBe(
      guide.a11y.optionLabel({
        label: guide.questions.homogeneity.options.homogeneous.title,
        caption: guide.questions.homogeneity.options.homogeneous.caption,
      }),
    )
    expect(homogeneous.props.accessibilityState.selected).toBe(false)
    // The focus follows the card that opens after the page is shown.
    expect(mockFocus).toHaveBeenCalledWith(7)
  })

  it("a tap on a choice answers at once and the next question opens", () => {
    const { press, one, byId, state } = mount(2.4)
    press("route-next-surface")
    press("route-choice-homogeneity-heterogeneous")
    expect(one("route-answer-homogeneity").props.accessibilityLabel).toBe(
      guide.a11y.answerRow({ question: "Aspect", answer: "Varié" }),
    )
    expect(state().view.open?.id).toBe("difficulty")
    expect(byId("route-choice-difficulty-hard")).toHaveLength(1)
    press("route-choice-difficulty-easy")
    expect(one("route-answer-difficulty").props.accessibilityLabel).toBe(
      guide.a11y.answerRow({ question: "Observation", answer: "Facile à observer" }),
    )
    expect(state().view.open).toBeNull()
    expect(byId("route-question-difficulty")).toHaveLength(0)
    expect(state().view.canUse).toBe(true)
  })

  it("pressing an answered row reopens that question with its answer selected", () => {
    const { press, one, byId } = mount(2.4)
    press("route-next-surface")
    press("route-choice-homogeneity-heterogeneous")
    press("route-answer-homogeneity")
    expect(byId("route-answer-homogeneity")).toHaveLength(0)
    expect(one("route-choice-homogeneity-heterogeneous").props.accessibilityState.selected).toBe(
      true,
    )
    expect(one("route-choice-homogeneity-homogeneous").props.accessibilityState.selected).toBe(
      false,
    )
  })

  it("draws the width question only when the package asks for it", () => {
    const { press, byId } = mount(4)
    press("route-next-surface")
    press("route-choice-homogeneity-homogeneous")
    press("route-choice-difficulty-easy")
    expect(byId("route-choice-narrow-yes")).toHaveLength(1)
    press("route-choice-narrow-no")
    expect(byId("route-answer-narrow")).toHaveLength(1)
    // Hard to observe: the strip is imposed, the width question leaves the stack.
    press("route-answer-difficulty")
    press("route-choice-difficulty-hard")
    expect(byId("route-answer-narrow")).toHaveLength(0)
    expect(byId("route-question-narrow")).toHaveLength(0)
  })

  it("a narrow stand is a strip", () => {
    const { press, state } = mount(4)
    press("route-next-surface")
    press("route-choice-homogeneity-homogeneous")
    press("route-choice-difficulty-easy")
    press("route-choice-narrow-yes")
    expect(state().view.selection).toMatchObject({ method: "partial_strip" })
  })

  it("a surface corrected to 0.8 hectare asks nothing more", () => {
    const { one, press, byId, state } = mount(2.4)
    act(() => one("route-surface-field").props.onChangeText("0,8"))
    press("route-next-surface")
    expect(byId("route-answer-surface")).toHaveLength(1)
    expect(state().view.open).toBeNull()
    expect(state().view.canUse).toBe(true)
  })

  it("above the bound offers the two options, subdivide pre-selected with its tag", () => {
    const { press, one, state, texts } = mount(15)
    press("route-next-surface")
    press("route-choice-homogeneity-heterogeneous")
    expect(texts()).toEqual(
      expect.arrayContaining([
        guide.largeStand.title,
        guide.largeStand.subdivide.caption,
        guide.largeStand.partial.caption,
        guide.largeStand.recommended,
      ]),
    )
    expect(texts()).not.toContain(guide.reasons.largeStand)
    expect(one("route-choice-largeStand-subdivide").props.accessibilityState.selected).toBe(true)
    expect(one("route-choice-largeStand-subdivide").props.accessibilityLabel).toContain(
      guide.largeStand.recommended,
    )
    press("route-choice-largeStand-partial")
    expect(one("route-answer-largeStand").props.accessibilityLabel).toBe(
      guide.a11y.answerRow({
        question: guide.largeStand.short,
        answer: guide.largeStand.partial.title,
      }),
    )
    // A varied stand is walked in strips: the package asks nothing more.
    expect(state().view.open).toBeNull()
    expect(state().view.selection).toMatchObject({ method: "partial_strip" })
  })

  it("subdivide reopens the surface card for one morceau without the estimate captions", () => {
    const { press, one, texts } = mount(15)
    press("route-next-surface")
    press("route-choice-homogeneity-heterogeneous")
    press("route-choice-largeStand-subdivide")
    expect(texts()).toContain(guide.questions.surface.subStand)
    press("route-question-info-surface")
    expect(texts()).toContain(
      [
        guide.questions.surface.subStandWhy,
        guide.questions.surface.aid,
        guide.questions.surface.linearHelp,
      ].join("\n\n"),
    )
    expect(one("route-surface-field").props.value).toBe("")
  })
})

describe("QuestionStack: reduced motion", () => {
  it("renders and answers the same with Reduce Motion on", () => {
    setReducedMotion(true)
    const { press, byId } = mount(2.4)
    press("route-next-surface")
    expect(byId("route-answer-surface")).toHaveLength(1)
    expect(byId("route-choice-homogeneity-homogeneous")).toHaveLength(1)
  })
})
