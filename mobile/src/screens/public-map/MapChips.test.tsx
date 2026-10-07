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
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
// The theme the pills read, switchable per test (light by default).
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("automatic", "dark", () => {}),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandColors, brandInteraction } from "../../app/brand-tokens"
import { buildTheme, defaultTheme } from "../../app/theme"
import {
  MAP_CONTROL_HIT_SLOP,
  MAP_PILL_HEIGHT,
  MapActionPill,
  MapInfoPill,
  MapOverlayCorners,
} from "./MapChips"

afterEach(() => {
  mockScheme.current = "light"
})

function renderAction(): renderer.ReactTestRenderer {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <MapActionPill
        icon="map-outline"
        label="Voir"
        accessibilityLabel="Voir le relevé"
        onPress={jest.fn()}
      />,
    )
  })
  return tree
}

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

  test("the action icon takes the theme's accent text colour, light in dark mode (12.2-18)", () => {
    const light = renderAction().root.findByType("Ionicons" as never)
    expect(light.props.color).toBe(defaultTheme.visual.accentText)
    mockScheme.current = "dark"
    const dark = renderAction().root.findByType("Ionicons" as never)
    const darkAccent = buildTheme("automatic", "dark", () => {}).visual.accentText
    expect(dark.props.color).toBe(darkAccent)
    expect(dark.props.color).not.toBe(brandColors.forest)
  })

  test("the pills keep their glass surface, height, and a 44 pt target (D-04, D-05)", () => {
    const tree = renderAction()
    const glass = tree.root.findByType("GlassSurface" as never)
    expect(glass.props.interactive).toBe(true)
    expect(MAP_PILL_HEIGHT).toBe(40)
    expect([glass.props.style].flat()[0].height).toBe(MAP_PILL_HEIGHT)
    const button = tree.root.findByType("Pressable" as never)
    expect(button.props.style.height).toBe(MAP_PILL_HEIGHT)
    expect(button.props.accessibilityRole).toBe("button")
    const slop = button.props.hitSlop as { top: number; bottom: number }
    expect(MAP_PILL_HEIGHT + slop.top + slop.bottom).toBe(brandInteraction.hitTarget.min)
    expect(MAP_CONTROL_HIT_SLOP).toBe(2)
  })
})
