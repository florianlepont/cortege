import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { ibpScoreTokens } from "../../app/brand-tokens"
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

type FlatStyle = { backgroundColor?: string; color?: string }

const flattenStyle = (style: unknown): FlatStyle =>
  Array.isArray(style)
    ? (Object.assign({}, ...style.map(flattenStyle)) as FlatStyle)
    : ((style ?? {}) as FlatStyle)

const textOf = (node: ReactTestInstance): string => [node.props.children].flat().join("")

const entries: Array<[string, DisplayedFactorResult]> = [
  ["A", { selected_class: "S2", warnings: [] }],
  ["B", { selected_class: NOT_FILLED_CLASS, warnings: ["x"] }],
]

const render = (
  props: Partial<React.ComponentProps<typeof FactorsSection>> = {},
): ReactTestRenderer => {
  let tree: ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorsSection
        scores={{ ibp_peuplement_gestion: 21, ibp_contexte: 10, ibp_total: 31 }}
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

const pill = (tree: ReactTestRenderer, testID: string): ReactTestInstance =>
  tree.root.find((node) => (node.type as unknown) === "View" && node.props.testID === testID)

describe("FactorsSection totals (D-03 amended, D-11)", () => {
  test("the total reads out of 50 and the sub-scores out of 35 and 15", () => {
    const all = texts(render())
    expect(all).toContain("31 / 50")
    expect(all.some((text) => text.includes("P/G 21 / 35"))).toBe(true)
    expect(all.some((text) => text.includes("Contexte 10 / 15"))).toBe(true)
  })

  test("stand 21 and context 10 show 'moyenne' and 'forte' in the mid and high tone colours", () => {
    const tree = render()
    const stand = pill(tree, "factor-subscore-stand")
    const context = pill(tree, "factor-subscore-context")
    expect(flattenStyle(stand.props.style).backgroundColor).toBe(
      ibpScoreTokens.colors.mid.background,
    )
    expect(flattenStyle(context.props.style).backgroundColor).toBe(
      ibpScoreTokens.colors.high.background,
    )
    const standText = stand.findByType("Text" as never)
    expect(textOf(standText)).toContain("moyenne")
    expect(flattenStyle(standText.props.style).color).toBe(ibpScoreTokens.colors.mid.text)
    expect(textOf(context.findByType("Text" as never))).toContain("forte")
  })

  test("a low stand score uses the low tone", () => {
    const tree = render({ scores: { ibp_peuplement_gestion: 6, ibp_contexte: 2, ibp_total: 8 } })
    expect(flattenStyle(pill(tree, "factor-subscore-stand").props.style).backgroundColor).toBe(
      ibpScoreTokens.colors.low.background,
    )
    expect(textOf(pill(tree, "factor-subscore-stand").findByType("Text" as never))).toContain(
      "faible",
    )
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
