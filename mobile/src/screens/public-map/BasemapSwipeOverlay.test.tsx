import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"

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
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
// The shared Reanimated mock, with recording entering and exiting builders and a host view.
jest.mock("react-native-reanimated", () => {
  const ReactRef = require("react") as typeof import("react")
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as {
    default: Record<string, unknown>
  }
  const builder = (calls: Record<string, unknown>) => ({
    duration: (ms: number) => builder({ ...calls, durationMs: ms }),
    delay: (ms: number) => builder({ ...calls, delayMs: ms }),
    reduceMotion: (mode: string) => builder({ ...calls, reduceMotion: mode }),
    calls,
  })
  return {
    ...shared,
    __esModule: true,
    default: {
      ...shared.default,
      View: ({ children, ...props }: { children?: React.ReactNode }) =>
        ReactRef.createElement("AnimatedView", props, children),
    },
    FadeIn: builder({}),
    FadeOut: builder({}),
    ReduceMotion: { System: "system" },
  }
})
jest.mock("../../ui/AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({
      children,
      disableScale: _disableScale,
      disableRipple: _disableRipple,
      ...props
    }: {
      children?: React.ReactNode
      disableScale?: boolean
      disableRipple?: boolean
    }) => ReactRef.createElement("Pressable", props, children),
  }
})
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = { light: actual.defaultTheme, dark: actual.buildTheme("dark") }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandMotion } from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
import type { BaseLayerKey } from "../../map/layers"
import { BUTTON_FADE_IN_DELAY_MS, BUTTON_FADE_MS } from "../../map/swipe-machine"
import { BasemapSwipeOverlay, type BasemapSwipeOverlayProps } from "./BasemapSwipeOverlay"
import { QuitComparePill } from "./QuitComparePill"
import { indicatorValue, swipeLabel } from "./swipe-labels"

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
  mockScheme.current = "light"
})

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

const handlers = {
  onDone: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  onCompareNext: jest.fn(),
}

beforeEach(() => {
  Object.values(handlers).forEach((handler) => handler.mockClear())
})

function render(props: Partial<BasemapSwipeOverlayProps> = {}): ReactTestRenderer {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <BasemapSwipeOverlay
        top={58}
        hintBottom={66}
        layer="map"
        isAvailable={() => true}
        hintText={null}
        fingerDown={false}
        introHintVisible={false}
        compareAvailable
        {...handlers}
        {...props}
      />,
    )
  })
  return tree
}

const byId = (tree: ReactTestRenderer, testID: string): ReactTestInstance[] =>
  tree.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")
const textsOf = (node: ReactTestInstance): string[] =>
  node.findAllByType("Text" as never).map((text) => String(text.props.children))

describe("indicator", () => {
  test.each(["light", "dark"] as const)(
    "%s: a centred glass pill with the chevrons, the name and the era",
    (scheme) => {
      mockScheme.current = scheme
      const theme = scheme === "dark" ? buildTheme("dark") : defaultTheme
      const tree = render()
      const indicator = byId(tree, "swipe-indicator")[0]
      const surface = indicator.findByType("GlassSurface" as never)
      expect(surface.props.surface).toEqual(theme.visual.mapControl.glass)
      expect(flat(surface.props.style)).toMatchObject({
        height: 36,
        maxWidth: 232,
        borderRadius: 18,
        paddingHorizontal: 14,
        borderColor: theme.visual.mapControl.hairline,
      })
      const glyphs = indicator.findAllByType("Ionicons" as never)
      expect(glyphs.map((glyph) => glyph.props.name)).toEqual([
        "chevron-back-outline",
        "chevron-forward-outline",
      ])
      expect(glyphs.every((glyph) => glyph.props.size === 14)).toBe(true)
      expect(textsOf(indicator)).toEqual(["Plan", "aujourd'hui"])
      const [name, era] = indicator.findAllByType("Text" as never)
      expect(flat(name.props.style)).toMatchObject({
        fontSize: 13,
        fontFamily: "Sora-SemiBold",
        color: theme.visual.mapControl.text,
      })
      expect(flat(era.props.style)).toMatchObject({
        fontSize: 12,
        fontFamily: "Jost-Regular",
        color: theme.visual.mapControl.textMuted,
      })
    },
  )

  test("names the layer it is given, with its era", () => {
    const tree = render({ layer: "etat-major" })
    expect(textsOf(byId(tree, "swipe-indicator")[0])).toEqual(["Carte d'état-major", "1820-1866"])
  })

  test("is adjustable, with the value text and the actions", () => {
    const indicator = byId(render(), "swipe-indicator")[0]
    expect(indicator.props.accessible).toBe(true)
    expect(indicator.props.accessibilityRole).toBe("adjustable")
    expect(indicator.props.accessibilityValue).toEqual({ text: "Plan, aujourd'hui, fond 1 sur 5" })
    expect(indicator.props.accessibilityActions).toEqual([
      { name: "increment", label: "Fond suivant" },
      { name: "decrement", label: "Fond précédent" },
      { name: "done", label: "Terminé : libérer la carte" },
      { name: "compareNext", label: "Comparer avec le fond suivant" },
    ])
    const fire = (actionName: string) =>
      act(() => indicator.props.onAccessibilityAction({ nativeEvent: { actionName } }))
    fire("increment")
    fire("decrement")
    fire("compareNext")
    fire("done")
    fire("activate")
    expect(handlers.onNext).toHaveBeenCalledTimes(1)
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1)
    expect(handlers.onCompareNext).toHaveBeenCalledTimes(1)
    expect(handlers.onDone).toHaveBeenCalledTimes(1)
  })

  test("offers no compare action when comparing is not available", () => {
    const indicator = byId(render({ compareAvailable: false }), "swipe-indicator")[0]
    expect(
      indicator.props.accessibilityActions.map((action: { name: string }) => action.name),
    ).toEqual(["increment", "decrement", "done"])
  })

  test("the label helpers read the catalogue", () => {
    expect(swipeLabel("photos-1950")).toEqual({ name: "Photos aériennes", era: "1950-1965" })
    expect(indicatorValue("etat-major")).toBe("Carte d'état-major, 1820-1866, fond 3 sur 5")
  })
})

describe("dots", () => {
  test("five dots, the current one 8 pt and full, the others 6 pt at 70 %", () => {
    const tree = render({ layer: "etat-major" })
    const dots = byId(tree, "swipe-dots")[0]
    expect(dots.props.accessibilityElementsHidden).toBe(true)
    expect(dots.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(dots.props.pointerEvents).toBe("none")
    const keys: BaseLayerKey[] = ["map", "satellite", "etat-major", "carte-1950", "photos-1950"]
    const styles = keys.map((key) => flat(byId(tree, `swipe-dot-${key}`)[0].props.style))
    expect(styles).toHaveLength(5)
    styles.forEach((style, index) => {
      expect(style).toMatchObject({
        backgroundColor: defaultTheme.visual.curtain.line,
        borderColor: defaultTheme.visual.curtain.edge,
        borderWidth: 1,
      })
      if (index === 2) {
        expect(style).toMatchObject({ width: 8, height: 8, borderRadius: 4 })
        expect(style.opacity).toBeUndefined()
      } else {
        expect(style).toMatchObject({ width: 6, height: 6, borderRadius: 3, opacity: 0.7 })
      }
    })
  })

  test("an unavailable layer's dot is at 40 %", () => {
    const tree = render({ isAvailable: (key) => key !== "carte-1950" })
    expect(flat(byId(tree, "swipe-dot-carte-1950")[0].props.style).opacity).toBe(0.4)
    expect(flat(byId(tree, "swipe-dot-satellite")[0].props.style).opacity).toBe(0.7)
  })
})

describe("offline markers", () => {
  const glyphs = (tree: ReactTestRenderer) =>
    byId(tree, "swipe-indicator")[0]
      .findAllByType("Ionicons" as never)
      .map((node) => node.props.name)

  test("online the pill has no marker", () => {
    expect(glyphs(render())).toEqual(["chevron-back-outline", "chevron-forward-outline"])
    expect(byId(render(), "swipe-indicator")[0].props.accessibilityValue.text).not.toMatch(
      /téléchargé/,
    )
  })

  test("offline the pill says if its layer is downloaded for the view, visually and aloud", () => {
    const here = render({ offline: true, isAvailable: () => true })
    expect(glyphs(here)).toContain("cloud-done-outline")
    expect(byId(here, "swipe-indicator")[0].props.accessibilityValue.text).toMatch(/, téléchargé$/)
    const missing = render({ offline: true, isAvailable: () => false })
    expect(glyphs(missing)).toContain("cloud-offline-outline")
    expect(byId(missing, "swipe-indicator")[0].props.accessibilityValue.text).toMatch(
      /, non téléchargé ici$/,
    )
  })
})

describe("hint", () => {
  test("sits in the bottom white zone, apart from the top stack", () => {
    const tree = render({ introHintVisible: true, hintBottom: 91 })
    const hint = byId(tree, "swipe-hint")[0]
    const zone = tree.root.findAll(
      (node) =>
        node.props.pointerEvents === "none" &&
        node.findAll((child) => child === hint).length > 0 &&
        flat(node.props.style).bottom === 91,
    )[0]
    expect(flat(zone.props.style)).toMatchObject({
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 91,
      alignItems: "center",
    })
    const stack = byId(tree, "swipe-indicator")[0]
    expect(stack.findAll((node) => node.props.testID === "swipe-hint")).toHaveLength(0)
  })

  test("offline the intro hint says once that the comparison needs a connection", () => {
    const hint = byId(render({ introHintVisible: true, offline: true }), "swipe-hint")[0]
    expect(textsOf(hint)).toEqual([
      "Faites glisser votre doigt sur la carte pour changer de fond. La comparaison demande une connexion.",
    ])
  })

  test("the intro hint shows while no finger is down", () => {
    const hint = byId(render({ introHintVisible: true }), "swipe-hint")[0]
    expect(textsOf(hint)).toEqual([
      "Faites glisser votre doigt sur la carte pour changer de fond. Relâchez au milieu pour comparer.",
    ])
    expect(hint.props.pointerEvents).toBe("none")
    // Decorative: the indicator carries the adjustable actions for a screen reader.
    expect(hint.props.accessibilityElementsHidden).toBe(true)
    expect(hint.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(flat(hint.props.style)).toMatchObject({
      minHeight: 24,
      maxWidth: 300,
      backgroundColor: defaultTheme.visual.mapHint.fill,
    })
    const text = hint.findByType("Text" as never)
    expect(flat(text.props.style)).toMatchObject({
      fontSize: 12,
      color: defaultTheme.visual.mapHint.ink,
      textAlign: "center",
    })
  })

  test.each([
    "Lâchez pour revenir",
    "Lâchez pour comparer",
    "Lâchez pour changer de fond",
    "Aucun autre fond n'est disponible hors connexion ici.",
  ])("while a finger is down it shows the zone hint: %s", (hintText) => {
    const tree = render({ fingerDown: true, hintText, introHintVisible: true })
    expect(textsOf(byId(tree, "swipe-hint")[0])).toEqual([hintText])
  })

  test("nothing shows before the slop, or once the intro is over", () => {
    expect(
      byId(render({ fingerDown: true, hintText: null, introHintVisible: true }), "swipe-hint"),
    ).toHaveLength(0)
    expect(byId(render(), "swipe-hint")).toHaveLength(0)
  })

  test("it fades in over 160 ms and out over about 1 s, both following Reduce Motion", () => {
    const tree = render({ introHintVisible: true })
    // The innermost wrapper that holds the hint (the root holds it too).
    const wrapper = tree.root
      .findAllByType("AnimatedView" as never)
      .filter((node) => node.findAll((child) => child.props.testID === "swipe-hint").length > 0)
      .at(-1)
    expect(wrapper?.props.entering.calls).toEqual({
      durationMs: brandMotion.durations.fast,
      reduceMotion: "system",
    })
    expect(wrapper?.props.exiting.calls).toEqual({ durationMs: 1000, reduceMotion: "system" })
  })
})

describe("layout", () => {
  test("a centred column from the given top, with a small side inset", () => {
    const tree = render({ top: 91 })
    const column = tree.root.findAll(
      (node) => typeof node.type === "string" && node.props.pointerEvents === "box-none",
    )[0]
    expect(flat(column.props.style)).toMatchObject({
      position: "absolute",
      left: 16,
      right: 16,
      top: 91,
      alignItems: "center",
      gap: 8,
    })
  })

  test("the whole stack fades in over 160 ms after 80 ms and out over 160 ms, both following Reduce Motion", () => {
    const tree = render()
    // The stack is one fading root; the hint (absent here) is the only other animated wrapper.
    const wrappers = tree.root.findAllByType("AnimatedView" as never)
    expect(wrappers).toHaveLength(1)
    expect(wrappers[0].props.entering.calls).toEqual({
      durationMs: BUTTON_FADE_MS,
      delayMs: BUTTON_FADE_IN_DELAY_MS,
      reduceMotion: "system",
    })
    expect(wrappers[0].props.exiting.calls).toEqual({
      durationMs: BUTTON_FADE_MS,
      reduceMotion: "system",
    })
    expect(BUTTON_FADE_MS).toBe(160)
    expect(BUTTON_FADE_IN_DELAY_MS).toBe(80)
  })
})

describe("QuitComparePill", () => {
  function renderQuit(bottom = 58, onQuit = jest.fn(), hint?: string | null) {
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<QuitComparePill bottom={bottom} onQuit={onQuit} hint={hint} />)
    })
    return { tree, onQuit, pill: byId(tree, "compare-quit")[0] }
  }

  test.each(["light", "dark"] as const)("%s: a centred labelled glass pill", (scheme) => {
    mockScheme.current = scheme
    const theme = scheme === "dark" ? buildTheme("dark") : defaultTheme
    const { tree, pill } = renderQuit(120)
    const row = tree.root.findAll(
      (node) => typeof node.type === "string" && node.props.pointerEvents === "box-none",
    )[0]
    expect(flat(row.props.style)).toMatchObject({
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 120,
      alignItems: "center",
    })
    const surface = tree.root.findByType("GlassSurface" as never)
    expect(surface.props.surface).toEqual(theme.visual.mapControl.glass)
    expect(flat(surface.props.style)).toMatchObject({ height: 40, maxWidth: 232 })
    const glyph = pill.findByType("Ionicons" as never)
    expect(glyph.props).toMatchObject({ name: "close-outline", size: 16 })
    expect(textsOf(pill)).toEqual(["Quitter la comparaison"])
  })

  test("says what it does, keeps the left layer, and calls onQuit", () => {
    const { pill, onQuit } = renderQuit()
    expect(pill.props.accessibilityRole).toBe("button")
    expect(pill.props.accessibilityLabel).toBe("Quitter la comparaison")
    expect(pill.props.accessibilityHint).toBe("Revient à un seul fond, celui de gauche")
    expect(pill.props.hitSlop).toBe(2)
    act(() => pill.props.onPress())
    expect(onQuit).toHaveBeenCalledTimes(1)
  })

  test("shows no hint without one, and the exit hint above the pill with one", () => {
    expect(byId(renderQuit().tree, "compare-exit-hint")).toHaveLength(0)
    expect(byId(renderQuit(58, jest.fn(), null).tree, "compare-exit-hint")).toHaveLength(0)
    const { tree, pill } = renderQuit(58, jest.fn(), "Lâchez pour quitter la comparaison")
    const hint = byId(tree, "compare-exit-hint")[0]
    expect(textsOf(hint)).toEqual(["Lâchez pour quitter la comparaison"])
    expect(hint.props.pointerEvents).toBe("none")
    expect(hint.props.accessibilityLiveRegion).toBe("polite")
    expect(flat(hint.props.style)).toMatchObject({
      minHeight: 24,
      maxWidth: 232,
      backgroundColor: defaultTheme.visual.mapHint.fill,
    })
    const text = hint.findByType("Text" as never)
    expect(flat(text.props.style)).toMatchObject({
      fontSize: 12,
      color: defaultTheme.visual.mapHint.ink,
      textAlign: "center",
    })
    // The pill itself is unchanged and still takes the press.
    expect(textsOf(pill)).toEqual(["Quitter la comparaison"])
  })

  test("fades in over 160 ms, following Reduce Motion", () => {
    const { tree } = renderQuit()
    const wrapper = tree.root.findByType("AnimatedView" as never)
    expect(wrapper.props.entering.calls).toEqual({
      durationMs: brandMotion.durations.fast,
      reduceMotion: "system",
    })
  })
})
