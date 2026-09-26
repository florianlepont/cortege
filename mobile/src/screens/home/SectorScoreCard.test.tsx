import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { SectorScoreCard } from "./SectorScoreCard"
import { brandColors, ibpScoreTokens } from "../../app/brand-tokens"
import { fr } from "../../i18n"

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)

  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    Platform: {
      OS: "ios",
      select: <T,>(options: { ios?: T; android?: T; default?: T }): T | undefined =>
        options.ios ?? options.default,
    },
  }
})

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) {
      return
    }
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

type FlatStyle = { backgroundColor?: string }

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle)) as FlatStyle
  }
  return (style ?? {}) as FlatStyle
}

function render(score: number, mixedMethods?: boolean) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <SectorScoreCard score={score} analysedCount={3} mixedMethods={mixedMethods} />,
    )
  })
  const root = tree!.root
  const dots = root
    .findAll(
      (node: ReactTestInstance) =>
        (node.type as unknown) === "View" && node.props.testID === "sector-score-dot",
    )
    .map((node) => flattenStyle(node.props.style).backgroundColor)
  const texts = root
    .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  return { dots, texts }
}

describe("SectorScoreCard shows the sector average out of 50 (01.8 D-03, CH-11)", () => {
  test("23.4 reads 23.4 / 50 with 5 of 10 dots in the mid colour", () => {
    const { dots, texts } = render(23.4)
    expect(texts).toContain("23.4 / 50")
    expect(dots).toHaveLength(10)
    expect(dots.filter((c) => c === ibpScoreTokens.colors.mid.background)).toHaveLength(5)
    expect(dots.filter((c) => c === brandColors.divider)).toHaveLength(5)
  })

  test("each dot is worth 5 points and the colour follows the band", () => {
    const high = render(42).dots
    expect(high.filter((c) => c === ibpScoreTokens.colors.high.background)).toHaveLength(8)
    const low = render(7).dots
    expect(low.filter((c) => c === ibpScoreTokens.colors.low.background)).toHaveLength(1)
    expect(render(50).dots.every((c) => c === ibpScoreTokens.colors.high.background)).toBe(true)
  })

  test("shows the mixed-methods line only when asked", () => {
    expect(render(23.4, true).texts).toContain(fr.home.sector.mixedMethods)
    expect(render(23.4, false).texts).not.toContain(fr.home.sector.mixedMethods)
    expect(render(23.4).texts).not.toContain(fr.home.sector.mixedMethods)
  })

  test("shows the label and the analysed count", () => {
    const { texts } = render(12)
    expect(texts).toContain(fr.home.sector.label)
    expect(texts).toContain(fr.home.sector.meta({ count: 3 }))
  })
})
