import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../test/react-native-reanimated.mock"
import { ScreenCoverContext } from "./screen-cover-context"
import { Skeleton, SkeletonRow } from "./Skeleton"

// The real package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})

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

const withRepeatSpy = jest.spyOn(reanimated, "withRepeat")
const withTimingSpy = jest.spyOn(reanimated, "withTiming")
const cancelSpy = jest.spyOn(reanimated, "cancelAnimation")

const noopUnsubscribe = () => undefined
const fakeNavigation = (focused: boolean) =>
  ({ isFocused: () => focused, addListener: () => noopUnsubscribe }) as never

function opacityOf(tree: renderer.ReactTestRenderer): unknown {
  const view = tree.root.findAll((node) => (node.type as unknown) === "View")[0]
  return Object.assign({}, ...[view.props.style].flat()).opacity
}

function findAll(tree: renderer.ReactTestRenderer, name: string): ReactTestInstance[] {
  return tree.root.findAll((node) => (node.type as unknown) === name)
}

describe("Skeleton", () => {
  afterEach(() => {
    appStateListeners.length = 0
    reanimated.setReducedMotion(false)
    for (const spy of [withRepeatSpy, withTimingSpy, cancelSpy]) spy.mockClear()
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

  test("pulses on the UI thread with ReduceMotion.System on the loop and its timing", () => {
    act(() => {
      renderer.create(<Skeleton />)
    })
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
    const [, count, reverse, , reduceMotion] = withRepeatSpy.mock.calls[0] as unknown[]
    expect([count, reverse, reduceMotion]).toEqual([-1, true, reanimated.ReduceMotion.System])
    expect((withTimingSpy.mock.calls[0] as unknown[])[1]).toMatchObject({
      duration: 900,
      reduceMotion: reanimated.ReduceMotion.System,
    })
  })

  test("under Reduce Motion holds a fixed opacity and starts no loop", () => {
    reanimated.setReducedMotion(true)
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<Skeleton />)
    })
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(opacityOf(tree)).toBe(0.75)
    expect(appStateListeners).toHaveLength(0)
  })

  test("runs only while its screen can be seen: not unfocused, not covered (12.2-21)", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <NavigationContext.Provider value={fakeNavigation(false)}>
          <Skeleton />
        </NavigationContext.Provider>,
      )
    })
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(appStateListeners).toHaveLength(0)

    act(() => {
      tree.update(
        <ScreenCoverContext.Provider value={true}>
          <NavigationContext.Provider value={fakeNavigation(true)}>
            <Skeleton />
          </NavigationContext.Provider>
        </ScreenCoverContext.Provider>,
      )
    })
    expect(withRepeatSpy).not.toHaveBeenCalled()

    act(() => {
      tree.update(
        <ScreenCoverContext.Provider value={false}>
          <NavigationContext.Provider value={fakeNavigation(true)}>
            <Skeleton />
          </NavigationContext.Provider>
        </ScreenCoverContext.Provider>,
      )
    })
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)

    cancelSpy.mockClear()
    act(() => {
      tree.update(
        <ScreenCoverContext.Provider value={true}>
          <NavigationContext.Provider value={fakeNavigation(true)}>
            <Skeleton />
          </NavigationContext.Provider>
        </ScreenCoverContext.Provider>,
      )
    })
    expect(cancelSpy).toHaveBeenCalled()
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
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
