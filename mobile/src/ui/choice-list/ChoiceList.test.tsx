import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { defaultTheme } from "../../app/theme"
import { brandSpacing4 } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { SELECTION_CIRCLE_SIZE } from "../SelectionCircle"
import { CHOICE_LABEL_INSET, createChoiceListStyles } from "./choice-list.styles"
import { ChoiceList, type ChoiceOption } from "./ChoiceList"
import { ChoiceSearchField } from "./ChoiceSearchField"

const mockSelection = jest.fn()
jest.mock("../feedback", () => ({ feedback: { selection: () => mockSelection() } }))

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

beforeEach(() => mockSelection.mockClear())

const OPTIONS: ChoiceOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Bravo" },
  { value: "c", label: "Charlie" },
]

type Props = Partial<React.ComponentProps<typeof ChoiceList>>

function mount(props: Props = {}) {
  const onChoose = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <ChoiceList
        factor="B"
        testID="choice-list-B"
        title="Nombre de strates *"
        mode="multi"
        options={OPTIONS}
        selected={new Set(["b"])}
        onChoose={onChoose}
        {...props}
      />,
    )
  })
  const rows = () =>
    tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Pressable" && String(n.props.testID).startsWith("choice-row-"),
    )
  const byId = (id: string) =>
    tree.root.findAll((n) => typeof n.type === "string" && n.props.testID === id)
  return { tree, onChoose, rows, byId }
}

const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? style.reduce<Record<string, unknown>>((acc, item) => ({ ...acc, ...flatten(item) }), {})
    : ((style as Record<string, unknown> | null | undefined) ?? {})

const textOf = (node: ReactTestInstance): string =>
  node.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("")

describe("ChoiceList", () => {
  test("a header, then one row per option with the factor and value in its test id", () => {
    const { rows, tree } = mount()
    expect(rows().map((row) => row.props.testID)).toEqual([
      "choice-row-B-a",
      "choice-row-B-b",
      "choice-row-B-c",
    ])
    const header = tree.root.find(
      (n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header",
    )
    expect(textOf(header)).toBe("Nombre de strates *")
  })

  test("a multi list reads as checkboxes with the checked state and the visible label", () => {
    const { rows } = mount()
    expect(rows().map((row) => row.props.accessibilityRole)).toEqual([
      "checkbox",
      "checkbox",
      "checkbox",
    ])
    expect(rows().map((row) => row.props.accessibilityState)).toEqual([
      { checked: false },
      { checked: true },
      { checked: false },
    ])
    expect(rows().map((row) => row.props.accessibilityLabel)).toEqual(["Alpha", "Bravo", "Charlie"])
  })

  test("a single list reads as radios, checked and selected on the chosen row", () => {
    const { rows } = mount({ mode: "single", selected: new Set(["c"]) })
    expect(rows().map((row) => row.props.accessibilityRole)).toEqual(["radio", "radio", "radio"])
    expect(rows()[2].props.accessibilityState).toEqual({ checked: true, selected: true })
    expect(rows()[0].props.accessibilityState).toEqual({ checked: false, selected: false })
  })

  test("a tap reports the value and gives the selection haptic, ticked row or not", () => {
    const { rows, onChoose } = mount()
    act(() => rows()[0].props.onPress())
    act(() => rows()[1].props.onPress())
    expect(onChoose.mock.calls).toEqual([["a"], ["b"]])
    expect(mockSelection).toHaveBeenCalledTimes(2)
  })

  test("a row is a 56 pt target, soft fill while pressed, and no scale or ripple", () => {
    const { rows } = mount()
    const styleOf = (pressed: boolean) => flatten(rows()[0].props.style({ pressed }))
    expect(styleOf(false).minHeight).toBe(56)
    expect(styleOf(false).backgroundColor).toBeUndefined()
    expect(styleOf(true).backgroundColor).toBe(defaultTheme.colors.surfaceSoft)
  })

  test("hairlines start under the labels", () => {
    const { tree } = mount()
    expect(CHOICE_LABEL_INSET).toBe(brandSpacing4.md + SELECTION_CIRCLE_SIZE + brandSpacing4.smd)
    const dividers = tree.root.findAll(
      (n) => (n.type as unknown) === "View" && flatten(n.props.style).height === 1,
    )
    expect(dividers).toHaveLength(2)
    expect(dividers.every((d) => flatten(d.props.style).marginLeft === CHOICE_LABEL_INSET)).toBe(
      true,
    )
  })

  test("the count sits in the header, a note and the error under the list", () => {
    const { byId } = mount({ countText: "1 sélectionné", note: "Une note", error: "Choisissez" })
    expect(byId("choice-list-B-note")).toHaveLength(1)
    const error = byId("choice-list-B-error")[0]
    expect(textOf(error)).toBe("Choisissez")
    expect(error.props.accessibilityRole).toBe("alert")
    expect(error.props.accessibilityLiveRegion).toBe("polite")
    expect(flatten(error.props.style).color).toBe(defaultTheme.fieldState.error.text)
  })

  test("no count, note or error: nothing of them is drawn", () => {
    const { byId, tree } = mount()
    expect(byId("choice-list-B-note")).toHaveLength(0)
    expect(byId("choice-list-B-error")).toHaveLength(0)
    expect(tree.root.findAll((n) => (n.type as unknown) === "Text")).toHaveLength(4)
  })

  test("no option: the empty line stands in for the list, or nothing without one", () => {
    const withLine = mount({ options: [], emptyText: "Rien ici" })
    expect(textOf(withLine.byId("choice-list-B-empty")[0])).toBe("Rien ici")
    expect(withLine.byId("choice-list-B-empty")[0].props.accessibilityLiveRegion).toBe("polite")
    expect(withLine.rows()).toHaveLength(0)
    const without = mount({ options: [] })
    expect(without.byId("choice-list-B-empty")).toHaveLength(0)
  })

  test("the slot above the list sits between the header and the rows", () => {
    const { tree } = mount({ above: <ChoiceSearchProbe /> })
    const names = tree.root
      .findAll((n) => typeof n.type === "string")
      .map((n) => n.type as unknown as string)
    expect(names.indexOf("Text")).toBeLessThan(names.indexOf("Probe"))
    expect(names.indexOf("Probe")).toBeLessThan(names.indexOf("Pressable"))
  })

  test("the styles carry no literal colour: the header is the secondary ink", () => {
    const styles = createChoiceListStyles(defaultTheme)
    expect(styles.title.color).toBe(defaultTheme.colors.textSecondary)
    expect(styles.label.color).toBe(defaultTheme.colors.textPrimary)
  })
})

function ChoiceSearchProbe() {
  return React.createElement("Probe")
}

describe("ChoiceSearchField", () => {
  const mountField = (value: string) => {
    const onChangeText = jest.fn()
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <ChoiceSearchField
          value={value}
          onChangeText={onChangeText}
          placeholder={fr.factorDetail.choice.search.placeholder}
          a11yLabel={fr.factorDetail.choice.search.a11yLabel}
          clearLabel={fr.factorDetail.choice.search.clear}
          testID="field"
        />,
      )
    })
    return { tree, onChangeText }
  }

  test("a magnifier, the placeholder and the text; the cross only once something is typed", () => {
    const empty = mountField("")
    const input = empty.tree.root.findByType("TextInput" as unknown as React.ElementType)
    expect(input.props.placeholder).toBe("Chercher un genre")
    expect(input.props.accessibilityRole).toBe("search")
    expect(input.props.accessibilityLabel).toBe(fr.factorDetail.choice.search.a11yLabel)
    expect(
      empty.tree.root.findAllByType("Ionicons" as unknown as React.ElementType)[0].props.name,
    ).toBe("search-outline")
    expect(empty.tree.root.findAll((n) => n.props.testID === "field-clear")).toHaveLength(0)
    act(() => input.props.onChangeText("fag"))
    expect(empty.onChangeText).toHaveBeenCalledWith("fag")

    const typed = mountField("fag")
    const clear = typed.tree.root.findAll(
      (n) => (n.type as unknown) === "Pressable" && n.props.testID === "field-clear",
    )[0]
    expect(clear.props.accessibilityLabel).toBe(fr.factorDetail.choice.search.clear)
    act(() => clear.props.onPress())
    expect(typed.onChangeText).toHaveBeenCalledWith("")
  })
})
