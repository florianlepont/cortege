import React from "react"
import renderer, { act } from "react-test-renderer"

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
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", null, children),
  }
})

import { MapActionPill, MapInfoPill, MapOverlayCorners } from "./MapChips"

const texts = (tree: renderer.ReactTestRenderer): string[] =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat().join(""))

describe("map chips (the overlays every map shares)", () => {
  test("an info pill shows its label", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<MapInfoPill label="2 parcelles" />)
    })
    expect(texts(tree)).toEqual(["2 parcelles"])
  })

  test("an action pill is one button that reports its press", () => {
    const onPress = jest.fn()
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <MapActionPill
          icon="map-outline"
          label="Voir"
          accessibilityLabel="Voir le relevé"
          onPress={onPress}
        />,
      )
    })
    const button = tree.root.findByProps({ accessibilityLabel: "Voir le relevé" })
    act(() => button.props.onPress())
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(texts(tree)).toEqual(["Voir"])
  })

  test("the corners hold the information on the left and the actions on the right", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <MapOverlayCorners
          info={<MapInfoPill label="info" />}
          actions={<MapInfoPill label="act" />}
        />,
      )
    })
    expect(texts(tree)).toEqual(["info", "act"])
  })
})
