import React from "react"
import renderer, { act } from "react-test-renderer"
import { Ionicons } from "@expo/vector-icons"
import { brandComponentTokens, brandSpacing4 } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"
import { CenteredState } from "./CenteredState"
import { FrameLargeTitleContext } from "./frame-large-title"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent = (name: string) => {
    const Component = ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
    Component.displayName = name
    return Component
  }
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios" },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("./AppText", () => ({ AppText: "Text" }))
jest.mock("./AppButton", () => ({ AppButton: "AppButton" }))

type Style = Record<string, unknown>
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style))
    return style.reduce<Style>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(
  props: Partial<React.ComponentProps<typeof CenteredState>> = {},
  largeTitle = false,
) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FrameLargeTitleContext.Provider value={largeTitle}>
        <CenteredState message="Ce relevé nécessite une connexion." {...props} />
      </FrameLargeTitleContext.Provider>,
    )
  })
  return tree
}

const byType = (tree: renderer.ReactTestRenderer, type: string) =>
  tree.root.findAll((node) => (node.type as unknown) === type)

describe("CenteredState", () => {
  it("renders the icon, the message and the button in that order, centred", () => {
    const onAction = jest.fn()
    const tree = render({
      icon: "cloud-offline-outline",
      actionLabel: "Réessayer",
      onAction,
      testID: "state",
    })
    const scroll = byType(tree, "ScrollView")
    expect(scroll).toHaveLength(1)
    expect(scroll[0].props.testID).toBe("state")
    expect(flattenStyle(scroll[0].props.style)).toEqual({ flex: 1 })
    const content = flattenStyle(scroll[0].props.contentContainerStyle)
    expect(content.flexGrow).toBe(1)
    expect(content.justifyContent).toBe("center")
    expect(content.alignItems).toBe("center")

    const icon = tree.root.findByType(Ionicons)
    expect(icon.props.name).toBe("cloud-offline-outline")
    expect(icon.props.size).toBe(32)
    expect(icon.props.color).toBe(defaultTheme.colors.textSecondary)
    expect(byType(tree, "ActivityIndicator")).toHaveLength(0)

    const message = byType(tree, "Text")[0]
    expect(message.props.children).toBe("Ce relevé nécessite une connexion.")
    expect(flattenStyle(message.props.style).textAlign).toBe("center")

    const group = message.parent!
    expect(group.props.accessibilityLiveRegion).toBe("polite")
    const order = group.children.map((child) => (typeof child === "string" ? "" : child.type))
    expect(order[0]).toBe(Ionicons)
    expect(order[1]).toBe("Text")

    const button = byType(tree, "AppButton")
    expect(button).toHaveLength(1)
    expect(button[0].props.label).toBe("Réessayer")
    expect(button[0].props.variant).toBe("secondary")
    act(() => button[0].props.onPress())
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it("keeps the button in a wrapper that cannot stretch", () => {
    const tree = render({ actionLabel: "Réessayer", onAction: jest.fn() })
    const wrapper = byType(tree, "AppButton")[0].parent!
    const style = flattenStyle(wrapper.props.style)
    expect(style).toEqual({ alignSelf: "center" })
    expect(style).not.toHaveProperty("flex")
    expect(style).not.toHaveProperty("flexGrow")
  })

  it("gives the button a fixed height so the pressable's scale wrapper cannot grow it", () => {
    // Plan 29-10, device finding on the Android 360 x 640 dp emulator: without an explicit height
    // `AppPressable`'s `flexGrow: 1` inner view stretched the button to the whole page (785 px
    // instead of 88 px), the "tall capsule" of finding F-1. Jest cannot see layout, so the value
    // is pinned here and the real height was measured from the native view tree.
    const tree = render({ actionLabel: "Réessayer", onAction: jest.fn() })
    const style = flattenStyle(byType(tree, "AppButton")[0].props.style)
    expect(style).toEqual({ height: brandComponentTokens.button.minHeight })
  })

  it("shows a spinner instead of the icon when busy, and no button without an action", () => {
    const tree = render({ busy: true, icon: "alert-circle-outline" })
    expect(byType(tree, "ActivityIndicator")).toHaveLength(1)
    expect(byType(tree, "ActivityIndicator")[0].props.color).toBe(defaultTheme.colors.forest)
    expect(tree.root.findAllByType(Ionicons)).toHaveLength(0)
    expect(byType(tree, "AppButton")).toHaveLength(0)
  })

  it("shows neither icon nor spinner when none is asked, and no button without a handler", () => {
    const tree = render({ actionLabel: "Réessayer" })
    expect(tree.root.findAllByType(Ionicons)).toHaveLength(0)
    expect(byType(tree, "ActivityIndicator")).toHaveLength(0)
    expect(byType(tree, "AppButton")).toHaveLength(0)
  })

  it("leaves the insets to the system under the native large title only", () => {
    expect(byType(render(), "ScrollView")[0].props.contentInsetAdjustmentBehavior).toBe("never")
    expect(byType(render({}, true), "ScrollView")[0].props.contentInsetAdjustmentBehavior).toBe(
      "automatic",
    )
  })

  it("pads the bottom by the tab bar clearance outside a large title frame, not inside", () => {
    const outside = flattenStyle(byType(render(), "ScrollView")[0].props.contentContainerStyle)
    expect(outside.paddingBottom).toBe(90 + brandSpacing4.md)
    const inside = flattenStyle(
      byType(render({}, true), "ScrollView")[0].props.contentContainerStyle,
    )
    expect(inside.paddingBottom).toBe(brandSpacing4.md)
  })
})
