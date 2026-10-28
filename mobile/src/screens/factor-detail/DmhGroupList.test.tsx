import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { selectionLabel } from "../../app/factor-selections"
import { DmhGroupList, type DmhListCounting } from "./DmhGroupList"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    AccessibilityInfo: { announceForAccessibility: jest.fn() },
    StyleSheet: { create: <T,>(styles: T) => styles, flatten: (style: unknown) => style },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))
jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", props, children),
  }
})

const t = fr.factorDetail.dmhList
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

type Props = React.ComponentProps<typeof DmhGroupList>
type Node = renderer.ReactTestInstance

function mount(props: Partial<Props> = {}) {
  const onChangeSelection = jest.fn()
  const onOpenDmhGuide = jest.fn()
  const element = (next: Partial<Props>) => (
    <DmhGroupList
      methodVersion={IBP_METHOD_V3_2}
      treesPerHaText=""
      selected={null}
      onChangeSelection={onChangeSelection}
      onOpenDmhGuide={onOpenDmhGuide}
      {...props}
      {...next}
    />
  )
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element({}))
  })
  const all = (id: string): Node[] =>
    tree.root.findAll((n) => n.props.testID === id && typeof n.type === "string")
  const one = (id: string): Node => all(id)[0]
  const press = (id: string): void => {
    act(() => {
      one(id).props.onPress()
    })
  }
  const open = (form: string): void => {
    press(`dmh-section-${form}`)
  }
  const sectionIds = (): string[] =>
    tree.root
      .findAll(
        (n) =>
          typeof n.type === "string" &&
          typeof n.props.testID === "string" &&
          n.props.testID.startsWith("dmh-section-"),
      )
      .map((n) => n.props.testID as string)
  const textOf = (node: Node): string =>
    node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")
  return {
    tree,
    onChangeSelection,
    onOpenDmhGuide,
    all,
    one,
    press,
    open,
    sectionIds,
    textOf,
    update: (next: Partial<Props>) => act(() => tree.update(element(next))),
  }
}

function counting(counts: DmhListCounting["counts"] = {}) {
  return {
    counts,
    onBump: jest.fn(),
    onSetCount: jest.fn(),
    onMarkNone: jest.fn(),
  } satisfies DmhListCounting
}

const FORM_ORDER = [
  "cavities",
  "wounds",
  "crown_deadwood",
  "growths",
  "fruiting_bodies",
  "epiphytic",
  "exudates",
].map((form) => `dmh-section-${form}`)

describe("DmhGroupList, structure", () => {
  test("nothing ticked: seven sections in form order, all closed, summary says none", () => {
    const { sectionIds, one, textOf, all } = mount()
    expect(sectionIds()).toEqual(FORM_ORDER)
    for (const id of FORM_ORDER)
      expect(one(id).props.accessibilityState).toEqual({ expanded: false })
    expect(textOf(one("dmh-summary"))).toBe(t.summaryNone)
    expect(all("dmh-row-dmh_01")).toHaveLength(0)
    expect(all("dmh-row-dmh_15")).toHaveLength(0)
  })

  test("a section opens on a press of its header and closes on the next", () => {
    const { open, one, all } = mount()
    open("cavities")
    expect(one("dmh-section-cavities").props.accessibilityState).toEqual({ expanded: true })
    expect(all("dmh-row-dmh_01")).toHaveLength(1)
    expect(all("dmh-row-dmh_15")).toHaveLength(0)
    open("cavities")
    expect(one("dmh-section-cavities").props.accessibilityState).toEqual({ expanded: false })
  })

  test("ticking never opens or closes a section after mount", () => {
    const { update, one } = mount({ selected: [] })
    update({ selected: ["dmh_12"] })
    expect(one("dmh-section-epiphytic").props.accessibilityState).toEqual({ expanded: false })
  })

  test("mounted with dmh_12 ticked: epiphytic first and open, the others closed", () => {
    const { sectionIds, one } = mount({ selected: ["dmh_12"] })
    expect(sectionIds()[0]).toBe("dmh-section-epiphytic")
    expect(one("dmh-section-epiphytic").props.accessibilityState).toEqual({ expanded: true })
    expect(one("dmh-section-cavities").props.accessibilityState).toEqual({ expanded: false })
  })

  test("ticking afterwards moves neither a section nor a row", () => {
    const { sectionIds, update, tree } = mount({ selected: ["dmh_12"] })
    const before = sectionIds()
    const rowOrder = () =>
      tree.root
        .findAll((n) => typeof n.type === "string" && /^dmh-row-/.test(String(n.props.testID)))
        .map((n) => n.props.testID)
    update({ selected: ["dmh_01", "dmh_12", "dmh_13"] })
    expect(sectionIds()).toEqual(before)
    expect(rowOrder().slice(0, 3)).toEqual(["dmh-row-dmh_12", "dmh-row-dmh_13", "dmh-row-dmh_14"])
  })

  test("a counted group (without tick) also opens its section first at mount", () => {
    const { sectionIds } = mount({ counting: counting({ dmh_15: 2 }) })
    expect(sectionIds()[0]).toBe("dmh-section-exudates")
  })

  test("each badge and header label read the ticked count of the section", () => {
    const { one, textOf } = mount({ selected: ["dmh_01", "dmh_03", "dmh_05"] })
    const cavities = one("dmh-section-cavities")
    expect(cavities.props.accessibilityLabel).toBe(
      t.sectionA11y({ form: t.forms.cavities, ticked: 2, total: 4 }),
    )
    expect(textOf(cavities)).toContain(t.badge({ ticked: 2, total: 4 }))
    const wounds = one("dmh-section-wounds")
    expect(wounds.props.accessibilityLabel).toBe(
      t.sectionA11y({ form: t.forms.wounds, ticked: 1, total: 2 }),
    )
    expect(textOf(one("dmh-section-exudates"))).toContain(t.badge({ ticked: 0, total: 1 }))
  })
})

describe("DmhGroupList, one container level (redesign A-C1, A-C2, A-I1, A-I4)", () => {
  type Style = Record<string, unknown>
  const flat = (style: unknown): Style =>
    Array.isArray(style)
      ? style.reduce<Style>((acc, item) => ({ ...acc, ...flat(item) }), {})
      : typeof style === "function"
        ? flat(style({ pressed: false }))
        : ((style as Style | null | undefined) ?? {})

  test("draws no card of its own: no AppCard, no bordered box around a section", () => {
    const { tree, open } = mount({ selected: ["dmh_01"] })
    open("cavities")
    expect(tree.root.findAll((n) => (n.type as unknown) === "AppCard")).toHaveLength(0)
    const boxed = tree.root.findAll(
      (n) => flat(n.props.style).borderWidth === 1 && flat(n.props.style).borderRadius === 999,
    )
    expect(boxed).toHaveLength(0)
  })

  test("the sections use the grouped header", () => {
    const { one, textOf } = mount()
    expect(textOf(one("dmh-section-cavities"))).toBe(
      `${t.forms.cavities}${t.badge({ ticked: 0, total: 4 })}`,
    )
    expect(flat(one("dmh-section-cavities").props.style).minHeight).toBe(44)
  })

  test("the rows of a section sit in one glass container with hairlines from the label (52)", () => {
    const { tree, open } = mount()
    open("cavities")
    const containers = tree.root.findAll(
      (n) => (n.type as unknown) === "View" && flat(n.props.style).borderRadius === 22,
    )
    // The open section only.
    expect(containers).toHaveLength(1)
    const section = containers[0]
    const dividers = section.findAll(
      (n) => (n.type as unknown) === "View" && flat(n.props.style).height === 1,
    )
    expect(dividers).toHaveLength(3)
    for (const divider of dividers) expect(flat(divider.props.style).marginLeft).toBe(52)
  })

  test("there is no guide entry card: the guide opens from the rows' info buttons", () => {
    const { all } = mount()
    expect(all("dmh-guide-entry")).toHaveLength(0)
  })

  test("the summary sits with the heading block, under the helper, in the meta style", () => {
    const { tree, one } = mount({ selected: ["dmh_01"], counting: counting({ dmh_01: 2 }) })
    const block = tree.root.find(
      (n) =>
        (n.type as unknown) === "View" &&
        n.findAll((m) => m.props.testID === "dmh-summary").length > 0 &&
        flat(n.props.style).gap === 4,
    )
    const texts = block.findAll((n) => (n.type as unknown) === "Text").map((n) => n.props.testID)
    expect(texts).toEqual([undefined, undefined, "dmh-summary"])
    expect(flat(one("dmh-summary").props.style).fontSize).toBe(12)
  })
})

describe("DmhGroupList, modes", () => {
  test("capped: heading, no +, summary capped", () => {
    const { tree, all, textOf, one } = mount({ selected: ["dmh_01", "dmh_02"] })
    const heading = tree.root.findAll(
      (n) => typeof n.type === "string" && n.props.accessibilityRole === "header",
    )[0]
    expect(textOf(heading)).toBe(fr.factorDetail.companionLabels.dmh_groups)
    expect(all("dmh-add-dmh_03")).toHaveLength(0)
    // One helper line only, the one that says where the guide is.
    const texts = tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => textOf(n))
    expect(texts).toContain(t.infoHelper)
    expect(texts).not.toContain(fr.factorDetail.countingMode.dmhHelper)
    expect(textOf(one("dmh-summary"))).toBe(t.summaryCapped({ groups: 2 }))
  })

  test("full: heading, helper, a + on unticked rows, summary with the sum of the counts", () => {
    const { tree, all, textOf, one } = mount({
      selected: ["dmh_01", "dmh_05"],
      counting: counting({ dmh_01: 3, dmh_05: 11 }),
    })
    const texts = tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => textOf(n))
    expect(texts).toContain(fr.factorDetail.countingMode.dmhTitle)
    // The cap sentence and the guide sentence are merged in one helper line.
    expect(texts).toContain(`${fr.factorDetail.countingMode.dmhHelper} ${t.infoHelper}`)
    expect(all("dmh-add-dmh_03")).toHaveLength(1)
    expect(all("dmh-add-dmh_01")).toHaveLength(0)
    expect(textOf(one("dmh-summary"))).toBe(t.summaryFull({ groups: 2, trees: 14 }))
  })
})

describe("DmhGroupList, capped counters per hectare (follow-up of phase 32)", () => {
  const perHectare = (counts: DmhListCounting["counts"] = {}) => ({ ...counting(counts), max: 2 })

  test("heading of the capped list, the cap sentence then the guide sentence, a + on unticked rows", () => {
    const { tree, all, textOf, one } = mount({
      selected: ["dmh_01", "dmh_05"],
      counting: perHectare({ dmh_01: 2, dmh_05: 1 }),
    })
    const texts = tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => textOf(n))
    expect(texts).toContain(fr.factorDetail.companionLabels.dmh_groups)
    expect(texts).toContain(`${t.cappedHelper} ${t.infoHelper}`)
    expect(texts).not.toContain(fr.factorDetail.countingMode.dmhHelper)
    expect(all("dmh-add-dmh_03")).toHaveLength(1)
    expect(all("dmh-add-dmh_01")).toHaveLength(0)
    // Groups only: the trees are the total below the list, not a count on a surface.
    expect(textOf(one("dmh-summary"))).toBe(t.summaryCapped({ groups: 2 }))
  })

  test("no total is drawn under the list: the sum is the trees per hectare field above it", () => {
    for (const counted of [
      mount({ selected: ["dmh_01", "dmh_05"], counting: perHectare({ dmh_01: 2, dmh_05: 1 }) }),
      mount({ selected: ["dmh_01"], counting: perHectare({ dmh_01: 0 }) }),
      mount({ selected: ["dmh_01"] }),
      mount({ selected: ["dmh_01"], counting: counting({ dmh_01: 3 }) }),
    ]) {
      expect(counted.all("dmh-total")).toHaveLength(0)
    }
  })

  test("a row steps to 2 at most and the handlers go up with the group", () => {
    const perHa = perHectare({ dmh_05: 1 })
    const { open, one, press } = mount({ selected: ["dmh_05"], counting: perHa })
    open("epiphytic")
    expect(one("dmh-stepper-dmh_05").props.accessibilityValue).toEqual({
      text: "1 arbre par hectare, au plus 2",
    })
    act(() => one("dmh-stepper-dmh_05-increase").props.onPressIn())
    act(() => one("dmh-stepper-dmh_05-increase").props.onPressOut())
    act(() => one("dmh-stepper-dmh_05-increase").props.onPress())
    expect(perHa.onSetCount).toHaveBeenCalledWith("dmh_05", 2)
    press("dmh-add-dmh_13")
    expect(perHa.onBump).toHaveBeenCalledWith("dmh_13", 1)
  })
})

describe("DmhGroupList, handlers", () => {
  test("ticking dmh_01 with dmh_12 selected hands the next selection in option order", () => {
    const { press, open, onChangeSelection } = mount({ selected: ["dmh_12"] })
    open("cavities")
    press("dmh-tick-dmh_01")
    expect(onChangeSelection).toHaveBeenCalledWith(["dmh_01", "dmh_12"])
  })

  test("an out-of-order tick keeps the option order, unticking removes only that code", () => {
    const { press, open, onChangeSelection } = mount({ selected: ["dmh_03", "dmh_09"] })
    open("wounds")
    press("dmh-tick-dmh_06")
    expect(onChangeSelection).toHaveBeenLastCalledWith(["dmh_03", "dmh_06", "dmh_09"])
    press("dmh-tick-dmh_03")
    expect(onChangeSelection).toHaveBeenLastCalledWith(["dmh_09"])
  })

  test("the row labels are the selectionLabel of the survey method", () => {
    for (const version of [IBP_METHOD_V3_2, IBP_METHOD_V3_0]) {
      const { one, open } = mount({ methodVersion: version })
      open("wounds")
      expect(one("dmh-tick-dmh_06").props.accessibilityLabel).toBe(
        selectionLabel("F", "dmh_06", version),
      )
    }
  })

  test("a row info glyph opens that group, also when read-only, and ticks nothing", () => {
    for (const editable of [true, false]) {
      const { press, open, onOpenDmhGuide, onChangeSelection } = mount({ editable })
      open("wounds")
      press("dmh-info-dmh_05")
      expect(onOpenDmhGuide).toHaveBeenCalledWith("dmh_05")
      expect(onChangeSelection).not.toHaveBeenCalled()
    }
  })

  test("read-only: the ticks are disabled", () => {
    const { one } = mount({ editable: false, selected: ["dmh_01"] })
    expect(one("dmh-tick-dmh_01").props.disabled).toBe(true)
  })

  test("the + on dmh_05 bumps it by 1", () => {
    const c = counting()
    const { press, open } = mount({ counting: c })
    open("wounds")
    press("dmh-add-dmh_05")
    expect(c.onBump).toHaveBeenCalledWith("dmh_05", 1)
  })

  test("a stepper step to 4 sets the count, an emptied field sends NaN", () => {
    const c = counting({ dmh_05: 3 })
    const { one } = mount({ selected: ["dmh_05"], counting: c })
    act(() => one("dmh-stepper-dmh_05-increase").props.onPressIn())
    act(() => one("dmh-stepper-dmh_05-increase").props.onPressOut())
    act(() => one("dmh-stepper-dmh_05-increase").props.onPress())
    expect(c.onSetCount).toHaveBeenLastCalledWith("dmh_05", 4)
    act(() => one("dmh-stepper-dmh_05-value").props.onPress())
    act(() => one("dmh-stepper-dmh_05-input").props.onChangeText(""))
    act(() => one("dmh-stepper-dmh_05-input").props.onSubmitEditing())
    const last = c.onSetCount.mock.calls[c.onSetCount.mock.calls.length - 1]
    expect(last[0]).toBe("dmh_05")
    expect(last[1]).toBeNaN()
  })

  test("a typed count is rounded through the shared parser", () => {
    const c = counting({ dmh_05: 3 })
    const { one } = mount({ selected: ["dmh_05"], counting: c })
    act(() => one("dmh-stepper-dmh_05-value").props.onPress())
    act(() => one("dmh-stepper-dmh_05-input").props.onChangeText("6,4"))
    act(() => one("dmh-stepper-dmh_05-input").props.onSubmitEditing())
    expect(c.onSetCount).toHaveBeenLastCalledWith("dmh_05", 6)
  })

  test("the row handlers keep their identity while the selection changes (memoised rows)", () => {
    const { tree, update, open } = mount({ selected: [] })
    open("cavities")
    const handlers = () => {
      const row = tree.root.findAll(
        (n) => n.props.code === "dmh_01" && n.props.onToggle !== undefined,
      )[0]
      return [row.props.onToggle, row.props.onAdd, row.props.onStep, row.props.onOpenInfo]
    }
    const before = handlers()
    update({ selected: ["dmh_02"], counting: counting({ dmh_02: 1 }) })
    expect(handlers()).toEqual(before)
  })
})

describe("DmhGroupList, the row 'no tree carries a dendromicrohabitat' (follow-up 32-25)", () => {
  const none = fr.factorDetail.dmhList.none
  // The checked state of the row, read from the circle the screen draws: the checkbox says it.
  const checked = (node: Node): boolean => node.props.accessibilityState.checked

  test("is the first thing of the list, above the first section, with the catalogue label", () => {
    const { tree, one, textOf } = mount({ counting: counting() })
    const row = one("dmh-none-row")
    expect(row.props.accessibilityRole).toBe("checkbox")
    expect(row.props.accessibilityLabel).toBe(none.label)
    expect(textOf(row)).toBe(none.label)
    expect(none.label).toBe("Aucun arbre porteur de dendromicrohabitats")
    const order = tree.root
      .findAll(
        (n) =>
          typeof n.type === "string" &&
          (n.props.testID === "dmh-none-row" || n.props.testID === "dmh-section-cavities"),
      )
      .map((n) => n.props.testID)
    expect(order).toEqual(["dmh-none-row", "dmh-section-cavities"])
  })

  test("is not on the page when the counters are not (no counting entry wired)", () => {
    expect(mount().all("dmh-none-row")).toHaveLength(0)
  })

  test("nothing stored: unticked; trees per hectare 0 with no group: ticked", () => {
    expect(checked(mount({ counting: counting() }).one("dmh-none-row"))).toBe(false)
    expect(checked(mount({ counting: counting(), treesPerHaText: "0" }).one("dmh-none-row"))).toBe(
      true,
    )
    expect(checked(mount({ counting: counting(), treesPerHaText: "5" }).one("dmh-none-row"))).toBe(
      false,
    )
  })

  test("an older capped survey with a typed 0 and no groups shows it ticked (max set, no counts)", () => {
    const capped = { ...counting(), max: 2 }
    const { one } = mount({ counting: capped, treesPerHaText: "0", selected: null })
    expect(checked(one("dmh-none-row"))).toBe(true)
    expect(
      checked(mount({ counting: capped, treesPerHaText: "0", selected: [] }).one("dmh-none-row")),
    ).toBe(true)
  })

  test("the state is derived: a ticked or a counted group unticks it, unticking all brings it back", () => {
    const { one, update } = mount({ counting: counting(), treesPerHaText: "0" })
    expect(checked(one("dmh-none-row"))).toBe(true)
    update({ selected: ["dmh_05"] })
    expect(checked(one("dmh-none-row"))).toBe(false)
    update({ selected: [], counting: counting({ dmh_05: 1 }) })
    expect(checked(one("dmh-none-row"))).toBe(false)
    // Counters back to 0 and unticked: the stored 0 reads as "none" again.
    update({ selected: [], counting: counting({ dmh_05: 0 }) })
    expect(checked(one("dmh-none-row"))).toBe(true)
  })

  test("a press records 'none' (true), a press on the ticked row undoes it (false), with a haptic", () => {
    const c = counting()
    const { press, update } = mount({ counting: c })
    press("dmh-none-row")
    expect(c.onMarkNone).toHaveBeenLastCalledWith(true)
    update({ treesPerHaText: "0" })
    press("dmh-none-row")
    expect(c.onMarkNone).toHaveBeenLastCalledWith(false)
    expect(c.onMarkNone).toHaveBeenCalledTimes(2)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(jest.requireMock("../../ui/feedback").feedback.selection).toHaveBeenCalled()
  })

  test("with ticked groups all at 0 the press asks nothing and clears them (true)", () => {
    const c = counting({ dmh_05: 0 })
    const { press, one } = mount({ counting: c, selected: ["dmh_05"] })
    expect(checked(one("dmh-none-row"))).toBe(false)
    press("dmh-none-row")
    expect(c.onMarkNone).toHaveBeenCalledWith(true)
  })

  test("with a count above 0 the press changes nothing and the locked caption shows", () => {
    jest.useFakeTimers()
    const c = counting({ dmh_05: 2 })
    const { press, all, one, textOf } = mount({ counting: c, selected: ["dmh_05"] })
    expect(one("dmh-none-row").props.accessibilityHint).toBe(none.lockedHint)
    expect(all("dmh-none-locked")).toHaveLength(0)
    press("dmh-none-row")
    expect(c.onMarkNone).not.toHaveBeenCalled()
    expect(textOf(one("dmh-none-locked"))).toBe(none.locked)
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(all("dmh-none-locked")).toHaveLength(0)
    jest.useRealTimers()
  })

  test("a read-only list disables the row", () => {
    const { one } = mount({ counting: counting(), editable: false })
    expect(one("dmh-none-row").props.accessibilityState).toEqual({
      checked: false,
      disabled: true,
    })
  })
})
