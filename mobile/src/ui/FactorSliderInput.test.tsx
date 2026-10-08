import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../app/theme"
import { FactorSliderInput } from "./FactorSliderInput"

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
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

function render(
  value: string,
  extra: Partial<React.ComponentProps<typeof FactorSliderInput>> = {},
) {
  const onChange = jest.fn()
  const onTouch = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorSliderInput
        label="Milieux ouverts fleuris (%)"
        value={value}
        onChange={onChange}
        touched={false}
        onTouch={onTouch}
        error={null}
        testID="g"
        {...extra}
      />,
    )
  })
  return { tree: tree!, onChange, onTouch }
}

function findTrack(tree: renderer.ReactTestRenderer) {
  return tree.root.findAll((n) => (n.type as unknown) === "View" && n.props.testID === "g-track")[0]
}

describe("FactorSliderInput (FLOW-01 slider variant, 5% steps)", () => {
  test("the +/- buttons step by 5 and clamp to [0,100]", () => {
    const { tree, onChange, onTouch } = render("0", { testID: "g" })
    const increase = tree.root.findAll((n) => n.props.testID === "g-increase")[0]
    act(() => {
      increase.props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith("5")
    expect(onTouch).toHaveBeenCalledTimes(1)

    const decrease = tree.root.findAll((n) => n.props.testID === "g-decrease")[0]
    act(() => {
      decrease.props.onPress()
    })
    act(() => {
      decrease.props.onPress()
    })
    // starts back at 0 each render since onChange doesn't mutate the prop in this test harness;
    // clamped at 0, never negative.
    expect(onChange).toHaveBeenLastCalledWith("0")
  })

  test("dragging on the track snaps to the nearest 5% step and touches on release", () => {
    const { tree, onChange, onTouch } = render("0")
    const track = findTrack(tree)
    act(() => {
      track.props.onLayout({ nativeEvent: { layout: { width: 200, height: 44, x: 0, y: 0 } } })
    })
    act(() => {
      track.props.onResponderGrant({ nativeEvent: { locationX: 62 } })
    })
    // 62/200 = 31% -> nearest 5% step = 30.
    expect(onChange).toHaveBeenCalledWith("30")
    act(() => {
      track.props.onResponderRelease()
    })
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  test("exposes an adjustable accessibility value and increment/decrement actions", () => {
    const { tree, onChange } = render("40")
    const track = findTrack(tree)
    expect(track.props.accessibilityRole).toBe("adjustable")
    expect(track.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 })
    act(() => {
      track.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } })
    })
    expect(onChange).toHaveBeenCalledWith("45")
  })

  test("no error shows before touch even when one is available", () => {
    const { tree } = render("0", { error: "Champ obligatoire", touched: false })
    const errorTexts = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && String(n.props.children) === "Champ obligatoire",
    )
    expect(errorTexts).toHaveLength(0)
  })

  describe("score tokens, sizes unchanged (D-05, D-16)", () => {
    type Style = Record<string, unknown>
    const flatten = (style: unknown): Style =>
      Array.isArray(style)
        ? style.reduce<Style>((acc, item) => ({ ...acc, ...flatten(item) }), {})
        : ((style as Style | null | undefined) ?? {})

    test("the fill is the score green and the track the score track", () => {
      const { tree } = render("40")
      const track = findTrack(tree)
      const views = track.findAll((n) => (n.type as unknown) === "View")
      const trackFill = flatten(views.find((v) => v.props.pointerEvents === "none")?.props.style)
      const fill = flatten(views.find((v) => flatten(v.props.style).width === "40%")?.props.style)
      expect(trackFill.backgroundColor).toBe(defaultTheme.visual.score.track)
      expect(fill.backgroundColor).toBe(defaultTheme.visual.score.high)
      expect(fill.backgroundColor).not.toBe(defaultTheme.colors.moss)
    })

    test("the track is 8 pt, the thumb 28 pt and the touch row 44 pt", () => {
      const { tree } = render("40")
      const track = findTrack(tree)
      const views = track.findAll((n) => (n.type as unknown) === "View")
      const trackFill = flatten(views.find((v) => v.props.pointerEvents === "none")?.props.style)
      expect(trackFill.height).toBe(8)
      const thumb = views
        .map((v) => flatten(v.props.style))
        .find((style) => style.position === "absolute")
      expect(thumb?.width).toBe(28)
      expect(thumb?.height).toBe(28)
      expect(flatten(track.props.style).height).toBe(44)
      for (const id of ["g-increase", "g-decrease"]) {
        const button = flatten(tree.root.findAll((n) => n.props.testID === id)[0].props.style)
        expect(button.width).toBe(44)
        expect(button.height).toBe(44)
        expect(button.backgroundColor).toBe(defaultTheme.visual.chip.fill)
        expect(button.borderColor).toBe(defaultTheme.visual.chip.border)
      }
    })
  })
})
