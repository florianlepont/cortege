import React from "react"
import renderer, { act } from "react-test-renderer"
import { NoteField } from "./NoteField"
import { brandTypography } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

type StyleObject = Record<string, unknown>

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

function flatten(style: unknown): StyleObject {
  return ([] as unknown[])
    .concat(style)
    .flat(Infinity)
    .filter(Boolean)
    .reduce<StyleObject>((merged, next) => ({ ...merged, ...(next as StyleObject) }), {})
}

type Props = React.ComponentProps<typeof NoteField>

function render(props: Partial<Props> = {}) {
  const onChangeText = jest.fn()
  const onCommit = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <NoteField
        label="Note du relevé"
        value=""
        maxLength={300}
        placeholder="Contexte"
        helper="Visible par les membres qui peuvent lire ce relevé."
        counterLabel={(count) => `${count} / 300`}
        counterA11y={(count) => `${count} caractères sur 300`}
        onChangeText={onChangeText}
        onCommit={onCommit}
        minHeight={112}
        maxHeight={240}
        accessibilityLabel="Note du relevé"
        accessibilityHint="300 caractères au plus"
        testID="note-field"
        {...props}
      />,
    )
  })
  const root = tree!.root
  const input = root.findByType("TextInput" as unknown as React.ComponentType)
  const texts = root.findAllByType("Text" as unknown as React.ComponentType)
  const find = (content: string) =>
    texts.find((node) => [node.props.children].flat().join("") === content)
  return { tree: tree!, input, find, onChangeText, onCommit }
}

describe("NoteField (D-05, D-06)", () => {
  test("renders the label, a multiline input capped at maxLength and the helper line", () => {
    const { input, find } = render()
    expect(find("Note du relevé")).toBeDefined()
    expect(find("Visible par les membres qui peuvent lire ce relevé.")).toBeDefined()
    expect(input.props.multiline).toBe(true)
    expect(input.props.maxLength).toBe(300)
    expect(input.props.textAlignVertical).toBe("top")
    expect(input.props.placeholder).toBe("Contexte")
    expect(input.props.autoCapitalize).toBe("sentences")
  })

  test("the label is the 13 SemiBold section header role", () => {
    const { find } = render()
    expect(flatten(find("Note du relevé")!.props.style)).toMatchObject({
      fontSize: brandTypography.sectionHeader.fontSize,
      lineHeight: brandTypography.sectionHeader.lineHeight,
      fontFamily: "Sora-SemiBold",
      color: defaultTheme.colors.textPrimary,
    })
  })

  test("the input line height is 20 and its height bounds come from the props", () => {
    const { input } = render({ minHeight: 96, maxHeight: 144 })
    expect(flatten(input.props.style)).toMatchObject({
      lineHeight: 20,
      minHeight: 96,
      maxHeight: 144,
    })
  })

  test("typing reports the text and the counter shows n / max", () => {
    const { input, onChangeText } = render({ value: "abc" })
    act(() => {
      input.props.onChangeText("abc")
    })
    expect(onChangeText).toHaveBeenCalledWith("abc")
    const { find } = render({ value: "abc" })
    expect(find("3 / 300")).toBeDefined()
  })

  test("below 90 % the counter is secondary text and not a live region", () => {
    const { find } = render({ value: "x".repeat(269) })
    const counter = find("269 / 300")!
    expect(flatten(counter.props.style).color).toBe(defaultTheme.colors.textSecondary)
    expect(counter.props.accessibilityLiveRegion).toBeUndefined()
  })

  test("from 90 % the counter takes the warning colour and is a polite live region", () => {
    const { find } = render({ value: "x".repeat(270) })
    const counter = find("270 / 300")!
    expect(flatten(counter.props.style).color).toBe(defaultTheme.onSurface.warning)
    expect(counter.props.accessibilityLiveRegion).toBe("polite")
    expect(counter.props.accessibilityLabel).toBe("270 caractères sur 300")
  })

  test("at the limit the counter stays in warning", () => {
    const { find } = render({ value: "x".repeat(300) })
    const counter = find("300 / 300")!
    expect(flatten(counter.props.style).color).toBe(defaultTheme.onSurface.warning)
    expect(counter.props.accessibilityLiveRegion).toBe("polite")
  })

  test("blur commits the raw current text once", () => {
    const { input, onCommit } = render({ value: "  une note \r\n" })
    act(() => {
      input.props.onBlur({})
    })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith("  une note \r\n")
  })

  test("accessibility label and hint come from the props", () => {
    const { input } = render({
      accessibilityLabel: "Note du facteur Genres",
      accessibilityHint: "300 caractères au plus",
    })
    expect(input.props.accessibilityLabel).toBe("Note du facteur Genres")
    expect(input.props.accessibilityHint).toBe("300 caractères au plus")
    expect(input.props.testID).toBe("note-field")
  })

  test("autoFocus is forwarded to the input", () => {
    const { input } = render({ autoFocus: true })
    expect(input.props.autoFocus).toBe(true)
  })
})
