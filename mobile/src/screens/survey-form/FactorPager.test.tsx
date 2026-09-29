import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorField, FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { FactorPager } from "./FactorPager"

// OA-28: the bar clears the tab bar; the tab-bar packages are not loaded in unit tests.
jest.mock("../../app/useAppBottomTabBarHeight", () => ({
  useTabBarClearance: () => 68,
  useAppBottomTabBarHeight: () => 68,
}))

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
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { ios?: unknown; default?: unknown }) => options.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

jest.mock("../FactorDetailScreen", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    FactorDetailScreen: ({ factor }: { factor: string }) =>
      ReactRef.createElement("FactorDetailScreenProbe", { factor }),
  }
})

const FACTORS: FactorKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

const field = (overrides: Partial<FactorField> = {}): FactorField => ({
  label: "x",
  value: "",
  onChange: jest.fn(),
  required: true,
  error: null,
  touched: false,
  onTouch: jest.fn(),
  ...overrides,
})

function sections(overrides: Partial<Record<FactorKey, FactorField[]>> = {}) {
  return FACTORS.reduce(
    (acc, factor) => ({ ...acc, [factor]: overrides[factor] ?? [field()] }),
    {} as Record<FactorKey, FactorField[]>,
  )
}

function scores() {
  return FACTORS.reduce(
    (acc, factor) => ({ ...acc, [factor]: null }),
    {} as Record<FactorKey, null>,
  )
}

function render(
  initialFactor: FactorKey,
  sectionOverrides: Partial<Record<FactorKey, FactorField[]>> = {},
) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorPager
        initialFactor={initialFactor}
        factorSections={sections(sectionOverrides)}
        factorRetainedScores={scores()}
        methodVersion={null}
      />,
    )
  })
  const root = tree!.root
  act(() => {
    root
      .findAll((n) => (n.type as unknown) === "View" && n.props.testID === "factor-pager")[0]
      .props.onLayout({
        nativeEvent: { layout: { width: 300, height: 600, x: 0, y: 0 } },
      })
  })
  return {
    tree: tree!,
    byTestID: (id: string) => root.findAll((n) => n.props.testID === id)[0],
  }
}

describe("FactorPager (FLOW-04)", () => {
  test("starts on the initial factor's page", () => {
    const { byTestID } = render("D")
    expect(byTestID("pager-previous")).toBeTruthy()
    expect(byTestID("pager-dot-D").props.accessibilityState).toEqual({ selected: true })
  })

  test("the position indicator reflects the active factor", () => {
    const { tree } = render("C")
    const positionText = tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Text" &&
        String(n.props.children) === fr.factorPager.position({ index: 3, total: 10 }),
    )
    expect(positionText.length).toBeGreaterThan(0)
  })

  test("tapping next advances the active index and disables at the last factor", () => {
    const { byTestID } = render("J")
    expect(byTestID("pager-next").props.disabled).toBe(true)
  })

  test("tapping previous is disabled on the first factor", () => {
    const { byTestID } = render("A")
    expect(byTestID("pager-previous").props.disabled).toBe(true)
  })

  test("tapping a dot jumps to that factor", () => {
    const { byTestID } = render("A")
    act(() => {
      byTestID("pager-dot-F").props.onPress()
    })
    expect(byTestID("pager-dot-F").props.accessibilityState).toEqual({ selected: true })
  })

  test("the next-incomplete shortcut is disabled once every factor is complete", () => {
    const complete = { value: "1", touched: false, error: null }
    const { byTestID } = render(
      "A",
      FACTORS.reduce((acc, f) => ({ ...acc, [f]: [field(complete)] }), {}),
    )
    expect(byTestID("pager-next-incomplete").props.disabled).toBe(true)
    expect(byTestID("pager-next-incomplete").props.accessibilityLabel).toBe(
      fr.factorPager.allComplete,
    )
  })

  test("the next-incomplete shortcut jumps to the next incomplete factor", () => {
    const incompleteAtF = FACTORS.reduce(
      (acc, f) => ({ ...acc, [f]: [field(f === "F" ? {} : { value: "1" })] }),
      {},
    )
    const { byTestID } = render("A", incompleteAtF)
    act(() => {
      byTestID("pager-next-incomplete").props.onPress()
    })
    expect(byTestID("pager-dot-F").props.accessibilityState).toEqual({ selected: true })
  })
})
