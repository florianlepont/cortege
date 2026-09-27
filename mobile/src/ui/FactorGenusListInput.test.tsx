import React from "react"
import renderer, { act } from "react-test-renderer"
import { CNPF_FACTOR_A_GENUS_CODES } from "@cortege/ibp-domain"
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

function findChips(tree: renderer.ReactTestRenderer) {
  return tree.root.findAll(
    (n) => (n.type as unknown) === "Pressable" && n.props.accessibilityState !== undefined,
  )
}

describe("FactorGenusListInput", () => {
  it("renders one chip per CNPF genus code, none withheld", () => {
    const { tree } = render("")
    expect(findChips(tree)).toHaveLength(CNPF_FACTOR_A_GENUS_CODES.length)
  })

  it("marks chips selected/unselected from the comma-joined value", () => {
    const { tree } = render("Fagus,Quercus_deciduae")
    const chips = findChips(tree)
    const fagusIndex = CNPF_FACTOR_A_GENUS_CODES.indexOf("Fagus")
    const acerIndex = CNPF_FACTOR_A_GENUS_CODES.indexOf("Acer")
    expect(chips[fagusIndex].props.accessibilityState.selected).toBe(true)
    expect(chips[acerIndex].props.accessibilityState.selected).toBe(false)
  })

  it("toggling an unselected chip adds its genus code and calls onTouch", () => {
    const { tree, onChange, onTouch } = render("Fagus")
    const chips = findChips(tree)
    const acerIndex = CNPF_FACTOR_A_GENUS_CODES.indexOf("Acer")
    act(() => {
      chips[acerIndex].props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith("Fagus,Acer")
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  it("toggling a selected chip removes its genus code", () => {
    const { tree, onChange } = render("Fagus,Acer")
    const chips = findChips(tree)
    const fagusIndex = CNPF_FACTOR_A_GENUS_CODES.indexOf("Fagus")
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
})
