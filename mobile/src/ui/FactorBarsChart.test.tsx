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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    FlatList: mockComponent("FlatList"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

import * as reanimated from "../../test/react-native-reanimated.mock"
import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import { FactorBarsChart, factorPointsFromEntries } from "./FactorBarsChart"

const withSpringSpy = jest.spyOn(reanimated, "withSpring")
const withDelaySpy = jest.spyOn(reanimated, "withDelay")

afterEach(() => {
  reanimated.setReducedMotion(false)
  withSpringSpy.mockClear()
  withDelaySpy.mockClear()
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const

function render(props: Partial<React.ComponentProps<typeof FactorBarsChart>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<FactorBarsChart entries={{}} testID="chart" {...props} />)
  })
  const root = tree!.root
  const host = (testID: string) =>
    root.findAll((n) => (n.type as unknown) === "View" && n.props.testID === testID)[0]
  const bar = (letter: string) => flatten(host(`chart-${letter}-bar`).props.style)
  return { root, bar, host }
}

describe("factorPointsFromEntries", () => {
  test("keeps the ten factor keys and drops unknown ones", () => {
    expect(
      factorPointsFromEntries([
        ["A", { score_points: 4 }],
        ["J", { score_points: null }],
        ["X", { score_points: 2 }],
      ]),
    ).toEqual({ A: 4, J: null })
  })
})

describe("FactorBarsChart", () => {
  test("renders ten bars A to J with a letter under each", () => {
    const { root } = render()
    const bars = root.findAll(
      (n) =>
        (n.type as unknown) === "View" &&
        typeof n.props.testID === "string" &&
        /-bar$/.test(n.props.testID),
    )
    expect(bars).toHaveLength(10)
    expect(bars.map((n) => n.props.testID)).toEqual(LETTERS.map((l) => `chart-${l}-bar`))
    const letters = root
      .findAll((n) => (n.type as unknown) === "Text")
      .map((n) => String(n.props.children))
    expect(letters).toEqual([...LETTERS])
  })

  test("bar height is max(4, points / 5 * 64)", () => {
    const { bar } = render({ entries: { A: 5, B: 3, C: null, D: 0 } })
    expect(bar("A").height).toBe(64)
    expect(bar("B").height).toBeCloseTo(38.4)
    expect(bar("C").height).toBe(4)
    expect(bar("D").height).toBe(4)
  })

  test("tone follows the 0-2 / 3 / 4-5 convention, with the glow", () => {
    const { bar } = render({ entries: { A: 2, B: 3, C: 5 } })
    const { factorBar } = defaultTheme.visual
    expect(bar("A")).toMatchObject({
      backgroundColor: factorBar.low.base,
      experimental_backgroundImage: factorBar.low.image,
      boxShadow: factorBar.low.shadow,
    })
    expect(bar("B")).toMatchObject({ backgroundColor: factorBar.mid.base })
    expect(bar("C")).toMatchObject({ backgroundColor: factorBar.high.base })
  })

  test("an empty factor uses the track colour and no shadow", () => {
    const { bar } = render({ entries: { A: null } })
    expect(bar("A").backgroundColor).toBe(defaultTheme.visual.score.track)
    expect(bar("A").boxShadow).toBeUndefined()
    expect(bar("J").backgroundColor).toBe(defaultTheme.visual.score.track)
  })

  test("the container reads as one image and each bar column is hidden", () => {
    const { host } = render({ entries: { A: 4, J: null } })
    const container = host("chart")
    expect(container.props.accessible).toBe(true)
    expect(container.props.accessibilityRole).toBe("image")
    expect(container.props.accessibilityLabel).toBe(
      fr.components.factorBars.label(
        LETTERS.map((letter) => ({
          letter,
          points: letter === "A" ? 4 : null,
        })),
      ),
    )
    for (const letter of LETTERS) {
      const column = host(`chart-${letter}`)
      expect(column.props.importantForAccessibility).toBe("no")
      expect(column.props.accessibilityElementsHidden).toBe(true)
    }
  })

  test("nothing in the tree is pressable", () => {
    const { root } = render({ entries: { A: 4 }, animate: true })
    expect(root.findAll((n) => n.props.onPress || n.props.onPressIn)).toHaveLength(0)
  })

  test("bars scale from the bottom and animate the transform only", () => {
    const { bar } = render({ entries: { A: 4 }, animate: true })
    expect(bar("A").transformOrigin).toBe("bottom")
    expect(bar("A").transform).toEqual([{ scaleY: 0 }])
    expect(bar("A").height).toBeCloseTo(51.2)
  })

  test("animate springs the ten bars with a stagger", () => {
    render({ animate: true })
    expect(withSpringSpy).toHaveBeenCalledTimes(10)
    expect(withDelaySpy.mock.calls.map((call) => call[0])).toEqual(
      LETTERS.map((_, index) => index * 40),
    )
    const config = (withSpringSpy.mock.calls[0] as unknown[])[1]
    expect(config).toMatchObject({ damping: 22, stiffness: 140, reduceMotion: "system" })
  })

  test("without animate the bars show final and no spring starts", () => {
    const { bar } = render()
    expect(bar("A").transform).toEqual([{ scaleY: 1 }])
    expect(withSpringSpy).not.toHaveBeenCalled()
  })

  test("under Reduce Motion every bar is final and no spring starts", () => {
    reanimated.setReducedMotion(true)
    const { bar } = render({ animate: true })
    for (const letter of LETTERS) expect(bar(letter).transform).toEqual([{ scaleY: 1 }])
    expect(withSpringSpy).not.toHaveBeenCalled()
  })

  test("renders without a testID", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<FactorBarsChart entries={{ A: 1 }} />)
    })
    expect(tree!.root.findAll((n) => n.props.testID !== undefined)).toHaveLength(0)
  })
})
