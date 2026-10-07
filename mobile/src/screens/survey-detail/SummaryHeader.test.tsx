import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../i18n"
import { SummaryHeader } from "./SummaryHeader"
import type { StatusLine } from "./summary-state"

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
    Pressable: mockComponent("Pressable"),
    Alert: { alert: jest.fn() },
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../../ui/AppField", () => ({ AppField: "AppField" }))

const h = fr.surveyDetail.header

function render(statusLine: StatusLine): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <SummaryHeader
        surveyId="survey-1"
        siteName="Parcelle A"
        canEdit={false}
        statusLine={statusLine}
        onRenameSurvey={jest.fn()}
      />,
    )
  })
  return tree!
}

const texts = (tree: ReactTestRenderer): string[] =>
  tree.root
    .findAll((n) => (n.type as unknown) === "Text")
    .map((n: ReactTestInstance) => [n.props.children].flat().join(""))

describe("SummaryHeader status line", () => {
  test("a draft says its status then its sync", () => {
    const tree = render({ status: h.status.draft, sync: h.sync.pending, syncTone: "pending" })
    expect(texts(tree)).toEqual(["Parcelle A", h.status.draft, h.syncSuffix(h.sync.pending)])
  })

  test("D-25: a finished, synced survey says just 'Terminé'", () => {
    const tree = render({ status: h.status.finished, sync: null, syncTone: "ok" })
    expect(texts(tree)).toEqual(["Parcelle A", "Terminé"])
  })

  test("D-25: a finished survey still sending says 'Terminé · synchronisation en cours'", () => {
    const tree = render({ status: h.status.finished, sync: h.sync.sending, syncTone: "ok" })
    expect(texts(tree).slice(1).join(" ")).toBe("Terminé · synchronisation en cours")
  })
})
