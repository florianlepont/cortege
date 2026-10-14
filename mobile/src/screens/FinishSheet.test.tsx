import React from "react"
import renderer, { act } from "react-test-renderer"

const mockStatus = { value: "Le relevé est enregistré sur cet appareil." }

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
jest.mock("../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../ui/AppNotice", () => ({ AppNotice: "AppNotice" }))
jest.mock("../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))
jest.mock("../ui/VisibilityPicker", () => ({ VisibilityPicker: "VisibilityPicker" }))
jest.mock("../state/status-context", () => ({
  useStatus: () => ({ status: mockStatus.value }),
}))

import { fr } from "../i18n"
import { FinishSheet } from "./FinishSheet"

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

type Props = React.ComponentProps<typeof FinishSheet>

function render(overrides: Partial<Props> = {}) {
  const props: Props = {
    siteName: "Forêt de Rambouillet",
    choice: "public",
    phase: "idle",
    outcomeKey: 0,
    offline: false,
    onSelect: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<FinishSheet {...props} />)
  })
  return { tree, props }
}

const byType = (tree: renderer.ReactTestRenderer, type: string) =>
  tree.root.findAll((node) => (node.type as unknown) === type)
const buttons = (tree: renderer.ReactTestRenderer) => byType(tree, "GlassButton")
const notices = (tree: renderer.ReactTestRenderer) => byType(tree, "AppNotice")
const texts = (tree: renderer.ReactTestRenderer) =>
  byType(tree, "Text").map((node) => node.props.children)

describe("FinishSheet", () => {
  test("idle: header title, picker on the choice, footnote, confirm and cancel", () => {
    const { tree, props } = render()
    const header = byType(tree, "Text").find((node) => node.props.accessibilityRole === "header")
    expect(header?.props.children).toBe("Qui peut voir ce relevé ?")
    const picker = byType(tree, "VisibilityPicker")[0]
    expect(picker.props.value).toBe("public")
    expect(picker.props.disabled).toBe(false)
    expect(picker.props.onChange).toBe(props.onSelect)
    expect(texts(tree)).toContain(
      "Ce choix ne pourra plus être modifié une fois le relevé terminé.",
    )
    const [confirm, cancel] = buttons(tree)
    expect(confirm.props.label).toBe("Terminer le relevé")
    expect(confirm.props.accessibilityLabel).toBe(
      fr.surveyFinish.confirmA11y({
        name: "Forêt de Rambouillet",
        choice: "Partagé avec l'association",
      }),
    )
    expect(confirm.props.loading).toBe(false)
    expect(cancel.props.label).toBe("Annuler")
    expect(cancel.props.disabled).toBe(false)
    expect(notices(tree)).toHaveLength(0)
  })

  test("the confirm label names the private choice", () => {
    const { tree } = render({ choice: "private" })
    expect(buttons(tree)[0].props.accessibilityLabel).toBe(
      "Terminer le relevé Forêt de Rambouillet. Visibilité : Privé.",
    )
  })

  test("the buttons call their handlers", () => {
    const { tree, props } = render()
    const [confirm, cancel] = buttons(tree)
    confirm.props.onPress()
    cancel.props.onPress()
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  test("offline: warning notice, the confirm only stores the choice", () => {
    const { tree } = render({ offline: true })
    const [notice] = notices(tree)
    expect(notice.props.tone).toBe("warning")
    expect(notice.props.icon).toBe("cloud-offline-outline")
    expect(notice.props.message).toBe(fr.surveyFinish.offline)
    const [confirm] = buttons(tree)
    expect(confirm.props.label).toBe("Enregistrer le choix")
    expect(confirm.props.accessibilityLabel).toBe(
      "Enregistrer le choix. Visibilité : Partagé avec l'association.",
    )
  })

  test("submitting: picker locked, confirm loading, cancel disabled", () => {
    const { tree } = render({ phase: "submitting" })
    expect(byType(tree, "VisibilityPicker")[0].props.disabled).toBe(true)
    const [confirm, cancel] = buttons(tree)
    expect(confirm.props.loading).toBe(true)
    expect(cancel.props.disabled).toBe(true)
  })

  test("saveError: danger notice and live controls", () => {
    const { tree } = render({ phase: "saveError" })
    const [notice] = notices(tree)
    expect(notice.props.tone).toBe("danger")
    expect(notice.props.icon).toBe("alert-circle-outline")
    expect(notice.props.message).toBe(
      "Impossible d'enregistrer votre choix sur cet appareil. Réessayez.",
    )
    expect(byType(tree, "VisibilityPicker")[0].props.disabled).toBe(false)
    expect(buttons(tree)[0].props.loading).toBe(false)
    expect(buttons(tree)[1].props.disabled).toBe(false)
  })

  test("saveError wins over the offline notice (one notice at most)", () => {
    const { tree } = render({ phase: "saveError", offline: true })
    expect(notices(tree)).toHaveLength(1)
    expect(notices(tree)[0].props.tone).toBe("danger")
  })

  test("notFinished: the status message of that moment, kept when the status changes", () => {
    mockStatus.value = "Le relevé est enregistré sur cet appareil."
    const { tree, props } = render({ phase: "notFinished", outcomeKey: 1 })
    expect(notices(tree)[0].props.message).toBe("Le relevé est enregistré sur cet appareil.")
    expect(notices(tree)[0].props.tone).toBe("warning")
    mockStatus.value = "Un autre message"
    act(() => {
      tree.update(<FinishSheet {...props} phase="notFinished" outcomeKey={1} />)
    })
    expect(notices(tree)[0].props.message).toBe("Le relevé est enregistré sur cet appareil.")
    act(() => {
      tree.update(<FinishSheet {...props} phase="notFinished" outcomeKey={2} />)
    })
    expect(notices(tree)[0].props.message).toBe("Un autre message")
  })

  test("notFinished with an empty status draws no notice", () => {
    mockStatus.value = "  "
    const { tree } = render({ phase: "notFinished", outcomeKey: 1 })
    expect(notices(tree)).toHaveLength(0)
  })

  test("frozen: locked picker, info notice instead of the footnote, one Fermer button", () => {
    const { tree, props } = render({ phase: "frozen" })
    expect(byType(tree, "VisibilityPicker")[0].props.disabled).toBe(true)
    expect(texts(tree)).not.toContain(fr.surveyFinish.footnote)
    const [notice] = notices(tree)
    expect(notice.props.tone).toBe("info")
    expect(notice.props.icon).toBe("lock-closed-outline")
    expect(notice.props.message).toBe(
      "Ce relevé est déjà terminé : sa visibilité ne peut plus être modifiée.",
    )
    expect(buttons(tree)).toHaveLength(1)
    expect(buttons(tree)[0].props.label).toBe("Fermer")
    expect(buttons(tree)[0].props.variant).toBe("secondary")
    buttons(tree)[0].props.onPress()
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  test("the notice slot is a polite live region", () => {
    const { tree } = render()
    const slot = byType(tree, "View").find(
      (node) => node.props.accessibilityLiveRegion === "polite",
    )
    expect(slot).toBeDefined()
  })
})
