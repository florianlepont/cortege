import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import {
  allowedFactorAGenusCodes,
  CNPF_FACTOR_A_GENUS_CODES,
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  type IbpCas,
} from "@cortege/ibp-domain"
import { sortGenusCodes } from "../../app/genus-order"
import { fr } from "../../i18n"
import { GenusChoice } from "./GenusChoice"

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

const textOf = (node: ReactTestInstance): string =>
  node.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("")

function mount(props: Partial<React.ComponentProps<typeof GenusChoice>> = {}) {
  const onChange = jest.fn()
  const onTouch = jest.fn()
  const element = (extra: Partial<React.ComponentProps<typeof GenusChoice>>) => (
    <GenusChoice
      title={fr.factorDetail.fieldLabels.genera}
      value=""
      onChange={onChange}
      touched={false}
      onTouch={onTouch}
      methodVersion={IBP_METHOD_V3_2}
      ibpCas={2}
      {...props}
      {...extra}
    />
  )
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element({}))
  })
  const rows = () =>
    tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Pressable" && String(n.props.testID).startsWith("choice-row-A-"),
    )
  const search = () => tree.root.findByType("TextInput" as unknown as React.ElementType)
  const type = (text: string) => act(() => search().props.onChangeText(text))
  const header = () =>
    tree.root.find((n) => (n.type as unknown) === "Text" && n.props.accessibilityRole === "header")
  const texts = () => tree.root.findAll((n) => (n.type as unknown) === "Text").map(textOf)
  return {
    tree,
    onChange,
    onTouch,
    rows,
    search,
    type,
    header,
    texts,
    update: (extra: Partial<React.ComponentProps<typeof GenusChoice>>) =>
      act(() => tree.update(element(extra))),
  }
}

describe("GenusChoice", () => {
  test("lists every genus in Latin order with the Latin-first label, none ticked", () => {
    const { rows } = mount()
    const expected = sortGenusCodes(CNPF_FACTOR_A_GENUS_CODES).map((code) =>
      fr.genus.latinLabel(code),
    )
    expect(rows().map((r) => r.props.accessibilityLabel)).toEqual(expected)
    expect(rows().every((r) => r.props.accessibilityState.checked === false)).toBe(true)
    expect(rows()[0].props.accessibilityRole).toBe("checkbox")
  })

  test("the header is the field label, with the count of ticked genera beside it", () => {
    const { header, texts, update } = mount()
    expect(textOf(header())).toBe("Genres autochtones observés")
    expect(texts()).toContain("Aucun sélectionné")
    update({ value: "Fagus,Acer" })
    expect(texts()).toContain("2 sélectionnés")
  })

  test("the stored genera are ticked and keep their place in the list", () => {
    const { rows } = mount({ value: "Quercus_deciduae,Abies" })
    const ticked = rows().filter((r) => r.props.accessibilityState.checked)
    expect(ticked.map((r) => r.props.testID)).toEqual([
      "choice-row-A-Abies",
      "choice-row-A-Quercus_deciduae",
    ])
    expect(rows()[0].props.testID).toBe("choice-row-A-Abies")
  })

  test("a tap writes the comma-joined value in the order chosen and touches the field", () => {
    const { rows, onChange, onTouch, update } = mount()
    const fagus = rows().find((r) => r.props.testID === "choice-row-A-Fagus")!
    act(() => fagus.props.onPress())
    expect(onChange).toHaveBeenLastCalledWith("Fagus")
    update({ value: "Fagus" })
    const acer = rows().find((r) => r.props.testID === "choice-row-A-Acer")!
    act(() => acer.props.onPress())
    expect(onChange).toHaveBeenLastCalledWith("Fagus,Acer")
    update({ value: "Fagus,Acer" })
    const again = rows().find((r) => r.props.testID === "choice-row-A-Fagus")!
    act(() => again.props.onPress())
    expect(onChange).toHaveBeenLastCalledWith("Acer")
    expect(onTouch).toHaveBeenCalledTimes(3)
  })

  test("the search ignores case and accents and reads the Latin and the French name", () => {
    const { rows, type } = mount()
    type("FAGUS")
    expect(rows().map((r) => r.props.testID)).toEqual(["choice-row-A-Fagus"])
    type("hetre")
    expect(rows().map((r) => r.props.testID)).toContain("choice-row-A-Fagus")
    type("  hêtre  ")
    expect(rows().map((r) => r.props.testID)).toContain("choice-row-A-Fagus")
    expect(rows().length).toBeLessThan(CNPF_FACTOR_A_GENUS_CODES.length)
  })

  test("a search that matches nothing says so, and clearing it brings the whole list back", () => {
    const { rows, type, tree, texts } = mount()
    type("zzzz")
    expect(rows()).toHaveLength(0)
    expect(texts()).toContain(fr.factorDetail.choice.search.empty)
    const clear = tree.root.find(
      (n) => (n.type as unknown) === "Pressable" && n.props.testID === "choice-search-A-clear",
    )
    act(() => clear.props.onPress())
    expect(rows()).toHaveLength(CNPF_FACTOR_A_GENUS_CODES.length)
    expect(texts()).not.toContain(fr.factorDetail.choice.search.empty)
  })

  test("the search never changes the selection: hidden ticked genera stay counted", () => {
    const { rows, type, texts, onChange } = mount({ value: "Fagus,Acer" })
    type("abies")
    expect(rows().every((r) => r.props.accessibilityState.checked === false)).toBe(true)
    expect(texts()).toContain("2 sélectionnés")
    expect(onChange).not.toHaveBeenCalled()
  })

  test("the field is named, with the Chercher un genre placeholder", () => {
    const { search } = mount()
    expect(search().props.placeholder).toBe("Chercher un genre")
    expect(search().props.accessibilityLabel).toBe(fr.factorDetail.choice.search.a11yLabel)
  })

  test("an error shows only once the field is touched", () => {
    const hidden = mount({ error: "Choisissez" })
    expect(hidden.texts()).not.toContain("Choisissez")
    const shown = mount({ error: "Choisissez", touched: true })
    expect(shown.texts()).toContain("Choisissez")
  })

  describe("the list follows the survey's method case (follow-up 32-33)", () => {
    const ids = (rows: () => ReactTestInstance[]) =>
      rows().map((r) => String(r.props.testID).replace("choice-row-A-", ""))
    const SUPPLEMENTARY = ["Ceratonia", "Cercis", "Olea", "Phillyrea", "Pistacia"]

    test.each([2, 4] as IbpCas[])(
      "cas %i offers the 34 classes, the Mediterranean ones included",
      (cas) => {
        const { rows } = mount({ ibpCas: cas })
        expect(ids(rows).sort()).toEqual([...allowedFactorAGenusCodes(cas)].sort())
        expect(ids(rows)).toHaveLength(34)
        expect(ids(rows)).toEqual(expect.arrayContaining(SUPPLEMENTARY))
      },
    )

    test.each([1, 3] as IbpCas[])("cas %i offers the 29 main classes only", (cas) => {
      const { rows } = mount({ ibpCas: cas })
      expect(ids(rows)).toHaveLength(29)
      for (const code of SUPPLEMENTARY) expect(ids(rows)).not.toContain(code)
    })

    test("v3.0 has no cas: the main classes only, whatever cas value is passed", () => {
      const { rows } = mount({ methodVersion: IBP_METHOD_V3_0, ibpCas: 2 })
      expect(ids(rows)).toHaveLength(29)
    })

    test("a v3.2 survey with no cas yet offers the main classes", () => {
      const { rows } = mount({ ibpCas: null })
      expect(ids(rows)).toHaveLength(29)
    })

    test("changing the cas changes the options", () => {
      const { rows, update } = mount({ ibpCas: 1 })
      expect(ids(rows)).not.toContain("Olea")
      update({ ibpCas: 4 })
      expect(ids(rows)).toContain("Olea")
      update({ ibpCas: 3 })
      expect(ids(rows)).not.toContain("Olea")
    })

    test("a ticked genus the case does not count stays listed with a quiet note, and can be unticked", () => {
      const { rows, texts, onChange } = mount({ ibpCas: 1, value: "Fagus,Olea" })
      const olea = rows().find((r) => r.props.testID === "choice-row-A-Olea")!
      expect(olea.props.accessibilityState.checked).toBe(true)
      expect(olea.props.accessibilityLabel).toBe(
        `${fr.genus.latinLabel("Olea")}, ${fr.factorDetail.choice.notCountedCas}`,
      )
      expect(texts().filter((t) => t === fr.factorDetail.choice.notCountedCas)).toHaveLength(1)
      // The counted genus carries no note.
      const fagus = rows().find((r) => r.props.testID === "choice-row-A-Fagus")!
      expect(fagus.props.accessibilityLabel).toBe(fr.genus.latinLabel("Fagus"))
      act(() => olea.props.onPress())
      expect(onChange).toHaveBeenLastCalledWith("Fagus")
    })

    test("the note names the method under v3.0, and the search still reaches the kept genus", () => {
      const { texts, type, rows } = mount({
        methodVersion: IBP_METHOD_V3_0,
        ibpCas: null,
        value: "Olea",
      })
      expect(texts()).toContain(fr.factorDetail.choice.notCountedMethod)
      type("olea")
      expect(ids(rows)).toEqual(["Olea"])
      type("pistacia")
      expect(rows()).toHaveLength(0)
    })
  })
})
