import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../i18n"
import { FactorChipsInput } from "./FactorChipsInput"

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

const options = fr.factorInput.strataOptions
const countLabel = (count: number): string => fr.factorInput.chips.selectedCount({ count })

type Props = React.ComponentProps<typeof FactorChipsInput>

function element(extra: Partial<Props> = {}, onSelectionChange = jest.fn(), onTouch = jest.fn()) {
  return (
    <FactorChipsInput
      label="Nombre de strates"
      options={options}
      selected={[]}
      onSelectionChange={onSelectionChange}
      touched={false}
      onTouch={onTouch}
      error={null}
      countLabel={countLabel}
      testID="b"
      {...extra}
    />
  )
}

function render(extra: Partial<Props> = {}) {
  const onSelectionChange = jest.fn()
  const onTouch = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(element(extra, onSelectionChange, onTouch))
  })
  return { tree: tree!, onSelectionChange, onTouch }
}

const chipsOf = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll(
    (n) => (n.type as unknown) === "Pressable" && n.props.accessibilityState !== undefined,
  )

const activeValues = (tree: renderer.ReactTestRenderer): boolean[] =>
  chipsOf(tree).map((chip) => chip.props.accessibilityState.selected as boolean)

const hasText = (tree: renderer.ReactTestRenderer, text: string): boolean =>
  tree.root.findAll((n) => (n.type as unknown) === "Text" && String(n.props.children) === text)
    .length > 0

describe("FactorChipsInput (D-12, controlled by the stored selection)", () => {
  test("ticks exactly the stored codes and counts them", () => {
    const { tree } = render({ selected: ["low", "high"] })
    expect(activeValues(tree)).toEqual([false, true, false, true, false])
    expect(hasText(tree, "2 sélectionnés")).toBe(true)
  })

  test("ticking a chip reports the previous list plus the code, in option order, and touches", () => {
    const { tree, onSelectionChange, onTouch } = render({ selected: ["high"] })
    act(() => {
      chipsOf(tree)[1].props.onPress()
    })
    expect(onSelectionChange).toHaveBeenCalledWith(["low", "high"])
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  test("unticking an active chip removes it", () => {
    const { tree, onSelectionChange } = render({ selected: ["low", "high"] })
    act(() => {
      chipsOf(tree)[1].props.onPress()
    })
    expect(onSelectionChange).toHaveBeenCalledWith(["high"])
  })

  test("a legacy count (no selection) ticks nothing and says how many were ticked", () => {
    const { tree, onSelectionChange } = render({ selected: null, legacyCount: 3 })
    expect(activeValues(tree).every((active) => !active)).toBe(true)
    expect(hasText(tree, fr.factorInput.chips.legacyCount({ count: 3 }))).toBe(true)
    act(() => {
      chipsOf(tree)[2].props.onPress()
    })
    expect(onSelectionChange).toHaveBeenCalledWith(["intermediate"])
  })

  test("no selection and no legacy count reads none selected", () => {
    const { tree } = render({ selected: null })
    expect(activeValues(tree).every((active) => !active)).toBe(true)
    expect(hasText(tree, "Aucun sélectionné")).toBe(true)
  })

  test("a null selection with a zero legacy count reads none selected", () => {
    const { tree } = render({ selected: null, legacyCount: 0 })
    expect(hasText(tree, "Aucun sélectionné")).toBe(true)
  })

  test("a selected code outside the options is ignored when ticking", () => {
    const { tree, onSelectionChange } = render({ selected: ["gone"] })
    act(() => {
      chipsOf(tree)[0].props.onPress()
    })
    expect(onSelectionChange).toHaveBeenCalledWith(["very_low"])
  })

  test("filled shows the filled shell state even with an empty selection", () => {
    const shellBorder = (tree: renderer.ReactTestRenderer): unknown =>
      (
        tree.root.find((n) => (n.type as unknown) === "View" && n.props.testID === "b").props
          .style as Array<{ borderColor: string }>
      )[1].borderColor
    const empty = render({ selected: [] })
    const filled = render({ selected: [], filled: true })
    expect(shellBorder(filled.tree)).not.toBe(shellBorder(empty.tree))
  })

  test("re-rendering with a new selection updates the chips", () => {
    const { tree } = render({ selected: ["low"] })
    expect(activeValues(tree)).toEqual([false, true, false, false, false])
    act(() => {
      tree.update(element({ selected: ["herbaceous"] }))
    })
    expect(activeValues(tree)).toEqual([false, false, false, false, true])
  })
})
