/**
 * Tests for AbbreviationInfo (D-04): the info control and its explanation sheet.
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
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppText", () => ({ AppText: "Text" }))

import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import { setReducedMotion } from "../../test/react-native-reanimated.mock"
import {
  ABBREVIATION_INFO_ICON_SIZE,
  AbbreviationInfo,
  type AbbreviationInfoProps,
} from "./AbbreviationInfo"

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

function mount(props: Partial<AbbreviationInfoProps> = {}) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<AbbreviationInfo term="TGB" {...props} />)
  })
  const byType = (type: string) => tree.root.findAll((node) => (node.type as unknown) === type)
  const trigger = () => tree.root.findAll((node) => node.props.testID !== undefined)[0]
  const texts = () =>
    byType("Text").flatMap((node) => React.Children.toArray(node.props.children) as string[])
  return { tree, byType, trigger, texts }
}

describe("AbbreviationInfo, icon variant", () => {
  it("is one 44 pt button with the outline info glyph", () => {
    const { byType, trigger } = mount()
    const button = trigger()
    expect(button.props.testID).toBe("abbreviation-info-TGB")
    expect(button.props.accessibilityRole).toBe("button")
    expect(button.props.accessibilityLabel).toBe("Que signifie TGB ?")
    const slop = button.props.hitSlop
    for (const side of ["top", "bottom", "left", "right"]) {
      expect(slop[side]).toBe(12)
      expect(ABBREVIATION_INFO_ICON_SIZE + 2 * slop[side]).toBe(44)
    }
    const glyph = byType("Ionicons")[0]
    expect(glyph.props.name).toBe("information-circle-outline")
    expect(glyph.props.size).toBe(20)
    expect(glyph.props.color).toBe(defaultTheme.semanticColors.accent)
  })

  it("mounts no Modal until pressed, then opens a page sheet with the catalogue texts", () => {
    const { byType, trigger, texts } = mount()
    expect(byType("Modal")).toHaveLength(0)
    act(() => trigger().props.onPress())
    const modal = byType("Modal")[0]
    expect(modal.props.presentationStyle).toBe("pageSheet")
    expect(modal.props.animationType).toBe("slide")
    const entry = fr.abbreviations.terms.TGB
    expect(texts()).toEqual(expect.arrayContaining([entry.long, "TGB", entry.explanation]))
    expect(entry.long).toBe("très gros bois")
    const header = byType("Text").find((node) => node.props.accessibilityRole === "header")
    expect(header?.props.children).toBe(entry.long)
  })

  it("closes by its close button and by the system back request", () => {
    const { byType, trigger } = mount()
    act(() => trigger().props.onPress())
    const closeButton = byType("Pressable").find(
      (node) => node.props.accessibilityLabel === fr.abbreviations.sheet.close,
    )
    expect(byType("Ionicons").some((icon) => icon.props.name === "close-outline")).toBe(true)
    act(() => closeButton?.props.onPress())
    expect(byType("Modal")).toHaveLength(0)

    act(() => trigger().props.onPress())
    act(() => byType("Modal")[0].props.onRequestClose())
    expect(byType("Modal")).toHaveLength(0)
  })

  it("does not animate the sheet when Reduce Motion is on", () => {
    setReducedMotion(true)
    const { byType, trigger } = mount()
    act(() => trigger().props.onPress())
    expect(byType("Modal")[0].props.animationType).toBe("none")
  })

  it("takes a custom test id and glyph colour", () => {
    const { byType, trigger } = mount({ testID: "custom-info", iconColor: "#123456" })
    expect(trigger().props.testID).toBe("custom-info")
    expect(byType("Ionicons")[0].props.color).toBe("#123456")
  })
})

describe("AbbreviationInfo, row variant", () => {
  it("is a 44 pt row with a visible label next to the glyph", () => {
    const { byType, trigger, texts } = mount({ variant: "row" })
    const row = trigger()
    expect(row.props.testID).toBe("abbreviation-info-TGB")
    expect(row.props.style.minHeight).toBe(44)
    expect(texts()).toContain("Que signifie TGB ?")
    expect(byType("Ionicons")[0].props.name).toBe("information-circle-outline")
  })

  it("lets the caller recolour the glyph and opens the same sheet", () => {
    const { byType, trigger } = mount({ variant: "row", iconColor: "#abcdef" })
    expect(byType("Ionicons")[0].props.color).toBe("#abcdef")
    act(() => trigger().props.onPress())
    expect(byType("Modal")).toHaveLength(1)
  })
})
