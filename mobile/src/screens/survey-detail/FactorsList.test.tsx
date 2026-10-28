import React from "react"
import renderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer"
import { FACTOR_TITLES } from "../../app/constants"
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
const a11y = fr.surveyDetail.a11y
const FACTOR_A = FACTOR_TITLES.A

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

describe("FactorsList doubt chip and note (phase 27, D-13, D-17)", () => {
  const LONG_NOTE = "Lisière irrégulière, souches récentes au nord de la parcelle. ".repeat(4)
  const annotated: Array<[string, DisplayedFactorResult]> = [
    ["A", { selected_class: "S2", warnings: [], score_points: 2, doubt: true, note: "souches" }],
    ["B", { selected_class: "S2", warnings: [], score_points: 2 }],
    ["C", { selected_class: "S1", warnings: [], score_points: 1, note: LONG_NOTE }],
  ]
  const byTestId = (tree: ReactTestRenderer, id: string) =>
    tree.root.findAll((node) => node.props.testID === id)

  test("a row with a doubt shows the chip 'Incertitude', a row without has none", () => {
    const { tree } = render({ factorEntries: annotated })

    expect(byTestId(tree, "factor-doubt-badge-A").length).toBeGreaterThan(0)
    expect(byTestId(tree, "factor-doubt-badge-B")).toHaveLength(0)
    expect(byTestId(tree, "factor-doubt-badge-C")).toHaveLength(0)
    const texts = tree.root.findAllByType("Text" as never).map(textOf)
    expect(texts.filter((text) => text === f.doubtBadge)).toHaveLength(1)
    expect(byTestId(tree, "factor-doubt-badge-A")[0]?.props.accessible).toBe(false)
  })

  test("the chip changes neither the points nor the badge letter style", () => {
    const { tree } = render({ factorEntries: annotated })
    const texts = tree.root.findAllByType("Text" as never)

    // Row A (doubt) and row B (none) both say 2 points out of 5 with the same style.
    const pointStyles = texts
      .filter((node) => [node.props.children].flat().includes(2))
      .map((node) => flatten(node.props.style))
    expect(pointStyles).toHaveLength(2)
    expect(pointStyles[0]).toEqual(pointStyles[1])
    const letters = texts.filter((node) => ["A", "B"].includes(textOf(node)))
    expect(flatten(letters[0]?.props.style)).toEqual(flatten(letters[1]?.props.style))
  })

  test("a draft row clamps the note to two lines and has no link", () => {
    const { tree } = render({ factorEntries: annotated, canEditSurvey: true })

    const note = byTestId(tree, "factor-note-C")[0]
    expect(note?.props.numberOfLines).toBe(2)
    expect(textOf(note as ReactTestInstance)).toBe(LONG_NOTE)
    const texts = tree.root.findAllByType("Text" as never).map(textOf)
    expect(texts).not.toContain(f.noteMore)
  })

  test("a read-only row clamps at three lines and offers 'Lire la suite' only when cut", () => {
    const { tree } = render({ factorEntries: annotated, canEditSurvey: false })
    const note = () => byTestId(tree, "factor-note-C")[0] as ReactTestInstance
    const textsNow = () => tree.root.findAllByType("Text" as never).map(textOf)

    expect(note().props.numberOfLines).toBe(3)
    expect(textsNow()).not.toContain(f.noteMore)

    act(() => {
      note().props.onTextLayout({ nativeEvent: { lines: [{}, {}, {}] } })
    })
    expect(textsNow()).not.toContain(f.noteMore)

    act(() => {
      note().props.onTextLayout({ nativeEvent: { lines: [{}, {}, {}, {}] } })
    })
    expect(textsNow()).toContain(f.noteMore)
  })

  test("the link expands the note in place, then folds it back", () => {
    const { tree } = render({ factorEntries: annotated, canEditSurvey: false })
    const note = () => byTestId(tree, "factor-note-C")[0] as ReactTestInstance
    act(() => {
      note().props.onTextLayout({ nativeEvent: { lines: [{}, {}, {}, {}] } })
    })
    const toggle = () =>
      byTestId(tree, "factor-note-toggle-C").find(
        (node) => typeof node.props.onPress === "function",
      )

    expect(toggle()?.props.accessibilityLabel).toBe(f.noteMoreA11y)
    act(() => {
      toggle()?.props.onPress()
    })
    expect(note().props.numberOfLines).toBeUndefined()
    expect(tree.root.findAllByType("Text" as never).map(textOf)).toContain(f.noteLess)
    expect(toggle()?.props.accessibilityLabel).toBe(f.noteLessA11y)

    act(() => {
      toggle()?.props.onPress()
    })
    expect(note().props.numberOfLines).toBe(3)
  })

  test("the labels name the doubt and the note: 'Ouvrir ...' on a draft, none on a read-only row", () => {
    const draft = render({ factorEntries: annotated })
    const draftLabels = rows(draft.tree).map((node) => node.props.accessibilityLabel)
    expect(draftLabels).toContain(
      a11y.openFactor({
        title: FACTOR_A,
        value: s.pointsOf({ points: 2, max: 5 }),
        doubtful: true,
        hasNote: true,
      }),
    )
    expect(
      draftLabels.some((label) => String(label).endsWith(", incertitude signalée, avec une note")),
    ).toBe(true)

    const readOnly = render({ factorEntries: annotated, canEditSurvey: false })
    const readOnlyLabels = rows(readOnly.tree).map((node) => node.props.accessibilityLabel)
    expect(readOnlyLabels).toContain(
      a11y.factorReadOnly({
        title: FACTOR_A,
        value: s.pointsOf({ points: 2, max: 5 }),
        doubtful: true,
        hasNote: true,
      }),
    )
    expect(readOnlyLabels.some((label) => String(label).startsWith("Ouvrir"))).toBe(false)
  })

  test("a row with neither doubt nor note renders as before: no chip, no note, plain label", () => {
    const { tree } = render()

    expect(byTestId(tree, "factor-doubt-badge-A")).toHaveLength(0)
    expect(byTestId(tree, "factor-note-A")).toHaveLength(0)
    expect(rows(tree)[0]?.props.accessibilityLabel).toBe(
      a11y.openFactor({ title: FACTOR_A, value: s.pointsOf({ points: 2, max: 5 }) }),
    )
    expect(rows(tree)).toHaveLength(2)
  })
})
