import React from "react"
import renderer, { act } from "react-test-renderer"
import { estimateFinishBarHeight } from "./finish-bar-layout"
import { useFinishBarHeight } from "./useFinishBarHeight"

jest.mock("../../app/useAppBottomTabBarHeight", () => ({ useTabBarClearance: () => 90 }))

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

type Result = ReturnType<typeof useFinishBarHeight>

function mount(visible: boolean): { read: () => Result } {
  let result!: Result
  function Probe() {
    result = useFinishBarHeight(visible)
    return null
  }
  act(() => {
    renderer.create(<Probe />)
  })
  return { read: () => result }
}

const layout = (height: number) => ({ nativeEvent: { layout: { height } } }) as never

describe("useFinishBarHeight", () => {
  test("is null without a bar", () => {
    expect(mount(false).read().barHeight).toBeNull()
  })

  test("starts at the estimate", () => {
    expect(mount(true).read().barHeight).toBe(estimateFinishBarHeight(90))
  })

  test("a taller measured bar (a label wrapped on two lines) wins over the estimate", () => {
    const probe = mount(true)
    act(() => probe.read().onBarLayout(layout(180.2)))
    expect(probe.read().barHeight).toBe(181)
  })

  test("a smaller measure never drops below the estimate, and repeating a height changes nothing", () => {
    const probe = mount(true)
    act(() => probe.read().onBarLayout(layout(100)))
    expect(probe.read().barHeight).toBe(estimateFinishBarHeight(90))
    act(() => probe.read().onBarLayout(layout(100)))
    act(() => probe.read().onBarLayout(layout(100)))
    expect(probe.read().barHeight).toBe(estimateFinishBarHeight(90))
  })
})
