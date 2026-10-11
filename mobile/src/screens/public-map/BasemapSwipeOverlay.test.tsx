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
        layer="map"
        comparing={false}
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

  test("is adjustable, with the value text and the three actions", () => {
    const indicator = byId(render(), "swipe-indicator")[0]
    expect(indicator.props.accessible).toBe(true)
    expect(indicator.props.accessibilityRole).toBe("adjustable")
    expect(indicator.props.accessibilityValue).toEqual({ text: "Plan, aujourd'hui, fond 1 sur 5" })
    expect(indicator.props.accessibilityActions).toEqual([
      { name: "increment", label: "Fond suivant" },
      { name: "decrement", label: "Fond précédent" },
      { name: "compareNext", label: "Comparer avec le fond suivant" },
    ])
    const fire = (actionName: string) =>
      act(() => indicator.props.onAccessibilityAction({ nativeEvent: { actionName } }))
    fire("increment")
    fire("decrement")
    fire("compareNext")
    fire("activate")
    expect(handlers.onNext).toHaveBeenCalledTimes(1)
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1)
    expect(handlers.onCompareNext).toHaveBeenCalledTimes(1)
  })

  test("offers no compare action when comparing is not available", () => {
    const indicator = byId(render({ compareAvailable: false }), "swipe-indicator")[0]
    expect(
      indicator.props.accessibilityActions.map((action: { name: string }) => action.name),
    ).toEqual(["increment", "decrement"])
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

describe("Terminé", () => {
  test("a labelled 40 pt pill with a 44 pt target that calls onDone", () => {
    const tree = render()
    const done = byId(tree, "swipe-done")[0]
    expect(done.props.accessibilityRole).toBe("button")
    expect(done.props.accessibilityLabel).toBe("Terminé : libérer la carte")
    expect(done.props.hitSlop).toBe(2)
    expect(textsOf(done)).toEqual(["Terminé"])
    const surface = tree.root
      .findAllByType("GlassSurface" as never)
      .find((node) => node.findAll((child) => child.props.testID === "swipe-done").length > 0)
    expect(flat(surface?.props.style)).toMatchObject({ height: 40, maxWidth: 232 })
    expect(surface?.props.surface).toEqual(defaultTheme.visual.mapControl.glass)
    act(() => done.props.onPress())
    expect(handlers.onDone).toHaveBeenCalledTimes(1)
  })
})

describe("hint", () => {
  test("the intro hint shows while no finger is down", () => {
    const hint = byId(render({ introHintVisible: true }), "swipe-hint")[0]
    expect(textsOf(hint)).toEqual(["Glissez · lâchez au milieu pour comparer"])
    expect(hint.props.pointerEvents).toBe("none")
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
    const wrapper = tree.root
      .findAllByType("AnimatedView" as never)
      .find((node) => node.findAll((child) => child.props.testID === "swipe-hint").length > 0)
    expect(wrapper?.props.entering.calls).toEqual({
      durationMs: brandMotion.durations.fast,
      reduceMotion: "system",
    })
    expect(wrapper?.props.exiting.calls).toEqual({ durationMs: 1000, reduceMotion: "system" })
  })
})

describe("in a comparison", () => {
  test("no indicator and no dots, only Terminé and the comparison hint", () => {
    const tree = render({ comparing: true, introHintVisible: true })
    expect(byId(tree, "swipe-indicator")).toHaveLength(0)
    expect(byId(tree, "swipe-dots")).toHaveLength(0)
    expect(byId(tree, "swipe-done")).toHaveLength(1)
    expect(textsOf(byId(tree, "swipe-hint")[0])).toEqual([
      "Glissez un côté pour changer son fond · tirez la ligne au bord pour quitter la comparaison",
    ])
  })

  test("the side hint shows while a finger is down", () => {
    const tree = render({
      comparing: true,
      fingerDown: true,
      hintText: "Lâchez pour changer de fond",
    })
    expect(textsOf(byId(tree, "swipe-hint")[0])).toEqual(["Lâchez pour changer de fond"])
  })
})

describe("layout", () => {
  test("a centred column from the given top, clear of the capsule on both sides", () => {
    const tree = render({ top: 91 })
    const column = tree.root.findAll(
      (node) => typeof node.type === "string" && node.props.pointerEvents === "box-none",
    )[0]
    expect(flat(column.props.style)).toMatchObject({
      position: "absolute",
      left: 72,
      right: 72,
      top: 91,
      alignItems: "center",
      gap: 8,
    })
  })

  test("the indicator and the dots fade in over 160 ms (none under Reduce Motion)", () => {
    const tree = render()
    const wrappers = tree.root.findAllByType("AnimatedView" as never)
    expect(wrappers).toHaveLength(3)
    wrappers.forEach((wrapper) =>
      expect(wrapper.props.entering.calls).toEqual({
        durationMs: brandMotion.durations.fast,
        reduceMotion: "system",
      }),
    )
  })
})

describe("QuitComparePill", () => {
  function renderQuit(top = 58, onQuit = jest.fn()) {
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<QuitComparePill top={top} onQuit={onQuit} />)
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
      left: 72,
      right: 72,
      top: 120,
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

  test("fades in over 160 ms, following Reduce Motion", () => {
    const { tree } = renderQuit()
    const wrapper = tree.root.findByType("AnimatedView" as never)
    expect(wrapper.props.entering.calls).toEqual({
      durationMs: brandMotion.durations.fast,
      reduceMotion: "system",
    })
  })
})
