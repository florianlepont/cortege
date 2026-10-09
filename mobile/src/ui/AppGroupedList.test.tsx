import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { AppGroupedList, type AppGroupedListSection } from "./AppGroupedList"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)

  type PressableRenderProp<T> = T | ((state: { pressed: boolean }) => T)
  const resolvePressableProp = <T,>(prop: PressableRenderProp<T> | undefined): T | undefined =>
    typeof prop === "function"
      ? (prop as (state: { pressed: boolean }) => T)({ pressed: false })
      : prop

  return {
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: PressableRenderProp<React.ReactNode>
      style?: PressableRenderProp<unknown>
    }) =>
      ReactActual.createElement(
        "Pressable",
        { ...props, style: resolvePressableProp(style) },
        resolvePressableProp(children),
      ),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    ActivityIndicator: mockComponent("ActivityIndicator"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) {
      return
    }
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

type FlatStyle = {
  color?: string
  backgroundColor?: string
  borderWidth?: number
  borderColor?: string
  boxShadow?: string
  borderRadius?: number
  overflow?: string
  paddingVertical?: number
  paddingHorizontal?: number
  minHeight?: number
  width?: number
  height?: number
  flexShrink?: number
}

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle)) as FlatStyle
  }
  return (style ?? {}) as FlatStyle
}

function findGlyph(root: ReactTestInstance, name: string): ReactTestInstance {
  const glyphs = root.findAllByType(Ionicons as unknown as React.ComponentType<object>)
  return glyphs.find((node) => node.props.name === name)!
}

function render(sections: AppGroupedListSection[]) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppGroupedList sections={sections} />)
  })
  const root = tree!.root
  const texts = root
    .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  return { root, texts }
}

describe("AppGroupedList (ACC-03)", () => {
  test("renders section titles, footers and row label/value pairs", () => {
    const { texts } = render([
      {
        key: "profile",
        title: "Profil",
        footer: "Visible par les autres membres.",
        rows: [{ key: "email", label: "Email", value: "a@b.fr", onPress: jest.fn() }],
      },
    ])
    expect(texts).toContain("Profil")
    expect(texts).toContain("Email")
    expect(texts).toContain("a@b.fr")
    expect(texts).toContain("Visible par les autres membres.")
  })

  test("a row with onPress calls it when pressed", () => {
    const onPress = jest.fn()
    const { root } = render([{ key: "s", rows: [{ key: "row", label: "Mot de passe", onPress }] }])
    act(() => {
      root.findByProps({ accessibilityLabel: "Mot de passe" }).props.onPress()
    })
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("a row without onPress is not interactive", () => {
    const { root } = render([
      { key: "s", rows: [{ key: "row", label: "Version", value: "1.0.0" }] },
    ])
    const row = root.findByProps({ accessibilityLabel: "Version" })
    expect(row.props.disabled).toBe(true)
    expect(row.props.accessibilityRole).toBe("none")
  })

  test("a disabled or loading row cannot be pressed even with onPress set", () => {
    const onPress = jest.fn()
    const { root } = render([
      {
        key: "s",
        rows: [
          { key: "a", label: "Disabled", onPress, disabled: true },
          { key: "b", label: "Loading", onPress, loading: true },
        ],
      },
    ])
    expect(root.findByProps({ accessibilityLabel: "Disabled" }).props.disabled).toBe(true)
    expect(root.findByProps({ accessibilityLabel: "Loading" }).props.disabled).toBe(true)
  })

  test("a destructive row renders in the danger colour", () => {
    const { root } = render([
      {
        key: "s",
        rows: [
          { key: "delete", label: "Supprimer mon compte", onPress: jest.fn(), destructive: true },
        ],
      },
    ])
    const label = root
      .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
      .find((node) => node.props.children === "Supprimer mon compte")
    expect(flattenStyle(label?.props.style).color).toBe(brandColors.terracotta)
  })

  test("a centered row has no chevron or value column", () => {
    const { texts } = render([
      {
        key: "s",
        rows: [
          {
            key: "signout",
            label: "Se déconnecter",
            onPress: jest.fn(),
            centered: true,
            value: "ignored",
          },
        ],
      },
    ])
    expect(texts).toContain("Se déconnecter")
    expect(texts).not.toContain("ignored")
  })

  test("a custom row renders arbitrary content", () => {
    const { texts } = render([
      {
        key: "s",
        rows: [{ key: "custom", kind: "custom", content: <Text>Custom content</Text> }],
      },
    ])
    expect(texts).toContain("Custom content")
  })

  test("a section body is a glass card (fill, hairline, shadow, radius 22)", () => {
    const { root } = render([{ key: "s", rows: [{ key: "row", label: "Version", value: "1" }] }])
    const body = root
      .findAll((node: ReactTestInstance) => (node.type as unknown) === "View")
      .map((node) => flattenStyle(node.props.style))
      .find((style) => style.borderRadius === 22)
    const glass = defaultTheme.visual.glass
    expect(body).toMatchObject({
      backgroundColor: glass.cardFill,
      borderWidth: 1,
      borderColor: glass.cardBorder,
      boxShadow: glass.cardShadow,
      overflow: "hidden",
    })
  })

  test("a nav row pads 12 by 16 and keeps a 48 pt minimum height", () => {
    const { root } = render([{ key: "s", rows: [{ key: "row", label: "Mot de passe" }] }])
    const pressable = root.find(
      (node: ReactTestInstance) =>
        (node.type as unknown) === "Pressable" && node.props.accessibilityLabel === "Mot de passe",
    )
    const row = flattenStyle(pressable.props.style)
    expect(row).toMatchObject({ paddingVertical: 12, paddingHorizontal: 16, minHeight: 48 })
  })

  test("a row with an icon renders a 28 pt moss tile holding a 20 pt accent glyph", () => {
    const { root } = render([
      {
        key: "s",
        rows: [{ key: "row", label: "Email", icon: "mail-outline", onPress: jest.fn() }],
      },
    ])
    const glyph = findGlyph(root, "mail-outline")
    expect(glyph.props).toMatchObject({
      name: "mail-outline",
      size: 20,
      color: defaultTheme.visual.glass.iconTint,
    })
    const tile = root
      .findAll((node: ReactTestInstance) => (node.type as unknown) === "View")
      .find(
        (node) =>
          flattenStyle(node.props.style).backgroundColor === defaultTheme.visual.glass.iconTile,
      )
    expect(flattenStyle(tile?.props.style)).toMatchObject({
      width: 28,
      height: 28,
      borderRadius: 12,
    })
    expect(tile?.props.accessible).toBe(false)
  })

  test("a destructive row icon uses the destructive label colour", () => {
    const { root } = render([
      {
        key: "s",
        rows: [
          {
            key: "d",
            label: "Supprimer",
            icon: "trash-outline",
            destructive: true,
            onPress: jest.fn(),
          },
        ],
      },
    ])
    const glyph = findGlyph(root, "trash-outline")
    expect(glyph.props.color).toBe(brandColors.terracotta)
  })

  test("a multiline nav row wraps its label to two lines and keeps its value whole", () => {
    const { root } = render([
      {
        key: "s",
        rows: [
          {
            key: "history",
            label: "Historique de la parcelle",
            value: "+3 depuis le relevé précédent",
            multiline: true,
            onPress: jest.fn(),
          },
        ],
      },
    ])
    const texts = root.findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    const label = texts.find((node) => node.props.children === "Historique de la parcelle")
    const value = texts.find((node) => node.props.children === "+3 depuis le relevé précédent")
    expect(label?.props.numberOfLines).toBe(2)
    expect(value?.props.numberOfLines).toBe(1)
    expect(flattenStyle(value?.props.style).flexShrink).toBe(0)
  })

  test("a nav row without multiline keeps one line for label and value", () => {
    const { root } = render([
      { key: "s", rows: [{ key: "row", label: "Email", value: "a@b.fr", onPress: jest.fn() }] },
    ])
    const texts = root.findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    const label = texts.find((node) => node.props.children === "Email")
    const value = texts.find((node) => node.props.children === "a@b.fr")
    expect(label?.props.numberOfLines).toBe(1)
    expect(value?.props.numberOfLines).toBe(1)
    expect(flattenStyle(value?.props.style).flexShrink).toBe(1)
  })

  test("a row without icon renders no tile", () => {
    const { root } = render([{ key: "s", rows: [{ key: "row", label: "Version" }] }])
    expect(root.findAllByType(Ionicons as unknown as React.ComponentType<object>)).toHaveLength(0)
    const tiles = root
      .findAll((node: ReactTestInstance) => (node.type as unknown) === "View")
      .filter((node) => flattenStyle(node.props.style).width === 28)
    expect(tiles).toHaveLength(0)
  })
})
