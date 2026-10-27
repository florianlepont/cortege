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
  return { counts, onBump: jest.fn(), onSetCount: jest.fn() } satisfies DmhListCounting
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
  test("nothing ticked: seven sections in form order, all expanded, summary says none", () => {
    const { sectionIds, one, textOf, all } = mount()
    expect(sectionIds()).toEqual(FORM_ORDER)
    for (const id of FORM_ORDER)
      expect(one(id).props.accessibilityState).toEqual({ expanded: true })
    expect(textOf(one("dmh-summary"))).toBe(t.summaryNone)
    expect(all("dmh-row-dmh_01")).toHaveLength(1)
    expect(all("dmh-row-dmh_15")).toHaveLength(1)
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

describe("DmhGroupList, modes", () => {
  test("capped: heading, no +, summary capped", () => {
    const { tree, all, textOf, one } = mount({ selected: ["dmh_01", "dmh_02"] })
    const heading = tree.root.findAll(
      (n) => typeof n.type === "string" && n.props.accessibilityRole === "header",
    )[0]
    expect(textOf(heading)).toBe(fr.factorDetail.companionLabels.dmh_groups)
    expect(all("dmh-add-dmh_03")).toHaveLength(0)
    expect(textOf(one("dmh-summary"))).toBe(t.summaryCapped({ groups: 2 }))
  })

  test("full: heading, helper, a + on unticked rows, summary with the sum of the counts", () => {
    const { tree, all, textOf, one } = mount({
      selected: ["dmh_01", "dmh_05"],
      counting: counting({ dmh_01: 3, dmh_05: 11 }),
    })
    const texts = tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => textOf(n))
    expect(texts).toContain(fr.factorDetail.countingMode.dmhTitle)
    expect(texts).toContain(fr.factorDetail.countingMode.dmhHelper)
    expect(all("dmh-add-dmh_03")).toHaveLength(1)
    expect(all("dmh-add-dmh_01")).toHaveLength(0)
    expect(textOf(one("dmh-summary"))).toBe(t.summaryFull({ groups: 2, trees: 14 }))
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
      const { one } = mount({ methodVersion: version })
      expect(one("dmh-tick-dmh_06").props.accessibilityLabel).toBe(
        selectionLabel("F", "dmh_06", version),
      )
    }
  })

  test("the guide entry opens the catalogue with no argument, also when read-only", () => {
    for (const editable of [true, false]) {
      const { press, onOpenDmhGuide } = mount({ editable })
      press("dmh-guide-entry")
      expect(onOpenDmhGuide).toHaveBeenCalledTimes(1)
      expect(onOpenDmhGuide.mock.calls[0]).toEqual([])
    }
  })

  test("a row info glyph opens that group, also when read-only, and ticks nothing", () => {
    for (const editable of [true, false]) {
      const { press, onOpenDmhGuide, onChangeSelection } = mount({ editable })
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
    const { press } = mount({ counting: c })
    press("dmh-add-dmh_05")
    expect(c.onBump).toHaveBeenCalledWith("dmh_05", 1)
  })

  test("a stepper step to 4 sets the count, an emptied field sends NaN", () => {
    const c = counting({ dmh_05: 3 })
    const { one } = mount({ selected: ["dmh_05"], counting: c })
    act(() => one("dmh-stepper-dmh_05-increase").props.onPressIn())
    act(() => one("dmh-stepper-dmh_05-increase").props.onPressOut())
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
    const { tree, update } = mount({ selected: [] })
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
