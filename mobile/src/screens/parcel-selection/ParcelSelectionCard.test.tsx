import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandFontScaleCaps } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { PARCEL_CARD_COMPACT } from "./layout-budget"
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
jest.mock("../../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
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
    compact: false,
    hasSelection: false,
    selectionLabel: "2 parcelles sélectionnées",
    helperText: "5 parcelles visibles",
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
    notices: tree.root.findAllByType("AppNotice" as never),
    icons: tree.root.findAllByType("Ionicons" as never),
    findText: (value: string) => texts.find((node) => textOf(node) === value),
  }
}

afterEach(() => {
  act(() => tree.unmount())
})

describe("ParcelSelectionCard, full mode", () => {
  test("without a selection: title, meta, one notice, the hint and the button", () => {
    const { findText, notices, button } = mount()
    expect(findText(t.noSelection)).toBeDefined()
    expect(findText("5 parcelles visibles")).toBeDefined()
    expect(notices).toHaveLength(1)
    expect(notices[0].props.message).toBe(t.selectionRequired)
    expect(findText(t.tapHint)).toBeDefined()
    expect(button.props.size).toBe("lg")
    expect(button.props.label).toBe(t.done)
    expect(button.props.leadingIcon).toBe("checkmark-outline")
    expect(button.props.disabled).toBe(false)
  })

  test("with a selection: the selection label, no notice, the hint", () => {
    const { findText, notices } = mount({ hasSelection: true })
    expect(findText("2 parcelles sélectionnées")).toBeDefined()
    expect(findText(t.noSelection)).toBeUndefined()
    expect(notices).toHaveLength(0)
    expect(findText(t.tapHint)).toBeDefined()
  })

  test("in the wizard the button reads Continuer and stays disabled without a parcel", () => {
    const { button } = mount({ wizard: true })
    expect(button.props.label).toBe(t.continue)
    expect(button.props.leadingIcon).toBe("arrow-forward-outline")
    expect(button.props.disabled).toBe(true)
  })

  test("in the wizard with a selection the button is enabled", () => {
    const { button } = mount({ wizard: true, hasSelection: true })
    expect(button.props.disabled).toBe(false)
  })

  test("while saving the label is Enregistrement and the button is disabled", () => {
    const { button } = mount({ saving: true, hasSelection: true })
    expect(button.props.label).toBe(t.saving)
    expect(button.props.leadingIcon).toBe("hourglass-outline")
    expect(button.props.disabled).toBe(true)
  })

  test("pressing the button calls onDone once", () => {
    const { button, onDone } = mount({ hasSelection: true })
    act(() => button.props.onPress())
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})

describe("ParcelSelectionCard, compact mode", () => {
  test("without a selection: one-line title, requirement in the meta line, no notice, no hint", () => {
    const { findText, notices, card, icons } = mount({ compact: true })
    const title = findText(t.noSelection)
    expect(title?.props.numberOfLines).toBe(1)
    expect(title?.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.title)
    const meta = findText(t.compact.selectionRequired)
    expect(meta?.props.numberOfLines).toBe(PARCEL_CARD_COMPACT.metaMaxLines)
    expect(meta?.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.meta)
    expect(styleOf(meta as ReactTestInstance).color).toBe(defaultTheme.colors.textPrimary)
    expect(icons).toHaveLength(1)
    expect(icons[0].props.name).toBe("alert-circle-outline")
    expect(icons[0].props.color).toBe(defaultTheme.onSurface.danger)
    expect(notices).toHaveLength(0)
    expect(findText(t.tapHint)).toBeUndefined()
    expect(findText("5 parcelles visibles")).toBeUndefined()
    expect(card.props.padding).toBe(PARCEL_CARD_COMPACT.padding)
    expect(card.props.padding).toBe(12)
  })

  test("with a selection: the helper text as meta, no icon", () => {
    const { findText, icons, notices } = mount({ compact: true, hasSelection: true })
    expect(findText("2 parcelles sélectionnées")?.props.numberOfLines).toBe(1)
    const meta = findText("5 parcelles visibles")
    expect(meta?.props.numberOfLines).toBe(PARCEL_CARD_COMPACT.metaMaxLines)
    expect(styleOf(meta as ReactTestInstance).color).toBe(defaultTheme.colors.textSecondary)
    expect(findText(t.compact.selectionRequired)).toBeUndefined()
    expect(icons).toHaveLength(0)
    expect(notices).toHaveLength(0)
  })

  test("the title uses the headline size and the button stays large", () => {
    const { findText, button } = mount({ compact: true, hasSelection: true })
    const style = styleOf(findText("2 parcelles sélectionnées") as ReactTestInstance)
    expect(style.fontSize).toBe(17)
    expect(style.lineHeight).toBe(PARCEL_CARD_COMPACT.titleLineHeight)
    expect(button.props.size).toBe("lg")
  })

  test("the wizard button stays disabled without a parcel and onDone fires when enabled", () => {
    const blocked = mount({ compact: true, wizard: true })
    expect(blocked.button.props.disabled).toBe(true)
    expect(blocked.button.props.label).toBe(t.continue)
    act(() => tree.unmount())
    const ready = mount({ compact: true, wizard: true, hasSelection: true })
    expect(ready.button.props.disabled).toBe(false)
    act(() => ready.button.props.onPress())
    expect(ready.onDone).toHaveBeenCalledTimes(1)
  })
})
