import React from "react"
import renderer, { act } from "react-test-renderer"
import { AppStatusChip, type AppStatusChipTone } from "./AppStatusChip"
import { brandColors, brandRadius } from "../app/brand-tokens"
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
    View: mockComponent("View"),
    Text: mockComponent("Text"),
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

function render(tone: AppStatusChipTone) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppStatusChip label="Synchronisé" tone={tone} />)
  })
  const view = tree!.root.findByType("View" as unknown as React.ComponentType)
  const text = tree!.root.findByType("Text" as unknown as React.ComponentType)
  return { box: flatten(view.props.style), label: flatten(text.props.style) }
}

describe("AppStatusChip (phase 12.2)", () => {
  test("has a hairline glass border and a pill radius", () => {
    const { box } = render("neutral")
    expect(box).toMatchObject({
      borderWidth: 1,
      borderColor: defaultTheme.visual.glass.cardBorder,
      borderRadius: brandRadius.pill,
    })
  })

  test("the on-dark tone keeps its own border and label", () => {
    const { box, label } = render("onDark")
    const { statusChip } = defaultTheme.componentColors
    expect(box.borderColor).toBe(statusChip.onDarkBorder)
    expect(label.color).toBe(statusChip.onDarkTextColor)
  })

  test("the success label is forest in light", () => {
    expect(render("success").label.color).toBe(brandColors.forest)
  })

  test.each(["light", "dark"] as const)("%s: every tone label is at least 4.5:1", (scheme) => {
    mockScheme = scheme
    const theme = buildTheme(scheme)
    for (const tone of ["neutral", "success", "warning", "danger"] as const) {
      const { box, label } = render(tone)
      const background = compositeOver(String(box.backgroundColor), theme.colors.canvas)
      expect(contrastRatio(String(label.color), background)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
