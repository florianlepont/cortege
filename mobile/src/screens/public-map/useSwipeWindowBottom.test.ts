jest.mock("react-native", () => ({}))

import { cleanup, renderHook } from "@testing-library/react-native/pure"
import { useSwipeWindowBottom } from "./useSwipeWindowBottom"

afterEach(async () => {
  await cleanup()
})

type Props = { on: boolean; notices: boolean }
const mount = (initial: Props) =>
  renderHook((p: Props) => useSwipeWindowBottom(p.on, p.notices, 100, 28), {
    initialProps: initial,
  })

describe("useSwipeWindowBottom", () => {
  test("without a notice the reserve is the base", async () => {
    const { result } = await mount({ on: true, notices: false })
    expect(result.current).toBe(100)
  })

  test("a notice up as the mode starts adds the notices zone", async () => {
    const { result } = await mount({ on: true, notices: true })
    expect(result.current).toBe(128)
  })

  test("a notice that appears or goes while receded does not move the window", async () => {
    const { result, rerender } = await mount({ on: true, notices: false })
    await rerender({ on: true, notices: true })
    expect(result.current).toBe(100)
    await rerender({ on: false, notices: true })
    await rerender({ on: true, notices: true })
    expect(result.current).toBe(128)
    await rerender({ on: true, notices: false })
    expect(result.current).toBe(128)
  })
})
