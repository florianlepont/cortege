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
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => "light",
  }
})

// The field is under test in its own file: a probe that keeps its props.
jest.mock("../../ui/AppField", () => {
  const ReactRef = require("react") as typeof import("react")
  return { AppField: (props: Record<string, unknown>) => ReactRef.createElement("AppField", props) }
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
  const surface = () =>
    tree.root.find(
      (n) => (n.type as unknown) === "AppField" && n.props.testID === "dmh-surface-field",
    )
  return {
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
  test("renders only the surface field: no title, no helper, no counter row", () => {
    const { tree, surface } = mount()
    expect(surface().props.label).toBe(t.dmhSurfaceLabel)
    const texts = textOf(tree.root)
    expect(texts).not.toContain(t.dmhTitle)
    expect(texts).not.toContain(t.dmhHelper)
    expect(
      tree.root.findAll(
        (n) => typeof n.props.testID === "string" && n.props.testID.startsWith("dmh-count-"),
      ),
    ).toHaveLength(0)
    expect(tree.root.findAll((n) => (n.type as unknown) === "FactorCounterInput")).toHaveLength(0)
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
    expect(surface().props.label).toBe(t.dmhSurfaceLabel)
  })

  test("F's surface is editable: the caption goes away, the typed value is never replaced", () => {
    const { update, onChangeSurface, surface, fromRoute } = mount({
      zoneSurfaceHa: 1.2,
      surfaceText: "1,2",
    })
    expect(onChangeSurface).not.toHaveBeenCalled()
    act(() => surface().props.onChangeText("2"))
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
    const { surface, onChangeSurface } = mount({ zoneSurfaceHa: 1.2, editable: false })
    expect(onChangeSurface).not.toHaveBeenCalled()
    expect(surface().props.editable).toBe(false)
  })
})
