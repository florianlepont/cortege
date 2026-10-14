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

let mockKeyboardUp = false
jest.mock("../survey-form/usePagerKeyboard", () => ({
  usePagerKeyboard: () => mockKeyboardUp,
  usePagerChromeStyle: (hidden: boolean) => ({ opacity: hidden ? 0 : 1 }),
}))

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { fr } from "../../i18n"
import { FrameLargeTitleContext } from "../../ui/frame-large-title"
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
  mockKeyboardUp = false
})

const guide = fr.routeGuide
const screen = guide.screen

type Options = {
  prefill?: number | null
  saveError?: boolean
  saving?: boolean
  stepLabel?: string
  nativeTitle?: boolean
}

function mount(options: Options = {}) {
  const {
    prefill = null,
    saveError = false,
    saving = false,
    stepLabel,
    nativeTitle = false,
  } = options
  const onUse = jest.fn()
  const onRetry = jest.fn()
  const onOpenChooser = jest.fn()
  let latest!: RouteGuideState
  function Harness() {
    const state = useRouteGuideState({ surfaceHaPrefill: prefill })
    latest = state
    return (
      <FrameLargeTitleContext.Provider value={nativeTitle}>
        <RouteGuideScreen
          state={state}
          surfaceUnknown={prefill === null}
          saveError={saveError}
          saving={saving}
          stepLabel={stepLabel}
          onUse={onUse}
          onRetry={onRetry}
          onOpenChooser={onOpenChooser}
        />
      </FrameLargeTitleContext.Provider>
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
  act(() => m.actions().answerDifficulty(false))
}

describe("RouteGuideScreen: the mandatory step before an answer", () => {
  it("renders the lead, the shortcut, the question and the waiting line, in this order", () => {
    const m = mount({ prefill: 2.4 })
    m.one("route-guide-screen")
    const order = ["route-know-link", "route-question-stack"]
    const flat = JSON.stringify(m.tree.toJSON())
    const positions = order.map((id) => flat.indexOf(`"testID":"${id}"`))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(m.texts()).toEqual(
      expect.arrayContaining([screen.lead, screen.required, screen.know, screen.waitingSurface]),
    )
    expect(m.one("route-question-surface")).toBeDefined()
  })

  it("has no skip control and no optional tag (O-19)", () => {
    const m = mount({ prefill: 2.4 })
    const all = m.texts().join(" | ")
    expect(all).not.toMatch(/Passer cette/)
    expect(all).not.toMatch(/Facultatif/)
    expect(m.byId("route-skip")).toHaveLength(0)
  })

  it("disables the one way forward with its hint, and presses do nothing", () => {
    const m = mount({ prefill: 2.4 })
    const use = m.one("route-use")
    expect(use.props.label).toBe(screen.use)
    expect(use.props.disabled).toBe(true)
    expect(use.props.accessibilityLabel).toBe(screen.useDisabledA11y)
    expect(use.props.size).toBe("lg")
  })

  it("opens the surface card empty with the unknown line when no surface could be computed", () => {
    const m = mount({ prefill: null })
    expect(m.one("route-surface-field").props.value).toBe("")
    expect(m.texts()).toContain(screen.missingSurface)
    expect(m.texts()).not.toContain(screen.waitingSurface)
    expect(m.byId("route-suggestion")).toHaveLength(0)
  })

  it("needs no network: the whole route is reachable from the typed surface alone", () => {
    const m = mount({ prefill: null })
    reachRoute(m)
    expect(m.one("route-use").props.disabled).toBe(false)
  })

  it("shows the step label of the creation when given, and the page title on Android", () => {
    const m = mount({ prefill: 2.4, stepLabel: "Étape 5 sur 5" })
    expect(m.texts()).toContain("Étape 5 sur 5")
    expect(m.texts()).toContain(screen.title)
  })

  it("leaves the title to the native large title on iOS", () => {
    const m = mount({ prefill: 2.4, nativeTitle: true })
    expect(m.texts()).not.toContain(screen.title)
  })

  it("keeps the scroll content above the floating footer and keyboard taps working", () => {
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
  })
})

describe("RouteGuideScreen: the suggestion", () => {
  it("shows the suggestion, the reasons and the details once the answers give a route", () => {
    const m = mount({ prefill: 2.4 })
    reachRoute(m)
    m.one("route-suggestion")
    m.one("route-reasons")
    m.one("route-details")
    m.one("route-glossary")
    expect(m.byId("route-large-stand")).toHaveLength(0)
    expect(m.texts()).not.toContain(screen.waiting)
    expect(m.texts()).not.toContain(screen.waitingSurface)
    const use = m.one("route-use")
    expect(use.props.disabled).toBe(false)
    expect(use.props.accessibilityLabel).toBeUndefined()
    act(() => use.props.onPress())
    expect(m.onUse).toHaveBeenCalledTimes(1)
  })

  it("asks to answer the questions while a question is open", () => {
    const m = mount({ prefill: 2.4 })
    act(() => m.actions().commitSurface())
    expect(m.texts()).toContain(screen.waiting)
    expect(m.byId("route-suggestion")).toHaveLength(0)
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
    act(() => m.one("route-change").props.onPress())
    expect(m.onOpenChooser).toHaveBeenLastCalledWith("pick")
    expect(m.onOpenChooser).toHaveBeenCalledTimes(2)
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
    return m
  }

  it("shows the two options once, not the forest card, and the footer asks for a piece", () => {
    const m = reachLargeStand()
    m.one("route-large-stand")
    expect(m.byId("route-question-largeStand")).toHaveLength(0)
    expect(m.byId("route-suggestion")).toHaveLength(0)
    const use = m.one("route-use")
    expect(use.props.label).toBe(guide.largeStand.subdivideCta)
    expect(use.props.disabled).toBe(false)
    act(() => use.props.onPress())
    expect(m.onUse).not.toHaveBeenCalled()
    expect(m.state().view.open).toMatchObject({ id: "surface", subStand: true })
    expect(m.one("route-use").props.label).toBe(screen.use)
  })

  it("goes on with a partial parcours when the observer chooses not to cut", () => {
    const m = reachLargeStand()
    act(() => m.one("route-large-option-partial").props.onPress())
    act(() => m.actions().answerDifficulty(false))
    expect(m.state().view.recommendation.status).toBe("route")
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

  it("fades with the keyboard, by opacity only", () => {
    const flat = (m: Mounted) =>
      ([] as Record<string, unknown>[])
        .concat(m.one("route-guide-footer").props.style)
        .reduce((acc, style) => ({ ...acc, ...style }), {})
    expect(flat(mount({ prefill: 2.4 })).opacity).toBe(1)
    mockKeyboardUp = true
    expect(flat(mount({ prefill: 2.4 })).opacity).toBe(0)
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
