import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: { position: "absolute" } },
  }
})

// The shared Reanimated mock, with a recording `withTiming`.
const mockTimings: { to: number; config: Record<string, unknown>; done?: (f?: boolean) => void }[] =
  []
jest.mock("react-native-reanimated", () => {
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as Record<
    string,
    unknown
  >
  return {
    ...shared,
    __esModule: true,
    withTiming: (
      to: number,
      config: Record<string, unknown>,
      done?: (finished?: boolean) => void,
    ) => {
      mockTimings.push({ to, config, done })
      return to
    },
  }
})

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
import type { SharedValue } from "react-native-reanimated"
import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { defaultTheme } from "../../app/theme"
import { CurtainSideTags } from "./CurtainSideTags"

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

beforeEach(() => {
  mockTimings.length = 0
  setReducedMotion(false)
})

afterEach(() => {
  setReducedMotion(false)
})

const shared = (value: number) => ({ value }) as unknown as SharedValue<number> & { value: number }
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

const WIDTH = 400

// The tags sit at the grabber's height (`grabberCenterY(height)`, 256 on an 800 pt window).
describe("CurtainSideTags", () => {
  function mount(over: Partial<React.ComponentProps<typeof CurtainSideTags>> = {}) {
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <CurtainSideTags
          lineX={shared(200)}
          width={WIDTH}
          knobTop={256}
          leftName="Plan"
          rightName="Photos 1950"
          swipeMode={false}
          leftUnavailable={false}
          rightUnavailable={false}
          {...over}
        />,
      )
    })
    const tag = (side: "left" | "right") => tree.root.findByProps({ testID: `curtain-tag-${side}` })
    return { tree, tag }
  }

  const textsOf = (node: { findAllByType: (type: never) => { props: { children?: unknown } }[] }) =>
    node.findAllByType("Text" as never).map((text) => text.props.children)
  const glyphsOf = (node: { findAllByType: (type: never) => { props: { name?: string } }[] }) =>
    node.findAllByType("Ionicons" as never).map((glyph) => glyph.props.name)

  test("each tag names its layer", () => {
    const { tag } = mount()
    expect(textsOf(tag("left"))).toEqual(["Plan"])
    expect(textsOf(tag("right"))).toEqual(["Photos 1950"])
  })

  test("the tags sit 30 pt from the line at the grabber height, with room for the name", () => {
    const { tag } = mount()
    const left = flat(tag("left").props.style)
    const right = flat(tag("right").props.style)
    expect(left).toMatchObject({ right: 230, maxWidth: 156, opacity: 1, top: 240, height: 32 })
    expect(right).toMatchObject({ left: 230, maxWidth: 156, opacity: 1, top: 240 })
  })

  test("a tag with under 72 pt of room fades out in 160 ms", () => {
    const { tag } = mount({ lineX: shared(60) })
    expect(flat(tag("left").props.style).opacity).toBe(0)
    expect(flat(tag("right").props.style).opacity).toBe(1)
    expect(mockTimings.some((timing) => timing.to === 0)).toBe(true)
    expect(mockTimings[0].config).toMatchObject({ duration: 160, reduceMotion: "system" })
  })

  test("chevrons round the name while the swipe mode is on", () => {
    const off = mount()
    expect(glyphsOf(off.tag("left"))).toEqual([])
    const on = mount({ swipeMode: true })
    expect(glyphsOf(on.tag("left"))).toEqual(["chevron-back-outline", "chevron-forward-outline"])
    expect(glyphsOf(on.tag("right"))).toEqual(["chevron-back-outline", "chevron-forward-outline"])
  })

  test("an unavailable side wears the cloud-offline glyph before its name", () => {
    const { tag } = mount({ rightUnavailable: true, swipeMode: true })
    expect(glyphsOf(tag("left"))).not.toContain("cloud-offline-outline")
    expect(glyphsOf(tag("right"))).toEqual([
      "cloud-offline-outline",
      "chevron-back-outline",
      "chevron-forward-outline",
    ])
    const { tag: plain } = mount({ leftUnavailable: true })
    expect(glyphsOf(plain("left"))).toEqual(["cloud-offline-outline"])
  })

  test("the tags take no touch and are hidden from accessibility", () => {
    const { tag } = mount()
    for (const side of ["left", "right"] as const) {
      expect(tag(side).props.pointerEvents).toBe("none")
      expect(tag(side).props.accessibilityElementsHidden).toBe(true)
      expect(tag(side).props.importantForAccessibility).toBe("no-hide-descendants")
    }
  })

  test("the pill is the map control glass", () => {
    const { tree } = mount()
    const pill = tree.root.findAllByType("GlassSurface" as never)[0]
    expect(pill.props.surface).toBe(defaultTheme.visual.mapControl.glass)
    expect(flat(pill.props.style)).toMatchObject({ height: 32, paddingHorizontal: 12 })
  })
})
