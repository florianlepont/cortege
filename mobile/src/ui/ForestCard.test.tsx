import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandRadius } from "../app/brand-tokens"
import { buildTheme, defaultTheme } from "../app/theme"
import { ForestCard } from "./ForestCard"

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
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

jest.mock("./ContourLines", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    ContourLines: (props: Record<string, unknown>) => ReactRef.createElement("ContourLines", props),
  }
})

let mockTheme = defaultTheme
jest.mock("../app/theme", () => ({
  ...jest.requireActual("../app/theme"),
  useBrandTheme: () => mockTheme,
}))

afterEach(() => {
  mockTheme = defaultTheme
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(props: Partial<React.ComponentProps<typeof ForestCard>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ForestCard testID="card" {...props}>
        <ForestCardChild />
      </ForestCard>,
    )
  })
  const views = tree!.root.findAll((n) => (n.type as unknown) === "View")
  return { tree: tree!, shell: flatten(views[0].props.style), clip: flatten(views[1].props.style) }
}

function ForestCardChild() {
  return React.createElement("Child")
}

describe("ForestCard", () => {
  test.each([
    ["light", defaultTheme],
    ["dark", buildTheme("dark", "dark", () => {})],
  ])("the clip always has the fallback colour (%s)", (_name, theme) => {
    mockTheme = theme
    const { clip } = render()
    expect(clip.backgroundColor).toBe(theme.visual.forest.fallback)
  })

  test("resume (default) uses radius 26 and the resume gradient", () => {
    const { shell, clip } = render()
    expect(shell.borderRadius).toBe(26)
    expect(clip.borderRadius).toBe(brandRadius.forestCard)
    expect(clip.experimental_backgroundImage).toBe(defaultTheme.visual.forest.image)
  })

  test("hero uses radius 28 and the hero gradient", () => {
    const { shell, clip } = render({ variant: "hero" })
    expect(shell.borderRadius).toBe(28)
    expect(clip.borderRadius).toBe(brandRadius.forestHero)
    expect(clip.experimental_backgroundImage).toBe(defaultTheme.visual.forest.heroImage)
  })

  test("the shell carries the coloured shadow, the clip the edge (inset ring and highlight)", () => {
    const forest = defaultTheme.visual.forest
    const { shell, clip } = render()
    expect(shell.boxShadow).toBe(forest.shadow)
    expect(shell.overflow).toBeUndefined()
    expect(clip).toMatchObject({ overflow: "hidden", boxShadow: forest.edge })
    expect(forest.edge).toBe(`inset 0 0 0 1px ${forest.hairline}, ${forest.highlight}`)
  })

  // 12.2-17 (owner, iPhone): the flat layer showed past the gradient at the edges and corners.
  describe.each([
    ["resume", "resume"],
    ["hero", "hero"],
  ] as const)("layering invariants, %s", (_name, variant) => {
    test("shell and clip resolve the same radius and no borderCurve", () => {
      const { shell, clip } = render({ variant })
      expect(typeof shell.borderRadius).toBe("number")
      expect(clip.borderRadius).toBe(shell.borderRadius)
      // RN on iOS draws box shadows and the overflow clip with circular arcs only.
      expect(shell.borderCurve).toBeUndefined()
      expect(clip.borderCurve).toBeUndefined()
    })

    test("a caller style cannot give the shell a background or a different radius", () => {
      const { shell, clip } = render({ variant, style: { marginTop: 8 } })
      expect(shell.backgroundColor).toBeUndefined()
      expect(clip.borderRadius).toBe(shell.borderRadius)
    })

    test("no border on the gradient view: the hairline is an inset ring", () => {
      const { shell, clip } = render({ variant })
      for (const layer of [shell, clip]) {
        for (const key of Object.keys(layer)) expect(key).not.toMatch(/^border.*(Width|Color)$/)
      }
      expect(String(clip.boxShadow)).toMatch(/^inset 0 0 0 1px rgba\(/)
    })

    test("the fallback colour sits on the clipped gradient view only", () => {
      const { shell, clip } = render({ variant })
      expect(clip.experimental_backgroundImage).toBeDefined()
      expect(clip.backgroundColor).toBe(defaultTheme.visual.forest.fallback)
      expect(clip.overflow).toBe("hidden")
      expect(shell.backgroundColor).toBeUndefined()
      expect(shell.experimental_backgroundImage).toBeUndefined()
    })
  })

  test("no style in the tree has an elevation key", () => {
    const { tree } = render({ style: { margin: 4 }, contentStyle: { padding: 8 } })
    const withElevation = tree.root.findAll((n) => "elevation" in flatten(n.props.style))
    expect(withElevation).toHaveLength(0)
  })

  test("renders the contours by default and passes animatedContours", () => {
    const { tree } = render()
    const contours = tree.root.findAll((n) => (n.type as unknown) === "ContourLines")
    expect(contours).toHaveLength(1)
    expect(contours[0].props.animated).toBe(true)
  })

  test("animatedContours={false} stops the drift", () => {
    const { tree } = render({ animatedContours: false })
    const contours = tree.root.findAll((n) => (n.type as unknown) === "ContourLines")
    expect(contours[0].props.animated).toBe(false)
  })

  test("no backdrop by default", () => {
    const { tree } = render()
    const clipView = tree.root.findAll((n) => (n.type as unknown) === "View")[1]
    expect(clipView.children).toHaveLength(2)
  })

  test("a backdrop sits inside the clip, over the gradient and under the content (12.2-19)", () => {
    const { tree } = render({ contours: false, backdrop: React.createElement("Aurora") })
    const clipView = tree.root.findAll((n) => (n.type as unknown) === "View")[1]
    const [first, second] = clipView.children as renderer.ReactTestInstance[]
    expect(clipView.children).toHaveLength(2)
    expect(first.type).toBe("Aurora")
    expect(second.findAll((n) => (n.type as unknown) === "Child")).toHaveLength(1)
    expect(tree.root.findAll((n) => (n.type as unknown) === "ContourLines")).toHaveLength(0)
  })

  test("other cards keep their contour drift beside a backdrop", () => {
    const { tree } = render({ backdrop: React.createElement("Aurora") })
    const contours = tree.root.findAll((n) => (n.type as unknown) === "ContourLines")
    expect(contours[0].props.animated).toBe(true)
  })

  test("contours={false} omits the contour layer", () => {
    const { tree } = render({ contours: false })
    expect(tree.root.findAll((n) => (n.type as unknown) === "ContourLines")).toHaveLength(0)
  })

  test("children render inside the clip view", () => {
    const { tree } = render()
    const clipView = tree.root.findAll((n) => (n.type as unknown) === "View")[1]
    expect(clipView.findAll((n) => (n.type as unknown) === "Child")).toHaveLength(1)
  })
})
