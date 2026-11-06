import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2, type IbpMethodVersion } from "@cortege/ibp-domain"
import type { FactorField, FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { fieldVariantsFor } from "./renderFactorField"
import { isChoiceVariant, renderChoiceField } from "./renderChoiceField"

jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
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

const field = (label: string, overrides: Partial<FactorField> = {}): FactorField => ({
  label,
  value: "",
  onChange: jest.fn(),
  required: true,
  error: null,
  touched: false,
  onTouch: jest.fn(),
  ...overrides,
})

function mount(
  factor: FactorKey,
  theField: FactorField,
  methodVersion: IbpMethodVersion | null = IBP_METHOD_V3_2,
) {
  const variant = fieldVariantsFor(factor, methodVersion)[0]
  if (!isChoiceVariant(variant)) throw new Error("not a choice variant")
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<>{renderChoiceField(factor, variant, theField, methodVersion)}</>)
  })
  const rows = (role?: string) =>
    tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Pressable" &&
        String(n.props.testID).startsWith("choice-row-") &&
        (role === undefined || n.props.accessibilityRole === role),
    )
  const byId = (id: string) =>
    tree.root.findAll((n) => typeof n.type === "string" && n.props.testID === id)
  const headers = () =>
    tree.root
      .findAll((n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header")
      .map(textOf)
  return { tree, rows, byId, headers }
}

const textOf = (node: ReactTestInstance): string =>
  node.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("")

describe("isChoiceVariant", () => {
  test("chips, segmented and genus list are choice lists; counters, sliders and numbers are not", () => {
    const kinds = (["A", "B", "C", "F", "G", "H"] as FactorKey[]).flatMap((factor) =>
      fieldVariantsFor(factor, IBP_METHOD_V3_2).map((variant) => [
        factor,
        isChoiceVariant(variant),
      ]),
    )
    expect(kinds).toEqual([
      ["A", true],
      ["A", false],
      ["B", true],
      ["C", false],
      ["C", false],
      ["C", false],
      ["F", false],
      ["G", false],
      ["H", true],
    ])
    expect(isChoiceVariant(undefined)).toBe(false)
  })
})

describe("B, I and J (multi-select)", () => {
  test("the header is the required label, the count is plain text, one row per option", () => {
    const { rows, headers, tree } = mount(
      "B",
      field("Nombre de strates", {
        value: "2",
        selection: { selected: ["low"], onChange: jest.fn() },
      }),
    )
    expect(headers()).toEqual(["Nombre de strates *"])
    expect(rows("checkbox").map((r) => r.props.accessibilityState.checked)).toEqual([
      false,
      true,
      false,
      false,
      false,
    ])
    expect(textOf(tree.root)).toContain(fr.factorInput.chips.selectedCount({ count: 1 }))
  })

  test("a tap ticks in option order, touches the field once and never writes a count itself", () => {
    const onChange = jest.fn()
    const onTouch = jest.fn()
    const { rows } = mount(
      "B",
      field("Nombre de strates", {
        value: "2",
        onTouch,
        selection: { selected: ["low", "high"], onChange },
      }),
    )
    act(() => rows()[0].props.onPress())
    expect(onChange).toHaveBeenLastCalledWith(["very_low", "low", "high"])
    act(() => rows()[1].props.onPress())
    expect(onChange).toHaveBeenLastCalledWith(["high"])
    expect(onTouch).toHaveBeenCalledTimes(2)
  })

  test("the first tap of a draft with no selection starts one", () => {
    const onChange = jest.fn()
    const { rows } = mount(
      "I",
      field("Nombre de types", { selection: { selected: null, onChange } }),
    )
    act(() => rows()[2].props.onPress())
    expect(onChange).toHaveBeenCalledWith(["small_stream"])
  })

  test("a field without a selection channel ticks nothing and does not throw", () => {
    const onTouch = jest.fn()
    const { rows } = mount("J", field("Nombre de types", { onTouch }))
    expect(() => act(() => rows()[0].props.onPress())).not.toThrow()
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  test("a draft saved with a count and no selection shows the legacy line in place of the count", () => {
    const { byId, rows, tree } = mount("B", field("Nombre de strates", { value: "3" }))
    expect(rows().every((r) => r.props.accessibilityState.checked === false)).toBe(true)
    expect(textOf(byId("choice-list-B-note")[0])).toBe(
      fr.factorInput.chips.legacyCount({ count: 3 }),
    )
    expect(textOf(tree.root)).not.toContain("Aucun sélectionné")
  })

  test("a selected code of the other method stays listed and ticked", () => {
    const { rows } = mount(
      "J",
      field("Nombre de types", {
        value: "1",
        selection: { selected: ["lower_rock"], onChange: jest.fn() },
      }),
      IBP_METHOD_V3_2,
    )
    expect(rows()).toHaveLength(13)
    expect(rows()[12].props.accessibilityState.checked).toBe(true)
    const v30 = mount("I", field("Nombre de types", {}), IBP_METHOD_V3_0)
    expect(v30.rows()).toHaveLength(10)
  })

  test("a missing required choice shows its message once the field is touched, never before", () => {
    const untouched = mount("B", field("Nombre de strates", { error: "Champ requis" }))
    expect(untouched.byId("choice-list-B-error")).toHaveLength(0)
    const touched = mount("B", field("Nombre de strates", { error: "Champ requis", touched: true }))
    expect(textOf(touched.byId("choice-list-B-error")[0])).toBe("Champ requis")
    const fine = mount("B", field("Nombre de strates", { touched: true }))
    expect(fine.byId("choice-list-B-error")).toHaveLength(0)
  })

  test("an optional field has no required mark in its header", () => {
    const { headers } = mount("B", field("Nombre de strates", { required: false }))
    expect(headers()).toEqual(["Nombre de strates"])
  })
})

describe("H (single choice and sources)", () => {
  const hField = (overrides: Partial<FactorField> = {}) =>
    field("Classe", { selection: { selected: ["field_signs"], onChange: jest.fn() }, ...overrides })

  test("the class list is radios under the catalogue header, the chosen one checked", () => {
    const { rows, headers } = mount("H", hField({ value: "2" }))
    expect(headers()).toEqual([`${fr.factorDetail.choice.headers.H} *`, "Sources de la continuité"])
    const classes = rows("radio")
    expect(classes.map((r) => r.props.accessibilityLabel)).toEqual([
      "Récente",
      "Partielle",
      "Ancienne",
    ])
    expect(classes.map((r) => r.props.accessibilityState.checked)).toEqual([false, true, false])
    expect(rows("checkbox").map((r) => r.props.accessibilityState.checked)).toEqual([
      false,
      false,
      true,
    ])
  })

  test("nothing is checked while the class is empty", () => {
    const { rows } = mount("H", hField({ value: "" }))
    expect(rows("radio").every((r) => r.props.accessibilityState.checked === false)).toBe(true)
  })

  test("a tap sets the class and touches; the chosen row stays chosen when tapped again", () => {
    const onChange = jest.fn()
    const onTouch = jest.fn()
    const { rows } = mount("H", hField({ value: "2", onChange, onTouch }))
    act(() => rows("radio")[2].props.onPress())
    expect(onChange).toHaveBeenLastCalledWith("5")
    act(() => rows("radio")[1].props.onPress())
    expect(onChange).toHaveBeenLastCalledWith("2")
    expect(onChange).not.toHaveBeenCalledWith("")
    expect(onTouch).toHaveBeenCalledTimes(2)
  })

  test("the sources are optional: a tap writes the selection and does not touch the class", () => {
    const onChange = jest.fn()
    const onTouch = jest.fn()
    const { rows } = mount(
      "H",
      hField({ value: "5", onTouch, selection: { selected: ["field_signs"], onChange } }),
    )
    act(() => rows("checkbox")[0].props.onPress())
    expect(onChange).toHaveBeenCalledWith(["etat_major_map", "field_signs"])
    expect(onTouch).not.toHaveBeenCalled()
  })

  test("a missing class shows its message under the class list only", () => {
    const { byId } = mount("H", hField({ error: "Choisissez une classe", touched: true }))
    expect(textOf(byId("choice-list-H-error")[0])).toBe("Choisissez une classe")
    expect(byId("choice-list-H-evidence-error")).toHaveLength(0)
  })

  test("the sources work with no selection channel", () => {
    const { rows } = mount("H", field("Classe", { value: "0" }))
    expect(() => act(() => rows("checkbox")[1].props.onPress())).not.toThrow()
    expect(rows("checkbox")).toHaveLength(3)
  })
})
