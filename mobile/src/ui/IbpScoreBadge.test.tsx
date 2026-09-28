import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { IbpScoreBadge } from "./IbpScoreBadge"
import { useBrandTheme, type BrandTheme } from "../app/theme"
import { fr } from "../i18n"

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

type FlatStyle = { backgroundColor?: string; color?: string }

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle)) as FlatStyle
  }
  return (style ?? {}) as FlatStyle
}

// No `BrandThemeProvider` is mounted in this test (same as the rest of the suite, which renders
// `IbpScoreBadge` in isolation), so `useBrandTheme()` resolves to its light-theme default — capture
// that same value here instead of duplicating its band colours as literals.
function captureTheme(): BrandTheme {
  let captured: BrandTheme | undefined
  function Capture() {
    captured = useBrandTheme()
    return null
  }
  act(() => {
    renderer.create(<Capture />)
  })
  return captured as BrandTheme
}

function render(score: number | null | undefined) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<IbpScoreBadge score={score} />)
  })
  const root = tree!.root
  const badge = root.findAll((node: ReactTestInstance) => (node.type as unknown) === "View")[0]
  const textNodes = root.findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
  return {
    background: flattenStyle(badge?.props.style).backgroundColor,
    textColor: flattenStyle(textNodes[0]?.props.style).color,
    texts: textNodes.map((node) => String([node.props.children].flat().join(""))),
  }
}

describe("IbpScoreBadge shows the total out of 50 in the package band colour (01.8 D-03, CH-11)", () => {
  test("42 reads 42 /50 in the high colour", () => {
    const theme = captureTheme()
    const { background, textColor, texts } = render(42)
    expect(texts).toEqual(["42", "/50"])
    expect(fr.components.ibpScoreBadge.denominator).toBe("/50")
    expect(background).toBe(theme.ibpScoreColors.high.background)
    expect(textColor).toBe(theme.ibpScoreColors.high.text)
  })

  test("25 (moyenne) is mid and 5 (faible) is low", () => {
    const theme = captureTheme()
    expect(render(25).background).toBe(theme.ibpScoreColors.mid.background)
    expect(render(5).background).toBe(theme.ibpScoreColors.low.background)
  })

  test("the old /10 thresholds no longer colour a score: 7 and 15 are low", () => {
    const theme = captureTheme()
    expect(render(7).background).toBe(theme.ibpScoreColors.low.background)
    expect(render(15).background).toBe(theme.ibpScoreColors.low.background)
  })

  test("a band boundary falls in the higher band: 20 is mid, 30 is high", () => {
    const theme = captureTheme()
    expect(render(20).background).toBe(theme.ibpScoreColors.mid.background)
    expect(render(30).background).toBe(theme.ibpScoreColors.high.background)
  })

  test("no score shows the empty colour and the dash", () => {
    const theme = captureTheme()
    const { background, texts } = render(null)
    expect(background).toBe(theme.ibpScoreColors.empty.background)
    expect(texts[0]).toBe(fr.components.ibpScoreBadge.noScore)
    expect(render(undefined).background).toBe(theme.ibpScoreColors.empty.background)
  })
})
