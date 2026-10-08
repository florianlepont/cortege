import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { defaultTheme } from "../../app/theme"
import { FINISH_BAR, finishBarBottomPadding } from "./finish-bar-layout"
import { FinishBar } from "./FinishBar"
import type { FinishCta } from "./summary-state"

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
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))

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

type Style = Record<string, unknown>
function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function mount(cta: FinishCta, extra: Partial<React.ComponentProps<typeof FinishBar>> = {}) {
  const onFinish = jest.fn()
  const onOpenFactor = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FinishBar
        cta={cta}
        accessibilityLabel="Terminer le relevé Parcelle A"
        onFinish={onFinish}
        onOpenFactor={onOpenFactor}
        {...extra}
      />,
    )
  })
  const bar = tree.root.findAll(
    (n) => (n.type as unknown) === "View" && n.props.pointerEvents === "box-none",
  )[0] as ReactTestInstance | undefined
  const button = tree.root.findAll(
    (n) => (n.type as unknown) === "Pressable",
  )[0] as ReactTestInstance
  return { tree, bar, button, onFinish, onOpenFactor }
}

describe("FinishBar", () => {
  test("renders nothing once the survey is finished", () => {
    const { tree } = mount({ kind: "hidden" })
    expect(tree.toJSON()).toBeNull()
  })

  test("the bar is transparent and floats at the bottom edge: no opaque background", () => {
    const { bar } = mount({ kind: "ready", label: "Terminer le relevé" })
    const style = flatten(bar!.props.style)
    expect(style).not.toHaveProperty("backgroundColor")
    expect(style).not.toHaveProperty("experimental_backgroundImage")
    expect(style).toMatchObject({ position: "absolute", left: 0, right: 0, bottom: 0 })
    expect(style.paddingTop).toBe(FINISH_BAR.paddingTop)
  })

  test("touches in the empty padding fall through to the page behind (box-none)", () => {
    const { bar } = mount({ kind: "ready", label: "Terminer le relevé" })
    expect(bar!.props.pointerEvents).toBe("box-none")
  })

  test("the button sits above the floating tab bar: clearance plus the gap", () => {
    const { bar } = mount({ kind: "ready", label: "Terminer le relevé" })
    expect(flatten(bar!.props.style).paddingBottom).toBe(finishBarBottomPadding(90))
    expect(flatten(bar!.props.style).paddingBottom).toBeGreaterThanOrEqual(90)
  })

  test("the glass button is the only filled element, large, with the finish label", () => {
    const { button, tree } = mount({ kind: "ready", label: "Terminer le relevé" })
    const fills = tree.root
      .findAll((n) => typeof n.type === "string")
      .filter((n) => "backgroundColor" in flatten(n.props.style))
    // The flat fallback fill of the button (Jest has no Liquid Glass), nothing else.
    expect(fills).toHaveLength(1)
    expect(flatten(fills[0].props.style).backgroundColor).toBe(defaultTheme.visual.glassCta.flat)
    expect(button.props.testID).toBe("finish-bar-button")
    expect(button.props.accessibilityLabel).toBe("Terminer le relevé Parcelle A")
    expect(flatten(fills[0].props.style).minHeight).toBe(50)
  })

  test("ready finishes the survey", () => {
    const { button, onFinish, onOpenFactor } = mount({ kind: "ready", label: "Terminer" })
    act(() => (button.props.onPress as () => void)())
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onOpenFactor).not.toHaveBeenCalled()
  })

  test("next opens the factor still to fill, with its own label", () => {
    const { button, onFinish, onOpenFactor } = mount({
      kind: "next",
      label: "Continuer la notation",
      factor: "C",
    })
    expect(button.props.accessibilityLabel).toBe("Continuer la notation")
    act(() => (button.props.onPress as () => void)())
    expect(onOpenFactor).toHaveBeenCalledWith("C")
    expect(onFinish).not.toHaveBeenCalled()
  })

  test("disabled says what is missing on the button and cannot be pressed", () => {
    const { button, tree } = mount({ kind: "disabled", label: "Nommez le relevé pour le terminer" })
    expect(button.props.disabled).toBe(true)
    expect(button.props.accessibilityLabel).toBe("Nommez le relevé pour le terminer")
    const texts = tree.root.findAll((n) => (n.type as unknown) === "Text")
    expect(texts).toHaveLength(1)
    expect(texts[0].props.children).toBe("Nommez le relevé pour le terminer")
  })

  test("reports its layout so the page can end above the bar", () => {
    const onLayout = jest.fn()
    const { bar } = mount({ kind: "ready", label: "Terminer" }, { onLayout })
    expect(bar!.props.onLayout).toBe(onLayout)
  })
})
