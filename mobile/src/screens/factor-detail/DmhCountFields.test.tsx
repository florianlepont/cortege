import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
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

// The counter and the field are under test in their own files: probes that keep their props.
jest.mock("../../ui/FactorCounterInput", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    FactorCounterInput: (props: Record<string, unknown>) =>
      ReactRef.createElement("FactorCounterInput", props),
  }
})
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
  const onChangeCount = jest.fn()
  const onChangeSurface = jest.fn()
  const element = (next: Partial<React.ComponentProps<typeof DmhCountFields>>) => (
    <DmhCountFields
      methodVersion={IBP_METHOD_V3_2}
      selectedGroups={["dmh_01", "dmh_13"]}
      counts={{}}
      surfaceText=""
      zoneSurfaceHa={null}
      onChangeCount={onChangeCount}
      onChangeSurface={onChangeSurface}
      {...next}
    />
  )
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element(props))
  })
  const counter = (code: string) =>
    tree.root.findAll(
      (n) => (n.type as unknown) === "FactorCounterInput" && n.props.testID === `dmh-count-${code}`,
    )
  const surface = () =>
    tree.root.find(
      (n) => (n.type as unknown) === "AppField" && n.props.testID === "dmh-surface-field",
    )
  return {
    tree,
    onChangeCount,
    onChangeSurface,
    counter,
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
  test("one counter row per ticked group, with the group's label, plus the hint", () => {
    const { tree, counter } = mount()
    expect(counter("dmh_01")).toHaveLength(1)
    expect(counter("dmh_13")).toHaveLength(1)
    expect(counter("dmh_02")).toHaveLength(0)
    expect(counter("dmh_01")[0].props.label).toBe("1. Loges de pic")
    expect(counter("dmh_13")[0].props.label).toBe("13. Nids")
    const texts = textOf(tree.root)
    expect(texts).toContain(t.dmhTitle)
    expect(texts).toContain(t.dmhHelper)
  })

  test("no ticked group, no counter row", () => {
    const { tree } = mount({ selectedGroups: [] })
    expect(tree.root.findAll((n) => (n.type as unknown) === "FactorCounterInput")).toHaveLength(0)
  })

  test("a group with a stored count keeps its row after it is unticked", () => {
    const { counter } = mount({ selectedGroups: ["dmh_01"], counts: { dmh_13: 3 } })
    expect(counter("dmh_13")).toHaveLength(1)
    expect(counter("dmh_13")[0].props.value).toBe("3")
  })

  test("the counter shows the stored count and calls onChangeCount with a whole number", () => {
    const { counter, onChangeCount } = mount({ counts: { dmh_01: 4 } })
    expect(counter("dmh_01")[0].props.value).toBe("4")
    expect(counter("dmh_13")[0].props.value).toBe("")
    act(() => counter("dmh_01")[0].props.onChange("5"))
    act(() => counter("dmh_13")[0].props.onChange("2,6"))
    act(() => counter("dmh_13")[0].props.onChange("-3"))
    act(() => counter("dmh_13")[0].props.onChange(""))
    expect(onChangeCount).toHaveBeenNthCalledWith(1, "dmh_01", 5)
    expect(onChangeCount).toHaveBeenNthCalledWith(2, "dmh_13", 3)
    expect(onChangeCount).toHaveBeenNthCalledWith(3, "dmh_13", 0)
    expect(onChangeCount.mock.calls[3][0]).toBe("dmh_13")
    expect(Number.isNaN(onChangeCount.mock.calls[3][1])).toBe(true)
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
