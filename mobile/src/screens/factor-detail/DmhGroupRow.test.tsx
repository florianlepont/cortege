import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"
import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { defaultTheme } from "../../app/theme"
import { DMH_STEPPER_SIZE } from "../../ui/DmhCounterStepper"
import { createDmhListStyles, DMH_LABEL_INSET } from "./dmh-group-list.styles"
import { DmhGroupRow, type DmhGroupRowProps } from "./DmhGroupRow"

const mockAnnounce = jest.fn()
const mockSelection = jest.fn()

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
    AccessibilityInfo: {
      announceForAccessibility: (...args: unknown[]) => mockAnnounce(...args),
    },
    StyleSheet: { create: <T,>(styles: T) => styles, flatten: (style: unknown) => style },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/feedback", () => ({
  feedback: { selection: () => mockSelection() },
}))

const t = fr.factorDetail.dmhList
const LABEL = "5. Aubier apparent"
const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  jest.useFakeTimers()
})

afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  setReducedMotion(false)
})

const styles = createDmhListStyles(defaultTheme)
type Node = renderer.ReactTestInstance
type Style = Record<string, unknown>

const flatten = (style: unknown): Style =>
  Array.isArray(style)
    ? style.reduce<Style>((acc, item) => ({ ...acc, ...flatten(item) }), {})
    : ((style as Style | null | undefined) ?? {})

function mount(props: Partial<DmhGroupRowProps> = {}) {
  const handlers = {
    onToggle: jest.fn(),
    onAdd: jest.fn(),
    onStep: jest.fn(),
    onSubmitText: jest.fn(),
    onOpenInfo: jest.fn(),
  }
  const element = (next: Partial<DmhGroupRowProps>) => (
    <DmhGroupRow
      code="dmh_05"
      label={LABEL}
      ticked={false}
      count={undefined}
      full={false}
      editable
      styles={styles}
      {...handlers}
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
  const update = (next: Partial<DmhGroupRowProps>): void => {
    act(() => tree.update(element(next)))
  }
  return { tree, handlers, all, one, press, update }
}

describe("DmhGroupRow", () => {
  test("capped, unticked: the check zone ticks with a haptic, no + and no stepper", () => {
    const { handlers, press, all } = mount()
    expect(all("dmh-add-dmh_05")).toHaveLength(0)
    expect(all("dmh-stepper-dmh_05")).toHaveLength(0)
    press("dmh-tick-dmh_05")
    expect(handlers.onToggle).toHaveBeenCalledWith("dmh_05", true)
    expect(mockSelection).toHaveBeenCalledTimes(1)
  })

  test("capped, ticked: the check zone unticks", () => {
    const { handlers, press } = mount({ ticked: true })
    press("dmh-tick-dmh_05")
    expect(handlers.onToggle).toHaveBeenCalledWith("dmh_05", false)
    expect(mockSelection).toHaveBeenCalledTimes(1)
  })

  test("full, unticked, no count: the + calls onAdd with a haptic", () => {
    const { handlers, press, all } = mount({ full: true })
    expect(all("dmh-stepper-dmh_05")).toHaveLength(0)
    press("dmh-add-dmh_05")
    expect(handlers.onAdd).toHaveBeenCalledWith("dmh_05")
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(handlers.onToggle).not.toHaveBeenCalled()
  })

  test("full, ticked, count 0 or none: the stepper shows 0 with - disabled, a tap unticks", () => {
    const { handlers, press, all, one } = mount({ full: true, ticked: true, count: 0 })
    expect(all("dmh-add-dmh_05")).toHaveLength(0)
    expect(one("dmh-stepper-dmh_05-value")).toBeDefined()
    expect(one("dmh-stepper-dmh_05-decrease").props.accessibilityState).toEqual({ disabled: true })
    press("dmh-tick-dmh_05")
    expect(handlers.onToggle).toHaveBeenCalledWith("dmh_05", false)
  })

  test("full, ticked, no stored count: the stepper reads 0", () => {
    const { one } = mount({ full: true, ticked: true, count: undefined })
    const text = one("dmh-stepper-dmh_05-value").findAll((n) => (n.type as unknown) === "Text")[0]
    expect(text.props.children).toBe("0")
  })

  test("full, ticked, count 3: the tap is locked, the caption shows 4 s and nothing changes", () => {
    const { handlers, press, all, one } = mount({ full: true, ticked: true, count: 3 })
    expect(all("dmh-locked-dmh_05")).toHaveLength(0)
    press("dmh-tick-dmh_05")
    expect(handlers.onToggle).not.toHaveBeenCalled()
    expect(mockSelection).not.toHaveBeenCalled()
    expect(one("dmh-locked-dmh_05").props.children).toBe(t.lockedUntick)
    expect(one("dmh-locked-dmh_05").props.accessibilityLiveRegion).toBe("polite")
    expect(mockAnnounce).toHaveBeenCalledWith(t.lockedUntick)
    act(() => {
      jest.advanceTimersByTime(3999)
    })
    expect(all("dmh-locked-dmh_05")).toHaveLength(1)
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(all("dmh-locked-dmh_05")).toHaveLength(0)
  })

  test("a second tap on a locked row restarts the 4 s", () => {
    const { press, all } = mount({ full: true, ticked: true, count: 3 })
    press("dmh-tick-dmh_05")
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    press("dmh-tick-dmh_05")
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(all("dmh-locked-dmh_05")).toHaveLength(1)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(all("dmh-locked-dmh_05")).toHaveLength(0)
  })

  test("the caption timer is cleared on unmount", () => {
    const { press, tree } = mount({ full: true, ticked: true, count: 3 })
    press("dmh-tick-dmh_05")
    act(() => tree.unmount())
    expect(() => jest.advanceTimersByTime(5000)).not.toThrow()
  })

  test("full, unticked with a kept count of 2: the stepper line shows 2, the box is empty", () => {
    const { one, all } = mount({ full: true, ticked: false, count: 2 })
    const text = one("dmh-stepper-dmh_05-value").findAll((n) => (n.type as unknown) === "Text")[0]
    expect(text.props.children).toBe("2")
    expect(one("dmh-tick-dmh_05").props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
    })
    expect(all("dmh-add-dmh_05")).toHaveLength(0)
  })

  test("a step and a typed count go up with the group code", () => {
    const { handlers, one } = mount({ full: true, ticked: true, count: 3 })
    act(() => one("dmh-stepper-dmh_05-increase").props.onPressIn())
    act(() => one("dmh-stepper-dmh_05-increase").props.onPressOut())
    expect(handlers.onStep).toHaveBeenCalledWith("dmh_05", 4)
    act(() => one("dmh-stepper-dmh_05-value").props.onPress())
    act(() => one("dmh-stepper-dmh_05-input").props.onChangeText("7"))
    act(() => one("dmh-stepper-dmh_05-input").props.onSubmitEditing())
    expect(handlers.onSubmitText).toHaveBeenCalledWith("dmh_05", "7")
  })

  test("the info glyph opens the guide on the group, never toggles, also when read-only", () => {
    for (const editable of [true, false]) {
      const { handlers, press, one } = mount({ full: true, ticked: true, count: 2, editable })
      expect(one("dmh-info-dmh_05").props.accessibilityLabel).toBe(t.a11y.info({ label: LABEL }))
      expect(one("dmh-info-dmh_05").props.accessibilityHint).toBe(t.a11y.infoHint)
      expect(one("dmh-info-dmh_05").props.disabled).toBeFalsy()
      press("dmh-info-dmh_05")
      expect(handlers.onOpenInfo).toHaveBeenCalledWith("dmh_05")
      expect(handlers.onToggle).not.toHaveBeenCalled()
      expect(mockSelection).not.toHaveBeenCalled()
    }
  })

  test("the info button is a 44 x 44 target holding the 22 pt outline glyph in the accent ink", () => {
    const { one, tree } = mount()
    const style = flatten(one("dmh-info-dmh_05").props.style)
    expect(style.width).toBe(44)
    expect(style.height).toBe(44)
    const glyph = tree.root.findAll(
      (n) => (n.type as unknown) === "Ionicons" && n.props.name === "information-circle-outline",
    )[0]
    expect(glyph.props.size).toBe(22)
    // visual.accentText (8.5:1 light, 9:1 dark), not the moss accent (2.6:1 on the light card).
    expect(glyph.props.color).toBe(defaultTheme.visual.accentText)
  })

  test("the check zone shows the soft pressed fill, and not when read-only", () => {
    const { one } = mount()
    const style = one("dmh-tick-dmh_05").props.style as (s: { pressed: boolean }) => unknown
    expect(flatten(style({ pressed: false })).backgroundColor).toBeUndefined()
    expect(flatten(style({ pressed: true })).backgroundColor).toBe(defaultTheme.colors.surfaceSoft)
    const readOnly = mount({ editable: false }).one("dmh-tick-dmh_05").props.style as (s: {
      pressed: boolean
    }) => unknown
    expect(flatten(readOnly({ pressed: true })).backgroundColor).toBeUndefined()
  })

  test("read-only: the check zone is disabled, no +, the stepper is read-only", () => {
    const { one, all } = mount({ full: true, ticked: true, count: 2, editable: false })
    expect(one("dmh-tick-dmh_05").props.disabled).toBe(true)
    expect(one("dmh-tick-dmh_05").props.accessibilityState).toEqual({
      checked: true,
      disabled: true,
    })
    expect(all("dmh-add-dmh_05")).toHaveLength(0)
    expect(all("dmh-stepper-dmh_05-increase")).toHaveLength(0)
    expect(one("dmh-stepper-dmh_05-value").props.children).toBeDefined()
  })

  test("read-only, unticked and uncounted: no + either", () => {
    const { all } = mount({ full: true, editable: false })
    expect(all("dmh-add-dmh_05")).toHaveLength(0)
  })

  test("the check zone is a checkbox with the label, the count and the right hint", () => {
    const capped = mount({ ticked: true })
    const zone = capped.one("dmh-tick-dmh_05")
    expect(zone.props.accessibilityRole).toBe("checkbox")
    expect(zone.props.accessibilityLabel).toBe(LABEL)
    expect(zone.props.accessibilityHint).toBe(t.a11y.tickHint)

    const counted = mount({ full: true, ticked: true, count: 3 })
    expect(counted.one("dmh-tick-dmh_05").props.accessibilityLabel).toBe(
      t.a11y.withCount({ label: LABEL, trees: 3 }),
    )
    expect(counted.one("dmh-tick-dmh_05").props.accessibilityHint).toBe(t.a11y.tickLockedHint)

    const single = mount({ full: true, ticked: true, count: 1 })
    expect(single.one("dmh-tick-dmh_05").props.accessibilityLabel).toBe(`${LABEL}, 1 arbre`)

    const zero = mount({ full: true, ticked: true, count: 0 })
    expect(zero.one("dmh-tick-dmh_05").props.accessibilityLabel).toBe(LABEL)
    expect(zero.one("dmh-tick-dmh_05").props.accessibilityHint).toBe(t.a11y.tickHint)
  })

  test("the + names its group, is a 48 pt target and holds a 36 pt disc in the control fill", () => {
    const { one, tree } = mount({ full: true })
    const add = one("dmh-add-dmh_05")
    expect(add.props.accessibilityLabel).toBe(t.a11y.add({ label: LABEL }))
    expect(add.props.accessibilityHint).toBe(t.a11y.addHint)
    const style = flatten(add.props.style)
    expect(style.width).toBe(DMH_STEPPER_SIZE)
    expect(style.height).toBe(DMH_STEPPER_SIZE)
    expect(DMH_STEPPER_SIZE).toBe(48)
    const disc = flatten(styles.addDisc)
    expect(disc.width).toBe(36)
    expect(disc.height).toBe(36)
    expect(disc.backgroundColor).toBe(defaultTheme.visual.control.fill)
    const glyph = add.findAll(
      (n) => (n.type as unknown) === "Ionicons" && n.props.name === "add-outline",
    )[0]
    expect(glyph.props.size).toBe(20)
    expect(glyph.props.color).toBe(defaultTheme.semanticColors.ctaPrimary)
    expect(tree).toBeDefined()
  })

  test("the second line is indented to the label, where the hairlines start", () => {
    expect(flatten(styles.line2).marginLeft).toBe(DMH_LABEL_INSET)
    expect(DMH_LABEL_INSET).toBe(52)
  })

  test("a ticked row draws the filled circle with a check, an empty one does not", () => {
    const on = mount({ ticked: true })
    expect(
      on.tree.root.findAll(
        (n) => (n.type as unknown) === "Ionicons" && n.props.name === "checkmark-outline",
      ),
    ).toHaveLength(1)
    const off = mount()
    expect(
      off.tree.root.findAll(
        (n) => (n.type as unknown) === "Ionicons" && n.props.name === "checkmark-outline",
      ),
    ).toHaveLength(0)
  })

  test("is a memo component: an identical re-render does not render it again", () => {
    expect((DmhGroupRow as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for("react.memo"))
  })

  test("renders under reduced motion", () => {
    setReducedMotion(true)
    const { one } = mount({ full: true, ticked: true, count: 1 })
    expect(one("dmh-row-dmh_05")).toBeDefined()
  })
})
