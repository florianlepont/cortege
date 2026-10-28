import React, { createRef } from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../app/theme"
import { SheetNavBar } from "./SheetNavBar"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios" },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, flatten: (s: unknown) => s },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Pressable", props, children),
  }
})

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

type Props = React.ComponentProps<typeof SheetNavBar>

function render(props: Partial<Props> = {}) {
  const onClose = jest.fn()
  const onBack = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <SheetNavBar
        closeLabel="Fermer"
        onClose={onClose}
        scrolled={false}
        testID="bar"
        closeTestID="bar-close"
        {...props}
      />,
      { createNodeMock: () => ({ node: "title" }) },
    )
  })
  return { tree, onClose, onBack }
}

const byTestId = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.type === "string")

const textOf = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

const flat = (style: unknown) => Object.assign({}, ...[style].flat())

describe("SheetNavBar", () => {
  test("is an opaque canvas bar above the content", () => {
    const { tree } = render({ title: "Titre" })
    expect(flat(byTestId(tree, "bar")[0].props.style)).toMatchObject({
      backgroundColor: defaultTheme.semanticColors.backgroundCanvas,
      zIndex: 1,
    })
  })

  test("draws the centred title as a header and gives it the ref", () => {
    const titleRef = createRef<unknown>()
    const { tree } = render({ title: "Titre", titleRef: titleRef as never })
    const header = tree.root.find(
      (n) => typeof n.type === "string" && n.props.accessibilityRole === "header",
    )
    expect(textOf(header)).toBe("Titre")
    expect(titleRef.current).toEqual({ node: "title" })
    const title = tree.root.find((n) => (n.type as unknown) === "Text")
    expect(flat(title.props.style)).toMatchObject({ fontFamily: "Sora-SemiBold", fontSize: 17 })
  })

  test("a back control replaces the title: chevron, plain Sora-Medium label in the accent ink", () => {
    const onBack = jest.fn()
    const { tree } = render({
      title: "Titre",
      back: {
        label: "Retour",
        accessibilityLabel: "Retour au début",
        onPress: onBack,
        testID: "b",
      },
    })
    const [back] = byTestId(tree, "b")
    expect(back.props.accessibilityLabel).toBe("Retour au début")
    expect(back.props.accessibilityRole).toBe("button")
    act(() => back.props.onPress())
    expect(onBack).toHaveBeenCalledTimes(1)
    const label = tree.root
      .findAll((n) => (n.type as unknown) === "Text")
      .find((n) => textOf(n) === "Retour")!
    expect(flat(label.props.style)).toMatchObject({
      fontFamily: "Sora-Medium",
      fontSize: 17,
      color: defaultTheme.visual.accentText,
    })
    const glyph = tree.root.find(
      (n) => (n.type as unknown) === "Ionicons" && n.props.name === "chevron-back-outline",
    )
    expect(glyph.props.size).toBe(22)
    expect(
      tree.root.findAll((n) => textOf(n) === "Titre" && (n.type as unknown) === "Text"),
    ).toHaveLength(0)
  })

  test("the close control is a 44 pt target around a 30 pt glass circle with an outline glyph", () => {
    const { tree, onClose } = render({ title: "Titre" })
    const [close] = byTestId(tree, "bar-close")
    expect(close.props.accessibilityLabel).toBe("Fermer")
    expect(flat(close.props.style)).toMatchObject({ width: 44, height: 44 })
    act(() => close.props.onPress())
    expect(onClose).toHaveBeenCalledTimes(1)
    const circle = close.find((n) => typeof n.type === "string" && flat(n.props.style).width === 30)
    expect(flat(circle.props.style)).toMatchObject({
      height: 30,
      borderRadius: 15,
      borderColor: defaultTheme.visual.sheet.closeHairline,
    })
    const glyph = close.find((n) => (n.type as unknown) === "Ionicons")
    expect(glyph.props).toMatchObject({
      name: "close-outline",
      size: 16,
      color: defaultTheme.visual.sheet.closeIcon,
    })
  })

  test("the bottom hairline shows only once the content has scrolled", () => {
    const { tree } = render({ title: "Titre" })
    expect(byTestId(tree, "bar-hairline")).toHaveLength(0)
    act(() =>
      tree.update(
        <SheetNavBar closeLabel="Fermer" onClose={jest.fn()} scrolled testID="bar" title="Titre" />,
      ),
    )
    const [hairline] = byTestId(tree, "bar-hairline")
    expect(flat(hairline.props.style)).toMatchObject({
      height: 1,
      bottom: 0,
      backgroundColor: defaultTheme.colors.divider,
    })
  })

  test("the bar row is 52 high", () => {
    const { tree } = render({ title: "Titre" })
    const row = byTestId(tree, "bar")[0].children[0] as renderer.ReactTestInstance
    expect(flat(row.props.style).height).toBe(52)
  })
})
