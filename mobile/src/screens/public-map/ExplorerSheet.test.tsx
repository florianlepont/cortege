import React from "react"
import renderer, { act } from "react-test-renderer"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    if (message.includes("not configured to support act")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

type PanHandlers = {
  onMoveShouldSetPanResponder: (e: unknown, g: { dy: number }) => boolean
  onPanResponderMove: (e: unknown, g: { dy: number }) => void
  onPanResponderRelease: (e: unknown, g: { dy: number; vy: number }) => void
}

const mockAnimations: Array<{
  kind: string
  toValue: number
  finish: (finished: boolean) => void
}> = []
const mockValues: Array<{ value: number }> = []
let mockPan: PanHandlers

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  class MockValue {
    value: number
    constructor(value: number) {
      this.value = value
      mockValues.push(this)
    }
    setValue(value: number) {
      this.value = value
    }
  }
  const animate = (kind: string) => (value: MockValue, config: { toValue: number }) => ({
    start: (done?: (result: { finished: boolean }) => void) => {
      value.value = config.toValue
      mockAnimations.push({
        kind,
        toValue: config.toValue,
        finish: (finished) => done?.({ finished }),
      })
    },
  })
  return {
    Animated: {
      Value: MockValue,
      View: mockComponent("AnimatedView"),
      timing: animate("timing"),
      spring: animate("spring"),
    },
    KeyboardAvoidingView: mockComponent("KeyboardAvoidingView"),
    PanResponder: {
      create: (handlers: PanHandlers) => {
        mockPan = handlers
        return { panHandlers: { testHandler: true } }
      },
    },
    Platform: { OS: "ios" },
    ScrollView: mockComponent("ScrollView"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: {} },
    View: mockComponent("View"),
    useWindowDimensions: () => ({ width: 400, height: 800 }),
  }
})
jest.mock("expo-blur", () => ({ BlurView: "BlurView" }))

import { brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { ExplorerSheet } from "./ExplorerSheet"

function mount(props: Partial<React.ComponentProps<typeof ExplorerSheet>> = {}) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ExplorerSheet visible={false} onDismiss={jest.fn()} {...props}>
        {props.children ?? "content"}
      </ExplorerSheet>,
    )
  })
  return tree
}

function update(tree: renderer.ReactTestRenderer, props: { visible: boolean; children?: string }) {
  act(() => {
    tree.update(
      <ExplorerSheet visible={props.visible} onDismiss={jest.fn()}>
        {props.children ?? "content"}
      </ExplorerSheet>,
    )
  })
}

beforeEach(() => {
  mockAnimations.length = 0
  mockValues.length = 0
})

describe("ExplorerSheet (MAP-01: the Explorer's one panel)", () => {
  test("draws nothing while hidden", () => {
    expect(mount({ visible: false }).toJSON()).toBeNull()
  })

  test("opens by sliding up and shows its content", () => {
    const tree = mount({ visible: true, children: "hello" })
    expect(
      tree.root.findAll(
        (node) => typeof node.type === "string" && node.props.testID === "explorer-sheet",
      ),
    ).toHaveLength(1)
    expect(JSON.stringify(tree.toJSON())).toContain("hello")
    expect(mockAnimations[0]).toMatchObject({ kind: "timing", toValue: 0 })
  })

  test("closes by sliding down, keeps its content meanwhile, then unmounts", () => {
    const tree = mount({ visible: true, children: "hello" })
    update(tree, { visible: false, children: "gone" })
    // 55% of an 800 pt window.
    const closing = mockAnimations[mockAnimations.length - 1]
    expect(closing).toMatchObject({ kind: "timing", toValue: 440 })
    expect(JSON.stringify(tree.toJSON())).toContain("hello")
    act(() => closing.finish(true))
    expect(tree.toJSON()).toBeNull()
  })

  test("an interrupted close (reopened meanwhile) stays mounted", () => {
    const tree = mount({ visible: true })
    update(tree, { visible: false })
    const closing = mockAnimations[mockAnimations.length - 1]
    update(tree, { visible: true })
    act(() => closing.finish(false))
    expect(tree.toJSON()).not.toBeNull()
  })

  test("a swipe down far enough, or fast enough, dismisses; a short one springs back", () => {
    const onDismiss = jest.fn()
    mount({ visible: true, onDismiss })
    expect(mockPan.onMoveShouldSetPanResponder({}, { dy: 2 })).toBe(false)
    expect(mockPan.onMoveShouldSetPanResponder({}, { dy: 10 })).toBe(true)

    mockPan.onPanResponderMove({}, { dy: 30 })
    expect(mockValues[0].value).toBe(30)
    mockPan.onPanResponderMove({}, { dy: -20 })
    expect(mockValues[0].value).toBe(30)

    mockPan.onPanResponderRelease({}, { dy: 30, vy: 0.1 })
    expect(onDismiss).not.toHaveBeenCalled()
    expect(mockAnimations[mockAnimations.length - 1]).toMatchObject({ kind: "spring", toValue: 0 })

    mockPan.onPanResponderRelease({}, { dy: 120, vy: 0.1 })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    mockPan.onPanResponderRelease({}, { dy: 20, vy: 1.2 })
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  test("keeps its blurred background, a divider handle and 4 grid content padding (12.2-18)", () => {
    const tree = mount({ visible: true, bottomInset: 50 })
    expect(tree.root.findAllByType("BlurView" as never)).toHaveLength(1)
    const handleArea = tree.root.find(
      (node) => (node.type as unknown) === "View" && node.props.testHandler === true,
    )
    const [indicator] = handleArea.findAll(
      (node) => (node.type as unknown) === "View" && node.props.style?.height === 5,
    )
    expect(indicator.props.style).toMatchObject({
      backgroundColor: defaultTheme.colors.divider,
      borderRadius: brandRadius.pill,
    })
    const scroll = tree.root.findByType("ScrollView" as never)
    const [content, extra] = scroll.props.contentContainerStyle as Record<string, number>[]
    expect(content.paddingHorizontal).toBe(brandSpacing4.md)
    expect(content.gap).toBe(brandSpacing4.smd)
    expect(extra.paddingBottom).toBe(brandSpacing4.lg + 50)
  })

  test("a panel that fits does not scroll or bounce; only an overflowing one does (12.2-19)", () => {
    const scroll = mount({ visible: true }).root.findByType("ScrollView" as never)
    expect(scroll.props.alwaysBounceVertical).toBe(false)
    // Scrolling itself stays on, for a long cluster list or the panel squeezed by the keyboard.
    expect(scroll.props.scrollEnabled).not.toBe(false)
  })
})
