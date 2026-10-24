import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    ScrollView: mockComponent("ScrollView"),
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios ?? o.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))
jest.mock("../../ui/RadioCard", () => ({ RadioCard: "RadioCard" }))

import { Ionicons } from "@expo/vector-icons"
import { fr } from "../../i18n"
import { ExportChoiceSheet } from "./ExportChoiceSheet"

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

type Props = React.ComponentProps<typeof ExportChoiceSheet>

function render(overrides: Partial<Props> = {}) {
  const props: Props = {
    siteName: "Bois",
    mode: "complete",
    isDraft: false,
    completePages: 6,
    onSelect: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<ExportChoiceSheet {...props} />)
  })
  return { tree, props }
}

const byType = (tree: renderer.ReactTestRenderer, type: unknown) =>
  tree.root.findAll((node) => (node.type as unknown) === type)
const byTestId = (tree: renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")[0]
const texts = (tree: renderer.ReactTestRenderer) =>
  byType(tree, "Text").map((node) => node.props.children)

describe("ExportChoiceSheet", () => {
  test("a submitted survey: title, group, two cards, two buttons, no draft sentence", () => {
    const { tree } = render()
    const header = byType(tree, "Text").find((node) => node.props.accessibilityRole === "header")
    expect(header?.props.children).toBe("Quel PDF voulez-vous ?")
    const group = tree.root.findAll((node) => node.props.accessibilityRole === "radiogroup")[0]
    expect(group.props.accessibilityLabel).toBe("Type de PDF")
    expect(byType(tree, "RadioCard")).toHaveLength(2)
    expect(texts(tree)).not.toContain(fr.surveyExportChoice.summaryDraft)
    expect(byType(tree, Ionicons).map((node) => node.props.name)).not.toContain(
      "lock-closed-outline",
    )
    const confirm = byTestId(tree, "export-choice-confirm")
    const cancel = byTestId(tree, "export-choice-cancel")
    expect(confirm.props.label).toBe("Exporter le PDF")
    expect(confirm.props.variant).toBe("primary")
    expect(cancel.props.label).toBe("Annuler")
    expect(cancel.props.variant).toBe("secondary")
  })

  test("the complete card is preselected and carries the page count", () => {
    const { tree } = render()
    const complete = byTestId(tree, "export-option-complete")
    expect(complete.props.selected).toBe(true)
    expect(complete.props.title).toBe("Complet")
    expect(complete.props.icon).toBe("documents-outline")
    expect(complete.props.caption).toBe(
      "Tout le relevé : identité, conditions, parcours, facteurs, carte, évolution et photos. Environ 6 pages.",
    )
    expect(complete.props.accessibilityLabel).toBe(`Complet. ${complete.props.caption}`)
    const summary = byTestId(tree, "export-option-summary")
    expect(summary.props.selected).toBe(false)
    expect(summary.props.disabled).toBe(false)
    expect(summary.props.title).toBe("Résumé")
    expect(summary.props.icon).toBe("document-text-outline")
    expect(summary.props.caption).toMatch(/1 page\.$/)
    expect(summary.props.accessibilityLabel).toBe(`Résumé. ${summary.props.caption}`)
  })

  test("pressing the other card selects it, pressing the selected one does nothing", () => {
    const { tree, props } = render()
    byTestId(tree, "export-option-complete").props.onPress()
    expect(props.onSelect).not.toHaveBeenCalled()
    byTestId(tree, "export-option-summary").props.onPress()
    expect(props.onSelect).toHaveBeenCalledTimes(1)
    expect(props.onSelect).toHaveBeenCalledWith("summary")
  })

  test("with the summary selected, the complete card is the one that selects", () => {
    const { tree, props } = render({ mode: "summary" })
    expect(byTestId(tree, "export-option-summary").props.selected).toBe(true)
    byTestId(tree, "export-option-summary").props.onPress()
    expect(props.onSelect).not.toHaveBeenCalled()
    byTestId(tree, "export-option-complete").props.onPress()
    expect(props.onSelect).toHaveBeenCalledWith("complete")
  })

  test("a draft: the summary card is dimmed, disabled, spoken unavailable and cannot be pressed", () => {
    const { tree, props } = render({ isDraft: true })
    const summary = byTestId(tree, "export-option-summary")
    expect(summary.props.disabled).toBe(true)
    expect(summary.props.accessibilityLabel).toBe(
      "Résumé, indisponible. Le résumé est réservé aux relevés terminés.",
    )
    summary.props.onPress()
    expect(props.onSelect).not.toHaveBeenCalled()
    const wrapper = summary.parent
    expect(wrapper?.props.style).toMatchObject({ opacity: 0.55 })
    expect(byTestId(tree, "export-option-complete").props.selected).toBe(true)
  })

  test("a draft: the sentence shows in a polite live region after a hidden lock glyph", () => {
    const { tree } = render({ isDraft: true })
    expect(texts(tree)).toContain(
      "Le résumé est réservé aux relevés terminés. Terminez le relevé pour l'obtenir.",
    )
    const region = tree.root.findAll(
      (node) =>
        node.props.accessibilityLiveRegion === "polite" && (node.type as unknown) === "View",
    )[0]
    expect(region).toBeDefined()
    const glyph = region.findAll((node) => (node.type as unknown) === Ionicons)[0]
    expect(glyph.props.name).toBe("lock-closed-outline")
    expect(glyph.props.size).toBe(16)
    expect(glyph.props.accessible).toBe(false)
    expect(glyph.props.importantForAccessibility).toBe("no")
  })

  test("the confirm label is spoken by the selected mode and names the site", () => {
    expect(byTestId(render().tree, "export-choice-confirm").props.accessibilityLabel).toBe(
      "Exporter le PDF complet du relevé Bois.",
    )
    expect(
      byTestId(render({ mode: "summary" }).tree, "export-choice-confirm").props.accessibilityLabel,
    ).toBe("Exporter le PDF résumé du relevé Bois.")
  })

  test("the buttons call their handlers", () => {
    const { tree, props } = render()
    byTestId(tree, "export-choice-confirm").props.onPress()
    byTestId(tree, "export-choice-cancel").props.onPress()
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })
})
