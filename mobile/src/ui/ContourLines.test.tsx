import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../test/react-native-reanimated.mock"
import { CONTOUR_PATHS, CONTOUR_VIEWBOX } from "../app/contour-paths"
import { defaultTheme } from "../app/theme"
import { ContourLines } from "./ContourLines"

// The real package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})

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

const withRepeatSpy = jest.spyOn(reanimated, "withRepeat")

afterEach(() => {
  reanimated.setReducedMotion(false)
  withRepeatSpy.mockClear()
})

const noopUnsubscribe = () => undefined
const fakeNavigation = (focused: boolean) =>
  ({ isFocused: () => focused, addListener: () => noopUnsubscribe }) as never

function render(props: Partial<React.ComponentProps<typeof ContourLines>> = {}, focused?: boolean) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    const element = <ContourLines {...props} />
    tree = renderer.create(
      focused === undefined ? (
        element
      ) : (
        <NavigationContext.Provider value={fakeNavigation(focused)}>
          {element}
        </NavigationContext.Provider>
      ),
    )
  })
  return tree!
}

const pathsOf = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => (n.type as unknown) === "Path")

describe("ContourLines", () => {
  test("renders the sage and moss groups from the deterministic paths", () => {
    const [sage, moss, ...rest] = pathsOf(render())
    expect(rest).toHaveLength(0)
    expect(sage.props).toMatchObject({
      d: CONTOUR_PATHS.sage,
      stroke: defaultTheme.visual.forest.contourSage,
      strokeWidth: 1,
      strokeOpacity: 0.55,
      fill: "none",
    })
    expect(moss.props).toMatchObject({
      d: CONTOUR_PATHS.moss,
      stroke: defaultTheme.visual.forest.contourMoss,
      strokeWidth: 1.4,
      strokeOpacity: 1,
      fill: "none",
    })
  })

  test("is decoration: hidden from assistive tech and touches, slice-fitted viewBox", () => {
    const tree = render({ testID: "contours" })
    const wrapper = tree.root.findAll(
      (n) => (n.type as unknown) === "View" && n.props.testID === "contours",
    )[0]
    expect(wrapper.props.pointerEvents).toBe("none")
    expect(wrapper.props.accessibilityElementsHidden).toBe(true)
    expect(wrapper.props.importantForAccessibility).toBe("no-hide-descendants")
    const svg = tree.root.findAll((n) => (n.type as unknown) === "Svg")[0]
    expect(svg.props.viewBox).toBe(CONTOUR_VIEWBOX)
    expect(svg.props.viewBox).toBe("0 0 320 180")
    expect(svg.props.preserveAspectRatio).toBe("xMidYMid slice")
  })

  test("drifts by default outside a navigator and while focused", () => {
    render()
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
    render({}, true)
    expect(withRepeatSpy).toHaveBeenCalledTimes(2)
  })

  test("does not drift when animated is false", () => {
    render({ animated: false })
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })

  test("does not drift under Reduce Motion", () => {
    reanimated.setReducedMotion(true)
    render()
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })

  test("does not drift while the screen is not focused", () => {
    render({}, false)
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })
})
