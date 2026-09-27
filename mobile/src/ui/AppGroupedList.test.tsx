import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { AppGroupedList, type AppGroupedListSection } from "./AppGroupedList"
import { AppText as Text } from "./AppText"
import { brandColors } from "../app/brand-tokens"

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

type FlatStyle = { color?: string }

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle)) as FlatStyle
  }
  return (style ?? {}) as FlatStyle
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
    expect(row.props.accessibilityRole).toBeUndefined()
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
})
