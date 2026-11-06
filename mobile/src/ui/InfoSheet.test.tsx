/**
 * Tests for InfoSheet: the small sheet shell shared by AbbreviationInfo and GlossaryInfo.
 */
import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Modal: mockComponent("Modal"),
    ScrollView: mockComponent("ScrollView"),
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppText", () => ({ AppText: "Text" }))

import { defaultTheme } from "../app/theme"
import { setReducedMotion } from "../../test/react-native-reanimated.mock"
import { InfoSheet, type InfoSheetProps } from "./InfoSheet"

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

afterEach(() => {
  setReducedMotion(false)
})

function mount(props: Partial<InfoSheetProps> = {}) {
  const onClose = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <InfoSheet
        open
        title="Titre"
        body="Le corps du texte."
        closeLabel="Fermer"
        onClose={onClose}
        {...props}
      />,
    )
  })
  const byType = (type: string) => tree.root.findAll((node) => (node.type as unknown) === type)
  const texts = () =>
    byType("Text").flatMap((node) => React.Children.toArray(node.props.children) as string[])
  return { tree, byType, texts, onClose }
}

describe("InfoSheet", () => {
  it("renders nothing while closed", () => {
    const { byType } = mount({ open: false })
    expect(byType("Modal")).toHaveLength(0)
  })

  it("opens a page sheet with the title as a header and the body", () => {
    const { byType, texts } = mount()
    const modal = byType("Modal")[0]
    expect(modal.props.presentationStyle).toBe("pageSheet")
    expect(modal.props.animationType).toBe("slide")
    expect(texts()).toEqual(expect.arrayContaining(["Titre", "Le corps du texte."]))
    const header = byType("Text").find((node) => node.props.accessibilityRole === "header")
    expect(header?.props.children).toBe("Titre")
  })

  it("draws the eyebrow only when given", () => {
    expect(mount().texts()).not.toContain("TGB")
    expect(mount({ eyebrow: "TGB" }).texts()).toContain("TGB")
  })

  it("closes by its labelled close button and by the system back request", () => {
    const { byType, onClose } = mount()
    const closeButton = byType("Pressable").find(
      (node) => node.props.accessibilityLabel === "Fermer",
    )
    expect(closeButton?.props.accessibilityRole).toBe("button")
    const glyph = byType("Ionicons")[0]
    expect(glyph.props.name).toBe("close-outline")
    expect(glyph.props.color).toBe(defaultTheme.semanticColors.accent)
    act(() => closeButton?.props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
    act(() => byType("Modal")[0].props.onRequestClose())
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it("does not animate the sheet when Reduce Motion is on", () => {
    setReducedMotion(true)
    const { byType } = mount()
    expect(byType("Modal")[0].props.animationType).toBe("none")
  })

  it("takes a test id on the sheet view", () => {
    const { tree } = mount({ testID: "sheet" })
    expect(tree.root.findAll((node) => node.props.testID === "sheet").length).toBeGreaterThan(0)
  })
})
