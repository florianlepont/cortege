import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandFontScaleCaps } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { PARCEL_CARD } from "./layout-budget"
import { ParcelSelectionCard, type ParcelSelectionCardProps } from "./ParcelSelectionCard"

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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/AppCard", () => ({ AppCard: "AppCard" }))
jest.mock("../../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../../app/theme", () => ({
  ...jest.requireActual("../../app/theme"),
  useBrandTheme: () => defaultTheme,
}))

const t = fr.parcelSelection

let tree: ReactTestRenderer

function styleOf(node: ReactTestInstance): Record<string, unknown> {
  return [node.props.style].flat(3).reduce(
    (acc: Record<string, unknown>, item: Record<string, unknown> | null | undefined) => ({
      ...acc,
      ...(item ?? {}),
    }),
    {},
  )
}

function mount(overrides: Partial<ParcelSelectionCardProps> = {}) {
  const onDone = jest.fn()
  const props: ParcelSelectionCardProps = {
    hasSelection: false,
    selectionLabel: "2 parcelles sélectionnées",
    saving: false,
    wizard: false,
    onDone,
    ...overrides,
  }
  act(() => {
    tree = renderer.create(<ParcelSelectionCard {...props} />)
  })
  const texts = tree.root.findAllByType("Text" as never)
  const textOf = (node: ReactTestInstance) => String([node.props.children].flat().join(""))
  return {
    onDone,
    texts,
    textOf,
    button: tree.root.findByType("AppButton" as never),
    card: tree.root.findByType("AppCard" as never),
    icons: tree.root.findAllByType("Ionicons" as never),
    findText: (value: string) => texts.find((node) => textOf(node) === value),
  }
}

afterEach(() => {
  act(() => tree.unmount())
})

describe("ParcelSelectionCard", () => {
  test("without a selection: the title, one line of help and the button, nothing else", () => {
    const { findText, button, icons, texts } = mount()
    const title = findText(t.noSelection)
    expect(title?.props.numberOfLines).toBe(2)
    expect(title?.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.title)
    const meta = findText(t.selectionHelper)
    expect(meta?.props.numberOfLines).toBe(PARCEL_CARD.metaMaxLines)
    expect(styleOf(meta as ReactTestInstance).color).toBe(defaultTheme.colors.textSecondary)
    expect(texts).toHaveLength(2)
    expect(icons).toHaveLength(0)
    expect(button.props.size).toBe("lg")
    expect(button.props.label).toBe(t.done)
    expect(button.props.leadingIcon).toBeUndefined()
    expect(button.props.disabled).toBe(false)
  })

  test("with a selection: only the selection label and the button (no helper, no count)", () => {
    const { findText, texts, card } = mount({ hasSelection: true })
    expect(texts).toHaveLength(1)
    expect(findText("2 parcelles sélectionnées")).toBeDefined()
    expect(findText(t.noSelection)).toBeUndefined()
    expect(findText(t.selectionHelper)).toBeUndefined()
    expect(card.props.padding).toBe(PARCEL_CARD.padding)
  })

  test("the title uses the headline size", () => {
    const { findText } = mount({ hasSelection: true })
    const style = styleOf(findText("2 parcelles sélectionnées") as ReactTestInstance)
    expect(style.fontSize).toBe(17)
    expect(style.lineHeight).toBe(PARCEL_CARD.titleLineHeight)
  })

  test("in the wizard the button reads Continuer and stays disabled without a parcel", () => {
    const { button } = mount({ wizard: true })
    expect(button.props.label).toBe(t.continue)
    expect(button.props.leadingIcon).toBeUndefined()
    expect(button.props.disabled).toBe(true)
  })

  test("in the wizard with a selection the button is enabled and fires onDone once", () => {
    const { button, onDone } = mount({ wizard: true, hasSelection: true })
    expect(button.props.disabled).toBe(false)
    act(() => button.props.onPress())
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  test("while saving the label is Enregistrement and the button is disabled", () => {
    const { button } = mount({ saving: true, hasSelection: true })
    expect(button.props.label).toBe(t.saving)
    expect(button.props.leadingIcon).toBe("hourglass-outline")
    expect(button.props.disabled).toBe(true)
  })
})
