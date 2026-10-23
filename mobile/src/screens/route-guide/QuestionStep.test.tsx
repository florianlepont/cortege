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
    AccessibilityInfo: { announceForAccessibility: (...args: unknown[]) => mockAnnounce(...args) },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))

const mockAnnounce = jest.fn()

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { fr } from "../../i18n"
import { QuestionStep } from "./QuestionStep"
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
  mockAnnounce.mockClear()
})

const guide = fr.routeGuide

function mount(prefill: number | null) {
  let latest!: RouteGuideState
  function Harness() {
    const state = useRouteGuideState({ surfaceHaPrefill: prefill })
    latest = state
    return React.createElement(QuestionStep, { state })
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
  // The pinned "Suivant" belongs to the screen; here it is the model's action.
  const next = () => act(() => latest.actions.next())
  const texts = () =>
    tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .flatMap((node) => React.Children.toArray(node.props.children).map(String))
  return { tree, state: () => latest, byId, one, press, next, texts }
}

describe("QuestionStep: one question a screen", () => {
  it("shows the surface question alone: its field, no answered row, no inline Suivant", () => {
    const { one, byId, texts } = mount(2.4)
    expect(byId("route-answer-surface")).toHaveLength(0)
    expect(byId("route-next-surface")).toHaveLength(0)
    one("route-question-surface")
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
    // The reason it is asked is the helper sentence under the heading, like steps 1 to 3.
    expect(texts()).toContain(guide.questions.surface.why)
    // The other help lives in the information sheet, not on the screen.
    for (const text of [
      guide.questions.surface.estimated,
      guide.questions.surface.aid,
      guide.questions.surface.linearHelp,
    ]) {
      expect(texts()).not.toContain(text)
    }
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

  it("shows the field error after blur and clears it when the text changes", () => {
    const { one, texts, state } = mount(null)
    act(() => one("route-surface-field").props.onChangeText("abc"))
    act(() => one("route-surface-field").props.onBlur())
    expect(texts()).toContain(guide.surfaceErrors.invalid)
    expect(state().view.open).toMatchObject({ error: "surface_invalid" })
    act(() => one("route-surface-field").props.onChangeText("2"))
    expect(texts()).not.toContain(guide.surfaceErrors.invalid)
  })

  it("an empty surface asks for it when Suivant is pressed", () => {
    const { next, texts, state } = mount(null)
    next()
    expect(texts()).toContain(guide.surfaceErrors.missing)
    expect(state().view.screen).toBe("surface")
  })

  it("the return key of the surface field is Suivant", () => {
    const { one, state } = mount(2.4)
    act(() => one("route-surface-field").props.onSubmitEditing())
    expect(state().view.screen).toBe("homogeneity")
  })
})

describe("QuestionStep: answering and moving", () => {
  it("Suivant replaces the surface by the homogeneity question, alone, with its choices", () => {
    const { next, one, byId, state, texts } = mount(2.4)
    next()
    expect(byId("route-answer-surface")).toHaveLength(0)
    expect(byId("route-surface-field")).toHaveLength(0)
    expect(state().view.open?.id).toBe("homogeneity")
    expect(texts()).toEqual(
      expect.arrayContaining([
        guide.questions.homogeneity.title,
        guide.questions.homogeneity.options.homogeneous.caption,
        guide.questions.homogeneity.options.heterogeneous.caption,
      ]),
    )
    expect(texts()).not.toContain(guide.questions.surface.title)
    // The reason it is asked is the helper sentence under the heading.
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
  })

  it("announces the title of a new question, not of the first one", () => {
    const { next } = mount(2.4)
    expect(mockAnnounce).not.toHaveBeenCalled()
    next()
    expect(mockAnnounce).toHaveBeenCalledWith(guide.questions.homogeneity.title)
  })

  it("a tap on a choice only selects it: the question stays until Suivant", () => {
    const { press, next, one, byId, state } = mount(2.4)
    next()
    press("route-choice-homogeneity-heterogeneous")
    expect(state().view.open?.id).toBe("homogeneity")
    expect(one("route-choice-homogeneity-heterogeneous").props.accessibilityState.selected).toBe(
      true,
    )
    next()
    expect(state().view.open?.id).toBe("difficulty")
    expect(byId("route-choice-difficulty-hard")).toHaveLength(1)
    press("route-choice-difficulty-easy")
    next()
    expect(state().view.open).toBeNull()
    expect(byId("route-question-difficulty")).toHaveLength(0)
    expect(state().view.canUse).toBe(true)
  })

  it("back returns to the question with its answer selected", () => {
    const { press, next, one, state } = mount(2.4)
    next()
    press("route-choice-homogeneity-heterogeneous")
    next()
    act(() => {
      state().actions.back()
    })
    expect(one("route-choice-homogeneity-heterogeneous").props.accessibilityState.selected).toBe(
      true,
    )
    expect(one("route-choice-homogeneity-homogeneous").props.accessibilityState.selected).toBe(
      false,
    )
  })

  it("draws the width question only when the package asks for it", () => {
    const { press, next, byId, state } = mount(4)
    next()
    press("route-choice-homogeneity-homogeneous")
    next()
    press("route-choice-difficulty-easy")
    next()
    expect(byId("route-choice-narrow-yes")).toHaveLength(1)
    press("route-choice-narrow-no")
    // Hard to observe: the strip is imposed, the width question is no longer needed.
    act(() => {
      state().actions.back()
    })
    press("route-choice-difficulty-hard")
    next()
    expect(state().view.open).toBeNull()
    expect(byId("route-question-narrow")).toHaveLength(0)
  })

  it("a narrow stand is a strip", () => {
    const { press, next, state } = mount(4)
    next()
    press("route-choice-homogeneity-homogeneous")
    next()
    press("route-choice-difficulty-easy")
    next()
    press("route-choice-narrow-yes")
    next()
    expect(state().view.selection).toMatchObject({ method: "partial_strip" })
  })

  it("a surface corrected to 0.8 hectare asks nothing more", () => {
    const { one, next, state } = mount(2.4)
    act(() => one("route-surface-field").props.onChangeText("0,8"))
    next()
    expect(state().view.open).toBeNull()
    expect(state().view.canUse).toBe(true)
  })

  it("above the bound the two options are a screen of their own, nothing selected yet", () => {
    const { press, next, one, state, texts } = mount(15)
    next()
    press("route-choice-homogeneity-heterogeneous")
    next()
    expect(state().view.screen).toBe("largeStand")
    expect(texts()).toEqual(
      expect.arrayContaining([
        guide.largeStand.title,
        guide.largeStand.subdivide.caption,
        guide.largeStand.partial.caption,
        guide.largeStand.recommended,
      ]),
    )
    expect(texts()).not.toContain(guide.questions.homogeneity.title)
    expect(one("route-large-option-subdivide").props.accessibilityState.selected).toBe(false)
    expect(state().view.canNext).toBe(false)
    expect(one("route-large-option-subdivide").props.accessibilityLabel).toContain(
      guide.largeStand.recommended,
    )
    press("route-large-option-partial")
    expect(state().view.canNext).toBe(true)
    next()
    // A varied stand is walked in strips: the package asks nothing more.
    expect(state().view.open).toBeNull()
    expect(state().view.selection).toMatchObject({ method: "partial_strip" })
  })

  it("subdivide reopens the surface question for one piece without the estimate captions", () => {
    const { press, next, one, texts } = mount(15)
    next()
    press("route-choice-homogeneity-heterogeneous")
    next()
    press("route-large-option-subdivide")
    next()
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

describe("QuestionStep: reduced motion", () => {
  it("renders and answers the same with Reduce Motion on", () => {
    setReducedMotion(true)
    const { next, byId } = mount(2.4)
    next()
    expect(byId("route-choice-homogeneity-homogeneous")).toHaveLength(1)
  })
})
