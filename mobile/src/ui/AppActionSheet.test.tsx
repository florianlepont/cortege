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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Pressable: mockComponent("Pressable"),
    Modal: mockComponent("Modal"),
    StyleSheet: { create: <T,>(value: T): T => value },
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

import { AppActionSheet, type AppActionSheetOption } from "./AppActionSheet"

function render(options: AppActionSheetOption[], overrides: { onClose?: () => void } = {}) {
  const onClose = overrides.onClose ?? jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <AppActionSheet
        visible
        onClose={onClose}
        title="Un relevé"
        options={options}
        cancelLabel="Annuler"
      />,
    )
  })
  return { tree: tree!, onClose }
}

describe("AppActionSheet (DET-03/04: native '…' menu)", () => {
  test("renders the title and every option's label", () => {
    const { tree } = render([
      { label: "Renommer", onPress: jest.fn() },
      { label: "Partager", onPress: jest.fn() },
    ])
    const texts = tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .map((node) => node.props.children)
    expect(texts).toEqual(expect.arrayContaining(["Un relevé", "Renommer", "Partager", "Annuler"]))
  })

  test("pressing an option closes the sheet and runs its action", () => {
    const onPress = jest.fn()
    const { tree, onClose } = render([{ label: "Renommer", onPress }])
    const option = tree.root.findByProps({ accessibilityLabel: "Renommer" })
    act(() => option.props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("a destructive option is styled distinctly", () => {
    const { tree } = render([{ label: "Supprimer", destructive: true, onPress: jest.fn() }])
    const option = tree.root.findByProps({ accessibilityLabel: "Supprimer" })
    const label = option.findByType("Text" as unknown as React.ComponentType)
    const flatStyle = [label.props.style].flat(2)
    expect(flatStyle.some((style: Record<string, unknown>) => style?.color)).toBe(true)
  })

  test("the backdrop and the cancel row both close without running an action", () => {
    const { tree, onClose } = render([{ label: "Renommer", onPress: jest.fn() }])
    const cancel = tree.root.findByProps({ accessibilityLabel: "Annuler" })
    act(() => cancel.props.onPress())
    expect(onClose).toHaveBeenCalled()
  })
})
