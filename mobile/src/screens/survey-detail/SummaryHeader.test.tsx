import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../i18n"
import { FrameLargeTitleContext } from "../../ui/frame-large-title"
import { SummaryHeader } from "./SummaryHeader"
import type { StatusLine } from "./summary-state"
import { resolveVisibilityLine, type VisibilityLine } from "./visibility-line"

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
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
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

describe("SummaryHeader under the native large title (12.2-17)", () => {
  function renderLarge(canEdit: boolean): ReactTestRenderer {
    let tree: ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <FrameLargeTitleContext.Provider value>
          <SummaryHeader
            surveyId="survey-1"
            siteName="Parcelle A"
            canEdit={canEdit}
            statusLine={{ status: h.status.draft, sync: h.sync.pending, syncTone: "pending" }}
            onRenameSurvey={jest.fn()}
          />
        </FrameLargeTitleContext.Provider>,
      )
    })
    return tree!
  }

  test.each([true, false])(
    "the header names the survey: only the status line is drawn (editable %s)",
    (canEdit) => {
      const tree = renderLarge(canEdit)
      expect(texts(tree)).toEqual([h.status.draft, h.syncSuffix(h.sync.pending)])
      // No tappable title: renaming is in the header's menu.
      expect(tree.root.findAll((n) => (n.type as unknown) === "Pressable")).toHaveLength(0)
    },
  )
})

describe("SummaryHeader visibility line (D-15)", () => {
  const line = resolveVisibilityLine({ status: "submitted", visibility: "public" })
  const statusLine: StatusLine = {
    status: h.status.finished,
    sync: null,
    syncTone: "ok",
  }

  function renderWithLine(visibilityLine: VisibilityLine | null | undefined, largeTitle: boolean) {
    let tree: ReactTestRenderer | undefined
    const header = (
      <SummaryHeader
        surveyId="survey-1"
        siteName="Parcelle A"
        canEdit={false}
        statusLine={statusLine}
        visibilityLine={visibilityLine}
        onRenameSurvey={jest.fn()}
      />
    )
    act(() => {
      tree = renderer.create(
        <FrameLargeTitleContext.Provider value={largeTitle}>
          {header}
        </FrameLargeTitleContext.Provider>,
      )
    })
    return tree!
  }

  const find = (tree: ReactTestRenderer) =>
    tree.root.findAll(
      (n) => (n.type as unknown) === "View" && n.props.testID === "summary-visibility-line",
    )

  test.each([true, false])(
    "is one readable element under the status line, not pressable (native title %s)",
    (largeTitle) => {
      const tree = renderWithLine(line, largeTitle)
      const nodes = find(tree)
      expect(nodes).toHaveLength(1)
      const node = nodes[0]
      expect(node.props.accessible).toBe(true)
      expect(node.props.accessibilityRole).toBe("text")
      expect(node.props.accessibilityLabel).toBe(
        "Visibilité : partagé avec l'association. Ne peut plus être modifiée.",
      )
      expect(node.props.onPress).toBeUndefined()
      expect(texts(tree)).toContain("Partagé avec l'association")
      // Last child of the title block, after the status line.
      expect(texts(tree).slice(-1)).toEqual(["Partagé avec l'association"])
      const glyph = node.findByType("Ionicons" as never)
      expect(glyph.props.name).toBe("people-outline")
      expect(glyph.props.size).toBe(14)
      expect(glyph.props.accessible).toBe(false)
    },
  )

  test.each([undefined, null])("without the prop (%s) no such element is drawn", (value) => {
    expect(find(renderWithLine(value, false))).toHaveLength(0)
    expect(find(renderWithLine(value, true))).toHaveLength(0)
  })
})
