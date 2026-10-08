import React from "react"
import renderer, { act } from "react-test-renderer"
import { AppSectionHeader } from "./AppSectionHeader"
import { brandTypography } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    View: mockComponent("View"),
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

function flatten(style: unknown): StyleObject {
  return ([] as unknown[])
    .concat(style)
    .flat(Infinity)
    .filter(Boolean)
    .reduce<StyleObject>((merged, next) => ({ ...merged, ...(next as StyleObject) }), {})
}

function render(props: Partial<React.ComponentProps<typeof AppSectionHeader>>) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppSectionHeader title="Facteurs" {...props} />)
  })
  return tree!
}

function texts(tree: renderer.ReactTestRenderer) {
  return tree.root.findAllByType("Text" as unknown as React.ComponentType)
}

describe("AppSectionHeader (phase 12.2)", () => {
  test("the title is Sora SemiBold 13/18 in the primary text colour", () => {
    const [title] = texts(render({}))
    expect(flatten(title.props.style)).toMatchObject({
      ...brandTypography.sectionHeader,
      fontFamily: "Sora-SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: defaultTheme.colors.textPrimary,
    })
  })

  test("a caller titleStyle overrides the role", () => {
    const [title] = texts(render({ titleStyle: { color: "#123456" } }))
    expect(flatten(title.props.style).color).toBe("#123456")
  })

  test("the subtitle is secondary meta text, and only rendered when given", () => {
    expect(texts(render({}))).toHaveLength(1)
    const [, subtitle] = texts(render({ subtitle: "Dix facteurs" }))
    expect(subtitle.props.children).toBe("Dix facteurs")
    expect(flatten(subtitle.props.style)).toMatchObject({
      ...brandTypography.meta,
      color: defaultTheme.colors.textSecondary,
    })
  })

  test("the trailing element is rendered", () => {
    const tree = render({ trailing: <AppSectionHeaderTrailing /> })
    expect(tree.root.findAllByType("Trailing" as unknown as React.ComponentType)).toHaveLength(1)
  })
})

function AppSectionHeaderTrailing() {
  return React.createElement("Trailing")
}
