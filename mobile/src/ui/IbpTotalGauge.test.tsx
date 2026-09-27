import React from "react"
import renderer, { act } from "react-test-renderer"
import type { FactorKey, FactorProgress } from "../app/types"
import { fr } from "../i18n"
import { IbpTotalGauge } from "./IbpTotalGauge"

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
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

const ORDER: FactorKey[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]

const progress = (complete: boolean, invalid = 0): FactorProgress => ({
  complete,
  filled: complete ? 1 : 0,
  total: 1,
  invalid,
})

describe("IbpTotalGauge (FLOW-06: segmented total gauge, visible from the first wizard step)", () => {
  test("renders one segment per factor", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <IbpTotalGauge
          order={ORDER}
          factorProgress={ORDER.reduce(
            (acc, f) => ({ ...acc, [f]: progress(false) }),
            {} as Record<FactorKey, FactorProgress>,
          )}
          total={0}
          testID="gauge"
        />,
      )
    })
    for (const factor of ORDER) {
      expect(
        tree!.root.findAll((n) => n.props.testID === `gauge-segment-${factor}`),
      ).not.toHaveLength(0)
    }
  })

  test("shows the score total via the shared catalogue text", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <IbpTotalGauge
          order={ORDER}
          factorProgress={ORDER.reduce(
            (acc, f) => ({ ...acc, [f]: progress(false) }),
            {} as Record<FactorKey, FactorProgress>,
          )}
          total={23}
        />,
      )
    })
    const texts = tree!.root.findAll(
      (n) =>
        (n.type as unknown) === "Text" &&
        String(n.props.children) === fr.surveyForm.factors.scoreTotal({ total: 23 }),
    )
    expect(texts.length).toBeGreaterThan(0)
  })

  test("a complete factor and an errored factor render different segment colours", () => {
    let tree: renderer.ReactTestRenderer | undefined
    const factorProgress = ORDER.reduce(
      (acc, f, index) => ({ ...acc, [f]: index === 0 ? progress(true) : progress(false, 1) }),
      {} as Record<FactorKey, FactorProgress>,
    )
    act(() => {
      tree = renderer.create(
        <IbpTotalGauge order={ORDER} factorProgress={factorProgress} total={5} testID="gauge" />,
      )
    })
    const flatten = (style: unknown): { backgroundColor?: string } =>
      Array.isArray(style)
        ? (Object.assign({}, ...style.map(flatten)) as { backgroundColor?: string })
        : ((style ?? {}) as { backgroundColor?: string })
    const segmentA = tree!.root.findAll((n) => n.props.testID === "gauge-segment-A")[0]
    const segmentB = tree!.root.findAll((n) => n.props.testID === "gauge-segment-B")[0]
    expect(flatten(segmentA.props.style).backgroundColor).not.toBe(
      flatten(segmentB.props.style).backgroundColor,
    )
  })
})
