import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
    if (message.includes("not configured to support act")) return
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
    ScrollView: mockComponent("ScrollView"),
    Pressable: mockComponent("Pressable"),
    StyleSheet: { create: <T,>(value: T): T => value },
  }
})

import { ExplorerFilterBar, type ExplorerFilterBarProps } from "./ExplorerFilterBar"

const t = fr.publicMap

function render(overrides: Partial<ExplorerFilterBarProps> = {}) {
  const props: ExplorerFilterBarProps = {
    period: "all",
    onChangePeriod: jest.fn(),
    region: "",
    onChangeRegion: jest.fn(),
    mineOnly: false,
    onToggleMine: jest.fn(),
    activeCount: 0,
    onReset: jest.fn(),
    ...overrides,
  }
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<ExplorerFilterBar {...props} />)
  })
  return { tree: tree!, props }
}

function pressableByLabel(tree: renderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    (node) => (node.type as unknown) === "Pressable" && node.props.accessibilityLabel === label,
  )
}

describe("ExplorerFilterBar (MAP-02: immediate chips, count and reset)", () => {
  test("no summary/reset row when nothing is active", () => {
    const { tree } = render({ activeCount: 0 })
    expect(
      tree.root.findAll(
        (node) => (node.type as unknown) === "Text" && node.props.children === t.filters.reset,
      ),
    ).toHaveLength(0)
  })

  test("shows the active count and a reset action once a filter is set", () => {
    const onReset = jest.fn()
    const { tree } = render({ activeCount: 2, onReset })
    const summary = tree.root.findAll(
      (node) =>
        (node.type as unknown) === "Text" && node.props.children === t.filters.activeCount(2),
    )
    expect(summary).toHaveLength(1)
    const reset = tree.root.find(
      (node) => (node.type as unknown) === "Text" && node.props.children === t.filters.reset,
    )
    act(() => reset.props.onPress())
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  test("pressing a period chip reports the key immediately", () => {
    const onChangePeriod = jest.fn()
    const { tree } = render({ onChangePeriod })
    const chip = pressableByLabel(tree, t.filters.period.year)
    act(() => chip.props.onPress())
    expect(onChangePeriod).toHaveBeenCalledWith("year")
  })

  test("pressing a region chip reports the key immediately, 'Toutes régions' clears it", () => {
    const onChangeRegion = jest.fn()
    const { tree } = render({ region: "ACA", onChangeRegion })
    const aca = pressableByLabel(tree, t.filters.region.ACA)
    expect(aca.props.accessibilityState.selected).toBe(true)
    const all = pressableByLabel(tree, t.filters.region.all)
    act(() => all.props.onPress())
    expect(onChangeRegion).toHaveBeenCalledWith("")
  })

  test("the mine toggle reflects mineOnly and calls onToggleMine", () => {
    const onToggleMine = jest.fn()
    const { tree } = render({ mineOnly: true, onToggleMine })
    const mine = pressableByLabel(tree, t.filters.mine)
    expect(mine.props.accessibilityState.selected).toBe(true)
    act(() => mine.props.onPress())
    expect(onToggleMine).toHaveBeenCalledTimes(1)
  })

  test("always shows the v3.0-only region hint", () => {
    const { tree } = render()
    expect(
      tree.root.findAll(
        (node) => (node.type as unknown) === "Text" && node.props.children === t.filters.regionHint,
      ),
    ).toHaveLength(1)
  })
})
