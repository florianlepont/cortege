import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"
import { FixedActionBar } from "./FixedActionBar"

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
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 12, left: 0, right: 0 }),
}))

jest.mock("../../ui/AppButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppButton: ({ label, onPress }: { label: string; onPress: () => void }) =>
      ReactRef.createElement("AppButton", { label, onPress }),
  }
})

function render(props: Partial<React.ComponentProps<typeof FixedActionBar>> = {}) {
  const onBack = jest.fn()
  const onPrimary = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FixedActionBar primaryLabel="Continuer" onBack={onBack} onPrimary={onPrimary} {...props} />,
    )
  })
  return { tree: tree!, onBack, onPrimary }
}

describe("FixedActionBar (FLOW-05 fixed CTA bar, FLOW-07 visible autosave)", () => {
  test("renders the primary CTA with the given label", () => {
    const { tree } = render({ primaryLabel: "Terminer la saisie" })
    const button = tree.root.findAll((n) => (n.type as unknown) === "AppButton")[0]
    expect(button.props.label).toBe("Terminer la saisie")
  })

  test("tapping the primary CTA calls onPrimary", () => {
    const { tree, onPrimary } = render()
    const button = tree.root.findAll((n) => (n.type as unknown) === "AppButton")[0]
    act(() => {
      button.props.onPress()
    })
    expect(onPrimary).toHaveBeenCalledTimes(1)
  })

  test("tapping back calls onBack", () => {
    const { tree, onBack } = render()
    const back = tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Pressable" &&
        n.props.accessibilityLabel === fr.surveyForm.a11y.back,
    )[0]
    act(() => {
      back.props.onPress()
    })
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  test("shows no autosave text when autosaveStatus is not provided", () => {
    const { tree } = render()
    expect(
      tree.root.findAll(
        (n) => (n.type as unknown) === "Text" && String(n.props.children).includes("Enregistré"),
      ),
    ).toHaveLength(0)
  })

  test("shows the saved time from a saved autosave status", () => {
    const { tree } = render({
      autosaveStatus: { state: "saved", savedAt: "2026-09-27T14:32:00.000Z" },
    })
    const texts = tree.root
      .findAll((n) => (n.type as unknown) === "Text")
      .map((n) => String(n.props.children))
    expect(texts.some((text) => text.startsWith("Enregistré ·"))).toBe(true)
  })

  test("shows the failed-save copy on an error status", () => {
    const { tree } = render({ autosaveStatus: { state: "error", savedAt: null } })
    const texts = tree.root
      .findAll((n) => (n.type as unknown) === "Text")
      .map((n) => String(n.props.children))
    expect(texts).toContain(fr.surveyForm.autosave.failed)
  })

  test("shows the saving copy while a save is in flight", () => {
    const { tree } = render({ autosaveStatus: { state: "saving", savedAt: null } })
    const texts = tree.root
      .findAll((n) => (n.type as unknown) === "Text")
      .map((n) => String(n.props.children))
    expect(texts).toContain(fr.surveyForm.autosave.saving)
  })
})
