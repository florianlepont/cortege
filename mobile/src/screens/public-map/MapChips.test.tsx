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
    dark: actual.buildTheme("dark"),
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
  MapTitlePill,
} from "./MapChips"

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

  test("the action icon takes the map control colour, light moss in dark mode (12.2-19)", () => {
    const light = renderAction().root.findByType("Ionicons" as never)
    expect(light.props.color).toBe(defaultTheme.visual.mapControl.icon)
    expect(light.props.color).toBe(defaultTheme.visual.accentText)
    mockScheme.current = "dark"
    const dark = renderAction().root.findByType("Ionicons" as never)
    const darkTheme = buildTheme("dark")
    expect(dark.props.color).toBe(darkTheme.visual.mapControl.icon)
    expect(dark.props.color).not.toBe(brandColors.forest)
  })

  test("over the map the pills take the map control glass, near opaque in dark (12.2-19)", () => {
    mockScheme.current = "dark"
    const darkTheme = buildTheme("dark")
    const glass = renderAction().root.findByType("GlassSurface" as never)
    expect(glass.props.surface).toEqual(darkTheme.visual.mapControl.glass)
    expect([glass.props.style].flat()[0].borderColor).toBe(darkTheme.visual.mapControl.hairline)
    let info!: renderer.ReactTestRenderer
    act(() => {
      info = renderer.create(<MapInfoPill label="2 parcelles" />)
    })
    expect(info.root.findByType("GlassSurface" as never).props.surface).toEqual(
      darkTheme.visual.mapControl.glass,
    )
    const label = info.root.findByType("Text" as never)
    const labelStyle = Object.assign({}, ...[label.props.style].flat(3).filter(Boolean))
    expect(labelStyle.color).toBe(darkTheme.visual.mapControl.text)
  })

  test("the title pill over a full-screen map takes the map control glass and ink (12.2-21)", () => {
    mockScheme.current = "dark"
    const darkTheme = buildTheme("dark")
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<MapTitlePill label="Parcelles" top={60} />)
    })
    expect(texts(tree)).toEqual(["Parcelles"])
    const glass = tree.root.findByType("GlassSurface" as never)
    expect(glass.props.surface).toEqual(darkTheme.visual.mapControl.glass)
    expect(glass.props.pointerEvents).toBe("none")
    const style = Object.assign({}, ...[glass.props.style].flat(3).filter(Boolean))
    expect(style).toMatchObject({
      top: 60,
      position: "absolute",
      height: brandInteraction.hitTarget.min,
      borderColor: darkTheme.visual.mapControl.hairline,
    })
    const label = tree.root.findByType("Text" as never)
    const labelStyle = Object.assign({}, ...[label.props.style].flat(3).filter(Boolean))
    expect(labelStyle.color).toBe(darkTheme.visual.mapControl.text)
    expect(labelStyle.color).not.toBe(brandColors.forest)
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
