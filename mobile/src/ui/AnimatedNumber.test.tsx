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
    TextInput: mockComponent("TextInput"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

import * as reanimated from "../../test/react-native-reanimated.mock"
import { AnimatedNumber } from "./AnimatedNumber"

const withTimingSpy = jest.spyOn(reanimated, "withTiming")

afterEach(() => {
  reanimated.setReducedMotion(false)
  withTimingSpy.mockClear()
})

function render(value: number, extra: Partial<React.ComponentProps<typeof AnimatedNumber>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AnimatedNumber value={value} testID="n" {...extra} />)
  })
  const input = () => tree!.root.findAll((n) => (n.type as unknown) === "TextInput")[0]
  return { input }
}

describe("AnimatedNumber (D-08 number counting)", () => {
  test("is a read-only text input with the final value as default and hidden from accessibility", () => {
    const { input } = render(34)
    expect(input().props.editable).toBe(false)
    expect(input().props.defaultValue).toBe("34")
    expect(input().props.accessibilityElementsHidden).toBe(true)
    expect(input().props.importantForAccessibility).toBe("no")
    expect(input().props.underlineColorAndroid).toBe("transparent")
  })

  test("counts up over 500 ms with Reduce Motion deferred to the system", () => {
    render(34)
    expect(withTimingSpy).toHaveBeenCalledTimes(1)
    expect(withTimingSpy.mock.calls[0][0]).toBe(34)
    const config = (withTimingSpy.mock.calls[0] as unknown[])[1]
    expect(config).toMatchObject({ duration: 500, reduceMotion: "system" })
  })

  test("a custom duration is passed through", () => {
    render(10, { durationMs: 200 })
    const config = (withTimingSpy.mock.calls[0] as unknown[])[1]
    expect(config).toMatchObject({ duration: 200 })
  })

  test("the count-up starts from 0", () => {
    const { input } = render(34)
    expect(input().props.animatedProps.text).toBe("0")
  })

  test("under Reduce Motion the shared value starts at the final value", () => {
    reanimated.setReducedMotion(true)
    const { input } = render(34)
    expect(input().props.animatedProps.text).toBe("34")
  })
})
