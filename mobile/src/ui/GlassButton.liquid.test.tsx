import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { impactAsync as impactAsyncReal } from "expo-haptics"
import { brandInteraction } from "../app/brand-tokens"
import { buildTheme, defaultTheme } from "../app/theme"

// iOS 26 with a binary that carries `@expo/ui`: the native SwiftUI glass button (D-28). Metro would
// pick `NativeGlassButton.ios.tsx` on iOS; Jest resolves the default file, so the iOS one is mapped
// in by hand, and its native-module check sees a module.
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
    Pressable: mockComponent("Pressable"),
    Platform: { OS: "ios" },
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: {},
      flatten: (style: unknown) =>
        Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity)) : (style ?? {}),
    },
  }
})
jest.mock("expo-glass-effect", () => ({
  isLiquidGlassAvailable: () => true,
  GlassView: () => null,
}))
jest.mock("expo", () => ({ requireOptionalNativeModule: (name: string) => ({ name }) }))
jest.mock("./NativeGlassButton", () => jest.requireActual("./NativeGlassButton.ios"))
// The theme the button reads, switchable per test (light by default).
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../app/theme", () => {
  const actual = jest.requireActual("../app/theme") as typeof import("../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("dark"),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { GlassButton, NATIVE_SYMBOLS } from "./GlassButton"

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

type Modifier = { $type: string; [key: string]: unknown }
type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function byType(root: ReactTestInstance, name: string): ReactTestInstance[] {
  return root.findAll((n) => (n.type as unknown) === name)
}

function modifier(node: ReactTestInstance, type: string): Modifier | undefined {
  return (node.props.modifiers as Modifier[]).find((m) => m.$type === type)
}

function render(props: Partial<React.ComponentProps<typeof GlassButton>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<GlassButton label="Terminer" onPress={() => {}} {...props} />)
  })
  const root = tree!.root
  const [host] = byType(root, "Host")
  const [button] = byType(root, "Button")
  const [text] = byType(root, "Text")
  return { root, host, button, text }
}

const cta = defaultTheme.visual.glassCta

describe("GlassButton on iOS 26: the native SwiftUI glass button (D-28)", () => {
  test("is one SwiftUI glass-prominent Button tinted with the forest token, in a Host", () => {
    const { root, host, button } = render()
    expect(byType(root, "Host")).toHaveLength(1)
    expect(byType(root, "Button")).toHaveLength(1)
    expect(host.findAll((n) => n === button)).toHaveLength(1)
    expect(modifier(button, "buttonStyle")).toEqual({
      $type: "buttonStyle",
      style: "glassProminent",
    })
    expect(modifier(button, "tint")).toEqual({
      $type: "tint",
      tint: { type: "color", color: cta.tint },
    })
    expect(modifier(button, "disabled")).toEqual({ $type: "disabled", disabled: false })
  })

  test("the tint is the charter forest and the label is explicitly white, in both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      mockScheme.current = scheme
      try {
        const { button, text } = render()
        expect(modifier(button, "tint")).toEqual({
          $type: "tint",
          tint: { type: "color", color: "#334E2B" },
        })
        expect(modifier(text, "foregroundStyle")).toEqual({
          $type: "foregroundStyle",
          style: { type: "color", color: "#FFFFFF" },
        })
      } finally {
        mockScheme.current = "light"
      }
    }
  })

  test("no drawn pill: no pressable, no glass view, no fill, hairline or shadow of ours", () => {
    const { root, host } = render()
    expect(byType(root, "Pressable")).toHaveLength(0)
    expect(byType(root, "GlassView")).toHaveLength(0)
    const style = flatten(host.props.style)
    for (const key of [
      "backgroundColor",
      "borderWidth",
      "boxShadow",
      "experimental_backgroundImage",
    ]) {
      expect(style).not.toHaveProperty(key)
    }
  })

  test("the label is the Sora button face in the ink token, scaling with Dynamic Type", () => {
    const { text } = render()
    expect(text.props.children).toBe("Terminer")
    expect(modifier(text, "font")).toEqual({
      $type: "font",
      family: "Sora-Bold",
      size: 16,
      textStyle: "body",
    })
    expect(modifier(text, "foregroundStyle")).toEqual({
      $type: "foregroundStyle",
      style: { type: "color", color: cta.ink },
    })
  })

  test("the label row fills the host, so the capsule is as wide as the bar", () => {
    const { root } = render()
    const [row] = byType(root, "HStack")
    const fill = modifier(row, "frame") as unknown as { maxWidth: number; maxHeight: number }
    expect(Number.isFinite(fill.maxWidth)).toBe(true)
    expect(fill.maxWidth).toBeGreaterThanOrEqual(1000)
    expect(fill.maxHeight).toBeGreaterThanOrEqual(1000)
  })

  test("the host follows the app's scheme, stretches and grows with its label", () => {
    const { host } = render()
    expect(host.props.colorScheme).toBe(defaultTheme.scheme)
    expect(host.props.matchContents).toEqual({ vertical: true })
    expect(flatten(host.props.style).alignSelf).toBe("stretch")
  })

  test("sizes: large 50, regular 44, small promoted to 44 (no hit slop natively)", () => {
    const cases = [
      ["lg", "large", 50],
      ["md", "regular", 44],
      ["sm", "small", 44],
    ] as const
    for (const [size, control, minHeight] of cases) {
      const { host, button } = render({ size })
      expect(modifier(button, "controlSize")).toEqual({ $type: "controlSize", size: control })
      expect(flatten(host.props.style).minHeight).toBe(minHeight)
      expect(minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    }
    expect(modifier(render({ size: "sm" }).text, "font")).toMatchObject({ size: 12 })
  })

  test("a given height is the host's exact box, filled by the capsule (offline panel, 46 pt)", () => {
    const { host, button, text } = render({ size: "md", minHeight: 46 })
    expect(modifier(button, "controlSize")).toEqual({ $type: "controlSize", size: "regular" })
    // 12.2-19: a host sized to the SwiftUI button (matchContents) kept the capsule at its own
    // ideal height and it overlapped the estimate above it. The host is now exactly 46 pt, offered
    // whole to the button, whose label row fills it: nothing is drawn outside the box.
    const style = flatten(host.props.style)
    expect(style.height).toBe(46)
    expect(style).not.toHaveProperty("minHeight")
    expect(host.props.matchContents).toBeUndefined()
    const fill = modifier(button.findByType("HStack" as never), "frame")
    expect(fill).toMatchObject({ maxWidth: expect.any(Number), maxHeight: expect.any(Number) })
    // The label stays on one line and shrinks a little before it would outgrow the box.
    expect(modifier(text, "lineLimit")).toEqual({ $type: "lineLimit", limit: 1 })
    expect(modifier(text, "minimumScaleFactor")).toEqual({
      $type: "minimumScaleFactor",
      factor: 0.75,
    })
  })

  test("without a given height the host still grows with its label, no line limit", () => {
    const { host, text } = render({ size: "lg" })
    expect(host.props.matchContents).toEqual({ vertical: true })
    expect(flatten(host.props.style)).not.toHaveProperty("height")
    expect(modifier(text, "lineLimit")).toBeUndefined()
  })

  test("pressing taps once and calls onPress", () => {
    const onPress = jest.fn()
    const { button } = render({ onPress })
    act(() => {
      ;(button.props.onPress as () => void)()
    })
    expect(impactAsync).toHaveBeenCalledTimes(1)
    expect(impactAsync).toHaveBeenCalledWith("light")
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("disabled is the system disabled look, with the label colour left to the system", () => {
    const onPress = jest.fn()
    const { button, text } = render({ disabled: true, onPress })
    expect(modifier(button, "disabled")).toEqual({ $type: "disabled", disabled: true })
    expect(modifier(button, "tint")).toBeDefined()
    expect(modifier(text, "foregroundStyle")).toBeUndefined()
    act(() => {
      ;(button.props.onPress as () => void)()
    })
    expect(onPress).not.toHaveBeenCalled()
    expect(impactAsync).not.toHaveBeenCalled()
  })

  test("loading shows a spinner beside the label, keeps the tint and ignores presses", () => {
    const onPress = jest.fn()
    const { root, button, text } = render({ loading: true, onPress })
    const spinners = byType(root, "ProgressView")
    expect(spinners).toHaveLength(1)
    expect(modifier(spinners[0], "tint")).toEqual({
      $type: "tint",
      tint: { type: "color", color: cta.ink },
    })
    expect(modifier(spinners[0], "accessibilityHidden")).toEqual({
      $type: "accessibilityHidden",
      hidden: true,
    })
    expect(text.props.children).toBe("Terminer")
    expect(modifier(button, "disabled")).toEqual({ $type: "disabled", disabled: false })
    act(() => {
      ;(button.props.onPress as () => void)()
    })
    expect(onPress).not.toHaveBeenCalled()
    expect(impactAsync).not.toHaveBeenCalled()
  })

  test("accessibility: the label by default, a given label wins, the testID is the identifier", () => {
    const { button } = render({ testID: "finish-bar-button" })
    expect(button.props.testID).toBe("finish-bar-button")
    expect(modifier(button, "accessibilityLabel")).toEqual({
      $type: "accessibilityLabel",
      label: "Terminer",
    })
    expect(
      modifier(
        render({ accessibilityLabel: "Terminer le relevé Parcelle A" }).button,
        "accessibilityLabel",
      ),
    ).toEqual({ $type: "accessibilityLabel", label: "Terminer le relevé Parcelle A" })
    expect(
      (
        modifier(render({ label: "  " }).button, "accessibilityLabel") as unknown as {
          label: string
        }
      ).label,
    ).toBeTruthy()
  })

  test("a leading icon becomes its SF Symbol, hidden from VoiceOver; an unmapped one is left out", () => {
    const { root } = render({ leadingIcon: "checkmark-outline" })
    const [image] = byType(root, "Image")
    expect(image.props.systemName).toBe(NATIVE_SYMBOLS["checkmark-outline"])
    expect(modifier(image, "accessibilityHidden")).toEqual({
      $type: "accessibilityHidden",
      hidden: true,
    })
    expect(byType(render({ leadingIcon: "leaf-outline" }).root, "Image")).toHaveLength(0)
    expect(byType(render().root, "Image")).toHaveLength(0)
  })

  test("the caller's style reaches the host", () => {
    const { host } = render({ style: { width: "100%" } })
    expect(flatten(host.props.style)).toMatchObject({ width: "100%", alignSelf: "stretch" })
  })

  test("the dark theme hands the dark scheme and its tint to the host", () => {
    mockScheme.current = "dark"
    try {
      const { host, button } = render()
      const dark = buildTheme("dark")
      expect(host.props.colorScheme).toBe("dark")
      expect(modifier(button, "tint")).toEqual({
        $type: "tint",
        tint: { type: "color", color: dark.visual.glassCta.tint },
      })
    } finally {
      mockScheme.current = "light"
    }
  })
})

describe("GlassButton secondary on iOS 26: the neutral system glass button", () => {
  test("is the system glass style, untinted, with the primary text colour for the label", () => {
    for (const scheme of ["light", "dark"] as const) {
      mockScheme.current = scheme
      try {
        const theme = scheme === "light" ? defaultTheme : buildTheme("dark")
        const { root, button, text } = render({ variant: "secondary" })
        expect(modifier(button, "buttonStyle")).toEqual({ $type: "buttonStyle", style: "glass" })
        expect(modifier(button, "tint")).toBeUndefined()
        expect(modifier(text, "foregroundStyle")).toEqual({
          $type: "foregroundStyle",
          style: { type: "color", color: theme.colors.textPrimary },
        })
        expect(byType(root, "Pressable")).toHaveLength(0)
      } finally {
        mockScheme.current = "light"
      }
    }
  })

  test("nothing is drawn over the system glass: no outline, no wrapper (12.2-17)", () => {
    // Owner, iPhone: the overlaid hairline showed as a green outline of another size than the
    // system capsule. The system glass button is the whole visual.
    const { root, host } = render({ variant: "secondary", style: { width: "100%" } })
    expect(byType(root, "View")).toHaveLength(0)
    expect(root.findAll((n) => "borderWidth" in flatten(n.props.style))).toHaveLength(0)
    // The caller's style goes to the host itself, which keeps stretching and its minimum height.
    expect(flatten(host.props.style)).toMatchObject({
      width: "100%",
      alignSelf: "stretch",
      minHeight: 50,
    })
    expect(host.props).not.toHaveProperty("edge")
    expect(byType(render().root, "View")).toHaveLength(0)
  })

  test("keeps the press, haptic, disabled, loading and accessibility contract", () => {
    const onPress = jest.fn()
    const { button } = render({ variant: "secondary", onPress, testID: "register" })
    expect(button.props.testID).toBe("register")
    act(() => {
      ;(button.props.onPress as () => void)()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(impactAsync).toHaveBeenCalledTimes(1)
    const off = render({ variant: "secondary", disabled: true, onPress })
    expect(modifier(off.button, "disabled")).toEqual({ $type: "disabled", disabled: true })
    expect(modifier(off.text, "foregroundStyle")).toBeUndefined()
    const busy = render({ variant: "secondary", loading: true, onPress })
    expect(byType(busy.root, "ProgressView")).toHaveLength(1)
    act(() => {
      ;(busy.button.props.onPress as () => void)()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(modifier(render({ variant: "secondary", size: "md" }).button, "controlSize")).toEqual({
      $type: "controlSize",
      size: "regular",
    })
  })
})
