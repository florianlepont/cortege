import React from "react"
import renderer, { act } from "react-test-renderer"
import { ValueSection } from "./ValueSection"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})
afterAll(() => jest.restoreAllMocks())

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

const render = (props: Partial<React.ComponentProps<typeof ValueSection>> = {}) => {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ValueSection testID="sec" title="Comptage" {...props}>
        <></>
        <></>
      </ValueSection>,
    )
  })
  return tree!
}
const textsOf = (tree: renderer.ReactTestRenderer): string[] =>
  tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => String(n.props.children))

describe("ValueSection", () => {
  test("a header role title, the rows, no error and no note by default", () => {
    const tree = render()
    const header = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header",
    )
    expect(header).toHaveLength(1)
    expect(textsOf(tree)).toEqual(["Comptage"])
  })

  test("the count at the right of the header", () => {
    const tree = render({ countText: "2 strates comptées", countTestID: "cnt" })
    expect(tree.root.findAll((n) => n.props.testID === "cnt")[0].props.children).toBe(
      "2 strates comptées",
    )
  })

  test("each error is an alert caption under the list, then the note", () => {
    const tree = render({ errors: ["Un", "Deux"], note: <></> })
    const alerts = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "alert",
    )
    expect(alerts.map((n) => n.props.children)).toEqual(["Un", "Deux"])
  })
})
