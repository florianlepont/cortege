import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { clampCoverText, StrataCoverFields } from "./StrataCoverFields"

const t = fr.factorDetail.countingMode

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
    TextInput: mockComponent("TextInput"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => "light",
  }
})

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

const textOf = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

function mount(props: Partial<React.ComponentProps<typeof StrataCoverFields>> = {}) {
  const onChange = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <StrataCoverFields
        methodVersion={IBP_METHOD_V3_2}
        coverText={{}}
        strataCountText=""
        onChange={onChange}
        {...props}
      />,
    )
  })
  const input = (index: number) =>
    tree.root.find(
      (n) => (n.type as unknown) === "TextInput" && n.props.testID === `strata-cover-${index}`,
    )
  return { tree, onChange, input }
}

describe("StrataCoverFields", () => {
  test("five percent fields in the order and with the labels of B's options, and the helper", () => {
    const { tree, input } = mount()
    for (let index = 0; index < 5; index += 1) {
      expect(input(index).props.keyboardType).toBe("decimal-pad")
    }
    const texts = textOf(tree.root)
    for (const option of fr.factorInput.strataOptions) expect(texts).toContain(option.label)
    expect(texts.indexOf("Très basse")).toBeLessThan(texts.indexOf("Basse"))
    expect(texts).toContain(t.strataTitle)
    expect(texts).toContain("Une strate compte à partir de 20 %")
    expect(input(0).props.accessibilityLabel).toBe(t.strataFieldA11y({ label: "Très basse" }))
  })

  test("typing calls onChange with the stratum code and the text", () => {
    const { input, onChange } = mount()
    act(() => input(0).props.onChangeText("25"))
    act(() => input(4).props.onChangeText("12,5"))
    expect(onChange).toHaveBeenNthCalledWith(1, "very_low", "25")
    expect(onChange).toHaveBeenNthCalledWith(2, "herbaceous", "12,5")
  })

  test("shows the values the form holds, so a reload shows what was typed", () => {
    const { input } = mount({ coverText: { very_low: "25", high: "40" } })
    expect(input(0).props.value).toBe("25")
    expect(input(3).props.value).toBe("40")
    expect(input(1).props.value).toBe("")
  })

  test("clamps what is typed to a percent from 0 to 100 (T-30-41)", () => {
    const { input, onChange } = mount()
    act(() => input(1).props.onChangeText("250"))
    act(() => input(1).props.onChangeText("-5"))
    act(() => input(1).props.onChangeText("1a2"))
    expect(onChange).toHaveBeenNthCalledWith(1, "low", "100")
    expect(onChange).toHaveBeenNthCalledWith(2, "low", "5")
    expect(onChange).toHaveBeenNthCalledWith(3, "low", "12")
    expect(clampCoverText("12,3,4")).toBe("12,34")
    expect(clampCoverText("100")).toBe("100")
    expect(clampCoverText("100,1")).toBe("100")
    expect(clampCoverText("")).toBe("")
  })

  test("the keyboard goes next on the first four fields and done on the last", () => {
    const { input } = mount()
    expect(input(0).props.returnKeyType).toBe("next")
    expect(input(3).props.returnKeyType).toBe("next")
    expect(input(4).props.returnKeyType).toBe("done")
  })

  test("shows the count the form derived, only once a cover is typed", () => {
    const find = (tree: renderer.ReactTestRenderer) =>
      tree.root.findAll((n) => n.props.testID === "strata-cover-count")
    expect(find(mount({ strataCountText: "2" }).tree)).toHaveLength(0)
    const typed = mount({ coverText: { high: "30", low: "20" }, strataCountText: "2" }).tree
    expect(textOf(find(typed)[0])).toBe("2 strates comptées")
    const one = mount({ coverText: { high: "30" }, strataCountText: "1" }).tree
    expect(textOf(find(one)[0])).toBe("1 strate comptée")
  })

  test("a locked page is not editable", () => {
    const { input } = mount({ editable: false })
    expect(input(0).props.editable).toBe(false)
  })

  test("v3.0 lists the same strata", () => {
    const { input } = mount({ methodVersion: IBP_METHOD_V3_0 })
    expect(input(4)).toBeDefined()
  })
})
