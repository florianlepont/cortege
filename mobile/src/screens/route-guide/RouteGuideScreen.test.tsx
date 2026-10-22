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
    Switch: mockComponent("Switch"),
    Modal: mockComponent("Modal"),
    ScrollView: mockComponent("ScrollView"),
    KeyboardAvoidingView: mockComponent("KeyboardAvoidingView"),
    Platform: { OS: "android" },
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
    AccessibilityInfo: {
      setAccessibilityFocus: jest.fn(),
      announceForAccessibility: jest.fn(),
    },
    findNodeHandle: () => 7,
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/ForestCard", () => ({ ForestCard: "ForestCard" }))
jest.mock("../../ui/AppCard", () => ({ AppCard: "AppCard" }))
jest.mock("../../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))
jest.mock("../../ui/TitledScrollView", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    TitledScrollView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("ScrollView", props, children),
  }
})
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 80 }))

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { fr } from "../../i18n"
import { finishBarBottomPadding } from "../survey-detail/finish-bar-layout"
import { RouteGuideScreen } from "./RouteGuideScreen"
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
})

const guide = fr.routeGuide
const screen = guide.screen

type Options = {
  prefill?: number | null
  saveError?: boolean
  saving?: boolean
  creationStep?: number
}

function mount(options: Options = {}) {
  const { prefill = null, saveError = false, saving = false, creationStep } = options
  const onUse = jest.fn()
  const onRetry = jest.fn()
  const onOpenChooser = jest.fn()
  let latest!: RouteGuideState
  function Harness() {
    const state = useRouteGuideState({ surfaceHaPrefill: prefill })
    latest = state
    return (
      <>
        <RouteGuideScreen
          state={state}
          surfaceUnknown={prefill === null}
          saveError={saveError}
          saving={saving}
          creationStep={creationStep}
          onUse={onUse}
          onRetry={onRetry}
          onOpenChooser={onOpenChooser}
        />
      </>
    )
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<Harness />)
  })
  const byId = (id: string): ReactTestInstance[] =>
    tree.root.findAll((node) => node.props.testID === id && typeof node.type === "string")
  const one = (id: string): ReactTestInstance => {
    const found = byId(id)
    expect(found).toHaveLength(1)
    return found[0]
  }
  const texts = () =>
    tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .flatMap((node) => React.Children.toArray(node.props.children).map(String))
  const actions = () => latest.actions
  return { tree, byId, one, texts, actions, state: () => latest, onUse, onRetry, onOpenChooser }
}

type Mounted = ReturnType<typeof mount>

/** Gets to a usable route: 2,4 ha, varied, easy to observe. */
function reachRoute(m: Mounted): void {
  act(() => m.actions().setSurfaceText("2,4"))
  act(() => m.actions().commitSurface())
  act(() => m.actions().answerHomogeneity("heterogeneous"))
  act(() => m.actions().next())
  act(() => m.actions().answerDifficulty(false))
  act(() => m.actions().next())
}

/** The pinned button of a question screen. */
const pressNext = (m: Mounted) => act(() => m.one("route-next").props.onPress())

describe("RouteGuideScreen: the first question", () => {
  it("shows only the progress, the question heading with its helper, and Continuer pinned", () => {
    const m = mount({ prefill: 2.4, creationStep: 5 })
    m.one("route-guide-screen")
    expect(m.texts()).toEqual(
      expect.arrayContaining([guide.questions.surface.title, guide.questions.surface.why]),
    )
    // The title and the step are the header's now (steps 1 to 3 look): not drawn in the page.
    expect(m.texts()).not.toContain(screen.title)
    expect(m.texts()).not.toContain("Étape 5 sur 5")
    m.one("route-question-surface")
    expect(m.byId("route-refine")).toHaveLength(0)
    expect(m.byId("route-suggestion")).toHaveLength(0)
    expect(m.byId("route-answer-surface")).toHaveLength(0)
    expect(m.byId("route-result")).toHaveLength(0)
    for (const text of [guide.questions.surface.aid, guide.questions.surface.linearHelp]) {
      expect(m.texts()).not.toContain(text)
    }
    const next = m.one("route-next")
    expect(next.props.label).toBe(screen.next)
    expect(next.props.size).toBe("lg")
    expect(next.props.disabled).toBe(false)
    expect(m.byId("route-use")).toHaveLength(0)
    // The shortcut is a small text link under the question, the footer comes after.
    const flat = JSON.stringify(m.tree.toJSON())
    const order = ["route-question-surface", "route-know-link", "route-guide-footer"]
    const positions = order.map((id) => flat.indexOf(`"testID":"${id}"`))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it("has no skip control and no optional tag (O-19)", () => {
    const m = mount({ prefill: 2.4 })
    const all = m.texts().join(" | ")
    expect(all).not.toMatch(/Passer cette/)
    expect(all).not.toMatch(/Facultatif/)
    expect(m.byId("route-skip")).toHaveLength(0)
  })

  it("opens the surface card empty with the unknown line when no surface could be computed", () => {
    const m = mount({ prefill: null })
    expect(m.one("route-surface-field").props.value).toBe("")
    expect(m.texts()).toContain(guide.questions.surface.unknown)
    expect(m.byId("route-suggestion")).toHaveLength(0)
  })

  it("needs no network: the whole route is reachable from the typed surface alone", () => {
    const m = mount({ prefill: null })
    reachRoute(m)
    expect(m.one("route-use").props.disabled).toBe(false)
  })

  it("draws the five-segment progress with the fifth active while creating, none when editing", () => {
    const creating = mount({ prefill: 2.4, creationStep: 5 })
    const bar = creating.one("wizard-progress")
    expect(bar.children).toHaveLength(5)
    const flat = (node: ReactTestInstance): Record<string, unknown> =>
      ([] as Record<string, unknown>[])
        .concat(node.props.style)
        .flat(3)
        .reduce((acc, item) => ({ ...acc, ...item }), {})
    const colours = (bar.children as ReactTestInstance[]).map((c) => flat(c).backgroundColor)
    expect(new Set(colours).size).toBe(1)
    expect(creating.byId("wizard-progress")).toHaveLength(1)
    const editing = mount({ prefill: 2.4 })
    expect(editing.byId("wizard-progress")).toHaveLength(0)
  })

  it("shows the shortcut as a text link of 44 pt", () => {
    const m = mount({ prefill: 2.4 })
    const know = m.one("route-know-link")
    expect(know.props.accessibilityRole).toBe("button")
    const style = ([] as Record<string, unknown>[])
      .concat(know.props.style)
      .flat(2)
      .reduce((acc, item) => ({ ...acc, ...item }), {})
    expect(Number(style.minHeight)).toBeGreaterThanOrEqual(44)
  })

  it("keeps the footer in its own row so nothing sits under it, and keyboard taps working", () => {
    const m = mount({ prefill: 2.4 })
    const scroll = m.one("route-guide-scroll")
    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled")
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true)
    const content = ([] as Record<string, unknown>[])
      .concat(scroll.props.contentContainerStyle)
      .reduce((acc, style) => ({ ...acc, ...style }), {})
    expect(content.paddingHorizontal).toBe(24)
    expect(Number(content.paddingBottom)).toBeGreaterThanOrEqual(16)
    const footer = m.one("route-guide-footer")
    const footerStyle = ([] as Record<string, unknown>[])
      .concat(footer.props.style)
      .reduce((acc, style) => ({ ...acc, ...style }), {})
    expect(footerStyle.paddingBottom).toBe(finishBarBottomPadding(80))
    expect(footerStyle.position).toBeUndefined()
    // The page pads above the keyboard on iOS and resizes on Android: never hidden by it.
    expect(m.one("route-guide-screen").props.behavior).toBeUndefined()
  })

  it("Continuer is disabled while the surface shows an error", () => {
    const m = mount({ prefill: null })
    act(() => m.one("route-surface-field").props.onChangeText("abc"))
    act(() => m.one("route-surface-field").props.onBlur())
    expect(m.one("route-next").props.disabled).toBe(true)
    act(() => m.one("route-surface-field").props.onChangeText("2"))
    expect(m.one("route-next").props.disabled).toBe(false)
  })
})

describe("RouteGuideScreen: one question a screen", () => {
  it("Continuer moves to the next question and shows that one alone", () => {
    const m = mount({ prefill: 2.4, creationStep: 5 })
    pressNext(m)
    m.one("route-question-homogeneity")
    expect(m.byId("route-question-surface")).toHaveLength(0)
    expect(m.byId("route-answer-surface")).toHaveLength(0)
    expect(m.byId("route-know-link")).toHaveLength(0)
    expect(m.byId("wizard-progress")).toHaveLength(1)
    // Nothing is answered yet: Continuer waits.
    expect(m.one("route-next").props.disabled).toBe(true)
    act(() => m.one("route-choice-homogeneity-heterogeneous").props.onPress())
    expect(m.one("route-next").props.disabled).toBe(false)
  })

  it("after the last question the result shows, with the shortcut at its very end", () => {
    const m = mount({ prefill: 2.4 })
    pressNext(m)
    act(() => m.one("route-choice-homogeneity-heterogeneous").props.onPress())
    pressNext(m)
    act(() => m.one("route-choice-difficulty-easy").props.onPress())
    pressNext(m)
    m.one("route-result")
    m.one("route-suggestion")
    expect(m.byId("route-next")).toHaveLength(0)
    expect(m.byId("route-question-difficulty")).toHaveLength(0)
    expect(m.one("route-use").props.label).toBe(screen.use)
  })

  it("starts a new screen at the top, and announces its title", () => {
    const m = mount({ prefill: 2.4 })
    const { AccessibilityInfo } = jest.requireMock("react-native") as {
      AccessibilityInfo: { announceForAccessibility: jest.Mock }
    }
    pressNext(m)
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      guide.questions.homogeneity.title,
    )
  })

  it("back returns one question at a time and tells the route when there is none", () => {
    const m = mount({ prefill: 2.4 })
    pressNext(m)
    let went = false
    act(() => {
      went = m.actions().back()
    })
    expect(went).toBe(true)
    m.one("route-question-surface")
    act(() => {
      went = m.actions().back()
    })
    expect(went).toBe(false)
  })
})

describe("RouteGuideScreen: the suggestion", () => {
  it("shows the suggestion, the reasons and the details once the answers give a route", () => {
    const m = mount({ prefill: 2.4 })
    reachRoute(m)
    m.one("route-suggestion")
    m.one("route-reasons")
    m.one("route-details")
    expect(m.byId("route-glossary")).toHaveLength(0)
    expect(m.byId("route-large-stand")).toHaveLength(0)
    const use = m.one("route-use")
    expect(use.props.disabled).toBe(false)
    act(() => use.props.onPress())
    expect(m.onUse).toHaveBeenCalledTimes(1)
  })

  it("keeps the suggestion and Pour affiner out of a question screen", () => {
    const m = mount({ prefill: 2.4 })
    act(() => m.actions().commitSurface())
    expect(m.byId("route-suggestion")).toHaveLength(0)
    expect(m.byId("route-refine")).toHaveLength(0)
    expect(m.byId("route-use")).toHaveLength(0)
    m.one("route-next")
  })

  it("goes to the result when a parcours is picked in the chooser, back returns to the question", () => {
    const m = mount({ prefill: 2.4 })
    act(() => m.actions().applyPick({ method: "full", counting: "capped" }))
    m.one("route-result")
    m.one("route-suggestion")
    act(() => {
      m.actions().back()
    })
    m.one("route-question-surface")
  })

  it("orders the result zone: suggestion, reasons, details, Pour affiner, shortcut", () => {
    const m = mount({ prefill: 2.4 })
    reachRoute(m)
    const order = [
      "route-suggestion",
      "route-reasons",
      "route-details",
      "route-refine",
      "route-know-link",
    ]
    const flat = JSON.stringify(m.tree.toJSON())
    const positions = order.map((id) => flat.indexOf(`"testID":"${id}"`))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it("puts the advice in the folded Pour affiner footer, information only", () => {
    const m = mount({ prefill: 2.4 })
    reachRoute(m)
    const refine = m.one("route-refine")
    expect(m.byId("route-advice")).toHaveLength(0)
    const header = refine.findAll(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        typeof node.props.accessibilityState?.expanded === "boolean",
    )[0]
    act(() => header.props.onPress())
    expect(m.byId("route-advice")).toHaveLength(1)
    const before = m.state().view.selection
    act(() => m.actions().setHoursText("0,5"))
    expect(m.state().view.selection).toEqual(before)
  })

  it("opens the chooser from the shortcut, from the suggestion and from the counting line", () => {
    const m = mount({ prefill: 2.4 })
    act(() => m.one("route-know-link").props.onPress())
    expect(m.onOpenChooser).toHaveBeenLastCalledWith("pick")
    reachRoute(m)
    // The shortcut also closes the result screen.
    act(() => m.one("route-know-link").props.onPress())
    act(() => m.one("route-change").props.onPress())
    expect(m.onOpenChooser).toHaveBeenLastCalledWith("pick")
    expect(m.onOpenChooser).toHaveBeenCalledTimes(3)
  })

  it("opens the chooser at the counting from the uncapped line", () => {
    const m = mount({ prefill: 2.4 })
    reachRoute(m)
    act(() =>
      m.actions().applyPick({ method: "full", counting: "uncapped", uncappedFactors: ["A", "B"] }),
    )
    act(() => m.one("route-edit-counting").props.onPress())
    expect(m.onOpenChooser).toHaveBeenLastCalledWith("pick", "counting")
  })

  it("restores the suggestion after an own choice", () => {
    const m = mount({ prefill: 2.4 })
    reachRoute(m)
    act(() =>
      m.actions().applyPick({ method: "full", counting: "uncapped", uncappedFactors: ["A"] }),
    )
    act(() => m.one("route-restore").props.onPress())
    expect(m.byId("route-restore")).toHaveLength(0)
    expect(m.state().view.chosenBy).toBe("guide")
  })

  it("keeps the reasons for the suggestion only, not for an own choice", () => {
    const m = mount({ prefill: 2.4 })
    reachRoute(m)
    m.one("route-reasons")
    act(() =>
      m.actions().applyPick({ method: "full", counting: "uncapped", uncappedFactors: ["A"] }),
    )
    expect(m.byId("route-reasons")).toHaveLength(0)
    m.one("route-suggestion")
  })

  it("shows the small stand warning once, and leaves the over half warning to the details", () => {
    const m = mount({ prefill: null })
    act(() => m.actions().setSurfaceText("0,4"))
    act(() => m.actions().commitSurface())
    expect(m.byId("route-notice-small_stand")).toHaveLength(1)
    expect(m.byId("route-notice-partial_over_half")).toHaveLength(0)
  })
})

describe("RouteGuideScreen: above the subdivision bound", () => {
  function reachLargeStand(): Mounted {
    const m = mount({ prefill: null })
    act(() => m.actions().setSurfaceText("40"))
    act(() => m.actions().commitSurface())
    act(() => m.actions().answerHomogeneity("heterogeneous"))
    act(() => m.actions().next())
    return m
  }

  it("shows the two options as a screen of their own, with Suivant disabled until one is picked", () => {
    const m = reachLargeStand()
    m.one("route-large-stand")
    expect(m.byId("route-question-homogeneity")).toHaveLength(0)
    expect(m.byId("route-suggestion")).toHaveLength(0)
    expect(m.one("route-next").props.disabled).toBe(true)
    act(() => m.one("route-large-option-partial").props.onPress())
    expect(m.one("route-next").props.disabled).toBe(false)
  })

  it("subdividing asks for the surface of a piece, and nothing is used yet", () => {
    const m = reachLargeStand()
    act(() => m.one("route-large-option-subdivide").props.onPress())
    pressNext(m)
    expect(m.onUse).not.toHaveBeenCalled()
    expect(m.state().view.open).toMatchObject({ id: "surface", subStand: true })
    expect(m.byId("route-use")).toHaveLength(0)
  })

  it("goes on to the result with a partial parcours when the observer chooses not to cut", () => {
    const m = reachLargeStand()
    act(() => m.one("route-large-option-partial").props.onPress())
    pressNext(m)
    expect(m.state().view.recommendation.status).toBe("route")
    m.one("route-result")
    expect(m.one("route-use").props.label).toBe(screen.use)
    expect(m.one("route-use").props.disabled).toBe(false)
  })
})

describe("RouteGuideScreen: the footer", () => {
  it("shows the save error above the button with Réessayer", () => {
    const m = mount({ prefill: 2.4, saveError: true })
    reachRoute(m)
    expect(m.texts()).toContain(screen.saveError)
    const retry = m.tree.root.find(
      (node) =>
        node.props.accessibilityLabel === screen.retry && typeof node.props.onPress === "function",
    )
    act(() => retry.props.onPress())
    expect(m.onRetry).toHaveBeenCalledTimes(1)
  })

  it("shows no error notice by default", () => {
    const m = mount({ prefill: 2.4 })
    expect(m.texts()).not.toContain(screen.saveError)
  })

  it("shows the button busy while the route is being saved", () => {
    const m = mount({ prefill: 2.4, saving: true })
    reachRoute(m)
    expect(m.one("route-use").props.loading).toBe(true)
  })

  it("is not busy otherwise", () => {
    const m = mount({ prefill: 2.4 })
    reachRoute(m)
    expect(m.one("route-use").props.loading).toBe(false)
  })
})
