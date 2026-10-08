import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Keyboard: { dismiss: jest.fn() },
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
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
jest.mock("../../ui/AppField", () => ({ AppField: "AppField" }))
jest.mock("../../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))
jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: (props: { trailing?: React.ReactNode }) =>
      ReactRef.createElement("AppSectionHeader", props, props.trailing),
  }
})
const mockScheme: { current: "light" | "dark" } = { current: "dark" }
jest.mock("../../app/theme", () => {
  const actual = jest.requireActual("../../app/theme") as typeof import("../../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("automatic", "dark", () => {}),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandComponentTokens, brandInteraction } from "../../app/brand-tokens"
import { buildTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { OfflineAreasSheet } from "./OfflineAreasSheet"
import { SHEET_CLOSE_ICON_SIZE, SHEET_CLOSE_SIZE, SheetCloseButton } from "./SheetCloseButton"

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

const dark = buildTheme("automatic", "dark", () => {})
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function mount(element: React.ReactElement): renderer.ReactTestRenderer {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return tree
}

describe("SheetCloseButton (12.2-19 fix round)", () => {
  test("a 44 pt glass circle with a bright glyph, closing on press", () => {
    const onPress = jest.fn()
    const tree = mount(<SheetCloseButton accessibilityLabel="Fermer" onPress={onPress} />)
    const circle = tree.root.findByType("GlassSurface" as never)
    expect(circle.props.interactive).toBe(true)
    expect(circle.props.surface).toEqual(dark.visual.sheet.close)
    expect(flat(circle.props.style)).toMatchObject({
      width: SHEET_CLOSE_SIZE,
      height: SHEET_CLOSE_SIZE,
      borderRadius: SHEET_CLOSE_SIZE / 2,
      borderColor: dark.visual.sheet.closeHairline,
    })
    expect(SHEET_CLOSE_SIZE).toBe(brandInteraction.hitTarget.min)
    const glyph = tree.root.findByType("Ionicons" as never)
    expect(glyph.props.name).toBe("close")
    expect(glyph.props.size).toBe(SHEET_CLOSE_ICON_SIZE)
    expect(glyph.props.color).toBe(dark.colors.textPrimary)
    const button = tree.root.findByType("Pressable" as never)
    expect(button.props.accessibilityLabel).toBe("Fermer")
    expect(button.props.accessibilityRole).toBe("button")
    act(() => button.props.onPress())
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe("OfflineAreasSheet text in dark mode (12.2-19 fix round)", () => {
  const estimate = {
    tileCountPerBasemap: 10,
    totalTileCount: 20,
    estimatedBytes: 2_000_000,
    exceedsCap: false,
  }

  function render(exceedsCap: boolean) {
    return mount(
      <OfflineAreasSheet
        downloadingAreaId={null}
        downloadStatus={null}
        estimate={{ ...estimate, exceedsCap }}
        onDownload={jest.fn()}
        onDone={jest.fn()}
        onRetry={jest.fn()}
        onClose={jest.fn()}
      />,
    )
  }

  test("the subtitle and the estimate use the theme's secondary text, the title its strong text", () => {
    const tree = render(false)
    const header = tree.root.findByType("AppSectionHeader" as never)
    expect(header.props.subtitle).toBe(fr.offlineMap.areas.subtitle)
    expect(flat(header.props.subtitleStyle).color).toBe(dark.colors.textSecondary)
    expect(flat(header.props.titleStyle).color).toBe(dark.semanticColors.textStrong)
    const line = tree.root.findByType("Text" as never)
    expect(flat(line.props.style).color).toBe(dark.colors.textSecondary)
  })

  test("the size warning is the theme's danger text, not the brand terracotta", () => {
    const line = render(true).root.findByType("Text" as never)
    expect(line.props.children).toBe(fr.offlineMap.areas.tooLarge)
    expect(flat(line.props.style).color).toBe(dark.onSurface.danger)
  })

  test("the download button is 46 pt, between md and lg, across the whole panel (12.2-19)", () => {
    const button = render(false).root.findByType("GlassButton" as never)
    expect(button.props.label).toBe(fr.offlineMap.areas.downloadThisArea)
    expect(button.props.size).toBe("md")
    expect(button.props.minHeight).toBe(brandComponentTokens.button.minHeightPanel)
    expect(brandComponentTokens.button.minHeightPanel).toBe(46)
    expect(button.props.style).toMatchObject({ alignSelf: "stretch" })
  })

  test("the close button is the glass circle", () => {
    const tree = render(false)
    const circle = tree.root.findByType("GlassSurface" as never)
    expect(circle.props.surface).toEqual(dark.visual.sheet.close)
    expect(circle.findByType("Pressable" as never).props.accessibilityLabel).toBe(
      fr.offlineMap.areas.a11y.closeSheet,
    )
  })
})
