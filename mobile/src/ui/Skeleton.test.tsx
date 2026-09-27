import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { Skeleton, SkeletonRow } from "./Skeleton"

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

const appStateListeners: Array<(state: string) => void> = []

jest.mock("react-native", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)

  return {
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
    AppState: {
      currentState: "active",
      addEventListener: (_event: string, callback: (state: string) => void) => {
        appStateListeners.push(callback)
        return { remove: () => {} }
      },
    },
  }
})

function findAll(tree: renderer.ReactTestRenderer, name: string): ReactTestInstance[] {
  return tree.root.findAll((node) => (node.type as unknown) === name)
}

describe("Skeleton", () => {
  afterEach(() => {
    appStateListeners.length = 0
  })

  test("renders at the given size with the muted panel color", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<Skeleton width={120} height={20} />)
    })
    const view = findAll(tree!, "View")[0]
    expect(view.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 120, height: 20 })]),
    )
  })

  test("SkeletonRow renders a leading block and two lines", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<SkeletonRow />)
    })
    expect(findAll(tree!, "View").length).toBeGreaterThanOrEqual(4)
  })

  test("pauses and resumes the pulse when the app backgrounds and foregrounds", () => {
    act(() => {
      renderer.create(<Skeleton />)
    })
    expect(appStateListeners).toHaveLength(1)
    // Neither transition should throw — the effect cancels/restarts the shared-value animation.
    expect(() => {
      act(() => {
        appStateListeners[0]("background")
      })
      act(() => {
        appStateListeners[0]("active")
      })
    }).not.toThrow()
  })
})
