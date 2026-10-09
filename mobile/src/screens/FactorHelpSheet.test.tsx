import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../i18n"
import { FactorHelpSheet } from "./FactorHelpSheet"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    ScrollView: mockComponent("ScrollView"),
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})

jest.mock("../ui/AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Pressable", props, children),
  }
})

describe("FactorHelpSheet (the content of the native help sheet)", () => {
  beforeAll(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })

  test("shows the help, one row per hint, and closes with its button", () => {
    const onClose = jest.fn()
    let tree!: renderer.ReactTestRenderer
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    act(() => {
      tree = renderer.create(
        <FactorHelpSheet
          help="Ce que compte le facteur"
          hints={["Un", "Deux"]}
          onClose={onClose}
        />,
      )
    })
    const texts = tree.root
      .findAllByType("Text" as unknown as React.ElementType)
      .map((node) => node.props.children)
    expect(texts).toEqual(
      expect.arrayContaining([fr.factorDetail.helpTitle, "Ce que compte le facteur", "Un", "Deux"]),
    )
    act(() =>
      tree.root.findByProps({ accessibilityLabel: fr.factorDetail.helpClose }).props.onPress(),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
