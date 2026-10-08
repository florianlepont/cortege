import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandRadius } from "../../app/brand-tokens"
import { compositeOver, contrastRatio } from "../../app/contrast"
import { buildTheme, defaultTheme } from "../../app/theme"
import { glassContourOpacity } from "../../app/visual-tokens"
import { fr } from "../../i18n"
import { NEW_SURVEY_INNER_RADIUS, NEW_SURVEY_LAYOUT } from "./layout-budget"
import { NewSurveyCard } from "./NewSurveyCard"

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
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: {
      create: <T,>(styles: T): T => styles,
      absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/AppCard", () => ({ AppCard: "AppCard" }))
jest.mock("../../ui/ContourLines", () => ({ ContourLines: "ContourLines" }))
jest.mock("../../ui/RipplePressable", () => ({ RipplePressable: "RipplePressable" }))

let mockTheme = defaultTheme
jest.mock("../../app/theme", () => ({
  ...jest.requireActual("../../app/theme"),
  useBrandTheme: () => mockTheme,
}))

const t = fr.home.newSurvey
const dark = buildTheme("dark")

let tree: ReactTestRenderer

function styleOf(node: ReactTestInstance): Record<string, unknown> {
  return [node.props.style].flat(3).reduce(
    (acc: Record<string, unknown>, item: Record<string, unknown> | null | undefined) => ({
      ...acc,
      ...(item ?? {}),
    }),
    {},
  )
}

function mount(theme = defaultTheme) {
  mockTheme = theme
  const onPress = jest.fn()
  act(() => {
    tree = renderer.create(<NewSurveyCard onPress={onPress} />)
  })
  const pressable = tree.root.findByType("RipplePressable" as never)
  const texts = tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  return { onPress, pressable, texts }
}

afterEach(() => {
  act(() => tree.unmount())
  mockTheme = defaultTheme
})

describe("NewSurveyCard (12.2-19 fix round)", () => {
  test("is one button named 'Nouveau relevé', with the green wave, that starts a survey", () => {
    const { onPress, pressable } = mount()
    expect(pressable.props.accessibilityRole).toBe("button")
    expect(pressable.props.accessibilityLabel).toBe("Nouveau relevé")
    expect(pressable.props.accessibilityLabel).toBe(t.label)
    expect(pressable.props.accessibilityHint).toBe(t.helper)
    expect(tree.root.findAllByType("RipplePressable" as never)).toHaveLength(1)
    act(() => pressable.props.onPress())
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("a 56 pt field target, its wave clipped to the inner curve of the 22 pt glass card", () => {
    const { pressable } = mount()
    const style = styleOf(pressable)
    expect(style.minHeight).toBe(NEW_SURVEY_LAYOUT.minHeight)
    expect(style.minHeight as number).toBeGreaterThanOrEqual(56)
    expect(style.minHeight as number).toBeGreaterThan(brandInteraction.hitTarget.min)
    expect(pressable.props.rippleRadius).toBe(NEW_SURVEY_INNER_RADIUS)
    expect(brandRadius.card).toBe(22)
    expect(NEW_SURVEY_INNER_RADIUS).toBe(brandRadius.card - NEW_SURVEY_LAYOUT.border)
  })

  test("the AppCard glass look: no padding of its own, no gradient and no extra border", () => {
    mount()
    const card = tree.root.findByType("AppCard" as never)
    expect(card.props.variant).toBe("glass")
    expect(card.props.padding).toBe(0)
    expect(card.props.glass).toBeUndefined()
    expect(card.props.style).toBeUndefined()
  })

  test("reads: a moss disc with the + outline icon, the label, the helper, a chevron", () => {
    const { texts } = mount()
    expect(texts).toEqual([t.label, t.helper])
    const icons = tree.root.findAllByType("Ionicons" as never).map((node) => node.props.name)
    expect(icons).toEqual(["add-outline", "chevron-forward-outline"])
    const disc = tree.root.findAllByType("Ionicons" as never)[0].parent as ReactTestInstance
    const discStyle = styleOf(disc)
    expect(discStyle.width).toBe(NEW_SURVEY_LAYOUT.disc)
    expect(discStyle.borderRadius).toBe(brandRadius.pill)
    expect(discStyle.backgroundColor).toBe(defaultTheme.visual.pill.fallback)
    expect(discStyle.borderWidth).toBeUndefined()
  })

  test("the texts come from the catalogue, with no dash", () => {
    for (const text of [t.label, t.helper]) {
      expect(text).not.toMatch(/[–—]/)
      expect(text.trim().length).toBeGreaterThan(0)
    }
  })

  test("the contours are a faint static texture, clipped, behind the button", () => {
    mount()
    const contours = tree.root.findByType("ContourLines" as never)
    expect(contours.props.animated).toBe(false)
    const texture = contours.parent as ReactTestInstance
    expect(texture.props.testID).toBe("home-new-survey-texture")
    expect(texture.props.pointerEvents).toBe("none")
    const style = styleOf(texture)
    expect(style.position).toBe("absolute")
    expect(style.overflow).toBe("hidden")
    expect(style.opacity).toBe(glassContourOpacity.light)
    expect(style.opacity as number).toBeLessThanOrEqual(0.3)
    // Drawn first, so the pressable and its text sit over it.
    const card = tree.root.findByType("AppCard" as never)
    expect((card.children[0] as ReactTestInstance).props.testID).toBe(texture.props.testID)
    act(() => tree.unmount())
    mount(dark)
    const darkTexture = tree.root.findByType("ContourLines" as never).parent as ReactTestInstance
    expect(styleOf(darkTexture).opacity).toBe(glassContourOpacity.dark)
  })

  test.each([
    ["light", defaultTheme],
    ["dark", dark],
  ])("reads in %s: label and helper AA on the glass, the + on the moss disc", (_name, theme) => {
    mount(theme)
    // The glass fill over the canvas it sits on (the backdrop halos are faint enough to ignore).
    const surface = compositeOver(theme.visual.glass.cardFill, theme.colors.canvas)
    const texts = tree.root.findAll((node) => (node.type as unknown) === "Text")
    expect(texts).toHaveLength(2)
    for (const text of texts) {
      expect(contrastRatio(String(styleOf(text).color), surface)).toBeGreaterThanOrEqual(4.5)
    }
    const plus = tree.root.findAllByType("Ionicons" as never)[0]
    expect(contrastRatio(plus.props.color, theme.visual.pill.fallback)).toBeGreaterThanOrEqual(4.5)
  })
})
