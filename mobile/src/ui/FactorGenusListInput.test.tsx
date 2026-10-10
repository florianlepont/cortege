import React from "react"
import renderer, { act } from "react-test-renderer"
import { CNPF_FACTOR_A_GENUS_CODES } from "@cortege/ibp-domain"
import { sortGenusCodes } from "../app/genus-order"
import { fr } from "../i18n"
import { FactorGenusListInput } from "./FactorGenusListInput"

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
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

function render(
  value: string,
  extra: Partial<React.ComponentProps<typeof FactorGenusListInput>> = {},
) {
  const onChange = jest.fn()
  const onTouch = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorGenusListInput
        label="Genres autochtones observés"
        value={value}
        onChange={onChange}
        touched={false}
        onTouch={onTouch}
        error={null}
        testID="a-genus"
        {...extra}
      />,
    )
  })
  return { tree: tree!, onChange, onTouch }
}

function chipLabel(chip: renderer.ReactTestInstance): string {
  return String(chip.props.accessibilityLabel)
}

function findChips(tree: renderer.ReactTestRenderer) {
  return tree.root.findAll(
    (n) => (n.type as unknown) === "Pressable" && n.props.accessibilityState !== undefined,
  )
}

const ORDERED = sortGenusCodes(CNPF_FACTOR_A_GENUS_CODES)

describe("FactorGenusListInput", () => {
  it("renders one chip per CNPF genus code, none withheld", () => {
    const { tree } = render("")
    expect(findChips(tree)).toHaveLength(CNPF_FACTOR_A_GENUS_CODES.length)
  })

  it("marks chips selected/unselected from the comma-joined value", () => {
    const { tree } = render("Fagus,Quercus_deciduae")
    const chips = findChips(tree)
    const fagusIndex = ORDERED.indexOf("Fagus")
    const acerIndex = ORDERED.indexOf("Acer")
    expect(chips[fagusIndex].props.accessibilityState.selected).toBe(true)
    expect(chips[acerIndex].props.accessibilityState.selected).toBe(false)
  })

  it("toggling an unselected chip adds its genus code and calls onTouch", () => {
    const { tree, onChange, onTouch } = render("Fagus")
    const chips = findChips(tree)
    const acerIndex = ORDERED.indexOf("Acer")
    act(() => {
      chips[acerIndex].props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith("Fagus,Acer")
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  it("toggling a selected chip removes its genus code", () => {
    const { tree, onChange } = render("Fagus,Acer")
    const chips = findChips(tree)
    const fagusIndex = ORDERED.indexOf("Fagus")
    act(() => {
      chips[fagusIndex].props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith("Acer")
  })

  it("shows the selected-count label", () => {
    const { tree } = render("Fagus,Acer")
    const texts = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && String(n.props.children) === "2 sélectionnés",
    )
    expect(texts.length).toBeGreaterThan(0)
  })

  it("renders the chips in Latin order with Latin-first labels", () => {
    const { tree } = render("")
    const labels = findChips(tree).map(chipLabel)
    expect(labels).toEqual(ORDERED.map((code) => fr.genus.latinLabel(code)))
    expect(labels[0]).toBe("Abies (Sapin)")
    expect(labels.indexOf("Ceratonia (Caroubier)")).toBe(labels.indexOf("Celtis (Micocoulier)") + 1)
  })

  it("keeps the click order in the stored value, whatever the display order", () => {
    const { tree, onChange, onTouch } = render("Fagus")
    const chips = findChips(tree)
    const index = findChips(tree).findIndex((c) => chipLabel(c) === "Ceratonia (Caroubier)")
    act(() => {
      chips[index].props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith("Fagus,Ceratonia")
    expect(onTouch).toHaveBeenCalledTimes(1)
  })
})
