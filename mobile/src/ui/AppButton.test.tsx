import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { impactAsync as impactAsyncReal } from "expo-haptics"
import { brandInteraction, brandRadius } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"
import { AppButton } from "./AppButton"

const impactAsync = impactAsyncReal as jest.Mock

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
    FlatList: mockComponent("FlatList"),
    ScrollView: mockComponent("ScrollView"),
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
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(props: Partial<React.ComponentProps<typeof AppButton>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppButton label="Valider" onPress={() => {}} {...props} />)
  })
  const root = tree!.root
  const pressable = root.findAll((n) => (n.type as unknown) === "Pressable")[0]
  const container = root.findAll((n) => (n.type as unknown) === "View")[0]
  const label = root.findAll((n) => (n.type as unknown) === "Text")[0] as
    | ReactTestInstance
    | undefined
  return { root, pressable, container, label, style: flatten(container.props.style) }
}

afterEach(() => {
  impactAsync.mockClear()
})

describe("AppButton", () => {
  test("glow is the moss gradient pill with the dark label", () => {
    const { pill } = defaultTheme.visual
    const { style, label } = render({ variant: "glow" })
    expect(style).toMatchObject({
      backgroundColor: pill.fallback,
      experimental_backgroundImage: pill.image,
      boxShadow: pill.shadow,
      borderRadius: brandRadius.pill,
    })
    expect(flatten(label!.props.style)).toMatchObject({
      color: pill.label,
      fontFamily: "Sora-SemiBold",
    })
  })

  test("glow leading icon takes the pill label colour", () => {
    const { root } = render({ variant: "glow", leadingIcon: "checkmark" })
    expect(root.findByType(Ionicons).props.color).toBe(defaultTheme.visual.pill.label)
  })

  test("primary keeps its colours", () => {
    const { style, label, root } = render({ variant: "primary", leadingIcon: "checkmark" })
    expect(style.backgroundColor).toBe(defaultTheme.componentColors.button.primaryBackground)
    expect(style).not.toHaveProperty("boxShadow")
    expect(style).not.toHaveProperty("experimental_backgroundImage")
    expect(flatten(label!.props.style).color).toBe(defaultTheme.semanticColors.onCtaPrimary)
    expect(root.findByType(Ionicons).props.color).toBe(defaultTheme.semanticColors.onCtaPrimary)
  })

  test.each(["primary", "secondary", "danger", "dangerSoft", "glow"] as const)(
    "%s keeps a hit area of at least 44 pt for sizes sm, md and lg",
    (variant) => {
      for (const size of ["sm", "md", "lg"] as const) {
        const { style, pressable } = render({ variant, size })
        const slop = (pressable.props.hitSlop as number | undefined) ?? 0
        expect((style.minHeight as number) + 2 * slop).toBeGreaterThanOrEqual(
          brandInteraction.hitTarget.min,
        )
      }
    },
  )

  test("icon-only buttons keep a hit area of at least 44 pt", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      const { style, pressable } = render({ iconOnly: true, size, leadingIcon: "close" })
      const slop = (pressable.props.hitSlop as number | undefined) ?? 0
      expect((style.height as number) + 2 * slop).toBeGreaterThanOrEqual(
        brandInteraction.hitTarget.min,
      )
      expect((style.width as number) + 2 * slop).toBeGreaterThanOrEqual(
        brandInteraction.hitTarget.min,
      )
    }
  })

  test("the visible size of the existing buttons is unchanged", () => {
    expect(render({ size: "sm" }).style.minHeight).toBe(36)
    expect(render({ size: "md" }).style.minHeight).toBe(44)
    expect(render({ size: "lg" }).style.minHeight).toBe(50)
  })

  test.each(["primary", "secondary", "danger", "dangerSoft", "glow"] as const)(
    "pressing %s taps once and calls onPress",
    (variant) => {
      const onPress = jest.fn()
      const { pressable } = render({ variant, onPress })
      act(() => {
        ;(pressable.props.onPress as () => void)()
      })
      expect(impactAsync).toHaveBeenCalledTimes(1)
      expect(impactAsync).toHaveBeenCalledWith("light")
      expect(onPress).toHaveBeenCalledTimes(1)
    },
  )

  test("loading shows a spinner and disables the button", () => {
    const { root, pressable } = render({ loading: true, variant: "glow" })
    expect(root.findAll((n) => (n.type as unknown) === "ActivityIndicator")).toHaveLength(1)
    expect(pressable.props.disabled).toBe(true)
  })
})
