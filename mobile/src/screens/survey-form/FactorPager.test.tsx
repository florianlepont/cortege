import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorField, FactorKey } from "../../app/types"
import type { FactorAnnotationDraft } from "../../hooks/useFactorAnnotations"
import { FACTOR_TITLES } from "../../app/constants"
import { fr } from "../../i18n"
import { defaultTheme } from "../../app/theme"
import { allowedScoresFor } from "@cortege/ibp-domain"
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

// Phase 27: the keyboard the pager listens to (listeners by event name) and the dismiss it calls.
const mockKeyboard = {
  listeners: {} as Record<string, (() => void) | undefined>,
  dismiss: jest.fn(),
}

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
    FlatList: mockComponent("FlatList"),
    Keyboard: {
      addListener: (event: string, listener: () => void) => {
        mockKeyboard.listeners[event] = listener
        return { remove: () => undefined }
      },
      dismiss: () => mockKeyboard.dismiss(),
    },
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

// The probe keeps the page's scroll lock, the way a percent track under the page would call it.
const mockScrollLock: { current: ((locked: boolean) => void) | null } = { current: null }

jest.mock("../FactorDetailScreen", () => {
  const ReactRef = require("react") as typeof import("react")
  const { useScrollLock } =
    require("../../ui/ScrollLockContext") as typeof import("../../ui/ScrollLockContext")
  return {
    FactorDetailScreen: (props: Record<string, unknown>) => {
      mockScrollLock.current = useScrollLock()
      return ReactRef.createElement("FactorDetailScreenProbe", props)
    },
  }
})

const visual = defaultTheme.visual

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
  factorAnnotations: FactorAnnotationDraft = {},
  extraProps: Partial<React.ComponentProps<typeof FactorPager>> = {},
) {
  const onFinish = jest.fn()
  const onActiveFactorChange = jest.fn()
  const onChangeDoubt = jest.fn()
  const onChangeNote = jest.fn()
  const onCommitNote = jest.fn()
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
        onOpenHelp={jest.fn()}
        onOpenDmhGuide={jest.fn()}
        finishAction={finishAction}
        factorAnnotations={factorAnnotations}
        onChangeDoubt={onChangeDoubt}
        onChangeNote={onChangeNote}
        onCommitNote={onCommitNote}
        {...extraProps}
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
    onChangeDoubt,
    onChangeNote,
    onCommitNote,
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

  test("the F page header reads DMH but speaks the full title; the other factors keep theirs", () => {
    const { tree, texts } = render("F")
    const headers = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header",
    )
    expect(headers).toHaveLength(1)
    expect(headers[0].props.children).toBe("DMH")
    expect(headers[0].props.accessibilityLabel).toBe(FACTOR_TITLES.F)
    expect(fr.factorPager.pageTitles.F).toBe("DMH")
    expect(texts()).not.toContain(FACTOR_TITLES.F)
    for (const factor of ["A", "B", "C", "D", "E", "G", "H", "I", "J"] as const) {
      expect(fr.factorPager.pageTitles[factor]).toBe(FACTOR_TITLES[factor])
    }
  })

  test("the header shows the running total out of 50", () => {
    const { byTestID, texts } = render("A")
    expect(texts()).toContain(fr.factorPager.total(0))
    expect(byTestID("pager-total").props.accessibilityLabel).toBe(fr.factorPager.totalA11y(0))
  })

  describe("the active factor's score and the total, one capsule (follow-up 32-26, variant B)", () => {
    const retained = (overrides: Partial<Record<FactorKey, { score: number }>>) =>
      FACTORS.reduce(
        (acc, factor) => ({
          ...acc,
          [factor]: overrides[factor] ? { ...overrides[factor], selected_class: "S0" } : null,
        }),
        {} as Record<FactorKey, never>,
      )
    const withScores = (initial: FactorKey) =>
      render(
        initial,
        {},
        null,
        {},
        {
          factorRetainedScores: retained({ A: { score: 2 }, F: { score: 5 }, J: { score: 0 } }),
        },
      )

    test("a scored factor shows 'score / max' on forest and the total on a card, for A to J alike", () => {
      const { byTestID, texts } = withScores("F")
      expect(texts()).toContain("5 / 5")
      expect(texts()).toContain(fr.factorPager.factorCaption)
      expect(texts()).toContain(fr.factorPager.totalCaption)
      // One element for a screen reader: the factor's score, then the survey total (2 + 5 + 0 = 7).
      const group = byTestID("pager-score-group")
      expect(group.props.accessible).toBe(true)
      expect(group.props.accessibilityLabel).toBe(
        "Score du facteur 5 sur 5, total du relevé 7 sur 50",
      )
      expect(byTestID("pager-total").props.accessible).toBe(false)
      expect(byTestID("pager-total").props.accessibilityLabel).toBe(fr.factorPager.totalA11y(7))
      for (const id of ["pager-factor-score", "pager-total"]) {
        const figure = byTestID(id).findAll((n) => (n.type as unknown) === "Text")[0]
        expect(flat(figure.props.style).fontVariant).toEqual(["tabular-nums"])
      }
    })

    test("the halves: forest for the factor, the glass card for the total, one clipped capsule of 40 pt", () => {
      const { byTestID } = withScores("F")
      const capsule = flat(byTestID("pager-score-group").props.style)
      expect(capsule.flexDirection).toBe("row")
      expect(capsule.height).toBe(TOTAL_CHIP_HEIGHT)
      expect(capsule.borderRadius).toBe(999)
      expect(capsule.overflow).toBe("hidden")
      expect(capsule.gap).toBeUndefined()
      const factor = flat(byTestID("pager-factor-score").props.style)
      expect(factor.backgroundColor).toBe(visual.forest.fallback)
      expect(factor.experimental_backgroundImage).toBe(visual.forest.image)
      // A gradient view carries no border (12.2-17) and no radius of its own: the capsule clips it.
      for (const key of Object.keys(factor)) expect(key).not.toMatch(/^border.*Width$/)
      expect(factor.borderRadius).toBeUndefined()
      const total = flat(byTestID("pager-total").props.style)
      expect(total.backgroundColor).toBe(visual.glass.cardFill)
      expect(total.height).toBe(TOTAL_CHIP_HEIGHT)
      expect(total.borderRadius).toBeUndefined()
      const factorText = byTestID("pager-factor-score").findAll(
        (n) => (n.type as unknown) === "Text",
      )
      expect(flat(factorText[0].props.style).color).toBe(visual.forest.title)
    })

    test("the maximum is the package's highest allowed score of the factor, never a literal", () => {
      const { texts } = render(
        "G",
        {},
        null,
        {},
        {
          factorRetainedScores: retained({ G: { score: 2 } }),
        },
      )
      expect(texts()).toContain("2 / 5")
      expect(Math.max(...allowedScoresFor("G"))).toBe(5)
    })

    test("a score of 0 shows too, and the capsule follows the page", () => {
      expect(withScores("J").texts()).toContain("0 / 5")
      const other = withScores("A")
      expect(other.texts()).toContain("2 / 5")
      for (let step = 0; step < 5; step += 1) {
        act(() => other.byTestID("pager-next").props.onPress())
      }
      expect(other.texts()).toContain("5 / 5")
      expect(other.byTestID("pager-score-group").props.accessibilityLabel).toBe(
        "Score du facteur 5 sur 5, total du relevé 7 sur 50",
      )
    })

    test("a factor without a score shows only the total, and the word 'classe' appears nowhere", () => {
      const { byTestID, texts } = withScores("B")
      expect(texts().some((text) => /classe/i.test(text))).toBe(false)
      expect(byTestID("pager-factor-score")).toBeUndefined()
      expect(byTestID("pager-score-group").props.accessible).toBeUndefined()
      expect(byTestID("pager-total").props.accessible).toBe(true)
      expect(byTestID("pager-total").props.accessibilityLabel).toBe(fr.factorPager.totalA11y(7))
    })

    test("the page gets the score for the toast logic only; it draws none itself", () => {
      const { tree } = withScores("F")
      const probe = tree.root.find((n) => (n.type as unknown) === "FactorDetailScreenProbe")
      expect(probe.props.retainedScore).toEqual({ score: 5, selected_class: "S0" })
    })
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

  test("a percent track being dragged holds the pager scroll and the page scroll (follow-up 32-33)", () => {
    const { tree, byTestID } = render("A")
    const scrolls = () =>
      tree.root.findAll(
        (n) =>
          (n.type as unknown) === "ScrollView" &&
          (n.props.testID === "factor-pager-scroll" ||
            n.findAll((c) => (c.type as unknown) === "FactorDetailScreenProbe").length > 0),
      )
    // The pager's own scroll and the active page's vertical scroll.
    expect(scrolls().filter((n) => n.props.scrollEnabled === true)).toHaveLength(2)
    act(() => mockScrollLock.current?.(true))
    expect(byTestID("factor-pager-scroll").props.scrollEnabled).toBe(false)
    expect(scrolls().filter((n) => n.props.scrollEnabled === false)).toHaveLength(2)
    act(() => mockScrollLock.current?.(false))
    expect(scrolls().filter((n) => n.props.scrollEnabled === true)).toHaveLength(2)
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

  test("the total half without a factor score is the card half alone: glass fill, dark ink, 40 pt", () => {
    const { byTestID } = render("A")
    const chip = byTestID("pager-total")
    const style = flat(chip.props.style)
    expect(style.backgroundColor).toBe(visual.glass.cardFill)
    expect(style.height).toBe(TOTAL_CHIP_HEIGHT)
    expect(TOTAL_CHIP_HEIGHT).toBe(40)
    const text = chip.findAll((n) => (n.type as unknown) === "Text")[0]
    expect(flat(text.props.style).color).toBe(defaultTheme.colors.textPrimary)
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

  test("the title takes the screen title role without growing the 40 pt title row", () => {
    const { tree } = render("A")
    const title = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === FACTOR_TITLES.A,
    )[0]
    const style = flat(title.props.style)
    expect(style.fontFamily).toBe("Sora-SemiBold")
    expect(style.lineHeight as number).toBeLessThanOrEqual(TOTAL_CHIP_HEIGHT)
    // The row is as tall as its tallest child: the score capsule.
    expect(Math.max(style.lineHeight as number, TOTAL_CHIP_HEIGHT)).toBe(40)
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
    expect(icon.props.name).toBe("checkmark-outline")
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
    expect(icon.props.name).toBe("close-outline")
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

describe("FactorPager keyboard and notes (phase 27, UI-SPEC 2.4, U-07)", () => {
  beforeEach(() => {
    mockKeyboard.dismiss.mockClear()
    mockKeyboard.listeners = {}
  })

  const action = (): PagerFinishAction => ({
    label: fr.surveyDetail.cta.finish,
    accessibilityLabel: fr.surveyDetail.a11y.finishSurvey("Lisière"),
    loading: false,
    onPress: jest.fn(),
    notice: null,
  })
  const showKeyboard = () => act(() => mockKeyboard.listeners.keyboardWillShow?.())
  const hideKeyboard = () => act(() => mockKeyboard.listeners.keyboardWillHide?.())
  const barOf = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAll(
      (n) =>
        (n.type as unknown) === "View" &&
        n.props.testID === undefined &&
        n.findAll((c) => c.props.testID === "pager-next").length > 0 &&
        flat(n.props.style).position === "absolute",
    )[0]
  const pages = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAll(
      (n) => (n.type as unknown) === "ScrollView" && n.props.contentContainerStyle !== undefined,
    )
  const probe = (tree: renderer.ReactTestRenderer) =>
    tree.root.findByType("FactorDetailScreenProbe" as unknown as React.ElementType)

  test("with the keyboard up the bar and the pill row are transparent and take no touches", () => {
    const { tree, byTestID } = render("J", {}, action())
    expect(flat(barOf(tree).props.style).opacity).toBe(1)
    expect(barOf(tree).props.pointerEvents).toBe("box-none")
    expect(flat(byTestID("pager-finish-row").props.style).opacity).toBe(1)
    const barFrame = { ...flat(barOf(tree).props.style) }
    delete barFrame.opacity

    showKeyboard()
    expect(flat(barOf(tree).props.style).opacity).toBe(0)
    expect(barOf(tree).props.pointerEvents).toBe("none")
    expect(byTestID("pager-finish-row").props.pointerEvents).toBe("none")
    expect(flat(byTestID("pager-finish-row").props.style).opacity).toBe(0)
    // Same frame: only the opacity changes, nothing re-lays out.
    const hiddenFrame = { ...flat(barOf(tree).props.style) }
    delete hiddenFrame.opacity
    expect(hiddenFrame).toEqual(barFrame)

    hideKeyboard()
    expect(flat(barOf(tree).props.style).opacity).toBe(1)
    expect(barOf(tree).props.pointerEvents).toBe("box-none")
    expect(byTestID("pager-finish-row").props.pointerEvents).toBe("box-none")
  })

  test("the page bottom padding drops to 16 while the keyboard is up and comes back", () => {
    const { tree } = render("J", {}, action())
    const bottom = () => flat(pages(tree)[0].props.contentContainerStyle).paddingBottom
    expect(bottom()).toBe(208)
    showKeyboard()
    expect(bottom()).toBe(16)
    hideKeyboard()
    expect(bottom()).toBe(208)
  })

  test("a letter tap, the next button and a swipe that changes the page dismiss the keyboard", () => {
    const { byTestID } = render("C")
    act(() => {
      byTestID("pager-strip").props.onResponderGrant(touch(165))
    })
    expect(mockKeyboard.dismiss).toHaveBeenCalled()
    mockKeyboard.dismiss.mockClear()
    act(() => {
      byTestID("pager-next").props.onPress()
    })
    expect(mockKeyboard.dismiss).toHaveBeenCalledTimes(1)
    mockKeyboard.dismiss.mockClear()
    // Swipe end on another page than the one shown.
    act(() => {
      byTestID("factor-pager-scroll").props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 900, y: 0 } },
      })
    })
    expect(mockKeyboard.dismiss).toHaveBeenCalledTimes(1)
  })

  test("a swipe that settles on the same page leaves the keyboard alone", () => {
    const { byTestID } = render("D")
    act(() => {
      byTestID("factor-pager-scroll").props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 900, y: 0 } },
      })
    })
    expect(mockKeyboard.dismiss).not.toHaveBeenCalled()
  })

  test("each page scroll view keeps taps, dismisses the keyboard on drag and adjusts its insets", () => {
    const { tree } = render("A")
    const all = pages(tree)
    expect(all).toHaveLength(10)
    for (const page of all) {
      expect(page.props.keyboardShouldPersistTaps).toBe("handled")
      expect(page.props.keyboardDismissMode).toBe("on-drag")
      expect(page.props.automaticallyAdjustKeyboardInsets).toBe(true)
    }
  })

  test("the active page gets its doubt, its note and the three callbacks", () => {
    const { tree, onChangeDoubt, onChangeNote, onCommitNote } = render("C", {}, null, {
      C: { doubt: true, note: "Vu en mai" },
      D: { doubt: false, note: "Autre" },
    })
    const active = probe(tree)
    expect(active.props.factor).toBe("C")
    expect(active.props.doubt).toBe(true)
    expect(active.props.note).toBe("Vu en mai")
    active.props.onChangeDoubt(false)
    expect(onChangeDoubt).toHaveBeenCalledWith("C", false)
    active.props.onChangeNote("Texte")
    expect(onChangeNote).toHaveBeenCalledWith("C", "Texte")
    active.props.onCommitNote()
    expect(onCommitNote).toHaveBeenCalledTimes(1)
  })

  test("a factor with no annotation reads as no doubt and no note; one page mounts", () => {
    const { tree } = render("A")
    const active = probe(tree)
    expect(active.props.doubt).toBe(false)
    expect(active.props.note).toBe("")
    expect(
      tree.root.findAll((n) => (n.type as unknown) === "FactorDetailScreenProbe"),
    ).toHaveLength(1)
  })
})

describe("FactorPager counting mode (Phase 30, D-07)", () => {
  test("the badge shows under the title row on a factor counted in full, and only there", () => {
    const { maybeByTestID, byTestID } = render("B", {}, null, {}, { uncappedFactors: ["B", "F"] })
    expect(maybeByTestID("counting-chip")).toBeDefined()
    act(() => {
      byTestID("pager-next").props.onPress()
    })
    // C is capped: the badge is gone.
    expect(maybeByTestID("counting-chip")).toBeUndefined()
  })

  test("a capped route or no route draws nothing new", () => {
    expect(render("B").maybeByTestID("counting-chip")).toBeUndefined()
    expect(render("B", {}, null, {}, { uncappedFactors: [] }).maybeByTestID("counting-chip")).toBe(
      undefined,
    )
  })

  test("the page receives the factors counted in full and the zone", () => {
    const { tree } = render("C", {}, null, {}, { uncappedFactors: ["C"], zoneSurfaceHa: 1.2 })
    const probe = tree.root.findAll((n) => (n.type as unknown) === "FactorDetailScreenProbe")[0]
    expect(probe.props.uncappedFactors).toEqual(["C"])
    expect(probe.props.zoneSurfaceHa).toBe(1.2)
  })

  test("the page receives the detail inputs of B and F as one object (plan 30-19)", () => {
    const uncappedEntry = {
      state: { strataCoverText: {}, dmhCounts: {}, fSurfaceText: "", openAreasHa: [] },
      setStratumCover: jest.fn(),
      setDmhCount: jest.fn(),
      bumpDmhGroup: jest.fn(),
      markNoDmhGroup: jest.fn(),
      setFSurface: jest.fn(),
      addOpenArea: jest.fn(),
      setOpenArea: jest.fn(),
      removeOpenArea: jest.fn(),
      markNoOpenArea: jest.fn(),
    }
    const { tree } = render("B", {}, null, {}, { uncappedFactors: ["B"], uncappedEntry })
    const probe = tree.root.findAll((n) => (n.type as unknown) === "FactorDetailScreenProbe")[0]
    expect(probe.props.uncappedEntry).toBe(uncappedEntry)
  })

  test("the page receives the survey's cas for the hero card of A (follow-up 32-29), none by default", () => {
    const withCas = render("A", {}, null, {}, { ibpCas: 2 })
    expect(
      withCas.tree.root.findAll((n) => (n.type as unknown) === "FactorDetailScreenProbe")[0].props
        .ibpCas,
    ).toBe(2)
    const without = render("A")
    expect(
      without.tree.root.findAll((n) => (n.type as unknown) === "FactorDetailScreenProbe")[0].props
        .ibpCas,
    ).toBeNull()
  })

  test("the page receives the guide opener (Phase 32, D-04)", () => {
    const onOpenDmhGuide = jest.fn()
    const { tree } = render("F", {}, null, {}, { onOpenDmhGuide })
    const probe = tree.root.findAll((n) => (n.type as unknown) === "FactorDetailScreenProbe")[0]
    expect(probe.props.onOpenDmhGuide).toBe(onOpenDmhGuide)
  })

  test("the badge reads 'Relevé déplafonné'", () => {
    const { texts } = render("B", {}, null, {}, { uncappedFactors: ["B"] })
    expect(texts()).toContain("Relevé déplafonné")
  })
})
