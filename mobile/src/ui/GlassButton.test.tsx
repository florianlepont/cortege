import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { impactAsync as impactAsyncReal } from "expo-haptics"
import { brandInteraction, brandRadius } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"
import { GlassButton } from "./GlassButton"

const impactAsync = impactAsyncReal as jest.Mock

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalConsoleError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

afterEach(() => {
  impactAsync.mockClear()
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
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: ({
      children,
      ...props
    }: {
      children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
    }) =>
      ReactRef.createElement(
        "Pressable",
        props,
        typeof children === "function" ? children({ pressed: false }) : children,
      ),
    Platform: { OS: "ios" },
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: {},
      flatten: (style: unknown) =>
        Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity)) : (style ?? {}),
    },
  }
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(props: Partial<React.ComponentProps<typeof GlassButton>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<GlassButton label="Terminer" onPress={() => {}} {...props} />)
  })
  const root = tree!.root
  const pressable = root.findAll((n) => (n.type as unknown) === "Pressable")[0]
  const container = root.findAll((n) => (n.type as unknown) === "View")[0]
  const label = root.findAll((n) => (n.type as unknown) === "Text")[0] as ReactTestInstance
  return { root, pressable, container, label, style: flatten(container.props.style) }
}

const cta = defaultTheme.visual.glassCta

describe("GlassButton, flat fallback (Android and iOS before 26)", () => {
  test("draws a translucent forest fill with a hairline, a reflection and a shadow, and no blur or glass view", () => {
    const { style, root } = render()
    expect(style).toMatchObject({
      backgroundColor: cta.flat,
      experimental_backgroundImage: cta.sheen,
      borderWidth: 1,
      borderColor: cta.hairline,
      boxShadow: cta.shadow,
      borderRadius: brandRadius.pill,
    })
    expect(root.findAll((n) => (n.type as unknown) === "GlassView")).toHaveLength(0)
    expect(root.findAll((n) => (n.type as unknown) === "BlurView")).toHaveLength(0)
    // Not the native SwiftUI button: Jest resolves the default (Android) half of the split.
    expect(root.findAll((n) => (n.type as unknown) === "Host")).toHaveLength(0)
    expect(root.findAll((n) => (n.type as unknown) === "Button")).toHaveLength(0)
    // The fill is see-through: it is not an opaque colour.
    expect(String(style.backgroundColor)).toMatch(/^rgba\(.*, 0\.\d+\)$/)
  })

  test("the label and the icon use the ink token", () => {
    const { label, root } = render({ leadingIcon: "checkmark" })
    expect(flatten(label.props.style).color).toBe(cta.ink)
    expect(root.findByType(Ionicons).props.color).toBe(cta.ink)
  })

  test("disabled is a pale neutral glass with the softer ink, no shadow, and is announced as disabled", () => {
    const { style, label, pressable } = render({ disabled: true })
    expect(style).toMatchObject({ backgroundColor: cta.flatOff, borderColor: cta.hairlineOff })
    expect(style).not.toHaveProperty("boxShadow")
    expect(style).not.toHaveProperty("experimental_backgroundImage")
    expect(style).not.toHaveProperty("opacity")
    expect(flatten(label.props.style).color).toBe(cta.inkOff)
    expect(pressable.props.disabled).toBe(true)
    expect(pressable.props.accessibilityState).toEqual({ disabled: true, busy: false })
  })

  test("loading keeps the forest look, shows a spinner and ignores presses", () => {
    const { style, root, pressable } = render({ loading: true })
    expect(style.backgroundColor).toBe(cta.flat)
    const spinner = root.findAll((n) => (n.type as unknown) === "ActivityIndicator")
    expect(spinner).toHaveLength(1)
    expect(spinner[0].props.color).toBe(cta.ink)
    expect(pressable.props.disabled).toBe(true)
    expect(pressable.props.accessibilityState).toEqual({ disabled: true, busy: true })
  })

  test("sizes match the buttons they replace and every size keeps a 44 pt hit area", () => {
    expect(render({ size: "sm" }).style.minHeight).toBe(36)
    expect(render({ size: "md" }).style.minHeight).toBe(44)
    expect(render().style.minHeight).toBe(50)
    for (const size of ["sm", "md", "lg"] as const) {
      const { style, pressable } = render({ size })
      const slop = (pressable.props.hitSlop as number | undefined) ?? 0
      expect((style.minHeight as number) + 2 * slop).toBeGreaterThanOrEqual(
        brandInteraction.hitTarget.min,
      )
    }
  })

  test("the small size uses the meta label", () => {
    expect(flatten(render({ size: "sm" }).label.props.style).fontSize).toBe(12)
    expect(flatten(render().label.props.style).fontSize).toBe(16)
  })

  test("pressing taps once and calls onPress", () => {
    const onPress = jest.fn()
    const { pressable } = render({ onPress })
    act(() => {
      ;(pressable.props.onPress as () => void)()
    })
    expect(impactAsync).toHaveBeenCalledTimes(1)
    expect(impactAsync).toHaveBeenCalledWith("light")
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("accessibility: button role, the label by default, a given label wins, the testID passes", () => {
    const { pressable } = render({ testID: "finish" })
    expect(pressable.props.accessibilityRole).toBe("button")
    expect(pressable.props.accessibilityLabel).toBe("Terminer")
    expect(pressable.props.testID).toBe("finish")
    expect(
      render({ accessibilityLabel: "Terminer le relevé Parcelle A" }).pressable.props
        .accessibilityLabel,
    ).toBe("Terminer le relevé Parcelle A")
    expect(render({ label: "  " }).pressable.props.accessibilityLabel).toBeTruthy()
  })

  test("the caller's style and label style are applied last", () => {
    const { style, label } = render({
      style: { alignSelf: "stretch" },
      labelStyle: { letterSpacing: 1 },
    })
    expect(style.alignSelf).toBe("stretch")
    expect(flatten(label.props.style).letterSpacing).toBe(1)
  })
})

describe("GlassButton secondary, flat fallback", () => {
  test("is an outlined translucent pill: no forest fill, no shadow, no reflection", () => {
    const { style, root } = render({ variant: "secondary" })
    expect(style).toMatchObject({
      backgroundColor: cta.secondary.flat,
      borderWidth: 1,
      borderColor: cta.secondary.hairline,
      borderRadius: brandRadius.pill,
    })
    expect(style).not.toHaveProperty("boxShadow")
    expect(style).not.toHaveProperty("experimental_backgroundImage")
    expect(style.backgroundColor).not.toBe(cta.flat)
    expect(root.findAll((n) => (n.type as unknown) === "Host")).toHaveLength(0)
  })

  test("the label and the icon use the primary text colour", () => {
    const { label, root } = render({ variant: "secondary", leadingIcon: "checkmark" })
    expect(flatten(label.props.style).color).toBe(cta.secondary.ink)
    expect(root.findByType(Ionicons).props.color).toBe(cta.secondary.ink)
    expect(cta.secondary.ink).toBe(defaultTheme.colors.textPrimary)
  })

  test("disabled shares the pale neutral glass of the primary, loading keeps the outline", () => {
    const off = render({ variant: "secondary", disabled: true })
    expect(off.style).toMatchObject({ backgroundColor: cta.flatOff, borderColor: cta.hairlineOff })
    expect(flatten(off.label.props.style).color).toBe(cta.inkOff)
    const busy = render({ variant: "secondary", loading: true })
    expect(busy.style.backgroundColor).toBe(cta.secondary.flat)
    expect(busy.pressable.props.disabled).toBe(true)
    expect(busy.pressable.props.accessibilityState).toEqual({ disabled: true, busy: true })
  })

  test("keeps the 44 pt hit area and the press contract", () => {
    const onPress = jest.fn()
    const { style, pressable } = render({ variant: "secondary", size: "md", onPress })
    expect(style.minHeight).toBe(44)
    act(() => {
      ;(pressable.props.onPress as () => void)()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(impactAsync).toHaveBeenCalledWith("light")
  })
})
