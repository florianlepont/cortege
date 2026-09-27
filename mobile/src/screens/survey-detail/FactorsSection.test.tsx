import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../i18n"
import { FactorsSection } from "./FactorsSection"
import { DisplayedFactorResult, NOT_FILLED_CLASS } from "./useLocalDraftSummary"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? "")
    if (message.includes("react-test-renderer is deprecated")) return
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
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})

jest.mock("../../ui/AppCard", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppCard: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("AppCard", null, children),
  }
})
jest.mock("../../ui/AppSectionHeader", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppSectionHeader: ({ title }: { title: string }) =>
      ReactRef.createElement("AppSectionHeader", { title }),
  }
})

const f = fr.surveyDetail.factors
const barsText = fr.components.ibpFactorBars

const textOf = (node: ReactTestInstance): string => [node.props.children].flat().join("")

const entries: Array<[string, DisplayedFactorResult]> = [
  ["A", { selected_class: "S2", warnings: [], score_points: 2 }],
  ["B", { selected_class: NOT_FILLED_CLASS, warnings: ["x"], score_points: null }],
]

const render = (
  props: Partial<React.ComponentProps<typeof FactorsSection>> = {},
): ReactTestRenderer => {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorsSection
        scores={{ ibp_peuplement_gestion: 20, ibp_contexte: 10, ibp_total: 30 }}
        factorEntries={entries}
        useLocalDraftView={false}
        showLoadingHint={false}
        canEditSurvey
        onOpenFactor={jest.fn()}
        {...props}
      />,
    )
  })
  return tree as ReactTestRenderer
}

const texts = (tree: ReactTestRenderer): string[] =>
  tree.root.findAll((node) => (node.type as unknown) === "Text").map(textOf)

describe("FactorsSection (DET-01): the total lives once, in the header — this shows the bars", () => {
  test("renders an IbpFactorBars row per factor, fed from factorEntries' score_points", () => {
    const tree = render()
    expect(tree.root.findByProps({ testID: "ibp-factor-bar-A" })).toBeTruthy()
    expect(texts(tree)).toContain(barsText.points({ points: 2 }))
    expect(texts(tree)).toContain(barsText.notFilled)
    // No total or sub-score repeated here (DetailHeader's hero owns that display).
    expect(texts(tree)).not.toContain("30 / 50")
  })

  test("the local draft hint and the loading hint", () => {
    expect(texts(render({ useLocalDraftView: true }))).toContain(f.localDraftHint)
    const empty = texts(render({ scores: null, showLoadingHint: true }))
    expect(empty).toEqual(expect.arrayContaining([f.loading, f.notLoaded]))
  })

  test("pressing an editable factor tile opens it; a read-only one does not", () => {
    const onOpenFactor = jest.fn()
    const tree = render({ onOpenFactor })
    const tiles = tree.root.findAll((node) => (node.type as unknown) === "Pressable")
    expect(tiles[0].props.accessibilityRole).toBe("button")
    expect(tiles[0].props.accessibilityLabel).toContain("S2")
    act(() => tiles[0].props.onPress())
    expect(onOpenFactor).toHaveBeenCalledWith("A")
    expect(texts(tree)).toEqual(expect.arrayContaining([f.notFilled, f.hasWarning]))

    const readOnlyOpen = jest.fn()
    const readOnly = render({ canEditSurvey: false, onOpenFactor: readOnlyOpen })
    act(() =>
      readOnly.root.findAll((node) => (node.type as unknown) === "Pressable")[0].props.onPress(),
    )
    expect(readOnlyOpen).not.toHaveBeenCalled()
  })
})
