import React from "react"
import renderer, { act, ReactTestInstance } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    Switch: mockComponent("Switch"),
    Modal: mockComponent("Modal"),
    Pressable: ({
      children,
      style,
      ...props
    }: {
      children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
      style?: unknown
    }) =>
      ReactRef.createElement(
        "Pressable",
        { ...props, style: typeof style === "function" ? style({ pressed: false }) : style },
        typeof children === "function" ? children({ pressed: false }) : children,
      ),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/AppCard", () => ({ AppCard: "AppCard" }))

import { setReducedMotion } from "../../../test/react-native-reanimated.mock"
import { formatHectares } from "../../app/route-text"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppField } from "../../ui/AppField"
import { termsOfSelection } from "./glossary-terms"
import { GlossarySection } from "./GlossarySection"
import { RouteDetailsCard, type RouteDetailsValue } from "./RouteDetailsCard"

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

afterEach(() => {
  setReducedMotion(false)
})

const guide = fr.routeGuide

function mountElement(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  const byId = (id: string): ReactTestInstance[] =>
    tree.root.findAll((node) => node.props.testID === id && typeof node.type === "string")
  const one = (id: string): ReactTestInstance => {
    const found = byId(id)
    expect(found).toHaveLength(1)
    return found[0]
  }
  const texts = () =>
    tree.root
      .findAll((node) => (node.type as unknown) === "Text")
      .flatMap((node) => React.Children.toArray(node.props.children).map(String))
  return {
    tree,
    byId,
    one,
    texts,
    update: (next: React.ReactElement) => act(() => tree.update(next)),
  }
}

type CardProps = React.ComponentProps<typeof RouteDetailsCard>

const emptyValue: RouteDetailsValue = { zoneText: "", complementDone: false, totalText: "" }

/** The card inside a tiny state holder, like the route step and the chooser own it. */
function mountCard(props: Partial<CardProps> & { value?: RouteDetailsValue }) {
  const changes: RouteDetailsValue[] = []
  function Harness() {
    const [value, setValue] = React.useState<RouteDetailsValue>(props.value ?? emptyValue)
    return React.createElement(RouteDetailsCard, {
      method: "full",
      counting: "capped",
      uncappedFactors: [],
      standHa: 2.4,
      ...props,
      value,
      onChange: (next: RouteDetailsValue) => {
        changes.push(next)
        setValue(next)
      },
    })
  }
  return { ...mountElement(React.createElement(Harness)), changes }
}

describe("RouteDetailsCard: full parcours", () => {
  it("is one read line and no field when the stand surface is known", () => {
    const { one, byId, texts } = mountCard({ method: "full", standHa: 2.4 })
    expect(one("route-details")).toBeDefined()
    expect(texts()).toContain(guide.details.title)
    expect(texts()).toContain(guide.details.fullLine(formatHectares(2.4)))
    expect(byId("route-zone-field")).toHaveLength(0)
    expect(byId("route-complement-switch")).toHaveLength(0)
  })

  it("opens an empty zone field when the stand surface is unknown, so the observer types it", () => {
    const { one, texts } = mountCard({ method: "full", standHa: null })
    const field = one("route-zone-field")
    expect(field.props.value).toBe("")
    expect(field.props.keyboardType).toBe("decimal-pad")
    expect(field.props.returnKeyType).toBe("done")
    expect(field.props.accessibilityLabel).toBe(guide.a11y.zoneField)
    expect(texts()).toContain(guide.details.zoneHelperFull)
  })

  it("shows no zone error for an empty field, then the error for a zero", () => {
    const { one, texts, changes } = mountCard({ method: "full", standHa: null })
    expect(texts()).not.toContain(guide.details.issues.zoneNotPositive)
    act(() => one("route-zone-field").props.onChangeText("0"))
    expect(changes.at(-1)).toEqual({ zoneText: "0", complementDone: false, totalText: "" })
    expect(texts()).toContain(guide.details.issues.zoneNotPositive)
  })
})

describe("RouteDetailsCard: partial parcours", () => {
  const partial = (overrides: Partial<CardProps> = {}, zoneText = "1,2") =>
    mountCard({
      method: "partial_strip",
      standHa: 8,
      value: { zoneText, complementDone: true, totalText: "8" },
      ...overrides,
    })

  it("shows the prefilled zone field, its helper and the field advice of the strip", () => {
    const { one, texts, byId } = partial()
    expect(one("route-zone-field").props.value).toBe("1,2")
    expect(texts()).toEqual(
      expect.arrayContaining([
        guide.details.zoneLabel,
        guide.details.zoneHelperPartial,
        guide.details.stripAdvice,
      ]),
    )
    expect(texts()).not.toContain(guide.details.plotAdvice)
    // Several placettes are only explained for the parcours par placette.
    expect(texts()).not.toContain(guide.details.plotsAdded)
    expect(byId("glossary-info-surfaceDecrite")).toHaveLength(1)
  })

  it("gives the field advice of a placette and says several are added up on one sheet", () => {
    const { texts } = partial({ method: "partial_plot" })
    expect(texts()).toEqual(
      expect.arrayContaining([guide.details.plotAdvice, guide.details.plotsAdded]),
    )
    expect(texts()).not.toContain(guide.details.stripAdvice)
  })

  it("has no group notice and no group name field (O-14, O-20)", () => {
    const { tree } = partial({ method: "partial_plot" })
    const fields = tree.root.findAll(
      (node) => (node.type as unknown) === "TextInput" && typeof node.props.testID === "string",
    )
    expect(fields.map((node) => node.props.testID).sort()).toEqual([
      "route-total-field",
      "route-zone-field",
    ])
  })

  it("warns live above half of the stand, without blocking", () => {
    const { tree, byId, texts } = partial({}, "5")
    expect(byId("route-zone-issue-partial_over_half")).toHaveLength(1)
    expect(texts()).toContain(guide.details.issues.partialOverHalf)
    // A warning is not an error: the field itself carries no error.
    const fields = tree.root.findAllByType(AppField)
    expect(fields.map((field) => field.props.error ?? null)).toEqual([null, null])
  })

  it("warns live below one hectare", () => {
    const { byId, texts } = partial({}, "0,8")
    expect(byId("route-zone-issue-partial_below_minimum")).toHaveLength(1)
    expect(texts()).toContain(guide.details.issues.partialBelowMinimum)
  })

  it("shows the error when the zone is above the stand, as text under the field", () => {
    const { texts } = partial({}, "9")
    expect(texts()).toContain(guide.details.issues.zoneAboveStand)
  })

  it("follows each keystroke through onChange", () => {
    const { one, changes } = partial()
    act(() => one("route-zone-field").props.onChangeText("1,5"))
    expect(changes.at(-1)).toEqual({ zoneText: "1,5", complementDone: true, totalText: "8" })
    expect(one("route-zone-field").props.value).toBe("1,5")
  })

  it("records the complement: the switch is on by default and shows the total evaluated field", () => {
    const { one } = partial()
    const toggle = one("route-complement-switch")
    expect(toggle.props.value).toBe(true)
    expect(toggle.props.accessibilityRole).toBe("switch")
    expect(toggle.props.accessibilityLabel).toBe(guide.details.complementLabel)
    expect(toggle.props.accessibilityHint).toBe(guide.details.complementHint)
    expect(toggle.props.accessibilityState).toEqual({ checked: true })
    expect(toggle.props.trackColor.true).toBe(defaultTheme.colors.moss)
    const total = one("route-total-field")
    expect(total.props.value).toBe("8")
    expect(total.props.accessibilityLabel).toBe(guide.a11y.totalField)
    expect(total.props.keyboardType).toBe("decimal-pad")
  })

  it("hides the total when the complement is turned off, and brings it back when turned on", () => {
    const { one, byId, changes } = partial()
    act(() => one("route-complement-switch").props.onValueChange(false))
    expect(changes.at(-1)).toEqual({ zoneText: "1,2", complementDone: false, totalText: "8" })
    expect(byId("route-total-field")).toHaveLength(0)
    expect(one("route-complement-switch").props.value).toBe(false)
    act(() => one("route-complement-switch").props.onValueChange(true))
    expect(one("route-total-field").props.value).toBe("8")
  })

  it("shows the error when the total evaluated is smaller than the zone", () => {
    const { texts } = partial({ value: { zoneText: "3", complementDone: true, totalText: "2" } })
    expect(texts()).toContain(guide.details.issues.complementBelowZone)
  })

  it("lets the observer type the total", () => {
    const { one, changes } = partial()
    act(() => one("route-total-field").props.onChangeText("7,5"))
    expect(changes.at(-1)).toEqual({ zoneText: "1,2", complementDone: true, totalText: "7,5" })
  })
})

describe("RouteDetailsCard: relevé déplafonné", () => {
  it("reads the factors counted in full with a link to change them", () => {
    const onEditCounting = jest.fn()
    const { texts, one } = mountCard({
      counting: "uncapped",
      uncappedFactors: ["B", "F"],
      onEditCounting,
    })
    const factors = ["B", "F"]
      .map((letter) =>
        fr.surveyDetail.route.factorItem({
          letter,
          title: fr.labels.factorTitles[letter as "B" | "F"],
        }),
      )
      .join(", ")
    expect(texts()).toContain(guide.details.countedLine(factors))
    const link = one("route-edit-counting")
    expect(link.props.accessibilityRole).toBe("button")
    expect(link.props.accessibilityLabel).toBe(guide.details.editCountingA11y)
    act(() => link.props.onPress())
    expect(onEditCounting).toHaveBeenCalledTimes(1)
  })

  it("has no counting line for a relevé plafonné, nor a link without a handler", () => {
    const capped = mountCard({ counting: "capped" })
    expect(capped.texts().join("|")).not.toContain(guide.details.countedLead)
    const noLink = mountCard({ counting: "uncapped", uncappedFactors: ["A"] })
    expect(noLink.byId("route-edit-counting")).toHaveLength(0)
  })
})

describe("GlossarySection", () => {
  const entries = (tree: renderer.ReactTestRenderer) =>
    tree.root
      .findAll((node) => typeof node.type === "string" && node.props.accessibilityRole === "header")
      .map((node) => node.props.children as string)

  it("is folded: no term shows until the section is opened", () => {
    const { one, texts } = mountElement(React.createElement(GlossarySection))
    expect(one("route-glossary")).toBeDefined()
    expect(texts()).toContain(guide.glossary.title)
    expect(texts()).not.toContain(guide.glossary.terms.peuplement.text)
  })

  it("lists the ten terms of the spec when opened, each with its sentence", () => {
    const { tree, one, texts } = mountElement(React.createElement(GlossarySection))
    const toggle = one("route-glossary").findAll(
      (node) => typeof node.type === "string" && node.props.accessibilityRole === "button",
    )[0]
    expect(toggle.props.accessibilityState).toEqual({ expanded: false })
    act(() => toggle.props.onPress())
    const terms = Object.values(guide.glossary.terms)
    expect(terms).toHaveLength(10)
    expect(entries(tree)).toEqual(terms.map((entry) => entry.term))
    for (const entry of terms) expect(texts()).toContain(entry.text)
  })

  it("lists the terms of the current suggestion first", () => {
    const { tree, one } = mountElement(
      React.createElement(GlossarySection, { highlight: ["parPlacette", "relevePlafonne"] }),
    )
    act(() =>
      one("route-glossary")
        .findAll(
          (node) => typeof node.type === "string" && node.props.accessibilityRole === "button",
        )[0]
        .props.onPress(),
    )
    const listed = entries(tree)
    expect(listed.slice(0, 2)).toEqual([
      guide.glossary.terms.parPlacette.term,
      guide.glossary.terms.relevePlafonne.term,
    ])
    expect(listed).toHaveLength(10)
    expect(new Set(listed).size).toBe(10)
  })

  it("ignores a repeated term", () => {
    const { tree, one } = mountElement(
      React.createElement(GlossarySection, { highlight: ["peuplement", "peuplement"] }),
    )
    act(() =>
      one("route-glossary")
        .findAll(
          (node) => typeof node.type === "string" && node.props.accessibilityRole === "button",
        )[0]
        .props.onPress(),
    )
    expect(entries(tree)).toHaveLength(10)
  })
})

describe("termsOfSelection", () => {
  it("names the words a full parcours uses", () => {
    expect(termsOfSelection("full", "capped")).toEqual([
      "parcoursEnPlein",
      "relevePlafonne",
      "surfaceDecrite",
      "peuplement",
    ])
  })

  it("adds the partial parcours and the rest of the stand for a partial one", () => {
    expect(termsOfSelection("partial_plot", "uncapped")).toEqual([
      "parPlacette",
      "parcoursPartiel",
      "releveDeplafonne",
      "surfaceDecrite",
      "resteDuPeuplement",
      "peuplement",
    ])
    expect(termsOfSelection("partial_strip", "capped")[0]).toBe("parBande")
  })
})
