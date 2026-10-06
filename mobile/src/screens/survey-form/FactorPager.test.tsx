import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorField, FactorKey } from "../../app/types"
import { FACTOR_TITLES } from "../../app/constants"
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

// The header is native: its height is not available in unit tests.
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => 0 }))

jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", null, children),
  }
})

jest.mock("@expo/vector-icons", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    Ionicons: (props: { name: string }) => ReactRef.createElement("Ionicons", props),
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
  const onFinish = jest.fn()
  const onActiveFactorChange = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorPager
        initialFactor={initialFactor}
        factorSections={sections(sectionOverrides)}
        factorRetainedScores={scores()}
        methodVersion={null}
        onActiveFactorChange={onActiveFactorChange}
        onFinish={onFinish}
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
  const texts = () =>
    root.findAll((n) => (n.type as unknown) === "Text").map((n) => String(n.props.children))
  return {
    tree: tree!,
    onFinish,
    onActiveFactorChange,
    texts,
    byTestID: (id: string) => root.findAll((n) => n.props.testID === id)[0],
  }
}

describe("FactorPager (FLOW-04, OA-30)", () => {
  test("starts on the initial factor: its name in the header, its letter selected", () => {
    const { byTestID, texts, onActiveFactorChange } = render("D")
    expect(byTestID("pager-letter-D").props.accessibilityState).toEqual({ selected: true })
    expect(texts()).toContain(FACTOR_TITLES.D)
    expect(onActiveFactorChange).toHaveBeenLastCalledWith("D")
  })

  test("the header shows the running total out of 50", () => {
    const { byTestID, texts } = render("A")
    expect(texts()).toContain(fr.factorPager.total(0))
    expect(byTestID("pager-total").props.accessibilityLabel).toBe(fr.factorPager.totalA11y(0))
  })

  test("next advances to the following factor and reports it", () => {
    const { byTestID, onActiveFactorChange, texts } = render("A")
    expect(byTestID("pager-next").props.accessibilityLabel).toBe(fr.factorPager.next)
    act(() => {
      byTestID("pager-next").props.onPress()
    })
    expect(byTestID("pager-letter-B").props.accessibilityState).toEqual({ selected: true })
    expect(onActiveFactorChange).toHaveBeenLastCalledWith("B")
    expect(texts()).toContain(FACTOR_TITLES.B)
  })

  test("going back is a tap on an earlier letter", () => {
    const { byTestID } = render("C")
    act(() => {
      byTestID("pager-letter-B").props.onPress()
    })
    expect(byTestID("pager-letter-B").props.accessibilityState).toEqual({ selected: true })
  })

  test("on the last factor the button finishes", () => {
    const { byTestID, onFinish } = render("J")
    expect(byTestID("pager-next").props.accessibilityLabel).toBe(fr.factorPager.finish)
    act(() => {
      byTestID("pager-next").props.onPress()
    })
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  test("tapping a letter jumps to that factor", () => {
    const { byTestID } = render("A")
    act(() => {
      byTestID("pager-letter-F").props.onPress()
    })
    expect(byTestID("pager-letter-F").props.accessibilityState).toEqual({ selected: true })
  })

  test("the pager scroll settling on a page selects that factor", () => {
    const { byTestID } = render("A")
    act(() => {
      byTestID("factor-pager-scroll").props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 600, y: 0 } },
      })
    })
    expect(byTestID("pager-letter-C").props.accessibilityState).toEqual({ selected: true })
  })

  test("a complete factor, an invalid one and an empty one have their own letter style", () => {
    const { byTestID } = render("A", {
      B: [field({ value: "1" })],
      C: [field({ error: "bad", touched: true })],
    })
    // Styles are the mocked identity objects: the three states differ.
    const styleOf = (id: string) => JSON.stringify(byTestID(id).props.style)
    expect(styleOf("pager-letter-B")).not.toEqual(styleOf("pager-letter-D"))
    expect(styleOf("pager-letter-C")).not.toEqual(styleOf("pager-letter-D"))
    expect(styleOf("pager-letter-B")).not.toEqual(styleOf("pager-letter-C"))
  })
})
