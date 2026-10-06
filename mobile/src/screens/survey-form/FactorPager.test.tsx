import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorField, FactorKey } from "../../app/types"
import { FACTOR_TITLES } from "../../app/constants"
import { fr } from "../../i18n"
import { feedback } from "../../ui/feedback"
import { FactorPager } from "./FactorPager"

// OA-111: the light tick for each factor crossed while sliding along the strip.
jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))

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
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
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
  act(() => {
    root
      .findAll((n) => n.props.testID === "pager-strip")[0]
      .props.onLayout({ nativeEvent: { layout: { width: 300, height: 46, x: 0, y: 0 } } })
  })
  const texts = () =>
    root.findAll((n) => (n.type as unknown) === "Text").map((n) => String(n.props.children))
  return {
    tree: tree!,
    onFinish,
    onActiveFactorChange,
    texts,
    byTestID: (id: string) => root.findAll((n) => n.props.testID === id)[0],
    maybeByTestID: (id: string) => root.findAll((n) => n.props.testID === id)[0],
  }
}

// The strip is 300 wide in these tests: ten letters of 30 each, A at 0-30, B at 30-60, ...
const touch = (x: number) => ({ nativeEvent: { locationX: x } })
const selectedText = (strip: { props: Record<string, unknown> }) =>
  (strip.props.accessibilityValue as { text: string }).text
const valueOf = (factor: FactorKey) =>
  fr.factorPager.indexValue({ factor, title: FACTOR_TITLES[factor] })

describe("FactorPager (FLOW-04, OA-30, OA-111)", () => {
  beforeEach(() => {
    jest.mocked(feedback.selection).mockClear()
  })

  test("starts on the initial factor: its name in the header, the strip says so", () => {
    const { byTestID, texts, onActiveFactorChange } = render("D")
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("D"))
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
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("B"))
    expect(onActiveFactorChange).toHaveBeenLastCalledWith("B")
    expect(texts()).toContain(FACTOR_TITLES.B)
  })

  test("on the last factor the button finishes", () => {
    const { byTestID, onFinish } = render("J")
    expect(byTestID("pager-next").props.accessibilityLabel).toBe(fr.factorPager.finish)
    act(() => {
      byTestID("pager-next").props.onPress()
    })
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  test("a touch on a letter goes to that factor, forward or back", () => {
    const { byTestID } = render("C")
    const strip = byTestID("pager-strip")
    act(() => {
      strip.props.onResponderGrant(touch(45))
    })
    act(() => {
      strip.props.onResponderRelease()
    })
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("B"))
    act(() => {
      strip.props.onResponderGrant(touch(165))
    })
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("F"))
  })

  test("sliding along the strip follows the finger: a bubble names the factor, a tick per factor crossed", () => {
    const { byTestID, maybeByTestID, texts } = render("A")
    const strip = byTestID("pager-strip")
    expect(maybeByTestID("pager-bubble")).toBeUndefined()

    act(() => {
      strip.props.onResponderGrant(touch(15))
    })
    expect(jest.mocked(feedback.selection)).not.toHaveBeenCalled()
    expect(maybeByTestID("pager-bubble")).toBeDefined()

    act(() => {
      strip.props.onResponderMove(touch(100))
    })
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("D"))
    expect(texts()).toContain("D")
    expect(texts()).toContain(FACTOR_TITLES.D)
    expect(jest.mocked(feedback.selection)).toHaveBeenCalledTimes(1)

    // Still on D: no new tick.
    act(() => {
      strip.props.onResponderMove(touch(110))
    })
    expect(jest.mocked(feedback.selection)).toHaveBeenCalledTimes(1)

    // Past the right end: the last letter.
    act(() => {
      strip.props.onResponderMove(touch(999))
    })
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("J"))
    expect(jest.mocked(feedback.selection)).toHaveBeenCalledTimes(2)

    act(() => {
      strip.props.onResponderRelease()
    })
    expect(maybeByTestID("pager-bubble")).toBeUndefined()
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("J"))
  })

  test("a cancelled touch hides the bubble and keeps the factor reached", () => {
    const { byTestID, maybeByTestID } = render("A")
    const strip = byTestID("pager-strip")
    act(() => {
      strip.props.onResponderGrant(touch(75))
    })
    act(() => {
      strip.props.onResponderTerminate()
    })
    expect(maybeByTestID("pager-bubble")).toBeUndefined()
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("C"))
  })

  test("the bubble sits over the letter and stays inside the strip's width", () => {
    const { byTestID } = render("A")
    const strip = byTestID("pager-strip")
    const leftOf = () => {
      const style = byTestID("pager-bubble").props.style as Array<{ left?: number }>
      return style[style.length - 1].left
    }
    act(() => {
      strip.props.onResponderGrant(touch(5))
    })
    expect(leftOf()).toBe(0)
    act(() => {
      strip.props.onResponderMove(touch(150))
    })
    // Letter F: centre at 8 + 5.5 * 30 = 173, bubble 200 wide.
    expect(leftOf()).toBe(73)
    act(() => {
      strip.props.onResponderMove(touch(295))
    })
    // Strip 300 + 2 * 8 padding - 200.
    expect(leftOf()).toBe(116)
  })

  test("VoiceOver adjusts the strip: increment and decrement move one factor", () => {
    const { byTestID } = render("C")
    const strip = byTestID("pager-strip")
    expect(strip.props.accessibilityRole).toBe("adjustable")
    expect(strip.props.accessibilityLabel).toBe(fr.factorPager.indexLabel)
    act(() => {
      strip.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } })
    })
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("D"))
    act(() => {
      strip.props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } })
    })
    act(() => {
      strip.props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } })
    })
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("B"))
  })

  test("the pager scroll settling on a page selects that factor", () => {
    const { byTestID } = render("A")
    act(() => {
      byTestID("factor-pager-scroll").props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 600, y: 0 } },
      })
    })
    expect(selectedText(byTestID("pager-strip"))).toBe(valueOf("C"))
  })

  test("a complete factor, an invalid one and an empty one have their own letter look", () => {
    const { tree } = render("A", {
      B: [field({ value: "1" })],
      C: [field({ error: "bad", touched: true })],
    })
    const dotsOf = (id: string) =>
      tree.root
        .findAll((n) => n.props.testID === id)[0]
        .findAll((n) => (n.type as unknown) === "View" && n.props.style !== undefined).length - 1
    const textStyleOf = (id: string) =>
      JSON.stringify(
        tree.root
          .findAll((n) => n.props.testID === id)[0]
          .findAll((n) => (n.type as unknown) === "Text")[0].props.style,
      )
    // Complete and invalid letters carry a dot, an empty one does not.
    expect(dotsOf("pager-letter-B")).toBe(1)
    expect(dotsOf("pager-letter-C")).toBe(1)
    expect(dotsOf("pager-letter-D")).toBe(0)
    expect(textStyleOf("pager-letter-B")).not.toEqual(textStyleOf("pager-letter-D"))
    expect(textStyleOf("pager-letter-C")).not.toEqual(textStyleOf("pager-letter-D"))
    expect(textStyleOf("pager-letter-B")).not.toEqual(textStyleOf("pager-letter-C"))
  })

  test("the current letter has the filled pill", () => {
    const { tree } = render("E")
    const viewsIn = (id: string) =>
      tree.root
        .findAll((n) => n.props.testID === id)[0]
        .findAll((n) => (n.type as unknown) === "View").length - 1
    expect(viewsIn("pager-letter-E")).toBe(1)
    expect(viewsIn("pager-letter-D")).toBe(0)
  })
})
