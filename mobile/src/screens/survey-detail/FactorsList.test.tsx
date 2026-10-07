import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandRadius } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { FactorsList } from "./FactorsList"
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
    Pressable: ({ children, ...props }: { children?: React.ReactNode; style?: unknown }) =>
      ReactRef.createElement("Pressable", props, children),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: <T,>(options: { ios?: T; default?: T }) => options.ios },
  }
})

const f = fr.surveyDetail.factors
const s = fr.surveyDetail.scoreScreen

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

const textOf = (node: ReactTestInstance): string => [node.props.children].flat().join("")

const entries: Array<[string, DisplayedFactorResult]> = [
  ["A", { selected_class: "S2", warnings: [], score_points: 2 }],
  ["B", { selected_class: NOT_FILLED_CLASS, warnings: ["x"], score_points: null }],
]

function render(overrides: Partial<React.ComponentProps<typeof FactorsList>> = {}) {
  const onOpenFactor = jest.fn()
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <FactorsList
        factorEntries={entries}
        showLoadingHint={false}
        canEditSurvey
        onOpenFactor={onOpenFactor}
        {...overrides}
      />,
    )
  })
  return { tree, onOpenFactor }
}

const rows = (tree: ReactTestRenderer) =>
  tree.root.findAll((node) => (node.type as unknown) === "Pressable")

describe("FactorsList (OA-45: the score once, as a list)", () => {
  test("a row per factor: points when filled, 'À remplir' otherwise, a warning mark", () => {
    const { tree } = render()
    expect(rows(tree)).toHaveLength(2)
    const texts = tree.root.findAllByType("Text" as never).map(textOf)
    expect(texts).toContain(s.factorsTitle)
    expect(texts).toContain(s.toFill)
    expect(texts).toContain(f.hasWarning)
  })

  test("a tap on a row of a draft opens that factor", () => {
    const { tree, onOpenFactor } = render()
    act(() => {
      rows(tree)[1]?.props.onPress()
    })
    expect(onOpenFactor).toHaveBeenCalledWith("B")
  })

  test("a finished survey's rows do not open", () => {
    const { tree } = render({ canEditSurvey: false })
    expect(rows(tree)[0]?.props.disabled).toBe(true)
  })

  test("shows the loading hint, then the empty message", () => {
    const loading = render({ factorEntries: [], showLoadingHint: true })
    expect(loading.tree.root.findAllByType("Text" as never).map(textOf)).toContain(f.loading)
    const empty = render({ factorEntries: [] })
    expect(empty.tree.root.findAllByType("Text" as never).map(textOf)).toContain(f.notLoaded)
  })

  test("every row keeps a 44 pt minimum height, pressed or not, and a press handler", () => {
    const { tree } = render()
    for (const row of rows(tree)) {
      const style = row.props.style as (state: { pressed: boolean }) => unknown
      expect(flatten(style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(
        brandInteraction.hitTarget.min,
      )
      expect(flatten(style({ pressed: true })).minHeight).toBeGreaterThanOrEqual(
        brandInteraction.hitTarget.min,
      )
      expect(typeof row.props.onPress).toBe("function")
    }
  })

  test("the rows sit in one glass card and the row padding is on the 4 grid", () => {
    const { tree } = render()
    const card = tree.root
      .findAllByType("View" as never)
      .find((node) => flatten(node.props.style).overflow === "hidden")
    expect(flatten(card?.props.style)).toMatchObject({
      backgroundColor: defaultTheme.visual.glass.cardFill,
      borderColor: defaultTheme.visual.glass.cardBorder,
      borderRadius: brandRadius.card,
    })
    const row = rows(tree)[0]
    const rowStyle = flatten(
      (row?.props.style as (s: { pressed: boolean }) => unknown)({ pressed: false }),
    )
    for (const key of ["paddingVertical", "paddingLeft", "paddingRight", "gap"]) {
      expect((rowStyle[key] as number) % 4).toBe(0)
    }
  })
})
