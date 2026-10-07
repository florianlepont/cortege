import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorField, FactorKey } from "../../app/types"
import { FACTOR_TITLES } from "../../app/constants"
import { fr } from "../../i18n"
import { defaultTheme } from "../../app/theme"
import { feedback } from "../../ui/feedback"
import {
  BAR_HEIGHT,
  FactorPager,
  FINISH_ROW_MIN_HEIGHT,
  type PagerFinishAction,
  TOTAL_CHIP_HEIGHT,
} from "./FactorPager"
import { PILL_SIZE, STRIP_HEIGHT } from "./FactorLetterStrip"

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

jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", null, children),
  }
})

// D-26: the pill is the shared GlassButton (its native and fallback looks have their own tests).
jest.mock("../../ui/GlassButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassButton: (props: Record<string, unknown>) => ReactRef.createElement("GlassButton", props),
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
  finishAction: PagerFinishAction | null = null,
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
        finishAction={finishAction}
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

type Style = Record<string, unknown>
const flat = (style: unknown): Style =>
  Array.isArray(style)
    ? style.reduce<Style>((acc, part) => ({ ...acc, ...flat(part) }), {})
    : ((style ?? {}) as Style)

describe("FactorPager variant I tokens, sizes unchanged (12.2-15, D-05)", () => {
  const visual = defaultTheme.visual

  test("field sizes keep their values: strip 46, letter pill 30, bar and round button 46", () => {
    expect(STRIP_HEIGHT).toBe(46)
    expect(PILL_SIZE).toBe(30)
    expect(BAR_HEIGHT).toBe(46)
    const { byTestID } = render("A")
    const next = flat(byTestID("pager-next").props.style)
    expect(next.width).toBe(46)
    expect(next.height).toBe(46)
    expect(next.borderRadius).toBe(23)
  })

  test("the total is a small forest pill: gradient, fallback, white figures, no shadow", () => {
    const { byTestID } = render("A")
    const chip = byTestID("pager-total")
    const style = flat(chip.props.style)
    expect(style.backgroundColor).toBe(visual.forest.fallback)
    expect(style.experimental_backgroundImage).toBe(visual.forest.image)
    expect(style.boxShadow).toBeUndefined()
    expect(style.shadowOpacity).toBeUndefined()
    expect(style.height).toBe(TOTAL_CHIP_HEIGHT)
    expect(TOTAL_CHIP_HEIGHT).toBe(36)
    expect(style.borderRadius).toBe(999)
    const text = chip.findAll((n) => (n.type as unknown) === "Text")[0]
    expect(flat(text.props.style).color).toBe(visual.forest.title)
    expect(chip.props.accessibilityLabel).toBe(fr.factorPager.totalA11y(0))
  })

  test("the pager header starts 8 pt under the route's ScreenFrame inset, no header height of its own (D-19)", () => {
    const { tree } = render("A")
    const header = tree.root.findAll(
      (n) =>
        (n.type as unknown) === "View" &&
        n.findAll((c) => c.props.testID === "pager-total").length > 0 &&
        flat(n.props.style).paddingHorizontal === 16,
    )[0]
    expect(flat(header.props.style).paddingTop).toBe(8)
  })

  test("the title takes the screen title role without growing the 36 pt title row", () => {
    const { tree } = render("A")
    const title = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === FACTOR_TITLES.A,
    )[0]
    const style = flat(title.props.style)
    expect(style.fontFamily).toBe("Sora-SemiBold")
    expect(style.lineHeight as number).toBeLessThanOrEqual(TOTAL_CHIP_HEIGHT)
    // The row is as tall as its tallest child: the total pill, as before.
    expect(Math.max(style.lineHeight as number, TOTAL_CHIP_HEIGHT)).toBe(36)
  })

  test("the current letter is the inverted neutral pill; complete and error dots use the tokens", () => {
    const { tree } = render("A", {
      B: [field({ value: "1" })],
      C: [field({ error: "bad", touched: true })],
    })
    const letter = (factor: FactorKey) =>
      tree.root.findAll((n) => n.props.testID === `pager-letter-${factor}`)[0]
    const innerViews = (factor: FactorKey) =>
      letter(factor).findAll((n) => (n.type as unknown) === "View" && n.props.testID === undefined)
    const pill = flat(innerViews("A")[0].props.style)
    expect(pill.backgroundColor).toBe(visual.chip.activeBg)
    expect(pill.width).toBe(PILL_SIZE)
    const activeText = letter("A").findAll((n) => (n.type as unknown) === "Text")[0]
    expect(flat(activeText.props.style).color).toBe(visual.chip.activeText)
    expect(flat(innerViews("B")[0].props.style).backgroundColor).toBe(visual.score.high)
    expect(flat(innerViews("C")[0].props.style).backgroundColor).toBe(defaultTheme.onSurface.danger)
    const emptyText = letter("D").findAll((n) => (n.type as unknown) === "Text")[0]
    expect(flat(emptyText.props.style).color).toBe(defaultTheme.colors.textSecondary)
  })
})

describe("FactorPager D-26: Terminer le relevé on the last factor", () => {
  const action = (overrides: Partial<PagerFinishAction> = {}): PagerFinishAction => ({
    label: fr.surveyDetail.cta.finish,
    accessibilityLabel: fr.surveyDetail.a11y.finishSurvey("Lisière"),
    loading: false,
    onPress: jest.fn(),
    notice: null,
    ...overrides,
  })
  const glassButtons = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAll((n) => (n.type as unknown) === "GlassButton")
  const pageContent = (tree: renderer.ReactTestRenderer) =>
    flat(
      tree.root.findAll(
        (n) =>
          (n.type as unknown) === "ScrollView" &&
          n.props.contentContainerStyle !== undefined &&
          n.findAll((c) => (c.type as unknown) === "FactorDetailScreenProbe").length > 0,
      )[0].props.contentContainerStyle,
    )

  test("without a finish (not complete or not named) the last button stays the plain Terminer", () => {
    const { tree, byTestID, maybeByTestID, onFinish } = render("J")
    expect(glassButtons(tree)).toHaveLength(0)
    expect(maybeByTestID("pager-finish-row")).toBeUndefined()
    expect(byTestID("pager-next").props.accessibilityLabel).toBe(fr.factorPager.finish)
    const icon = byTestID("pager-next").findAll((n) => (n.type as unknown) === "Ionicons")[0]
    expect(icon.props.name).toBe("checkmark")
    act(() => {
      byTestID("pager-next").props.onPress()
    })
    expect(onFinish).toHaveBeenCalledTimes(1)
    // tab bar 68 + bar 46 + 2 x 16.
    expect(pageContent(tree).paddingBottom).toBe(146)
  })

  test("the pill is offered on the last factor only", () => {
    const { tree, byTestID } = render("I", {}, action())
    expect(glassButtons(tree)).toHaveLength(0)
    expect(byTestID("pager-next").props.accessibilityLabel).toBe(fr.factorPager.next)
    act(() => {
      byTestID("pager-next").props.onPress()
    })
    expect(glassButtons(tree)).toHaveLength(1)
  })

  test("on the last factor: a labelled 50 pt glass pill that calls the finish once", () => {
    const onPress = jest.fn()
    const { tree } = render("J", {}, action({ onPress }))
    const [pill] = glassButtons(tree)
    expect(pill.props.label).toBe("Terminer le relevé")
    expect(pill.props.label).not.toContain("\u2014")
    expect(pill.props.accessibilityLabel).toBe(fr.surveyDetail.a11y.finishSurvey("Lisière"))
    expect(pill.props.size).toBe("lg")
    expect(pill.props.loading).toBe(false)
    expect(pill.props.testID).toBe("pager-finish-survey")
    expect(FINISH_ROW_MIN_HEIGHT).toBeGreaterThanOrEqual(50)
    act(() => {
      pill.props.onPress()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("the pill row floats above the bar with no fill and moves or shrinks no control", () => {
    const plain = render("J")
    const withPill = render("J", {}, action())
    const row = withPill.byTestID("pager-finish-row")
    expect(row.props.pointerEvents).toBe("box-none")
    const rowStyle = flat(row.props.style)
    expect(rowStyle.position).toBe("absolute")
    expect(rowStyle.backgroundColor).toBeUndefined()
    expect(rowStyle.experimental_backgroundImage).toBeUndefined()
    // Tab bar 68 + 8 under the bar, the 46 pt bar, 12 above it.
    expect(rowStyle.bottom).toBe(134)
    // The round button and the strip keep their sizes and place.
    expect(flat(withPill.byTestID("pager-next").props.style)).toEqual(
      flat(plain.byTestID("pager-next").props.style),
    )
    const barOf = (r: ReturnType<typeof render>) =>
      r.tree.root.findAll(
        (n) =>
          (n.type as unknown) === "View" &&
          n.props.pointerEvents === "box-none" &&
          n.props.testID === undefined,
      )[0]
    expect(flat(barOf(withPill).props.style)).toEqual(flat(barOf(plain).props.style))
  })

  test("beside the pill the round button only goes back to the summary", () => {
    const onPress = jest.fn()
    const { byTestID, onFinish } = render("J", {}, action({ onPress }))
    expect(byTestID("pager-next").props.accessibilityLabel).toBe(fr.factorPager.close)
    const icon = byTestID("pager-next").findAll((n) => (n.type as unknown) === "Ionicons")[0]
    expect(icon.props.name).toBe("close")
    act(() => {
      byTestID("pager-next").props.onPress()
    })
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()
  })

  test("the page ends above the pill row, measured, at least 50 pt", () => {
    const { tree, byTestID } = render("J", {}, action())
    // 146 + 50 + 12.
    expect(pageContent(tree).paddingBottom).toBe(208)
    act(() => {
      byTestID("pager-finish-row").props.onLayout({
        nativeEvent: { layout: { width: 300, height: 120, x: 0, y: 0 } },
      })
    })
    expect(pageContent(tree).paddingBottom).toBe(278)
    act(() => {
      byTestID("pager-finish-row").props.onLayout({
        nativeEvent: { layout: { width: 300, height: 10, x: 0, y: 0 } },
      })
    })
    expect(pageContent(tree).paddingBottom).toBe(208)
  })

  test("loading and the notice pass through", () => {
    const { tree, byTestID } = render(
      "J",
      {},
      action({ loading: true, notice: React.createElement("NoticeProbe") }),
    )
    expect(glassButtons(tree)[0].props.loading).toBe(true)
    const row = byTestID("pager-finish-row")
    expect(row.findAll((n) => (n.type as unknown) === "NoticeProbe")).toHaveLength(1)
  })
})
