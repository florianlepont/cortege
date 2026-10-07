import React from "react"
import renderer, { act } from "react-test-renderer"
import { buildTheme, defaultTheme } from "../app/theme"
import { ScreenFrame } from "./ScreenFrame"

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
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    },
  }
})

const mockHeader = { height: 96 }
jest.mock("@react-navigation/elements", () => ({ useHeaderHeight: () => mockHeader.height }))

let mockTheme = defaultTheme
jest.mock("../app/theme", () => ({
  ...jest.requireActual("../app/theme"),
  useBrandTheme: () => mockTheme,
}))

afterEach(() => {
  mockTheme = defaultTheme
  mockHeader.height = 96
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function hostView(root: renderer.ReactTestInstance, testID: string) {
  const views = root.findAll((n) => (n.type as unknown) === "View" && n.props.testID === testID)
  expect(views).toHaveLength(1)
  return views[0]
}

function render(testID?: string) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ScreenFrame testID={testID}>
        {React.createElement("Text", { testID: "content" }, "page")}
      </ScreenFrame>,
    )
  })
  return tree!.root
}

describe("ScreenFrame", () => {
  test("is the page: canvas colour, full height, content pushed below the header", () => {
    const root = render()
    const frame = hostView(root, "screen-frame")
    expect(flatten(frame.props.style)).toEqual({
      flex: 1,
      backgroundColor: defaultTheme.colors.canvas,
      paddingTop: 96,
    })
  })

  test("draws the halo first, behind the content, and the content once", () => {
    const root = render()
    const frame = hostView(root, "screen-frame")
    const children = frame.children as renderer.ReactTestInstance[]
    const backdrop = hostView(root, "screen-frame-backdrop")
    // The backdrop is an absolute fill, so the header inset (padding) does not move it: the halo
    // also runs behind the transparent header.
    expect(flatten(backdrop.props.style)).toMatchObject({
      position: "absolute",
      top: 0,
      experimental_backgroundImage: defaultTheme.visual.backdrop,
    })
    expect(children).toHaveLength(2)
    expect(children[0].props.testID).toBe("screen-frame-backdrop")
    expect(children[1].props.testID).toBe("content")
  })

  test("adds no inset when the stack hides its header", () => {
    mockHeader.height = 0
    const frame = hostView(render(), "screen-frame")
    expect(flatten(frame.props.style).paddingTop).toBe(0)
  })

  test("follows the dark scheme and takes a custom test id", () => {
    mockTheme = buildTheme("dark", "dark", () => {})
    const root = render("score-frame")
    const frame = hostView(root, "score-frame")
    expect(flatten(frame.props.style).backgroundColor).toBe(mockTheme.colors.canvas)
    const backdrop = hostView(root, "score-frame-backdrop")
    expect(flatten(backdrop.props.style).experimental_backgroundImage).toBe(
      mockTheme.visual.backdrop,
    )
  })
})
