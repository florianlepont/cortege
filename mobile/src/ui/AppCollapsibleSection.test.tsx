import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppCollapsibleSection } from "./AppCollapsibleSection"

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
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, flatten: (s: unknown) => s },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppText", () => ({ AppText: "Text" }))

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

function mount(props: Partial<React.ComponentProps<typeof AppCollapsibleSection>> = {}) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <AppCollapsibleSection title="Cavités" {...props}>
        <React.Fragment>
          {React.createElement("Text", { testID: "body" }, "contenu")}
        </React.Fragment>
      </AppCollapsibleSection>,
    )
  })
  const header = () =>
    tree.root.find(
      (n) => (n.type as unknown) === "Pressable" && n.props.accessibilityRole === "button",
    )
  const hasBody = () => tree.root.findAll((n) => n.props.testID === "body").length > 0
  const chevron = () => tree.root.find((n) => (n.type as unknown) === "Ionicons")
  const texts = () =>
    tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => n.props.children)
  return { tree, header, hasBody, chevron, texts }
}

type Style = Record<string, unknown>
const flatten = (style: unknown): Style =>
  typeof style === "function"
    ? flatten(style({ pressed: false }))
    : Array.isArray(style)
      ? style.reduce<Style>((acc, item) => ({ ...acc, ...flatten(item) }), {})
      : ((style as Style | null | undefined) ?? {})

describe("AppCollapsibleSection", () => {
  test("is collapsed by default and the header toggles the body", () => {
    const { header, hasBody } = mount()
    expect(hasBody()).toBe(false)
    expect(header().props.accessibilityState).toEqual({ expanded: false })
    act(() => header().props.onPress())
    expect(hasBody()).toBe(true)
    expect(header().props.accessibilityState).toEqual({ expanded: true })
    act(() => header().props.onPress())
    expect(hasBody()).toBe(false)
  })

  test("defaultExpanded opens the body at mount", () => {
    const { hasBody } = mount({ defaultExpanded: true })
    expect(hasBody()).toBe(true)
  })

  test("without testID and label the header keeps the default toggle label", () => {
    const { header } = mount()
    expect(header().props.accessibilityLabel).toBe(
      fr.components.collapsibleSection.toggleLabel({ title: "Cavités", expanded: false }),
    )
    expect(header().props.testID).toBeUndefined()
  })

  test("a testID and an accessibility label go to the header", () => {
    const { header } = mount({
      testID: "dmh-section-cavities",
      accessibilityLabel: "Cavités, 1 sur 4",
    })
    expect(header().props.testID).toBe("dmh-section-cavities")
    expect(header().props.accessibilityLabel).toBe("Cavités, 1 sur 4")
  })

  test("the boxed variant keeps its border, its chip badge and its down chevron", () => {
    const { chevron, tree } = mount({ badge: "1 sur 4" })
    expect(chevron().props.name).toBe("chevron-down-outline")
    expect(chevron().props.size).toBe(14)
    const box = tree.root.findAll(
      (n) =>
        flatten(n.props.style).borderWidth === 1 && flatten(n.props.style).overflow === "hidden",
    )
    expect(box.length).toBeGreaterThan(0)
  })
})

describe("AppCollapsibleSection, grouped variant (redesign A-C2)", () => {
  test("the header is a plain row: sentence-case title, plain count, forward chevron", () => {
    const { header, texts, chevron, tree } = mount({
      variant: "grouped",
      badge: "1 sur 4",
      testID: "dmh-section-cavities",
    })
    expect(texts()).toEqual(["Cavités", "1 sur 4"])
    const title = tree.root.find(
      (n) => (n.type as unknown) === "Text" && n.props.children === "Cavités",
    )
    const titleStyle = flatten(title.props.style)
    expect(titleStyle).toMatchObject({
      fontFamily: "Sora-SemiBold",
      fontSize: 13,
      lineHeight: 18,
      color: defaultTheme.colors.textSecondary,
    })
    expect(titleStyle.textTransform).toBeUndefined()
    expect(titleStyle.letterSpacing).toBeUndefined()
    const count = tree.root.find(
      (n) => (n.type as unknown) === "Text" && n.props.children === "1 sur 4",
    )
    expect(flatten(count.props.style)).toMatchObject({
      fontFamily: "Jost-SemiBold",
      fontSize: 12,
      color: defaultTheme.colors.textSecondary,
    })
    expect(chevron().props).toMatchObject({
      name: "chevron-forward-outline",
      size: 16,
      color: defaultTheme.colors.textSecondary,
    })
    const style = flatten(header().props.style)
    expect(style.minHeight).toBe(44)
    expect(style.paddingHorizontal).toBe(4)
    expect(flatten(header().props.style({ pressed: true })).opacity).toBe(0.6)
  })

  test("no border, no clipping, no chip", () => {
    const { tree } = mount({ variant: "grouped", badge: "1 sur 4", defaultExpanded: true })
    const framed = tree.root.findAll((n) => {
      const style = flatten(n.props.style)
      return style.borderWidth !== undefined || style.borderTopWidth !== undefined
    })
    expect(framed).toHaveLength(0)
    const clipped = tree.root.findAll((n) => flatten(n.props.style).overflow === "hidden")
    expect(clipped).toHaveLength(0)
  })

  test("toggles like the boxed one and keeps testID, expanded state and label", () => {
    const { header, hasBody } = mount({
      variant: "grouped",
      testID: "dmh-section-cavities",
      accessibilityLabel: "Cavités, 1 groupe sur 4 coché",
    })
    expect(header().props.testID).toBe("dmh-section-cavities")
    expect(header().props.accessibilityLabel).toBe("Cavités, 1 groupe sur 4 coché")
    expect(header().props.accessibilityState).toEqual({ expanded: false })
    expect(hasBody()).toBe(false)
    act(() => header().props.onPress())
    expect(header().props.accessibilityState).toEqual({ expanded: true })
    expect(hasBody()).toBe(true)
    act(() => header().props.onPress())
    expect(hasBody()).toBe(false)
  })

  test("the chevron points right closed and a quarter turn down when mounted open", () => {
    const rotationOf = (tree: renderer.ReactTestRenderer): unknown => {
      const turning = tree.root.find(
        (n) => Array.isArray(flatten(n.props.style).transform) && n.children.length > 0,
      )
      return (flatten(turning.props.style).transform as { rotate: string }[])[0].rotate
    }
    const closed = mount({ variant: "grouped" })
    expect(rotationOf(closed.tree)).toBe("0deg")
    const open = mount({ variant: "grouped", defaultExpanded: true })
    expect(rotationOf(open.tree)).toBe("90deg")
  })
})
