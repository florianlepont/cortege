import React from "react"
import renderer, { act, ReactTestInstance } from "react-test-renderer"
import { ROUTE_METHODS, UNCAPPED_PRESETS } from "@cortege/ibp-domain"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    Modal: mockComponent("Modal"),
    ScrollView: mockComponent("ScrollView"),
    TextInput: mockComponent("TextInput"),
    Switch: mockComponent("Switch"),
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
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}))
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppText", () => ({ AppText: "Text" }))
jest.mock("../../ui/AppCard", () => ({ AppCard: "AppCard" }))
jest.mock("../../ui/GlassButton", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassButton: (props: Record<string, unknown>) => ReactRef.createElement("GlassButton", props),
  }
})

import { ROUTE_METHOD_TEXT } from "../../app/route-text"
import { fr } from "../../i18n"
import {
  chooseReducer,
  initialChooseModel,
  selectChooseView,
  type ChooseInit,
} from "./route-choose-model"
import { RouteChooseScreen } from "./RouteChooseScreen"

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

const guide = fr.routeGuide

type ScreenProps = React.ComponentProps<typeof RouteChooseScreen>

/** The screen over the real model, as the route owns it. */
function mount(
  init: ChooseInit,
  extra: Partial<Pick<ScreenProps, "mode" | "saveError" | "saving" | "section">> = {},
) {
  const onUse = jest.fn()
  const onAdvise = jest.fn()
  const scrollTo = jest.fn()
  function Harness() {
    const [model, dispatch] = React.useReducer(chooseReducer, init, initialChooseModel)
    return (
      <RouteChooseScreen
        mode="pick"
        saveError={false}
        saving={false}
        {...extra}
        view={selectChooseView(model)}
        onSelectMethod={(method) => dispatch({ type: "selectMethod", method })}
        onSelectCounting={(counting) => dispatch({ type: "selectCounting", counting })}
        onSelectPreset={(preset) => dispatch({ type: "selectPreset", preset })}
        onToggleFactor={(factor) => dispatch({ type: "toggleFactor", factor })}
        onChangeDetails={(value) => dispatch({ type: "setDetails", value })}
        onUse={onUse}
        onAdvise={onAdvise}
      />
    )
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<Harness />, { createNodeMock: () => ({ scrollTo }) })
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
  const press = (id: string) => act(() => one(id).props.onPress())
  return { tree, byId, one, texts, press, onUse, onAdvise, scrollTo }
}

describe("RouteChooseScreen: content", () => {
  test("keeps the ScrollView off the first-child path of the iOS form sheet (it opened empty)", () => {
    // react-native-screens forces the frame of the first ScrollView found along first children of a
    // form sheet to the sheet's own frame, which hid the list. The root is not flattened and its first
    // child is an empty guard, so the scroll comes after it and flex gives it the room above the footer.
    const { one } = mount({ standHa: 8 })
    const root = one("route-choose-screen")
    expect(root.props.collapsable).toBe(false)
    const ids = root.children.map((child) =>
      typeof child === "string" ? child : (child.props.testID as string | undefined),
    )
    expect(ids.slice(0, 2)).toEqual(["route-choose-sheet-guard", "route-choose-scroll"])
    expect(one("route-choose-sheet-guard").props.collapsable).toBe(false)
    expect(one("route-choose-sheet-guard").children).toHaveLength(0)
    const scroll = one("route-choose-scroll")
    expect(scroll.props.style).toEqual(expect.objectContaining({ flex: 1 }))
  })

  test("shows the lead, the three parcours with their words, the mode and the glossary", () => {
    const { one, byId, texts } = mount({ standHa: 8 })
    expect(one("route-choose-screen")).toBeDefined()
    expect(texts()).toContain(guide.chooser.lead)
    expect(texts()).toContain("Parcours")
    for (const method of ROUTE_METHODS) {
      expect(byId(`route-parcours-${method}`)).toHaveLength(1)
      expect(texts()).toContain(ROUTE_METHOD_TEXT[method].name)
    }
    expect(texts()).toContain("Parcours en plein")
    expect(texts()).toContain("Parcours partiel par bande")
    expect(texts()).toContain("Parcours partiel par placette")
    expect(byId("route-parcours-typological")).toHaveLength(0)
    expect(byId("route-parcours-systematic")).toHaveLength(0)
    expect(byId("route-counting-capped")).toHaveLength(1)
    expect(byId("route-counting-uncapped")).toHaveLength(1)
    expect(byId("route-glossary")).toHaveLength(0)
    expect(byId("glossary-info-parcoursEnPlein")).toHaveLength(1)
  })

  test("each parcours card carries its explanation, what it does and who it suits", () => {
    const { one } = mount({ standHa: 8 })
    const label = one("route-parcours-partial_plot").props.accessibilityLabel as string
    const text = ROUTE_METHOD_TEXT.partial_plot
    expect(label).toContain(text.name)
    expect(label).toContain(text.does)
    expect(label).toContain(text.suits)
  })

  test("tags the suggested parcours Conseillé, and none without a suggestion", () => {
    const tagged = mount({ standHa: 8, suggested: { method: "partial_strip", counting: "capped" } })
    expect(tagged.texts().filter((text) => text === "Conseillé")).toHaveLength(1)
    expect(tagged.one("route-parcours-partial_strip").props.accessibilityLabel).toContain(
      "Conseillé",
    )
    expect(mount({ standHa: 8 }).texts()).not.toContain("Conseillé")
  })

  test("shows no details card until a parcours is chosen", () => {
    const { byId, press } = mount({ standHa: 8 })
    expect(byId("route-details")).toHaveLength(0)
    press("route-parcours-full")
    expect(byId("route-details")).toHaveLength(1)
  })

  test("the disabled button explains itself, and the duration advice follows the zone", () => {
    const { one, press, byId } = mount({ standHa: 8 })
    expect(one("route-choose-use").props.disabled).toBe(true)
    expect(one("route-choose-use").props.accessibilityLabel).toBe(guide.chooser.useDisabledA11y)
    expect(byId("route-advice")).toHaveLength(0)
    press("route-parcours-full")
    expect(byId("route-advice")).toHaveLength(1)
    expect(one("route-choose-use").props.disabled).toBe(false)
    expect(one("route-choose-use").props.accessibilityLabel).toBeUndefined()
    expect(one("route-choose-use").props.label).toBe("Utiliser ce parcours")
  })
})

describe("RouteChooseScreen: choosing", () => {
  test("a parcours is plafonné by default, and déplafonné needs a hand choice", () => {
    const { one, press, byId } = mount({ standHa: 8 })
    press("route-parcours-partial_strip")
    expect(one("route-parcours-partial_strip").props.accessibilityState).toMatchObject({
      selected: true,
    })
    expect(one("route-counting-capped").props.accessibilityState).toMatchObject({ selected: true })
    expect(byId("route-counting-factors")).toHaveLength(0)
    press("route-counting-uncapped")
    expect(byId("route-counting-factors")).toHaveLength(1)
    expect(one("route-preset-all_factors").props.accessibilityState).toMatchObject({
      selected: true,
    })
    expect(byId("route-advice")).toHaveLength(1)
  })

  test("the advice says the uncapped mode takes longer", () => {
    const { press, texts } = mount({ standHa: 8 })
    press("route-parcours-full")
    expect(texts().join("\n")).not.toContain(guide.advice.uncappedLonger)
    press("route-counting-uncapped")
    expect(texts().join("\n")).toContain(guide.advice.uncappedLonger)
  })

  test("a preset sets the chips, a chip touch leaves the preset, the last factor off blocks", () => {
    const { one, press, texts } = mount({ standHa: 8 })
    press("route-parcours-full")
    press("route-counting-uncapped")
    press("route-preset-minimum")
    for (const letter of UNCAPPED_PRESETS.minimum) {
      expect(one(`route-factor-${letter}`).props.accessibilityState).toMatchObject({
        selected: true,
      })
    }
    press("route-factor-A")
    expect(one("route-preset-custom").props.accessibilityState).toMatchObject({ selected: true })
    press("route-factor-A")
    press("route-factor-C")
    press("route-factor-D")
    press("route-factor-E")
    expect(texts()).toContain("Choisissez au moins un facteur.")
    expect(one("route-choose-use").props.disabled).toBe(true)
  })

  test("going back to plafonné says the values are kept when the draft has detail values", () => {
    const { press, byId } = mount({ standHa: 8, hasDetailData: true })
    press("route-parcours-full")
    press("route-counting-uncapped")
    press("route-counting-capped")
    expect(byId("route-kept-values")).toHaveLength(1)
  })

  test("a partial parcours asks for a valid surface to describe before it can be used", () => {
    const { one, press } = mount({ standHa: 8 })
    press("route-parcours-partial_plot")
    expect(one("route-choose-use").props.disabled).toBe(true)
    act(() => one("route-zone-field").props.onChangeText("1,2"))
    expect(one("route-choose-use").props.disabled).toBe(false)
  })

  test("an unknown stand surface is typed by hand, even for the full parcours", () => {
    const { one, press } = mount({ standHa: null })
    press("route-parcours-full")
    expect(one("route-zone-field").props.value).toBe("")
    expect(one("route-choose-use").props.disabled).toBe(true)
    act(() => one("route-zone-field").props.onChangeText("3"))
    expect(one("route-choose-use").props.disabled).toBe(false)
  })
})

describe("RouteChooseScreen: footer, link and sections", () => {
  test("Utiliser ce parcours calls the owner", () => {
    const { press, onUse } = mount({ standHa: 8 })
    press("route-parcours-full")
    press("route-choose-use")
    expect(onUse).toHaveBeenCalledTimes(1)
  })

  test("the footer button is busy while saving", () => {
    const { one } = mount({ standHa: 8 }, { saving: true })
    expect(one("route-choose-use").props.loading).toBe(true)
  })

  test("a save error shows the notice and Réessayer asks again", () => {
    const { onUse, texts, tree } = mount({ standHa: 8 }, { saveError: true })
    expect(texts()).toContain(guide.screen.saveError)
    const retry = tree.root.findAll(
      (node) => node.props.accessibilityLabel === guide.screen.retry && node.props.onPress,
    )
    expect(retry.length).toBeGreaterThan(0)
    act(() => retry[0].props.onPress())
    expect(onUse).toHaveBeenCalledTimes(1)
  })

  test("the link Être conseillé shows in edit mode only", () => {
    const edit = mount({ standHa: 8 }, { mode: "edit" })
    expect(edit.texts()).toContain("Être conseillé")
    edit.press("route-advise-link")
    expect(edit.onAdvise).toHaveBeenCalledTimes(1)
    expect(mount({ standHa: 8 }).byId("route-advise-link")).toHaveLength(0)
  })

  test("opens at the mode de relevé once when asked", () => {
    const { tree, scrollTo } = mount({ standHa: 8 }, { section: "counting" })
    const sections = tree.root.findAll(
      (node) => typeof node.type === "string" && typeof node.props.onLayout === "function",
    )
    expect(sections).toHaveLength(1)
    act(() => sections[0].props.onLayout({ nativeEvent: { layout: { y: 420 } } }))
    expect(scrollTo).toHaveBeenCalledWith({ y: 420, animated: false })
    act(() => sections[0].props.onLayout({ nativeEvent: { layout: { y: 430 } } }))
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  test("does not scroll by itself without the section", () => {
    const { tree, scrollTo } = mount({ standHa: 8 })
    const sections = tree.root.findAll(
      (node) => typeof node.type === "string" && typeof node.props.onLayout === "function",
    )
    act(() => sections[0].props.onLayout({ nativeEvent: { layout: { y: 420 } } }))
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
