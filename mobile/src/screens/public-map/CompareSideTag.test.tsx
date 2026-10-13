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

// A recorder for `Gesture.Pan()`: every chained method returns the gesture; the handlers and the
// offsets are kept.
jest.mock("react-native-gesture-handler", () => {
  const ReactRef = require("react") as typeof import("react")
  function pan() {
    const gesture: Record<string, unknown> & {
      handlers: Record<string, (...args: unknown[]) => void>
      offsets: Record<string, unknown>
    } = { handlers: {}, offsets: {} }
    for (const name of ["onBegin", "onUpdate", "onEnd", "onFinalize"]) {
      gesture[name] = (handler: (...args: unknown[]) => void) => {
        gesture.handlers[name] = handler
        return gesture
      }
    }
    for (const name of ["activeOffsetX", "failOffsetY"]) {
      gesture[name] = (value: unknown) => {
        gesture.offsets[name] = value
        return gesture
      }
    }
    return gesture
  }
  return {
    Gesture: { Pan: pan },
    GestureDetector: ({ gesture, children }: { gesture: unknown; children?: React.ReactNode }) =>
      ReactRef.createElement("GestureDetector", { gesture }, children),
  }
})

// The shared Reanimated mock, with a recording `withTiming`.
const mockTimings: { to: number; config: Record<string, unknown> }[] = []
jest.mock("react-native-reanimated", () => {
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as Record<
    string,
    unknown
  >
  return {
    ...shared,
    __esModule: true,
    withTiming: (to: number, config: Record<string, unknown>) => {
      mockTimings.push({ to, config })
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
jest.mock("../../ui/AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppPressable", props, children),
  }
})

import type { SharedValue } from "react-native-reanimated"
import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { brandInteraction } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { CompareSideTag, TAG_HEIGHT, type CompareSideTagProps } from "./CompareSideTag"

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

const shared = (value: number) => ({ value }) as unknown as SharedValue<number> & { value: number }
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

const WIDTH = 400

type Node = {
  props: Record<string, unknown>
  findAllByType: (type: never) => { props: Record<string, unknown> }[]
}

describe("CompareSideTag", () => {
  function mount(over: Partial<CompareSideTagProps> = {}) {
    const props: CompareSideTagProps = {
      side: "right",
      name: "Photos 1950",
      label: "Photos aériennes",
      era: "1950-1965",
      lineX: shared(200),
      width: WIDTH,
      centerY: 256,
      canStep: true,
      disabled: false,
      onStep: jest.fn(),
      ...over,
    }
    let tree!: ReactTestRenderer
    act(() => {
      tree = renderer.create(<CompareSideTag {...props} />)
    })
    const tag = () => tree.root.findByProps({ testID: `compare-tag-${props.side}` })
    const chevron = (which: "previous" | "next") =>
      tree.root.findByProps({ testID: `compare-tag-${props.side}-${which}` })
    const gesture = () =>
      tree.root.findByType("GestureDetector" as never).props.gesture as {
        handlers: Record<string, (...args: unknown[]) => void>
        offsets: Record<string, unknown>
      }
    const swipe = (translationX: number, velocityX = 0) =>
      act(() => gesture().handlers.onEnd({ translationX, velocityX }))
    return { tree, props, tag, chevron, gesture, swipe }
  }

  const textsOf = (node: Node) =>
    node.findAllByType("Text" as never).map((text) => text.props.children)
  const glyphsOf = (node: Node) =>
    node.findAllByType("Ionicons" as never).map((glyph) => glyph.props.name)

  test("the tag is 44 high and names its layer between its two chevrons", () => {
    const { tag } = mount()
    expect(TAG_HEIGHT).toBe(44)
    expect(textsOf(tag())).toEqual(["Photos 1950"])
    expect(glyphsOf(tag())).toEqual(["chevron-back-outline", "chevron-forward-outline"])
    expect(flat(tag().props.style)).toMatchObject({ position: "absolute", height: 44 })
  })

  test("the right tag sits 24 pt from the line, centred on the grabber height, with room for its name", () => {
    const { tag } = mount()
    expect(flat(tag().props.style)).toMatchObject({
      left: 224,
      maxWidth: 162,
      opacity: 1,
      top: 234,
    })
  })

  test("the left tag sits 24 pt from the line on its side", () => {
    const { tag } = mount({ side: "left", name: "Plan" })
    expect(flat(tag().props.style)).toMatchObject({
      right: 224,
      maxWidth: 162,
      opacity: 1,
      top: 234,
    })
  })

  test("it follows the line", () => {
    const { tag } = mount({ lineX: shared(300) })
    expect(flat(tag().props.style)).toMatchObject({ left: 324, maxWidth: 62, opacity: 0 })
  })

  test("a tag with under 72 pt of room fades out in 160 ms", () => {
    const { tag } = mount({ side: "left", lineX: shared(60) })
    expect(flat(tag().props.style).opacity).toBe(0)
    expect(mockTimings[0].to).toBe(0)
    expect(mockTimings[0].config).toMatchObject({ duration: 160, reduceMotion: "system" })
  })

  test("the back chevron asks for the previous layer, the forward chevron for the next", () => {
    const { chevron, props } = mount()
    act(() => (chevron("previous").props.onPress as () => void)())
    expect(props.onStep).toHaveBeenLastCalledWith(-1)
    act(() => (chevron("next").props.onPress as () => void)())
    expect(props.onStep).toHaveBeenLastCalledWith(1)
    expect(props.onStep).toHaveBeenCalledTimes(2)
  })

  test("each chevron is a 44 x 44 target hidden from the screen reader", () => {
    const { chevron } = mount()
    for (const which of ["previous", "next"] as const) {
      const node = chevron(which)
      expect(flat(node.props.style)).toMatchObject({ width: 44, height: 44 })
      expect(node.props.accessibilityElementsHidden).toBe(true)
      expect(node.props.importantForAccessibility).toBe("no")
      expect(node.props.disabled).toBe(false)
    }
  })

  test("a swipe left on the name asks for the next layer, a swipe right for the previous", () => {
    const { swipe, props, gesture } = mount()
    expect(gesture().offsets.activeOffsetX).toEqual([-6, 6])
    expect(gesture().offsets.failOffsetY).toEqual([-6, 6])
    swipe(-50)
    expect(props.onStep).toHaveBeenLastCalledWith(1)
    swipe(50)
    expect(props.onStep).toHaveBeenLastCalledWith(-1)
    expect(props.onStep).toHaveBeenCalledTimes(2)
  })

  test("a short swipe does nothing, a flick past the slop does", () => {
    const { swipe, props } = mount()
    swipe(-20)
    expect(props.onStep).not.toHaveBeenCalled()
    swipe(-10, -700)
    expect(props.onStep).toHaveBeenCalledTimes(1)
    expect(props.onStep).toHaveBeenLastCalledWith(1)
  })

  test("with no other layer the chevrons are dimmed and disabled and the swipe does nothing", () => {
    const { chevron, swipe, props, tree } = mount({ canStep: false })
    for (const which of ["previous", "next"] as const) {
      expect(chevron(which).props.disabled).toBe(true)
      expect(flat(chevron(which).props.style).opacity).toBe(brandInteraction.disabledOpacity)
    }
    swipe(-80)
    swipe(80)
    expect(props.onStep).not.toHaveBeenCalled()
    const adjustable = tree.root.findByProps({ testID: "compare-tag-right" })
    act(() => {
      ;(adjustable.props.onAccessibilityAction as (event: unknown) => void)({
        nativeEvent: { actionName: "increment" },
      })
    })
    expect(props.onStep).not.toHaveBeenCalled()
  })

  test("during a line drag the tag takes no touch", () => {
    expect(mount({ disabled: true }).tag().props.pointerEvents).toBe("none")
    expect(mount({ disabled: false }).tag().props.pointerEvents).toBe("auto")
  })

  test("the tag is one adjustable element with a label, a hint and a value", () => {
    const { tag } = mount()
    const props = tag().props
    expect(props.accessible).toBe(true)
    expect(props.accessibilityRole).toBe("adjustable")
    expect(props.accessibilityLabel).toBe("Côté droit : Photos aériennes")
    expect(props.accessibilityHint).toBe(
      "Balayez vers le haut ou le bas pour changer le fond de ce côté",
    )
    expect(props.accessibilityValue).toEqual({ text: "1950-1965" })
  })

  test("the left tag says its own side", () => {
    const { tag } = mount({ side: "left", label: "Plan", era: "aujourd'hui" })
    expect(tag().props.accessibilityLabel).toBe("Côté gauche : Plan")
    expect(tag().props.accessibilityValue).toEqual({ text: "aujourd'hui" })
  })

  test("the increment and decrement actions step the layer", () => {
    const { tag, props } = mount()
    expect(tag().props.accessibilityActions).toEqual([
      { name: "increment", label: "Fond suivant" },
      { name: "decrement", label: "Fond précédent" },
    ])
    const fire = (actionName: string) =>
      act(() => {
        ;(tag().props.onAccessibilityAction as (event: unknown) => void)({
          nativeEvent: { actionName },
        })
      })
    fire("increment")
    expect(props.onStep).toHaveBeenLastCalledWith(1)
    fire("decrement")
    expect(props.onStep).toHaveBeenLastCalledWith(-1)
    fire("magicTap")
    expect(props.onStep).toHaveBeenCalledTimes(2)
  })

  test("it uses the map control look: glass, hairline and text colours of the theme", () => {
    const { tree } = mount()
    const { mapControl } = defaultTheme.visual
    const glass = tree.root.findByType("GlassSurface" as never)
    expect(glass.props.surface).toBe(mapControl.glass)
    expect(flat(glass.props.style).borderColor).toBe(mapControl.hairline)
    const name = tree.root.findAllByType("Text" as never)[0]
    expect(flat(name.props.style).color).toBe(mapControl.text)
    const glyph = tree.root.findAllByType("Ionicons" as never)[0]
    expect(glyph.props.color).toBe(mapControl.icon)
  })
})
