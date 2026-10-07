import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { PagerFinishNotice } from "./PagerFinishNotice"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { ios?: unknown }) => options.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, style }: { children?: React.ReactNode; style?: unknown }) =>
      ReactRef.createElement("GlassSurface", { style }, children),
  }
})

type Style = Record<string, unknown>
const flat = (style: unknown): Style =>
  Array.isArray(style)
    ? style.reduce<Style>((acc, part) => ({ ...acc, ...flat(part) }), {})
    : ((style ?? {}) as Style)

function render(message: string) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<PagerFinishNotice message={message} />)
  })
  return tree!
}

describe("PagerFinishNotice (D-26)", () => {
  test("the calm message floats on its own glass, announced politely", () => {
    const message = fr.status.surveyOps.submitPostponed({ name: "Lisière" })
    const tree = render(message)
    const glass = tree.root.findAll((n) => (n.type as unknown) === "GlassSurface")
    expect(glass).toHaveLength(1)
    const text = glass[0].findAll((n) => (n.type as unknown) === "Text")[0]
    expect(text.props.children).toBe(message)
    expect(text.props.accessibilityLiveRegion).toBe("polite")
    expect(flat(text.props.style).color).toBe(defaultTheme.colors.textPrimary)
    expect(glass[0].props.style.paddingVertical).toBe(8)
    expect(glass[0].props.style.paddingHorizontal).toBe(12)
  })

  test("nothing for an empty message", () => {
    expect(render("").toJSON()).toBeNull()
    expect(render("   ").toJSON()).toBeNull()
  })
})
