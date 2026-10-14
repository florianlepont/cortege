import React from "react"
import type { SurveyRoute } from "@cortege/ibp-domain"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { fr } from "../../../i18n"
import { RouteSection } from "./RouteSection"

// Phase 30 (plan 30-22, spec section 9): the "Parcours utilisé" card of the Contexte page and of
// another member's survey.

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
  }
})

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

const t = fr.surveyDetail.route

const GUIDED: SurveyRoute = {
  version: 1,
  method: "partial_plot",
  counting: "capped",
  zone_surface_ha: 1.2,
  complement: { done: true, total_surface_ha: 8 },
  guide: {
    chosen_by: "guide",
    suggested: { method: "partial_plot", counting: "capped" },
    answers: { surface_ha: 8, homogeneity: "homogeneous", difficulty: false, narrow: false },
  },
}

type Props = React.ComponentProps<typeof RouteSection>

function mount(over: Partial<Props> = {}): { tree: ReactTestRenderer; onEdit: jest.Mock } {
  const onEdit = jest.fn()
  const props: Props = {
    route: GUIDED,
    loaded: true,
    status: "draft",
    editable: true,
    variant: "detail",
    onEdit,
    ...over,
  }
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(<RouteSection {...props} />)
  })
  return { tree, onEdit }
}

const find = (tree: ReactTestRenderer, testID: string): ReactTestInstance | undefined =>
  tree.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")[0]

function texts(tree: ReactTestRenderer): string[] {
  return tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat(Infinity).join(""))
}

describe("RouteSection with a recorded route", () => {
  test("an editable draft: the title, one caption and value per row, and the edit link", () => {
    const { tree, onEdit } = mount()
    expect(find(tree, "route-section")).toBeDefined()
    const said = texts(tree)
    expect(said).toContain(t.title)
    expect(said).toEqual(
      expect.arrayContaining([
        "Parcours",
        "Parcours partiel par placette",
        "Mode de relevé",
        "Relevé plafonné",
        "Surface décrite",
        "1,2 ha",
        "Reste du peuplement",
        "Regardé rapidement, surface totale évaluée 8 ha",
        "Choix",
        "Conseillé par l'app d'après vos réponses",
        "Vos réponses",
        "Peuplement de 8 ha, homogène, facile à observer, large",
      ]),
    )
    expect(find(tree, "route-choose-link")).toBeUndefined()
    const link = find(tree, "route-edit") as ReactTestInstance
    expect(texts(tree)).toContain("Modifier le parcours")
    expect(link.props.accessibilityLabel).toBe(t.editA11y)
    act(() => link.props.onPress())
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  test("read-only (submitted, or not the observer's): the same rows and no link", () => {
    const { tree } = mount({ status: "readonly", editable: false })
    expect(texts(tree)).toContain("Parcours partiel par placette")
    expect(find(tree, "route-edit")).toBeUndefined()
    expect(find(tree, "route-choose-link")).toBeUndefined()
  })

  test("the community variant leaves out Choix and Vos réponses", () => {
    const { tree } = mount({ status: "readonly", editable: false, variant: "community" })
    const said = texts(tree)
    expect(said).toContain("Parcours partiel par placette")
    expect(said).not.toContain("Choix")
    expect(said).not.toContain("Vos réponses")
    expect(find(tree, "route-row-choice")).toBeUndefined()
    expect(find(tree, "route-row-answers")).toBeUndefined()
  })

  test("an editable draft without a callback draws no dead link", () => {
    const { tree } = mount({ onEdit: undefined })
    expect(find(tree, "route-edit")).toBeUndefined()
  })
})

describe("RouteSection without a route", () => {
  test("the observer's draft: Parcours à choisir, the sentence and Choisir le parcours", () => {
    const { tree, onEdit } = mount({ route: null })
    const said = texts(tree)
    expect(said).toContain(t.none)
    expect(said).toContain(t.noneBody)
    expect(said).toContain("Choisir le parcours")
    expect(find(tree, "route-edit")).toBeUndefined()
    act(() => (find(tree, "route-choose-link") as ReactTestInstance).props.onPress())
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  test("a survey submitted before the phase: the discreet line and the sentence, no link (P-3)", () => {
    const { tree } = mount({ route: null, status: "readonly", editable: false })
    expect(texts(tree)).toEqual([
      "Parcours : non renseigné",
      "Ce relevé a été fait avant l'assistant de choix du parcours.",
    ])
    expect(find(tree, "route-legacy")).toBeDefined()
    expect(find(tree, "route-choose-link")).toBeUndefined()
  })

  test("another member's survey without a route draws nothing (O-15)", () => {
    const { tree } = mount({
      route: null,
      status: "readonly",
      editable: false,
      variant: "community",
    })
    expect(tree.toJSON()).toBeNull()
  })

  test("a draft that is not the observer's own draws nothing", () => {
    const { tree } = mount({ route: null, editable: false })
    expect(tree.toJSON()).toBeNull()
  })
})

test("nothing is drawn while the route loads", () => {
  for (const route of [GUIDED, null]) {
    expect(mount({ route, loaded: false }).tree.toJSON()).toBeNull()
  }
})
