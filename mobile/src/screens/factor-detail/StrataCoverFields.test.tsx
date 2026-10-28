import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { StrataCoverFields } from "./StrataCoverFields"

const t = fr.factorDetail.countingMode

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))
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
  jest.useFakeTimers()
})

afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
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
  const byId = (id: string) => tree.root.findAll((n) => n.props.testID === id)
  // The typed field exists while the value is being edited: tap the value first.
  const edit = (index: number) => {
    act(() => byId(`strata-stepper-${index}-value`)[0].props.onPress())
    return byId(`strata-cover-${index}`)[0]
  }
  // A track of 200 points: one point is half a percent.
  const track = (index: number) => {
    const node = byId(`strata-stepper-${index}-slider-track`)[0]
    act(() => node.props.onLayout({ nativeEvent: { layout: { width: 200 } } }))
    return node
  }
  return { tree, onChange, byId, edit, track }
}

describe("StrataCoverFields", () => {
  test("five rows in the order and with the labels of B's options, the title and the 20 percent rule", () => {
    const { tree, byId } = mount()
    for (let index = 0; index < 5; index += 1) {
      expect(byId(`strata-stepper-${index}-row`)).not.toHaveLength(0)
    }
    const texts = textOf(tree.root)
    for (const option of fr.factorInput.strataOptions) expect(texts).toContain(option.label)
    expect(texts.indexOf("Très basse")).toBeLessThan(texts.indexOf("Basse"))
    expect(texts).toContain(t.strataTitle)
    expect(texts).toContain("Une strate compte à partir de 20 %")
  })

  test("each stratum has a draggable track snapping to 5, and no -/+ capsule", () => {
    const { byId, track, onChange } = mount({ coverText: { very_low: "25" } })
    expect(byId("strata-stepper-0-increase")).toHaveLength(0)
    expect(byId("strata-stepper-0-decrease")).toHaveLength(0)
    act(() => track(0).props.onResponderMove({ nativeEvent: { locationX: 126 } }))
    expect(onChange).toHaveBeenLastCalledWith("very_low", "65")
    act(() => track(1).props.onResponderGrant({ nativeEvent: { locationX: 40 } }))
    expect(onChange).toHaveBeenLastCalledWith("low", "20")
  })

  test("typing keeps the old field's test id and calls onChange with the code and the text", () => {
    const { edit, onChange } = mount()
    const input = edit(0)
    expect(input.props.keyboardType).toBe("decimal-pad")
    act(() => input.props.onChangeText("25"))
    act(() => input.props.onBlur())
    expect(onChange).toHaveBeenLastCalledWith("very_low", "25")
  })

  test("shows the values the form holds, so a reload shows what was typed", () => {
    const { tree } = mount({ coverText: { very_low: "25", high: "40" } })
    const texts = tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => textOf(n))
    expect(texts).toContain("25 %")
    expect(texts).toContain("40 %")
    expect(texts.filter((text) => text === "0 %")).toHaveLength(3)
  })

  test("clamps what is typed to a percent from 0 to 100 (T-30-41)", () => {
    const { edit, onChange } = mount()
    const input = edit(1)
    act(() => input.props.onChangeText("250"))
    act(() => input.props.onBlur())
    expect(onChange).toHaveBeenLastCalledWith("low", "100")
  })

  test("the track stops at 100 and does not rewrite the same value", () => {
    const { track, onChange } = mount({ coverText: { high: "100" } })
    act(() => track(3).props.onResponderMove({ nativeEvent: { locationX: 400 } }))
    expect(onChange).not.toHaveBeenCalled()
    act(() => track(2).props.onResponderMove({ nativeEvent: { locationX: 400 } }))
    expect(onChange).toHaveBeenLastCalledWith("intermediate", "100")
  })

  test("shows the count the form derived in the header, only once a cover is typed", () => {
    const find = (tree: renderer.ReactTestRenderer) =>
      tree.root.findAll((n) => n.props.testID === "strata-cover-count")
    expect(find(mount({ strataCountText: "2" }).tree)).toHaveLength(0)
    const typed = mount({ coverText: { high: "30", low: "20" }, strataCountText: "2" }).tree
    expect(textOf(find(typed)[0])).toBe("2 strates comptées")
    const one = mount({ coverText: { high: "30" }, strataCountText: "1" }).tree
    expect(textOf(find(one)[0])).toBe("1 strate comptée")
  })

  test("a locked page is not editable: no track", () => {
    const { byId } = mount({ editable: false })
    expect(byId("strata-stepper-0-slider-track")).toHaveLength(0)
    expect(byId("strata-stepper-0-value")).not.toHaveLength(0)
  })

  test("v3.0 lists the same strata", () => {
    const { byId } = mount({ methodVersion: IBP_METHOD_V3_0 })
    expect(byId("strata-stepper-4-row")).not.toHaveLength(0)
  })
})
