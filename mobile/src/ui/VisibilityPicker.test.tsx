import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppText", () => ({ AppText: "Text" }))
jest.mock("./feedback", () => ({ feedback: { selection: jest.fn() } }))

import { fr } from "../i18n"
import { feedback } from "./feedback"
import { VisibilityPicker } from "./VisibilityPicker"

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
  jest.mocked(feedback.selection).mockClear()
})

function render(props: Partial<React.ComponentProps<typeof VisibilityPicker>> = {}) {
  const onChange = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<VisibilityPicker value="public" onChange={onChange} {...props} />)
  })
  return { tree, onChange }
}

function option(tree: renderer.ReactTestRenderer, key: "shared" | "private") {
  // The outermost node carrying the radio role: the AppPressable of the card.
  return tree.root.findAll(
    (node) =>
      node.props.testID === `visibility-option-${key}` && node.props.accessibilityRole === "radio",
  )[0]
}

describe("VisibilityPicker", () => {
  test("a radio group, shared first and selected for the value public", () => {
    const { tree } = render()
    const group = tree.root.findByProps({ accessibilityRole: "radiogroup" })
    expect(group.props.accessibilityLabel).toBe(fr.surveyFinish.groupA11y)

    const radios = tree.root.findAll(
      (node) => node.props.accessibilityRole === "radio" && node.props.testID,
    )
    // Each card shows up at several levels of the tree (AppPressable, Pressable): keep the order.
    expect([...new Set(radios.map((node) => node.props.testID))]).toEqual([
      "visibility-option-shared",
      "visibility-option-private",
    ])
    expect(option(tree, "shared").props.accessibilityState.selected).toBe(true)
    expect(option(tree, "private").props.accessibilityState.selected).toBe(false)
  })

  test("the private value selects the second card", () => {
    const { tree } = render({ value: "private" })
    expect(option(tree, "shared").props.accessibilityState.selected).toBe(false)
    expect(option(tree, "private").props.accessibilityState.selected).toBe(true)
  })

  test("labels join the title and the caption of each choice", () => {
    const { tree } = render()
    expect(option(tree, "shared").props.accessibilityLabel).toBe(
      fr.surveyForm.wizard.optionA11y({
        label: fr.surveyFinish.options.shared.label,
        caption: fr.surveyFinish.options.shared.caption,
      }),
    )
    expect(option(tree, "private").props.accessibilityLabel).toBe(
      "Privé. Vous seul le voyez : il reste invisible pour les autres membres.",
    )
  })

  test("each card carries its glyph, never a globe", () => {
    const { tree } = render()
    const names = tree.root.findAllByType("Ionicons" as never).map((node) => node.props.name)
    expect(names).toContain("people-outline")
    expect(names).toContain("lock-closed-outline")
    expect(names.some((name: string) => name.startsWith("globe"))).toBe(false)
  })

  test("pressing the other card fires the selection haptic and onChange once", () => {
    const { tree, onChange } = render()
    act(() => {
      option(tree, "private").props.onPress()
    })
    expect(feedback.selection).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("private")
  })

  test("pressing the selected card does nothing", () => {
    const { tree, onChange } = render()
    act(() => {
      option(tree, "shared").props.onPress()
    })
    expect(feedback.selection).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  test("disabled: no haptic, no change, cards report disabled", () => {
    const { tree, onChange } = render({ disabled: true })
    act(() => {
      option(tree, "private").props.onPress()
    })
    expect(feedback.selection).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(option(tree, "private").props.accessibilityState.disabled).toBe(true)
  })
})
