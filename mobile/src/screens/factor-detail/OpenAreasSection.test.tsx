import React from "react"
import renderer, { act } from "react-test-renderer"
import { AccessibilityInfo } from "react-native"
import { OPEN_AREAS_MAX_COUNT } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { OpenAreasSection } from "./OpenAreasSection"

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

const t = fr.factorDetail.openAreas
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

type Props = React.ComponentProps<typeof OpenAreasSection>
type Node = renderer.ReactTestInstance

function mount(props: Partial<Props> = {}) {
  const handlers = {
    onAdd: jest.fn(),
    onChangeArea: jest.fn(),
    onRemove: jest.fn(),
    onMarkNone: jest.fn(),
  }
  let tree!: renderer.ReactTestRenderer
  const element = (next: Partial<Props>) => (
    <OpenAreasSection
      areas={[]}
      zoneSurfaceHa={2}
      percentText=""
      {...handlers}
      {...props}
      {...next}
    />
  )
  act(() => {
    tree = renderer.create(element({}))
  })
  const all = (id: string): Node[] =>
    tree.root.findAll((n) => typeof n.type === "string" && n.props.testID === id)
  const one = (id: string): Node => all(id)[0]
  const textOf = (node: Node): string =>
    node
      .findAll((n) => (n.type as unknown) === "Text")
      .map((n) => n.props.children)
      .join("")
  const press = (id: string): void => {
    act(() => one(id).props.onPress())
  }
  const update = (next: Partial<Props>): void => {
    act(() => tree.update(element(next)))
  }
  return { ...handlers, all, one, textOf, press, update }
}

const announce = AccessibilityInfo.announceForAccessibility as jest.Mock

describe("OpenAreasSection rows", () => {
  test("has the header, a row per zone with its surface in hectares and the two action rows", () => {
    const { one, all, textOf } = mount({ areas: [0.3, 0.1, 0] })
    expect(t.header).toBe("Zones de milieux ouverts fleuris")
    expect(textOf(one("open-areas-section"))).toContain(t.header)
    expect(textOf(one("open-area-0-row"))).toContain("Zone 1")
    expect(textOf(one("open-area-1-row"))).toContain("Zone 2")
    expect(textOf(one("open-area-0-value"))).toBe("0,3 ha")
    expect(textOf(one("open-area-1-value"))).toBe("0,1 ha")
    expect(textOf(one("open-area-2-value"))).toBe("0,0 ha")
    expect(all("open-area-3-row")).toHaveLength(0)
    expect(one("open-area-add")).toBeDefined()
    expect(one("open-area-none")).toBeDefined()
  })

  test("a zone is one adjustable element named after it, speaking hectares", () => {
    const { one } = mount({ areas: [0.3] })
    const stepper = one("open-area-0")
    expect(stepper.props.accessibilityRole).toBe("adjustable")
    expect(stepper.props.accessibilityLabel).toBe("Zone 1")
    expect(stepper.props.accessibilityValue).toEqual({ text: "0,3 hectares" })
  })

  test("a step moves the zone by a tenth of a hectare", () => {
    const { one, onChangeArea } = mount({ areas: [0.3, 1] })
    act(() =>
      one("open-area-1").props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }),
    )
    expect(onChangeArea).toHaveBeenLastCalledWith(1, 1.1)
    act(() =>
      one("open-area-0").props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } }),
    )
    expect(onChangeArea).toHaveBeenLastCalledWith(0, 0.2)
  })

  test("a typed surface is passed as a number, an empty one as 0", () => {
    const { one, press, onChangeArea } = mount({ areas: [0.3] })
    press("open-area-0-value")
    act(() => one("open-area-0-input").props.onChangeText("0,25"))
    act(() => one("open-area-0-input").props.onSubmitEditing())
    expect(onChangeArea).toHaveBeenLastCalledWith(0, 0.25)
    press("open-area-0-value")
    act(() => one("open-area-0-input").props.onChangeText(""))
    act(() => one("open-area-0-input").props.onBlur())
    expect(onChangeArea).toHaveBeenLastCalledWith(0, 0)
  })

  test("the remove button is named after its zone and removes it", () => {
    const { one, press, onRemove } = mount({ areas: [0.3, 0.1] })
    expect(one("open-area-remove-1").props.accessibilityLabel).toBe("Supprimer la zone 2")
    announce.mockClear()
    press("open-area-remove-1")
    expect(onRemove).toHaveBeenCalledWith(1)
    expect(announce).toHaveBeenCalledWith("Zone 2 supprimée")
  })

  test("the add row adds a zone and announces it", () => {
    const { one, press, onAdd } = mount({ areas: [0.3] })
    expect(one("open-area-add").props.accessibilityLabel).toBe("Ajouter une zone")
    announce.mockClear()
    press("open-area-add")
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith("Zone 2 ajoutée")
  })

  test("at the maximum the add row is gone and a note says why", () => {
    const full = new Array(OPEN_AREAS_MAX_COUNT).fill(0.1)
    const { all, one, textOf, update } = mount({ areas: full })
    expect(all("open-area-add")).toHaveLength(0)
    expect(textOf(one("open-areas-max"))).toBe("Vous ne pouvez pas ajouter plus de 20 zones.")
    update({ areas: full.slice(1) })
    expect(all("open-area-add")).toHaveLength(1)
    expect(all("open-areas-max")).toHaveLength(0)
  })
})

describe("OpenAreasSection total and warning", () => {
  test("the total line reads the sum against the described surface, with decimal commas", () => {
    const { one, textOf } = mount({ areas: [0.3, 0.1], zoneSurfaceHa: 2 })
    expect(textOf(one("open-areas-total"))).toBe("Total des zones : 0,4 ha sur 2,0 ha décrits")
  })

  test("with no zone the total is 0,0 ha", () => {
    const { one, textOf } = mount({ areas: [], zoneSurfaceHa: 12.5 })
    expect(textOf(one("open-areas-total"))).toBe("Total des zones : 0,0 ha sur 12,5 ha décrits")
  })

  test("a quiet warning shows only when the zones exceed the surface", () => {
    const { all, one, textOf, update } = mount({ areas: [1.5, 1], zoneSurfaceHa: 2 })
    expect(textOf(one("open-areas-warning"))).toBe(
      "Les zones dépassent la surface décrite : le total est limité à 100 %",
    )
    expect(one("open-areas-warning").props.accessibilityLiveRegion).toBe("polite")
    update({ areas: [2] })
    expect(all("open-areas-warning")).toHaveLength(0)
  })
})

describe("OpenAreasSection none row", () => {
  const checked = (node: Node): boolean => node.props.accessibilityState.checked

  test("is ticked exactly when the stored percent is 0 and no zone exists", () => {
    expect(checked(mount().one("open-area-none"))).toBe(false)
    expect(checked(mount({ percentText: "0" }).one("open-area-none"))).toBe(true)
    expect(checked(mount({ percentText: "5" }).one("open-area-none"))).toBe(false)
    expect(checked(mount({ percentText: "0", areas: [0] }).one("open-area-none"))).toBe(false)
  })

  test("a press records none (true), a press on the ticked row undoes it (false)", () => {
    const { press, onMarkNone, update, one } = mount()
    expect(one("open-area-none").props.accessibilityRole).toBe("checkbox")
    press("open-area-none")
    expect(onMarkNone).toHaveBeenLastCalledWith(true)
    update({ percentText: "0" })
    press("open-area-none")
    expect(onMarkNone).toHaveBeenLastCalledWith(false)
    expect(onMarkNone).toHaveBeenCalledTimes(2)
  })

  test("while a zone exists the press changes nothing and the locked caption shows", () => {
    jest.useFakeTimers()
    const { press, one, all, textOf, onMarkNone } = mount({ areas: [0.3], percentText: "15" })
    expect(one("open-area-none").props.accessibilityHint).toBe(t.none.lockedHint)
    expect(all("open-area-none-locked")).toHaveLength(0)
    press("open-area-none")
    expect(onMarkNone).not.toHaveBeenCalled()
    expect(textOf(one("open-area-none-locked"))).toBe(t.none.locked)
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    expect(all("open-area-none-locked")).toHaveLength(0)
    jest.useRealTimers()
  })
})
