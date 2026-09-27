import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { IbpFactorBars, type IbpFactorBarsEntries } from "./IbpFactorBars"
import { FACTOR_TITLES } from "../app/constants"
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

type FlatStyle = { width?: string; backgroundColor?: string }

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle)) as FlatStyle
  }
  return (style ?? {}) as FlatStyle
}

function render(entries: IbpFactorBarsEntries) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<IbpFactorBars entries={entries} />)
  })
  const root = tree!.root
  const texts = root
    .findAll((node: ReactTestInstance) => (node.type as unknown) === "Text")
    .map((node) => String([node.props.children].flat().join("")))
  return { texts, root }
}

function fillWidth(root: ReactTestInstance, factor: string) {
  const row = root.findByProps({ testID: `ibp-factor-bar-${factor}` })
  const fillView = row
    .findAll((node: ReactTestInstance) => (node.type as unknown) === "View")
    .map((node) => flattenStyle(node.props.style))
    .find((style) => typeof style.width === "string" && style.width !== "0%")
  return fillView?.width
}

describe("IbpFactorBars (DET-01)", () => {
  test("groups A-G under 'stand', H-J under 'context'", () => {
    const { texts } = render({ A: 5, H: 2 })
    expect(texts).toContain(fr.components.ibpFactorBars.standGroup)
    expect(texts).toContain(fr.components.ibpFactorBars.contextGroup)
  })

  test("renders every factor's title and its bar fills proportionally to a 0-5 scale", () => {
    const { texts, root } = render({ A: 5, B: 0, C: null })
    expect(texts).toContain(FACTOR_TITLES.A)
    expect(texts).toContain(FACTOR_TITLES.J)
    expect(fillWidth(root, "A")).toBe("100%")
    expect(fillWidth(root, "B")).toBeUndefined()
  })

  test("a missing or null entry shows the not-filled placeholder, not a score", () => {
    const { texts } = render({})
    expect(texts).toContain(fr.components.ibpFactorBars.notFilled)
    expect(texts).not.toContain(fr.components.ibpFactorBars.points({ points: 0 }))
  })

  test("a filled factor shows its points out of 5", () => {
    const { texts } = render({ D: 2 })
    expect(texts).toContain(fr.components.ibpFactorBars.points({ points: 2 }))
  })

  test("clamps an out-of-range point value to the 0-5 scale", () => {
    const { root } = render({ E: 9 })
    expect(fillWidth(root, "E")).toBe("100%")
  })
})
