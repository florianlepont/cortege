import React from "react"
import renderer, { act } from "react-test-renderer"
import { selectionAsync } from "expo-haptics"
import { pressableLook as look } from "../../test/pressable-look"
import { AppChoiceChip, type AppStatusChipTone } from "./AppChoiceChip"
import { brandColors, brandComponentTokens, brandRadius } from "../app/brand-tokens"
import { compositeOver, contrastRatio } from "../app/contrast"
import { buildTheme, defaultTheme, type BrandColorScheme } from "../app/theme"

let mockScheme: BrandColorScheme = "light"

jest.mock("../app/theme", () => {
  const actual = jest.requireActual<typeof import("../app/theme")>("../app/theme")
  return {
    ...actual,
    useBrandTheme: () => actual.buildTheme(mockScheme),
  }
})

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
  }
})

type StyleObject = Record<string, unknown>

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

beforeEach(() => {
  ;(selectionAsync as jest.Mock).mockClear()
})

afterEach(() => {
  mockScheme = "light"
})

function flatten(style: unknown): StyleObject {
  return ([] as unknown[])
    .concat(style)
    .flat(Infinity)
    .filter(Boolean)
    .reduce<StyleObject>((merged, next) => ({ ...merged, ...(next as StyleObject) }), {})
}

function render(props: {
  active?: boolean
  tone?: "neutral" | "success" | "warning" | "danger"
  onPress?: () => void
}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppChoiceChip label="Oui" {...props} />)
  })
  const pressable = tree!.root.findByType("Pressable" as unknown as React.ComponentType)
  const text = tree!.root.findByType("Text" as unknown as React.ComponentType)
  return { pressable, text }
}

const { chip } = defaultTheme.visual

describe("AppChoiceChip (D-05, D-08)", () => {
  test("inactive: glass fill, hairline border and secondary label", () => {
    const { pressable, text } = render({ onPress: () => undefined })
    expect(look(pressable)).toMatchObject({
      backgroundColor: chip.fill,
      borderColor: chip.border,
    })
    expect(flatten(text.props.style).color).toBe(chip.text)
    expect(pressable.props.accessibilityState).toEqual({ disabled: false, selected: false })
  })

  test("active: inverted neutral fill with the canvas label, selected for screen readers", () => {
    const { pressable, text } = render({ active: true, onPress: () => undefined })
    expect(look(pressable).backgroundColor).toBe(chip.activeBg)
    expect(flatten(text.props.style).color).toBe(chip.activeText)
    expect(pressable.props.accessibilityState.selected).toBe(true)
  })

  test("keeps the 44 pt minimum height", () => {
    const { pressable } = render({ onPress: () => undefined })
    expect(look(pressable).minHeight).toBe(brandComponentTokens.choiceChip.minHeight)
    expect(brandComponentTokens.choiceChip.minHeight).toBe(44)
  })

  test("pressing ticks once and then calls onPress", () => {
    const onPress = jest.fn()
    const { pressable } = render({ onPress })
    act(() => {
      pressable.props.onPress()
    })
    expect(selectionAsync).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  test("a chip without onPress is disabled and fires nothing", () => {
    const { pressable } = render({})
    expect(pressable.props.disabled).toBe(true)
    expect(pressable.props.onPress).toBeUndefined()
    expect(pressable.props.accessibilityState.disabled).toBe(true)
    expect(selectionAsync).not.toHaveBeenCalled()
  })

  test("a tone tints the inactive fill and the active state still wins", () => {
    const tinted = render({ tone: "success", onPress: () => undefined })
    expect(look(tinted.pressable).backgroundColor).toBe(
      defaultTheme.componentColors.choiceChip.successBackground,
    )
    const active = render({ tone: "success", active: true, onPress: () => undefined })
    expect(look(active.pressable).backgroundColor).toBe(chip.activeBg)
  })
})

function renderStatus(tone?: AppStatusChipTone) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppChoiceChip variant="status" label="Synchronisé" tone={tone} />)
  })
  const view = tree!.root.findByType("View" as unknown as React.ComponentType)
  const text = tree!.root.findByType("Text" as unknown as React.ComponentType)
  return { view, box: flatten(view.props.style), label: flatten(text.props.style) }
}

describe("AppChoiceChip status variant (phase 12.2)", () => {
  test("is a plain non-interactive view with a hairline glass border and a pill radius", () => {
    const { view, box } = renderStatus("neutral")
    expect(view.props.accessibilityRole).toBeUndefined()
    expect(box).toMatchObject({
      borderWidth: 1,
      borderColor: defaultTheme.visual.glass.cardBorder,
      borderRadius: brandRadius.pill,
    })
  })

  test("defaults to the neutral tone", () => {
    expect(renderStatus().box.backgroundColor).toBe(defaultTheme.visual.chip.fill)
  })

  test("the on-dark tone keeps its own border and label", () => {
    const { box, label } = renderStatus("onDark")
    const { statusChip } = defaultTheme.componentColors
    expect(box.borderColor).toBe(statusChip.onDarkBorder)
    expect(label.color).toBe(statusChip.onDarkTextColor)
  })

  test("the success label is forest in light", () => {
    expect(renderStatus("success").label.color).toBe(brandColors.forest)
  })

  test.each(["light", "dark"] as const)("%s: every tone label is at least 4.5:1", (scheme) => {
    mockScheme = scheme
    const theme = buildTheme(scheme)
    for (const tone of ["neutral", "success", "warning", "danger"] as const) {
      const { box, label } = renderStatus(tone)
      const background = compositeOver(String(box.backgroundColor), theme.colors.canvas)
      expect(contrastRatio(String(label.color), background)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
