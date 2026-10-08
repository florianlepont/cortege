import React, { createRef } from "react"
import renderer, { act } from "react-test-renderer"
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native"
import { useScrollTop } from "./useScrollTop"

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

function setup() {
  const scrollTo = jest.fn()
  const ref = createRef<ScrollView | null>() as { current: ScrollView | null }
  ref.current = { scrollTo } as unknown as ScrollView
  let api: ReturnType<typeof useScrollTop> | undefined
  function Probe() {
    api = useScrollTop(ref)
    return null
  }
  act(() => {
    renderer.create(<Probe />)
  })
  return { scrollTo, api: api!, ref }
}

const drag = (y: number) =>
  ({ nativeEvent: { contentOffset: { x: 0, y } } }) as NativeSyntheticEvent<NativeScrollEvent>

describe("useScrollTop (D-25, 12.2-17)", () => {
  test("before any drag the page has not moved: back to 0", () => {
    const { scrollTo, api } = setup()
    api.scrollToTop(true)
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true })
  })

  test("under the native large title the resting offset is minus the inset: back there", () => {
    const { scrollTo, api } = setup()
    // The page opens at its top: the first drag starts at the resting offset.
    api.onScrollBeginDrag(drag(-152))
    api.onScrollBeginDrag(drag(400))
    api.scrollToTop(false)
    expect(scrollTo).toHaveBeenCalledWith({ y: -152, animated: false })
  })

  test("without a large title the resting offset is 0, never below", () => {
    const { scrollTo, api } = setup()
    api.onScrollBeginDrag(drag(0))
    api.scrollToTop(true)
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true })
  })

  test("a page whose first drag begins mid-scroll still goes back to 0, not past it", () => {
    const { scrollTo, api } = setup()
    api.onScrollBeginDrag(drag(37))
    api.scrollToTop(true)
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true })
  })

  test("does nothing once the scroll view is gone", () => {
    const { scrollTo, api, ref } = setup()
    ref.current = null
    expect(() => api.scrollToTop(true)).not.toThrow()
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
