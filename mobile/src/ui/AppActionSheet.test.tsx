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

const mockPlatform = { OS: "android" as "android" | "ios" }
const mockShowActionSheet = jest.fn()

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
    Platform: {
      get OS() {
        return mockPlatform.OS
      },
    },
    ActionSheetIOS: {
      showActionSheetWithOptions: (...args: unknown[]) => mockShowActionSheet(...args),
    },
    StyleSheet: { create: <T,>(value: T): T => value },
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock("./AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Pressable", props, children),
  }
})

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

beforeEach(() => {
  mockPlatform.OS = "android"
  mockShowActionSheet.mockReset()
})

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
    const cancel = tree.root.findAll(
      (node) =>
        (node.type as unknown) === "Pressable" && node.props.accessibilityLabel === "Annuler",
    )
    expect(cancel).toHaveLength(2)
    for (const button of cancel) act(() => button.props.onPress())
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe("AppActionSheet on iOS: the system sheet", () => {
  beforeEach(() => {
    mockPlatform.OS = "ios"
  })

  test("draws nothing of its own and shows the system sheet when it becomes visible", () => {
    const { tree } = render([
      { label: "Renommer", onPress: jest.fn() },
      { label: "Supprimer", destructive: true, onPress: jest.fn() },
    ])
    expect(tree.toJSON()).toBeNull()
    expect(mockShowActionSheet).toHaveBeenCalledTimes(1)
    expect(mockShowActionSheet.mock.calls[0][0]).toEqual({
      title: "Un relevé",
      options: ["Renommer", "Supprimer", "Annuler"],
      cancelButtonIndex: 2,
      destructiveButtonIndex: 1,
    })
  })

  test("has no destructive index when no option is destructive", () => {
    render([{ label: "Renommer", onPress: jest.fn() }])
    expect(mockShowActionSheet.mock.calls[0][0].destructiveButtonIndex).toBeUndefined()
  })

  test("choosing an option closes, then runs its action", () => {
    const first = jest.fn()
    const second = jest.fn()
    const { onClose } = render([
      { label: "Renommer", onPress: first },
      { label: "Supprimer", destructive: true, onPress: second },
    ])
    mockShowActionSheet.mock.calls[0][1](1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  test("cancelling closes without running an action", () => {
    const onPress = jest.fn()
    const { onClose } = render([{ label: "Renommer", onPress }])
    mockShowActionSheet.mock.calls[0][1](1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()
  })

  test("a hidden sheet shows nothing", () => {
    act(() => {
      renderer.create(
        <AppActionSheet visible={false} onClose={jest.fn()} options={[]} cancelLabel="Annuler" />,
      )
    })
    expect(mockShowActionSheet).not.toHaveBeenCalled()
  })
})
