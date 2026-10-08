import React from "react"
import renderer, { act } from "react-test-renderer"
import { selectionAsync } from "expo-haptics"
import { AppChoiceChip } from "./AppChoiceChip"
import { brandComponentTokens } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

type StyleObject = Record<string, unknown>

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

beforeEach(() => {
  ;(selectionAsync as jest.Mock).mockClear()
})

function flatten(style: unknown): StyleObject {
  return ([] as unknown[])
    .concat(style)
    .flat(Infinity)
    .filter(Boolean)
    .reduce<StyleObject>((merged, next) => ({ ...merged, ...(next as StyleObject) }), {})
}

function render(props: Partial<React.ComponentProps<typeof AppChoiceChip>>) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppChoiceChip label="Oui" {...props} />)
  })
  const pressable = tree!.root.findByType("Pressable" as unknown as React.ComponentType)
  const text = tree!.root.findByType("Text" as unknown as React.ComponentType)
  return { pressable, text }
}

const { chip } = defaultTheme.visual

describe("AppChoiceChip (D-05, D-08)", () => {
  test("inactive: glass fill, hairline border and secondary label", () => {
    const { pressable, text } = render({ onPress: () => undefined })
    expect(flatten(pressable.props.style)).toMatchObject({
      backgroundColor: chip.fill,
      borderColor: chip.border,
    })
    expect(flatten(text.props.style).color).toBe(chip.text)
    expect(pressable.props.accessibilityState).toEqual({ disabled: false, selected: false })
  })

  test("active: inverted neutral fill with the canvas label, selected for screen readers", () => {
    const { pressable, text } = render({ active: true, onPress: () => undefined })
    expect(flatten(pressable.props.style).backgroundColor).toBe(chip.activeBg)
    expect(flatten(text.props.style).color).toBe(chip.activeText)
    expect(pressable.props.accessibilityState.selected).toBe(true)
  })

  test("keeps the 44 pt minimum height", () => {
    const { pressable } = render({ onPress: () => undefined })
    expect(flatten(pressable.props.style).minHeight).toBe(brandComponentTokens.choiceChip.minHeight)
    expect(brandComponentTokens.choiceChip.minHeight).toBe(44)
  })

  test("pressing ticks once and then calls onPress", () => {
    const onPress = jest.fn()
    const { pressable } = render({ onPress })
    act(() => {
      pressable.props.onPress()
    })
    expect(selectionAsync).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("a chip without onPress is disabled and fires nothing", () => {
    const { pressable } = render({})
    expect(pressable.props.disabled).toBe(true)
    expect(pressable.props.onPress).toBeUndefined()
    expect(pressable.props.accessibilityState.disabled).toBe(true)
    expect(selectionAsync).not.toHaveBeenCalled()
  })

  test("a tone tints the inactive fill and the active state still wins", () => {
    const tinted = render({ tone: "success", onPress: () => undefined })
    expect(flatten(tinted.pressable.props.style).backgroundColor).toBe(
      defaultTheme.componentColors.choiceChip.successBackground,
    )
    const active = render({ tone: "success", active: true, onPress: () => undefined })
    expect(flatten(active.pressable.props.style).backgroundColor).toBe(chip.activeBg)
  })
})
