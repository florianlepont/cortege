import React from "react"
import renderer, { act } from "react-test-renderer"

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

// The real navigation package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    },
  }
})

import { NavigationContext } from "@react-navigation/native"
import { createFakeNavigation } from "../../test/fake-navigation"
import * as reanimated from "../../test/react-native-reanimated.mock"
import { brandTypography } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import { ScreenCoverContext } from "./screen-cover-context"
import { resetAnimatedRingKeys, ringGeometry, ScoreRing, shouldAnimateRing } from "./ScoreRing"

const withDelaySpy = jest.spyOn(reanimated, "withDelay")

beforeEach(() => {
  resetAnimatedRingKeys()
})

afterEach(() => {
  reanimated.setReducedMotion(false)
  withDelaySpy.mockClear()
})

type Props = React.ComponentProps<typeof ScoreRing>

function render(props: Partial<Props> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<ScoreRing score={null} {...props} />)
  })
  const root = tree!.root
  const circles = root.findAll((n) => (n.type as unknown) === "Circle")
  const texts = root.findAll((n) => (n.type as unknown) === "Text")
  return { root, circles, texts, rootView: root.findAllByType("View" as never)[0] }
}

function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...flatStyle(s) }), {})
  }
  return (style as Record<string, unknown> | undefined) ?? {}
}

describe("catalogue entries (D-15)", () => {
  const t = fr.components

  test("score ring labels", () => {
    expect(t.scoreRing.label({ score: 34 })).toBe("Score 34 sur 50")
    expect(t.scoreRing.none).toBe("Pas de score")
    expect(t.scoreRing.draft({ filled: 1 })).toBe("1 facteur sur 10 rempli")
    expect(t.scoreRing.draft({ filled: 4 })).toBe("4 facteurs sur 10 remplis")
  })

  test("factor bars label reads as one sentence", () => {
    expect(
      t.factorBars.label([
        { letter: "A", points: 4 },
        { letter: "J", points: null },
      ]),
    ).toBe("Facteurs. A 4 sur 5, J non rempli.")
  })

  test("no new string carries the em dash", () => {
    const strings = [
      t.scoreRing.label({ score: 1 }),
      t.scoreRing.none,
      t.scoreRing.draft({ filled: 0 }),
      t.scoreRing.draft({ filled: 1 }),
      t.factorBars.label([{ letter: "A", points: 0 }]),
    ]
    for (const text of strings) expect(text).not.toContain("—")
  })
})

describe("ringGeometry", () => {
  test("38 pt ring, stroke 4, half drawn", () => {
    const g = ringGeometry(38, 4, 0.5)
    expect(g.radius).toBe(17)
    expect(g.circumference).toBeCloseTo(2 * Math.PI * 17)
    expect(g.dashOffset).toBeCloseTo(g.circumference * 0.5)
  })

  test("progress is clamped", () => {
    expect(ringGeometry(38, 4, 2).dashOffset).toBe(0)
    expect(ringGeometry(38, 4, -1).dashOffset).toBeCloseTo(ringGeometry(38, 4, 0).circumference)
  })
})

describe("ScoreRing with a score", () => {
  test.each([
    [15, "low"],
    [25, "mid"],
    [35, "high"],
  ] as const)("score %s strokes the %s tone", (score, tone) => {
    const { circles } = render({ score })
    expect(circles).toHaveLength(2)
    expect(circles[0].props.stroke).toBe(defaultTheme.visual.score.track)
    expect(circles[1].props.stroke).toBe(defaultTheme.visual.score[tone])
    expect(circles[1].props.strokeLinecap).toBe("round")
  })

  test("light high tone is #728A2D", () => {
    expect(render({ score: 35 }).circles[1].props.stroke).toBe("#728A2D")
  })

  test("the inner number uses the ring value role", () => {
    const { texts } = render({ score: 35 })
    expect(texts).toHaveLength(1)
    expect(texts[0].props.children).toBe(35)
    expect(flatStyle(texts[0].props.style)).toMatchObject({
      fontSize: brandTypography.ringValue.fontSize,
      fontFamily: brandTypography.ringValue.fontFamily,
    })
  })

  test("one accessible image with the catalogue label, SVG hidden, no press handler", () => {
    const { rootView, root } = render({ score: 34, testID: "ring" })
    expect(rootView.props.accessible).toBe(true)
    expect(rootView.props.accessibilityRole).toBe("image")
    expect(rootView.props.accessibilityLabel).toBe("Score 34 sur 50")
    const svg = root.findAll((n) => (n.type as unknown) === "Svg")[0]
    expect(svg.props.accessibilityElementsHidden).toBe(true)
    expect(svg.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(root.findAll((n) => n.props.onPress || n.props.onPressIn)).toHaveLength(0)
  })

  test("the arc keeps the offset of its ratio when not animated", () => {
    const { circles } = render({ score: 25 })
    const { circumference } = ringGeometry(38, 4, 0.5)
    expect(circles[1].props.animatedProps.strokeDashoffset).toBeCloseTo(circumference * 0.5)
  })
})

describe("ScoreRing without a score", () => {
  test("no score and no completion: one dashed neutral track, no arc, no number", () => {
    const { circles, texts, rootView } = render({ score: null })
    expect(circles).toHaveLength(1)
    expect(circles[0].props.strokeDasharray).toBe("3 4")
    expect(circles[0].props.stroke).toBe(defaultTheme.visual.score.neutral)
    expect(texts).toHaveLength(0)
    expect(rootView.props.accessibilityLabel).toBe("Pas de score")
  })

  test("a draft shows a neutral completion arc and its factor count", () => {
    const { circles, texts, rootView } = render({ score: null, completion: 0.4 })
    expect(circles).toHaveLength(2)
    expect(circles[1].props.stroke).toBe(defaultTheme.visual.score.neutral)
    const { circumference } = ringGeometry(38, 4, 0.4)
    expect(circles[1].props.animatedProps.strokeDashoffset).toBeCloseTo(circumference * 0.6)
    expect(texts).toHaveLength(0)
    expect(rootView.props.accessibilityLabel).toBe("4 facteurs sur 10 remplis")
  })

  test("a draft with one factor uses the singular", () => {
    expect(render({ score: null, completion: 0.1 }).rootView.props.accessibilityLabel).toBe(
      "1 facteur sur 10 rempli",
    )
  })
})

describe("shouldAnimateRing", () => {
  test("true once per key, then false", () => {
    expect(shouldAnimateRing("s1:30", 0, false)).toBe(true)
    expect(shouldAnimateRing("s1:30", 0, false)).toBe(false)
  })

  test("a new score for the same survey animates again", () => {
    expect(shouldAnimateRing("s1:30", 0, false)).toBe(true)
    expect(shouldAnimateRing("s1:31", 0, false)).toBe(true)
  })

  test("rows from index 8 on, a missing key and Reduce Motion never animate", () => {
    expect(shouldAnimateRing("s2:30", 8, false)).toBe(false)
    expect(shouldAnimateRing(undefined, 0, false)).toBe(false)
    expect(shouldAnimateRing("s3:30", 0, true)).toBe(false)
    // The skipped keys were not recorded.
    expect(shouldAnimateRing("s2:30", 0, false)).toBe(true)
    expect(shouldAnimateRing("s3:30", 0, false)).toBe(true)
  })

  test("resetAnimatedRingKeys clears the set", () => {
    shouldAnimateRing("s1:30", 0, false)
    resetAnimatedRingKeys()
    expect(shouldAnimateRing("s1:30", 0, false)).toBe(true)
  })
})

describe("ScoreRing motion", () => {
  test("the first mount with a key starts at 0 and a staggered timing", () => {
    const { circles } = render({ score: 25, animationKey: "a:25", index: 2 })
    expect(circles[1].props.animatedProps.strokeDashoffset).toBeCloseTo(
      ringGeometry(38, 4, 0).circumference,
    )
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
    expect(withDelaySpy.mock.calls[0][0]).toBe(80)
  })

  test("a second mount for the same key renders final with no timing", () => {
    render({ score: 25, animationKey: "a:25" })
    withDelaySpy.mockClear()
    const { circles } = render({ score: 25, animationKey: "a:25" })
    expect(circles[1].props.animatedProps.strokeDashoffset).toBeCloseTo(
      ringGeometry(38, 4, 0.5).dashOffset,
    )
    expect(withDelaySpy).not.toHaveBeenCalled()
  })

  test("under Reduce Motion the final offset shows at first render", () => {
    reanimated.setReducedMotion(true)
    const { circles } = render({ score: 25, animationKey: "b:25" })
    expect(circles[1].props.animatedProps.strokeDashoffset).toBeCloseTo(
      ringGeometry(38, 4, 0.5).dashOffset,
    )
    expect(withDelaySpy).not.toHaveBeenCalled()
  })

  test("under an overlay the fill waits, and starts once the screen is visible (12.2-11 fix)", () => {
    let tree: renderer.ReactTestRenderer | undefined
    const element = (covered: boolean) => (
      <ScreenCoverContext.Provider value={covered}>
        <ScoreRing score={25} animationKey="cover:25" index={1} />
      </ScreenCoverContext.Provider>
    )
    act(() => {
      tree = renderer.create(element(true))
    })
    expect(withDelaySpy).not.toHaveBeenCalled()
    act(() => tree!.update(element(false)))
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
    expect(withDelaySpy.mock.calls[0][0]).toBe(40)
    act(() => tree!.unmount())
  })

  test("in an unfocused screen the fill waits for the focus", () => {
    const { navigation, emit } = createFakeNavigation(false)
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <NavigationContext.Provider value={navigation as never}>
          <ScoreRing score={25} animationKey="focus:25" />
        </NavigationContext.Provider>,
      )
    })
    expect(withDelaySpy).not.toHaveBeenCalled()
    emit("focus")
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
    act(() => tree!.unmount())
  })
})
