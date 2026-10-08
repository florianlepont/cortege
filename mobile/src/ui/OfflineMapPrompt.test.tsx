import React from "react"
import renderer, { act, type ReactTestRenderer } from "react-test-renderer"
import { fr } from "../i18n"
import type { OfflineMapPrompt as Model } from "../hooks/useOfflineMapPrompt"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const host =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: host("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, hairlineWidth: 1, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppText", () => ({ AppText: "Text" }))
jest.mock("./GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
jest.mock("./AppButton", () => ({ AppButton: "AppButton" }))
// The theme the prompt reads, switchable per test (light by default).
const mockScheme: { current: "light" | "dark" } = { current: "light" }
jest.mock("../app/theme", () => {
  const actual = jest.requireActual("../app/theme") as typeof import("../app/theme")
  const themes = {
    light: actual.defaultTheme,
    dark: actual.buildTheme("automatic", "dark", () => {}),
  }
  return { ...actual, useBrandTheme: () => themes[mockScheme.current] }
})

import { brandColors } from "../app/brand-tokens"
import { buildTheme, defaultTheme } from "../app/theme"
import { OfflineMapPrompt } from "./OfflineMapPrompt"

const t = fr.offlineMap.prompt

function model(overrides: Partial<Model> = {}): Model {
  return { state: "missing", megabytes: "24.0", percent: 0, download: jest.fn(), ...overrides }
}

function render(prompt: Model, variant: "banner" | "row", onDismiss?: () => void) {
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <OfflineMapPrompt prompt={prompt} siteName="Bois" variant={variant} onDismiss={onDismiss} />,
    )
  })
  return tree
}

const texts = (tree: ReactTestRenderer): string[] =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => String(node.props.children))
const button = (tree: ReactTestRenderer, label: string) =>
  tree.root.find((node) => (node.type as unknown) === "AppButton" && node.props.label === label)

afterEach(() => {
  mockScheme.current = "light"
})

describe("OfflineMapPrompt", () => {
  test("banner, missing: message with the size, download and later", () => {
    const prompt = model()
    const onDismiss = jest.fn()
    const tree = render(prompt, "banner", onDismiss)
    expect(texts(tree)).toContain(t.message("24.0"))
    act(() => button(tree, t.download).props.onPress())
    expect(prompt.download).toHaveBeenCalledWith(t.areaName("Bois"))
    act(() => button(tree, t.later).props.onPress())
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  test("banner without a dismiss handler: later is a harmless no-op", () => {
    const tree = render(model(), "banner")
    expect(() => act(() => button(tree, t.later).props.onPress())).not.toThrow()
  })

  test("banner, downloading: progress and the reassurance, no buttons", () => {
    const tree = render(model({ state: "downloading", percent: 62 }), "banner")
    expect(texts(tree)).toEqual(expect.arrayContaining([t.downloading(62), t.keepGoing]))
    expect(tree.root.findAll((node) => (node.type as unknown) === "AppButton")).toHaveLength(0)
  })

  test("banner, covered or hidden: nothing", () => {
    expect(render(model({ state: "covered" }), "banner").toJSON()).toBeNull()
    expect(render(model({ state: "hidden" }), "banner").toJSON()).toBeNull()
  })

  test("row: missing, downloading and downloaded lines", () => {
    const missing = render(model(), "row")
    expect(texts(missing)).toContain(t.row.missing("24.0"))
    act(() => button(missing, t.download).props.onPress())

    expect(texts(render(model({ state: "downloading", percent: 10 }), "row"))).toContain(
      t.downloading(10),
    )
    expect(texts(render(model({ state: "covered" }), "row"))).toContain(t.row.downloaded)
    expect(render(model({ state: "hidden" }), "row").toJSON()).toBeNull()
  })

  test("over the parcel map the banner takes the map panel glass (12.2-21 dark pass)", () => {
    mockScheme.current = "dark"
    const dark = buildTheme("automatic", "dark", () => {})
    const glass = render(model(), "banner").root.findByType("GlassSurface" as never)
    expect(glass.props.surface).toEqual(dark.visual.mapPanel)
  })

  test.each([
    ["light", defaultTheme],
    ["dark", buildTheme("automatic", "dark", () => {})],
  ] as const)(
    "icons and progress fill take the %s accent, never the forest on dark",
    (scheme, theme) => {
      mockScheme.current = scheme
      const trees = [
        render(model(), "banner"),
        render(model({ state: "downloading", percent: 40 }), "banner"),
        render(model({ state: "downloading", percent: 40 }), "row"),
        render(model({ state: "covered" }), "row"),
      ]
      const icons = trees.flatMap((tree) => tree.root.findAllByType("Ionicons" as never))
      const brandIcons = icons.filter((icon) => icon.props.name !== "cloud-offline-outline")
      expect(brandIcons.length).toBe(4)
      for (const icon of brandIcons) expect(icon.props.color).toBe(theme.visual.accentText)
      const flat = (style: unknown): Record<string, unknown> =>
        Object.assign({}, ...[style].flat(3).filter(Boolean))
      const fills = trees.flatMap((tree) =>
        tree.root.findAll(
          (node) =>
            (node.type as unknown) === "View" && String(flat(node.props.style).width).endsWith("%"),
        ),
      )
      expect(fills).toHaveLength(1)
      expect(flat(fills[0].props.style).backgroundColor).toBe(theme.visual.accentText)
      if (scheme === "dark") expect(theme.visual.accentText).not.toBe(brandColors.forest)
      else expect(theme.visual.accentText).toBe(brandColors.forest)
    },
  )
})
