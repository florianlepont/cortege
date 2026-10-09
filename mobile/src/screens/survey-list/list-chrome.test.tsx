import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"

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
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("../../ui/AppPressable", () => ({ AppPressable: "AppPressable" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))

import { fr } from "../../i18n"
import { ListTitleBar } from "./list-chrome"

let tree: ReactTestRenderer

afterEach(() => {
  act(() => tree.unmount())
})

describe("ListTitleBar (D-01)", () => {
  test("has the title and the create button only, search being the tab", () => {
    const onOpenCreateSurvey = jest.fn()
    act(() => {
      tree = renderer.create(<ListTitleBar onOpenCreateSurvey={onOpenCreateSurvey} />)
    })
    const buttons = tree.root.findAllByType("AppPressable" as never)
    expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual([
      fr.surveyList.a11y.createSurvey,
    ])
    expect(JSON.stringify(tree.toJSON())).not.toContain("Rechercher un relevé")

    act(() => buttons[0].props.onPress())
    expect(onOpenCreateSurvey).toHaveBeenCalledTimes(1)
  })
})
