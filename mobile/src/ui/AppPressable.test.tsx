import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { brandInteraction, brandMotion } from "../app/brand-tokens"
import { AppPressable } from "./AppPressable"

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
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    // Renders the children and the style the way React Native's Pressable would at rest.
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
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

const mockWithSpring = jest.fn((toValue: number) => toValue)
let mockReduced = false
const mockSharedValues: { value: number }[] = []

jest.mock("react-native-reanimated", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: { children?: React.ReactNode }) =>
        ReactRef.createElement("AnimatedView", props, children),
    },
    useReducedMotion: () => mockReduced,
    useSharedValue: (initial: number) => {
      const ref = ReactRef.useRef<{ value: number }>({ value: initial })
      if (!mockSharedValues.includes(ref.current)) mockSharedValues.push(ref.current)
      return ref.current
    },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withSpring: (toValue: number) => mockWithSpring(toValue),
  }
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(props: Partial<React.ComponentProps<typeof AppPressable>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <AppPressable accessibilityLabel="Valider" {...props}>
        {props.children ?? <></>}
      </AppPressable>,
    )
  })
  const root = tree!.root
  const pressable = root.findAll((n) => (n.type as unknown) === "Pressable")[0]
  const inner = root.findAll((n) => (n.type as unknown) === "AnimatedView")[0] as
    | ReactTestInstance
    | undefined
  return { root, pressable, inner }
}

function press(pressable: ReactTestInstance, event: "onPressIn" | "onPressOut") {
  act(() => {
    pressable.props[event]({})
  })
}

afterEach(() => {
  mockReduced = false
  mockWithSpring.mockClear()
  mockSharedValues.length = 0
})

describe("AppPressable accessibility", () => {
  test("forwards the label, defaults the role to button and keeps the other props", () => {
    const { pressable } = render({ testID: "go", accessibilityHint: "Valide", hitSlop: 8 })
    expect(pressable.props.accessibilityLabel).toBe("Valider")
    expect(pressable.props.accessibilityRole).toBe("button")
    expect(pressable.props.testID).toBe("go")
    expect(pressable.props.accessibilityHint).toBe("Valide")
    expect(pressable.props.hitSlop).toBe(8)
  })

  test("an explicit role wins (radio, tab, link, none)", () => {
    for (const role of ["radio", "tab", "link", "none"] as const) {
      expect(render({ accessibilityRole: role }).pressable.props.accessibilityRole).toBe(role)
    }
  })

  test("forwards the state and the accessible flag", () => {
    const { pressable } = render({
      accessibilityState: { selected: true, busy: true },
      accessible: false,
    })
    expect(pressable.props.accessibilityState).toEqual({ selected: true, busy: true })
    expect(pressable.props.accessible).toBe(false)
  })
})

describe("AppPressable press feedback", () => {
  test("springs down on press in and back to 1 on press out, calling the caller's handlers", () => {
    const onPressIn = jest.fn()
    const onPressOut = jest.fn()
    const { pressable } = render({ onPressIn, onPressOut })
    press(pressable, "onPressIn")
    expect(mockWithSpring).toHaveBeenLastCalledWith(brandInteraction.pressedScale)
    expect(mockSharedValues[0].value).toBe(brandInteraction.pressedScale)
    expect(onPressIn).toHaveBeenCalledTimes(1)
    press(pressable, "onPressOut")
    expect(mockWithSpring).toHaveBeenLastCalledWith(1)
    expect(mockSharedValues[0].value).toBe(1)
    expect(onPressOut).toHaveBeenCalledTimes(1)
    expect(brandMotion.springs.press).toBeDefined()
  })

  test("press handlers are optional", () => {
    const { pressable } = render()
    expect(() => {
      press(pressable, "onPressIn")
      press(pressable, "onPressOut")
    }).not.toThrow()
  })

  test("calls onPress", () => {
    const onPress = jest.fn()
    const { pressable } = render({ onPress })
    pressable.props.onPress()
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("Reduce Motion skips the scale but still calls the handlers", () => {
    mockReduced = true
    const onPressIn = jest.fn()
    const onPressOut = jest.fn()
    const { pressable } = render({ onPressIn, onPressOut })
    press(pressable, "onPressIn")
    press(pressable, "onPressOut")
    expect(mockWithSpring).not.toHaveBeenCalled()
    expect(onPressIn).toHaveBeenCalledTimes(1)
    expect(onPressOut).toHaveBeenCalledTimes(1)
  })

  test("disableScale skips the scale and the wrapper view", () => {
    const onPressIn = jest.fn()
    const { pressable, inner } = render({ disableScale: true, onPressIn })
    press(pressable, "onPressIn")
    press(pressable, "onPressOut")
    expect(mockWithSpring).not.toHaveBeenCalled()
    expect(onPressIn).toHaveBeenCalledTimes(1)
    expect(inner).toBeUndefined()
  })
})

describe("AppPressable disabled", () => {
  test("passes disabled to the Pressable", () => {
    expect(render({ disabled: true }).pressable.props.disabled).toBe(true)
    expect(render().pressable.props.disabled).toBeUndefined()
  })
})

describe("AppPressable Android ripple", () => {
  test("uses the default colour, a given colour, or none", () => {
    expect(render().pressable.props.android_ripple).toEqual({
      color: brandInteraction.rippleColor,
    })
    expect(render({ rippleColor: "#123456" }).pressable.props.android_ripple).toEqual({
      color: "#123456",
    })
    expect(render({ disableRipple: true }).pressable.props.android_ripple).toBeUndefined()
  })
})

describe("AppPressable style", () => {
  test("layout keys stay on the Pressable, the look goes to the scaling inner view", () => {
    const { pressable, inner } = render({
      style: [
        { flex: 1, marginTop: 4, width: 120, height: "50%", padding: 8, borderRadius: 12 },
        null,
        { backgroundColor: "red" },
      ],
    })
    expect(flatten(pressable.props.style)).toEqual({
      flex: 1,
      marginTop: 4,
      width: 120,
      height: "50%",
    })
    // A fixed size is repeated inside, a percentage is not; the inner view grows to fill.
    expect(flatten(inner!.props.style)).toMatchObject({
      flexGrow: 1,
      width: 120,
      padding: 8,
      borderRadius: 12,
      backgroundColor: "red",
      transform: [{ scale: 1 }],
    })
    expect(flatten(inner!.props.style)).not.toHaveProperty("flex")
    expect(flatten(inner!.props.style).height).toBeUndefined()
  })

  test("a style function receives the pressed state, for the Pressable and the inner view", () => {
    const style = jest.fn(({ pressed }: { pressed: boolean }) => ({
      marginLeft: 2,
      opacity: pressed ? 0.5 : 1,
    }))
    const { pressable, inner } = render({ style })
    expect(style).toHaveBeenCalledWith(expect.objectContaining({ pressed: false }))
    expect(flatten(pressable.props.style)).toEqual({ marginLeft: 2 })
    expect(flatten(inner!.props.style).opacity).toBe(1)
  })

  test("without style the Pressable has an empty style", () => {
    expect(flatten(render().pressable.props.style)).toEqual({})
  })

  test("disableScale hands style to the Pressable untouched", () => {
    const style = { padding: 8, flex: 1 }
    expect(render({ disableScale: true, style }).pressable.props.style).toBe(style)
  })

  test("children as a function get the pressed state", () => {
    const children = jest.fn(({ pressed }: { pressed: boolean }) => (pressed ? <></> : <></>))
    render({ children })
    expect(children).toHaveBeenCalledWith(expect.objectContaining({ pressed: false }))
    const withoutScale = jest.fn(() => <></>)
    render({ children: withoutScale, disableScale: true })
    expect(withoutScale).toHaveBeenCalledWith(expect.objectContaining({ pressed: false }))
  })
})
