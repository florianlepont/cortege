import React from "react"
import renderer, { act } from "react-test-renderer"
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
  return { header, hasBody }
}

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
})
