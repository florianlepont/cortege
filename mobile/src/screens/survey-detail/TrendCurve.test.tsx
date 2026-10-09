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
import { createFakeNavigation } from "../../../test/fake-navigation"
import * as reanimated from "../../../test/react-native-reanimated.mock"
import { brandMotion, brandTypography } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { buildTrend, TREND_HEIGHT } from "../../app/trend-geometry"
import type { TrendInputPoint } from "../../app/trend-geometry"
import { fr } from "../../i18n"
import { ScreenCoverContext } from "../../ui/screen-cover-context"
import { TREND_REVEAL_MODE, TrendCurve } from "./TrendCurve"
import type { TrendRevealMode } from "./TrendCurve"

const forest = defaultTheme.visual.forest
const withDelaySpy = jest.spyOn(reanimated, "withDelay")
const withTimingSpy = jest.spyOn(reanimated, "withTiming")

afterEach(() => {
  reanimated.setReducedMotion(false)
  withDelaySpy.mockClear()
  withTimingSpy.mockClear()
})

const WIDTH = 311

// Two runs of two methods (cut), one point without a year, the last one is the current survey.
const POINTS: TrendInputPoint[] = [
  { surveyId: "a", total: 21, year: 2023, isCurrent: false, methodKey: "v3.0" },
  { surveyId: "b", total: 27, year: null, isCurrent: false, methodKey: "v3.0" },
  { surveyId: "c", total: 30, year: 2024, isCurrent: false, methodKey: "v3.2" },
  { surveyId: "d", total: 34, year: 2025, isCurrent: true, methodKey: "v3.2" },
]
const LABEL = "Évolution du total IBP. test"

type Props = React.ComponentProps<typeof TrendCurve>

function element(props: Partial<Props> = {}) {
  return <TrendCurve points={POINTS} accessibilityLabel={LABEL} {...props} />
}

function find(root: renderer.ReactTestInstance, type: string) {
  return root.findAll((n) => (n.type as unknown) === type)
}

function mount(
  props: Partial<Props> = {},
  wrap?: (child: React.ReactElement) => React.ReactElement,
) {
  let tree: renderer.ReactTestRenderer | undefined
  const build = (next: Partial<Props> = props) => (wrap ? wrap(element(next)) : element(next))
  act(() => {
    tree = renderer.create(build())
  })
  const wrapper = () => tree!.root.findByProps({ testID: "trend-curve" })
  const layout = (width = WIDTH) =>
    act(() => {
      wrapper().props.onLayout({ nativeEvent: { layout: { width, height: TREND_HEIGHT } } })
    })
  const rerender = () =>
    act(() => {
      tree!.update(build())
    })
  return { tree: tree!, root: tree!.root, wrapper, layout, rerender }
}

function laidOut(props: Partial<Props> = {}) {
  const view = mount(props)
  view.layout()
  return view
}

describe("TrendCurve layout", () => {
  test("nothing is drawn before the width is known, then an Svg of that width", () => {
    const view = mount({ revealMode: "dash" })
    expect(find(view.root, "Svg")).toHaveLength(0)
    expect(view.wrapper().props.style).toMatchObject({ height: 128 })
    view.layout()
    const svg = find(view.root, "Svg")
    expect(svg).toHaveLength(1)
    expect(svg[0].props.width).toBe(WIDTH)
    expect(svg[0].props.height).toBe(128)
  })

  test("a zero width draws no Svg", () => {
    const view = mount()
    view.layout(0)
    expect(find(view.root, "Svg")).toHaveLength(0)
  })
})

describe.each<TrendRevealMode>(["dash", "clip"])("TrendCurve drawing (%s)", (revealMode) => {
  test("one solid accent path per run of two or more points", () => {
    const { root } = laidOut({ revealMode })
    const geometry = buildTrend(POINTS, WIDTH)
    const solid = find(root, "Path").filter((p) => p.props.stroke === forest.titleAccent)
    expect(solid).toHaveLength(2)
    expect(solid.map((p) => p.props.d)).toEqual(geometry.segments.map((s) => s.d))
    for (const path of solid) {
      expect(path.props.strokeWidth).toBe(3)
      expect(path.props.strokeLinecap).toBe("round")
      expect(path.props.strokeLinejoin).toBe("round")
      expect(path.props.fill).toBe("none")
    }
  })

  test("one dashed sage link between the two methods", () => {
    const { root } = laidOut({ revealMode })
    const links = find(root, "Path").filter((p) => p.props.stroke === forest.sage)
    expect(links).toHaveLength(1)
    expect(links[0].props.d).toBe(buildTrend(POINTS, WIDTH).links[0].d)
    expect(links[0].props.strokeWidth).toBe(2)
    expect(links[0].props.strokeDasharray).toBe("4 4")
  })

  test("a circle per point, the current one larger with a ring", () => {
    const { root } = laidOut({ revealMode })
    const circles = find(root, "Circle")
    expect(circles).toHaveLength(4)
    for (const circle of circles.slice(0, 3)) {
      expect(circle.props.r).toBe(4)
      expect(circle.props.fill).toBe(forest.titleAccent)
    }
    expect(circles[3].props.r).toBe(6)
    expect(circles[3].props.fill).toBe(forest.title)
    expect(circles[3].props.stroke).toBe(forest.titleAccent)
    expect(circles[3].props.strokeWidth).toBe(2)
  })

  test("value labels 12 above each point and year labels on the baseline", () => {
    const { root } = laidOut({ revealMode })
    const geometry = buildTrend(POINTS, WIDTH)
    const texts = find(root, "Text")
    expect(texts).toHaveLength(8)
    const values = texts.slice(0, 4)
    const years = texts.slice(4)
    values.forEach((text, index) => {
      expect(text.props.children).toBe(POINTS[index].total)
      expect(text.props.x).toBe(geometry.points[index].x)
      expect(text.props.y).toBe(geometry.points[index].y - 12)
      expect(text.props.fill).toBe(forest.title)
      expect(text.props.fontFamily).toBe(brandTypography.ringValue.fontFamily)
      expect(text.props.fontSize).toBe(12)
      expect(text.props.textAnchor).toBe("middle")
    })
    years.forEach((text, index) => {
      expect(text.props.y).toBe(120)
      expect(text.props.x).toBe(geometry.points[index].x)
      expect(text.props.fill).toBe(forest.body)
      expect(text.props.fontFamily).toBe(brandTypography.meta.fontFamily)
      expect(text.props.fontSize).toBe(12)
      expect(text.props.textAnchor).toBe("middle")
    })
    expect(years.map((text) => text.props.children)).toEqual([
      2023,
      fr.parcelHistory.page.trend.unknownYear,
      2024,
      2025,
    ])
  })

  test("one accessible image with the label, the Svg hidden from assistive tech", () => {
    const { root, wrapper } = laidOut({ revealMode })
    expect(wrapper().props.accessible).toBe(true)
    expect(wrapper().props.accessibilityRole).toBe("image")
    expect(wrapper().props.accessibilityLabel).toBe(LABEL)
    const svg = find(root, "Svg")[0]
    expect(svg.props.accessibilityElementsHidden).toBe(true)
    expect(svg.props.importantForAccessibility).toBe("no-hide-descendants")
  })

  test("a single run draws no link and a lone point no path", () => {
    const lone = laidOut({ revealMode, points: [POINTS[0]] })
    expect(find(lone.root, "Path")).toHaveLength(0)
    expect(find(lone.root, "Circle")).toHaveLength(1)
    const same = laidOut({ revealMode, points: POINTS.slice(0, 2) })
    expect(find(same.root, "Path")).toHaveLength(1)
  })
})

describe("TrendCurve dash mode", () => {
  test("each run carries a dash array of its length and an animated offset", () => {
    const { root } = laidOut({ revealMode: "dash" })
    const geometry = buildTrend(POINTS, WIDTH)
    const solid = find(root, "Path").filter((p) => p.props.stroke === forest.titleAccent)
    solid.forEach((path, index) => {
      const { length } = geometry.segments[index]
      expect(path.props.strokeDasharray).toEqual([length, length])
      expect(path.props.animatedProps.strokeDashoffset).toBeCloseTo(length)
    })
  })

  test("points, links and labels sit in a group with an animated opacity", () => {
    const { root } = laidOut({ revealMode: "dash" })
    const group = find(root, "G")[0]
    expect(group.props.animatedProps.opacity).toBe(0)
    expect(find(group, "Circle")).toHaveLength(4)
    expect(find(group, "Text")).toHaveLength(8)
    expect(find(root, "ClipPath")).toHaveLength(0)
  })

  test("under Reduce Motion the lines and the group are complete at the first frame", () => {
    reanimated.setReducedMotion(true)
    const { root } = laidOut({ revealMode: "dash" })
    const solid = find(root, "Path").filter((p) => p.props.stroke === forest.titleAccent)
    for (const path of solid) expect(path.props.animatedProps.strokeDashoffset).toBe(0)
    expect(find(root, "G")[0].props.animatedProps.opacity).toBe(1)
  })
})

describe("TrendCurve clip mode", () => {
  test("everything sits in a group clipped by a rectangle that grows with the progress", () => {
    const { root } = laidOut({ revealMode: "clip" })
    const clip = find(root, "ClipPath")[0]
    const rect = find(clip, "Rect")[0]
    expect(rect.props.x).toBe(0)
    expect(rect.props.y).toBe(0)
    expect(rect.props.height).toBe(128)
    expect(rect.props.animatedProps.width).toBe(0)
    const group = find(root, "G")[0]
    expect(group.props.clipPath).toBe(`url(#${clip.props.id})`)
    expect(find(group, "Circle")).toHaveLength(4)
    expect(find(group, "Path")).toHaveLength(3)
  })

  test("the clip id is made of letters, digits, dash and underscore, and unique per instance", () => {
    const first = laidOut({ revealMode: "clip" })
    const second = laidOut({ revealMode: "clip" })
    const idOf = (view: ReturnType<typeof laidOut>) => find(view.root, "ClipPath")[0].props.id
    expect(idOf(first)).toMatch(/^trend-clip-[A-Za-z0-9_-]*$/)
    expect(idOf(second)).toMatch(/^trend-clip-[A-Za-z0-9_-]*$/)
    expect(idOf(first)).not.toBe(idOf(second))
  })

  test("under Reduce Motion the clip is the full width at the first frame", () => {
    reanimated.setReducedMotion(true)
    const { root } = laidOut({ revealMode: "clip" })
    expect(find(find(root, "ClipPath")[0], "Rect")[0].props.animatedProps.width).toBe(WIDTH)
  })
})

describe("TrendCurve default mode", () => {
  test("renders with the exported default when no mode is passed", () => {
    expect(["clip", "dash"]).toContain(TREND_REVEAL_MODE)
    const { root } = laidOut()
    expect(find(root, "ClipPath")).toHaveLength(TREND_REVEAL_MODE === "clip" ? 1 : 0)
  })
})

describe("TrendCurve reveal timing", () => {
  test("nothing is scheduled before the layout, then one delayed timing with Reduce Motion deferred to the system", () => {
    const view = mount({ revealMode: "dash" })
    expect(withDelaySpy).not.toHaveBeenCalled()
    view.layout()
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
    expect(withDelaySpy.mock.calls[0][0]).toBe(120)
    expect(withTimingSpy).toHaveBeenCalledTimes(1)
    expect(withTimingSpy.mock.calls[0][0]).toBe(1)
    expect((withTimingSpy.mock.calls[0] as unknown[])[1]).toMatchObject({
      duration: brandMotion.durations.emphasis,
      reduceMotion: reanimated.ReduceMotion.System,
    })
  })

  test("a re-render, a resize or a new layout never starts it again", () => {
    const view = laidOut({ revealMode: "clip" })
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
    view.rerender()
    view.layout(280)
    view.layout()
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
  })

  test("Reduce Motion schedules no timing at all", () => {
    reanimated.setReducedMotion(true)
    laidOut({ revealMode: "dash" })
    expect(withDelaySpy).not.toHaveBeenCalled()
    expect(withTimingSpy).not.toHaveBeenCalled()
  })

  test("a covered screen waits for the cover to lift and then plays once", () => {
    let tree: renderer.ReactTestRenderer | undefined
    const render = (covered: boolean) => (
      <ScreenCoverContext.Provider value={covered}>
        {element({ revealMode: "clip" })}
      </ScreenCoverContext.Provider>
    )
    act(() => {
      tree = renderer.create(render(true))
    })
    act(() => {
      tree!.root.findByProps({ testID: "trend-curve" }).props.onLayout({
        nativeEvent: { layout: { width: WIDTH, height: TREND_HEIGHT } },
      })
    })
    expect(withDelaySpy).not.toHaveBeenCalled()
    act(() => tree!.update(render(false)))
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
    act(() => tree!.update(render(true)))
    act(() => tree!.update(render(false)))
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
  })

  test("a blurred screen waits for its focus and a later blur and focus do not replay", () => {
    const { navigation, emit } = createFakeNavigation(false)
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <NavigationContext.Provider value={navigation as never}>
          {element({ revealMode: "dash" })}
        </NavigationContext.Provider>,
      )
    })
    act(() => {
      tree!.root.findByProps({ testID: "trend-curve" }).props.onLayout({
        nativeEvent: { layout: { width: WIDTH, height: TREND_HEIGHT } },
      })
    })
    expect(withDelaySpy).not.toHaveBeenCalled()
    emit("focus")
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
    emit("blur")
    emit("focus")
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
  })
})
