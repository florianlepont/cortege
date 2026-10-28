import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"
import { DmhCountFields } from "./DmhCountFields"

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
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => "light",
  }
})

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/feedback", () => ({ feedback: { selection: jest.fn() } }))

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

function mount(props: Partial<React.ComponentProps<typeof DmhCountFields>> = {}) {
  const onChangeSurface = jest.fn()
  const element = (next: Partial<React.ComponentProps<typeof DmhCountFields>>) => (
    <DmhCountFields
      surfaceText=""
      zoneSurfaceHa={null}
      onChangeSurface={onChangeSurface}
      {...next}
    />
  )
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element(props))
  })
  const byId = (id: string) => tree.root.findAll((n) => n.props.testID === id)
  // The typed field exists while the value is being edited: tap the value first.
  const surface = () => {
    act(() => byId("dmh-surface-stepper-value")[0].props.onPress())
    return byId("dmh-surface-field")[0]
  }
  return {
    byId,
    tree,
    onChangeSurface,
    surface,
    update: (next: Partial<React.ComponentProps<typeof DmhCountFields>>) =>
      act(() => tree.update(element({ ...props, ...next }))),
    fromRoute: () =>
      tree.root.findAll(
        (n) => typeof n.type === "string" && n.props.testID === "surface-from-route",
      ),
  }
}

describe("DmhCountFields", () => {
  test("renders only the surface row, with its label and a decimal keyboard: no counter row", () => {
    const { tree, surface, byId } = mount()
    expect(textOf(tree.root)).toContain(t.dmhSurfaceLabel)
    expect(byId("dmh-surface-block")).not.toHaveLength(0)
    expect(
      tree.root.findAll(
        (n) => typeof n.props.testID === "string" && n.props.testID.startsWith("dmh-count-"),
      ),
    ).toHaveLength(0)
    expect(surface().props.keyboardType).toBe("decimal-pad")
  })

  test("the capsule steps a tenth of a hectare", () => {
    const { byId, onChangeSurface } = mount({ surfaceText: "1,2" })
    const up = byId("dmh-surface-stepper-increase")[0]
    act(() => up.props.onPressIn())
    act(() => up.props.onPressOut())
    act(() => up.props.onPress())
    expect(onChangeSurface).toHaveBeenLastCalledWith("1,3")
  })

  test("F's surface starts from the route's zone, once, and says where it comes from", () => {
    const { update, onChangeSurface, surface, fromRoute } = mount({ zoneSurfaceHa: 1.2 })
    expect(onChangeSurface).toHaveBeenCalledTimes(1)
    expect(onChangeSurface).toHaveBeenCalledWith("1,2")
    expect(fromRoute()).toHaveLength(0)
    update({ zoneSurfaceHa: 1.2, surfaceText: "1,2" })
    expect(onChangeSurface).toHaveBeenCalledTimes(1)
    expect(fromRoute()).toHaveLength(1)
    expect(textOf(fromRoute()[0])).toBe(t.fromRoute)
    expect(surface().props.value).toBe("1,2")
  })

  test("F's surface is editable: the caption goes away, the typed value is never replaced", () => {
    const { update, onChangeSurface, surface, fromRoute } = mount({
      zoneSurfaceHa: 1.2,
      surfaceText: "1,2",
    })
    expect(onChangeSurface).not.toHaveBeenCalled()
    const field = surface()
    act(() => field.props.onChangeText("2"))
    act(() => field.props.onBlur())
    expect(onChangeSurface).toHaveBeenCalledWith("2")
    update({ surfaceText: "2" })
    expect(fromRoute()).toHaveLength(0)
    update({ surfaceText: "" })
    expect(onChangeSurface).toHaveBeenCalledTimes(1)
  })

  test("a value already there is not overwritten, and no zone means no prefill", () => {
    expect(mount({ zoneSurfaceHa: 1.2, surfaceText: "3" }).onChangeSurface).not.toHaveBeenCalled()
    expect(mount({ zoneSurfaceHa: null }).onChangeSurface).not.toHaveBeenCalled()
  })

  test("a locked page writes nothing and cannot be edited", () => {
    const { byId, onChangeSurface } = mount({ zoneSurfaceHa: 1.2, editable: false })
    expect(onChangeSurface).not.toHaveBeenCalled()
    expect(byId("dmh-surface-stepper-increase")).toHaveLength(0)
  })
})
