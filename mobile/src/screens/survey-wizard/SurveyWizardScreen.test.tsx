import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { brandSpacing4 } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { estimateFinishBarHeight, finishBarBottomPadding } from "../survey-detail/finish-bar-layout"
import type { SurveyFormMethod } from "./method"
import { SurveyWizardScreen } from "./SurveyWizardScreen"
import { pressableLook as look } from "../../../test/pressable-look"

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

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: {
      OS: "ios",
      select: <T,>(spec: { ios?: T; default?: T }) => spec.ios ?? spec.default,
    },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}))
jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))
jest.mock("../../ui/AppText", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppText: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("Text", props, children),
  }
})
jest.mock("../../ui/AppField", () => ({ AppField: "AppField" }))
jest.mock("../../ui/CasPicker", () => ({ CasPicker: "CasPicker" }))
jest.mock("../../ui/AppChoiceChip", () => ({ AppChoiceChip: "AppChoiceChip" }))
jest.mock("../../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))
// The native header bridge talks to the navigator; here only what the wizard hands it matters.
jest.mock("./WizardNativeHeader", () => ({ WizardNativeHeader: "WizardNativeHeader" }))

const w = fr.surveyForm.wizard

type Style = Record<string, unknown>
function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function makeMethod(overrides: Partial<SurveyFormMethod> = {}): SurveyFormMethod {
  return {
    version: IBP_METHOD_V3_2,
    cas: null,
    cas3Scale: false,
    locked: false,
    setVersion: jest.fn(),
    setCas: jest.fn(),
    setCas3Scale: jest.fn(),
    ...overrides,
  }
}

function mount(
  extra: Partial<React.ComponentProps<typeof SurveyWizardScreen>> = {},
  method = makeMethod(),
) {
  const onOpenParcels = jest.fn()
  const onClose = jest.fn()
  let tree!: ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <SurveyWizardScreen
        siteName="Forêt de Rambouillet"
        setSiteName={jest.fn()}
        formErrors={{ siteName: null }}
        method={method}
        regionVersion="ACA"
        vegetationStage="collineen"
        setVegetationStage={jest.fn()}
        onRegionChange={jest.fn()}
        onOpenParcels={onOpenParcels}
        onClose={onClose}
        {...extra}
      />,
    )
  })
  return { tree, method, onOpenParcels, onClose }
}

const byTestID = (tree: ReactTestRenderer, id: string): ReactTestInstance =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.type === "string")[0]
const button = (tree: ReactTestRenderer) => byTestID(tree, "wizard-continue")
const next = (tree: ReactTestRenderer): void => {
  act(() => {
    button(tree).props.onPress()
  })
}

describe("SurveyWizardScreen: variant I glass (12.2-16)", () => {
  test("draws no canvas: the route's ScreenFrame is the page and the halo (D-19)", () => {
    const { tree } = mount()
    const screen = flatten(byTestID(tree, "wizard-screen").props.style)
    expect(screen.flex).toBe(1)
    expect("backgroundColor" in screen).toBe(false)
  })

  test("the top buttons keep their 44 pt and the progress uses the score tokens", () => {
    const { tree } = mount()
    const back = look(byTestID(tree, "wizard-back"))
    expect(back.width).toBe(44)
    expect(back.height).toBe(44)
    expect(back.backgroundColor).toBe(defaultTheme.visual.glass.cardFill)
    const segments = tree.root.findAll(
      (n) => typeof n.type === "string" && flatten(n.props.style).height === 4,
    )
    expect(segments).toHaveLength(4)
    const colours = segments.map((segment) => flatten(segment.props.style).backgroundColor)
    expect(colours).toEqual([
      defaultTheme.visual.score.high,
      defaultTheme.visual.score.track,
      defaultTheme.visual.score.track,
      defaultTheme.visual.score.track,
    ])
  })

  test("the question keeps its 30 on 35 size", () => {
    const { tree } = mount()
    const title = tree.root.findAll(
      (n) => n.props.accessibilityRole === "header" && typeof n.type === "string",
    )[0]
    const style = flatten(title.props.style)
    expect(style.fontSize).toBe(30)
    expect(style.lineHeight).toBe(35)
  })
})

describe("SurveyWizardScreen: floating call to action (D-27c, D-28)", () => {
  test("the bar has no fill, floats at the bottom and lets touches through", () => {
    const { tree } = mount()
    const bar = byTestID(tree, "wizard-footer")
    const style = flatten(bar.props.style)
    expect(bar.props.pointerEvents).toBe("box-none")
    expect(style.position).toBe("absolute")
    expect(style.bottom).toBe(0)
    expect("backgroundColor" in style).toBe(false)
    expect(style.paddingBottom).toBe(finishBarBottomPadding(90))
  })

  test("the button is the glass button, large, disabled until the step can continue", () => {
    const empty = mount({ siteName: "  " })
    expect(button(empty.tree).type).toBe("GlassButton")
    expect(button(empty.tree).props).toMatchObject({
      label: w.continue,
      size: "lg",
      disabled: true,
    })
    const named = mount()
    expect(button(named.tree).props.disabled).toBe(false)
  })

  test("the page ends above the bar: measured height once known, the estimate before", () => {
    const { tree } = mount()
    const content = () => flatten(byTestID(tree, "wizard-body").props.contentContainerStyle)
    expect(content().paddingBottom).toBe(estimateFinishBarHeight(90) + brandSpacing4.md)
    act(() => {
      byTestID(tree, "wizard-footer").props.onLayout({
        nativeEvent: { layout: { height: 220, width: 390, x: 0, y: 0 } },
      })
    })
    expect(content().paddingBottom).toBe(220 + brandSpacing4.md)
  })

  test("a name is required on the first step, then the steps advance to the parcel map", () => {
    const { tree, onOpenParcels } = mount()
    const none = mount({ siteName: "" })
    next(none.tree)
    expect(byTestID(none.tree, "wizard-name-field")).toBeDefined()

    next(tree)
    expect(byTestID(tree, `method-option-${IBP_METHOD_V3_2}`)).toBeDefined()
    next(tree)
    // v3.2 needs a cas before it can go on.
    expect(tree.root.findAll((n) => (n.type as unknown) === "CasPicker")).toHaveLength(1)
    expect(button(tree).props.disabled).toBe(true)
    next(tree)
    expect(onOpenParcels).not.toHaveBeenCalled()
  })

  test("the last step with a cas opens the parcel map", () => {
    const { tree, onOpenParcels } = mount({}, makeMethod({ cas: 2 }))
    next(tree)
    next(tree)
    next(tree)
    expect(onOpenParcels).toHaveBeenCalledTimes(1)
  })

  test("back closes from the first step and goes back one step otherwise", () => {
    const { tree, onClose } = mount()
    expect(byTestID(tree, "wizard-back").props.accessibilityLabel).toBe(w.close)
    act(() => {
      byTestID(tree, "wizard-back").props.onPress()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    next(tree)
    expect(byTestID(tree, "wizard-back").props.accessibilityLabel).toBe(w.back)
    act(() => {
      byTestID(tree, "wizard-back").props.onPress()
    })
    expect(byTestID(tree, "wizard-back").props.accessibilityLabel).toBe(w.close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe("SurveyWizardScreen: method cards", () => {
  function onMethodStep(method = makeMethod()) {
    const mounted = mount({}, method)
    next(mounted.tree)
    return mounted
  }

  test("a card is glass with a hairline; the selected one has a 2 pt accent border", () => {
    const { tree } = onMethodStep()
    const selected = look(byTestID(tree, `method-option-${IBP_METHOD_V3_2}`))
    const other = look(byTestID(tree, `method-option-${IBP_METHOD_V3_0}`))
    const { glass, accentText } = defaultTheme.visual
    expect(other.backgroundColor).toBe(glass.cardFill)
    expect(other.borderWidth).toBe(1)
    expect(other.borderColor).toBe(glass.cardBorder)
    expect(selected.backgroundColor).toBe(glass.cardFill)
    expect(selected.borderWidth).toBe(2)
    expect(selected.borderColor).toBe(accentText)
  })

  test("the selected and unselected cards have the same size (padding plus border)", () => {
    const { tree } = onMethodStep()
    const selected = look(byTestID(tree, `method-option-${IBP_METHOD_V3_2}`))
    const other = look(byTestID(tree, `method-option-${IBP_METHOD_V3_0}`))
    expect(Number(selected.padding) + Number(selected.borderWidth)).toBe(
      Number(other.padding) + Number(other.borderWidth),
    )
  })

  test("the selected radio is the inverted neutral dot with a matching check", () => {
    const { tree } = onMethodStep()
    const card = byTestID(tree, `method-option-${IBP_METHOD_V3_2}`)
    const radio = card.findAll(
      (n) => typeof n.type === "string" && flatten(n.props.style).borderRadius === 12,
    )[0]
    const { chip } = defaultTheme.visual
    expect(flatten(radio.props.style).backgroundColor).toBe(chip.activeBg)
    const check = card.findAll((n) => (n.type as unknown) === "Ionicons")[0]
    expect(check.props.color).toBe(chip.activeText)
    const unselected = byTestID(tree, `method-option-${IBP_METHOD_V3_0}`)
    expect(unselected.findAll((n) => (n.type as unknown) === "Ionicons")).toHaveLength(0)
  })

  test("the recommended mark is a plain accent word, not a tag pill", () => {
    const { tree } = onMethodStep()
    const word = byTestID(tree, `method-option-${IBP_METHOD_V3_2}`).findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === w.method.recommended,
    )[0]
    const style = flatten(word.props.style)
    expect(style.color).toBe(defaultTheme.visual.accentText)
    expect("backgroundColor" in style).toBe(false)
    expect("borderRadius" in style).toBe(false)
    expect(
      byTestID(tree, `method-option-${IBP_METHOD_V3_0}`).findAll(
        (n) => n.props.children === w.method.recommended,
      ),
    ).toHaveLength(0)
  })

  test("choosing a method calls the setter, and a locked method cannot change", () => {
    const open = onMethodStep()
    act(() => {
      byTestID(open.tree, `method-option-${IBP_METHOD_V3_0}`).props.onPress()
    })
    expect(open.method.setVersion).toHaveBeenCalledWith(IBP_METHOD_V3_0)

    const locked = onMethodStep(makeMethod({ locked: true }))
    const card = byTestID(locked.tree, `method-option-${IBP_METHOD_V3_0}`)
    expect(card.props.onPress).toBeUndefined()
    expect(card.props.accessibilityState).toEqual({ selected: false, disabled: true })
  })
})

describe("SurveyWizardScreen: v3.0 region and stage", () => {
  test("the context step shows the region and stage chips", () => {
    const { tree } = mount({}, makeMethod({ version: IBP_METHOD_V3_0 }))
    next(tree)
    next(tree)
    const chips = tree.root.findAll((n) => (n.type as unknown) === "AppChoiceChip")
    expect(chips.length).toBeGreaterThan(2)
    expect(chips.filter((chip) => chip.props.active)).toHaveLength(2)
    act(() => {
      chips[0].props.onPress()
    })
  })
})

describe("SurveyWizardScreen under the native iOS header (12.2-17)", () => {
  const header = (tree: ReactTestRenderer) =>
    tree.root.findAll((n) => (n.type as unknown) === "WizardNativeHeader")[0]

  test("no back button or step label of its own: the system back and the bar's title replace them", () => {
    const { tree } = mount({ nativeHeader: true })
    expect(byTestID(tree, "wizard-back")).toBeUndefined()
    expect(
      tree.root.findAll((n) => typeof n.type === "string" && n.props.children === "Étape 1 sur 4"),
    ).toHaveLength(0)
    expect(header(tree).props.title).toBe(w.stepLabel({ step: 1, total: 4 }))
    expect(header(tree).props.canStepBack).toBe(false)
  })

  test("keeps the progress, the question and the floating Continuer, below the bar", () => {
    const { tree } = mount({ nativeHeader: true })
    const segments = tree.root.findAll(
      (n) => typeof n.type === "string" && flatten(n.props.style).height === 4,
    )
    expect(segments).toHaveLength(4)
    expect(button(tree)).toBeDefined()
    // The route's ScreenFrame already starts below the bar: no status bar gap here (47 + 8).
    const topBar = tree.root.findAll(
      (n) => typeof n.type === "string" && flatten(n.props.style).paddingTop !== undefined,
    )[0]
    expect(flatten(topBar.props.style).paddingTop).toBe(brandSpacing4.sm)
  })

  test("the bar follows the step; back steps back inside the wizard past the first question", () => {
    const { tree, onClose } = mount({ nativeHeader: true })
    next(tree)
    expect(header(tree).props.title).toBe(w.stepLabel({ step: 2, total: 4 }))
    expect(header(tree).props.canStepBack).toBe(true)
    next(tree)
    expect(header(tree).props.title).toBe(w.stepLabel({ step: 3, total: 4 }))
    act(() => {
      header(tree).props.onStepBack()
    })
    expect(header(tree).props.title).toBe(w.stepLabel({ step: 2, total: 4 }))
    act(() => {
      header(tree).props.onStepBack()
    })
    expect(header(tree).props.canStepBack).toBe(false)
    // Leaving from the first question is the stack's own pop, not onClose.
    expect(onClose).not.toHaveBeenCalled()
  })

  test("without the native header (Android) the wizard keeps its top bar and no bridge", () => {
    const { tree } = mount()
    expect(header(tree)).toBeUndefined()
    expect(byTestID(tree, "wizard-back")).toBeDefined()
    const topBar = tree.root.findAll(
      (n) => typeof n.type === "string" && flatten(n.props.style).paddingTop !== undefined,
    )[0]
    expect(flatten(topBar.props.style).paddingTop).toBe(47 + 8)
  })
})
