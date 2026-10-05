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
    GlassSurface: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", null, children),
  }
})
jest.mock("./AppButton", () => ({ AppButton: "AppButton" }))

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
})
