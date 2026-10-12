jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { IMMERSIVE_OUT_MS } from "../../map/swipe-machine"
import {
  COVER_PRESENT_MS,
  COVER_RENDER_TIMEOUT_MS,
  useCoverRelease,
  type CoverRelease,
} from "./useCoverRelease"

beforeEach(() => {
  jest.useFakeTimers()
})
afterEach(async () => {
  await cleanup()
  jest.useRealTimers()
})

const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms)
  })

async function setup(initial = { covered: true, swipeMode: true }) {
  const release = jest.fn()
  const hook = await renderHook(
    (props: { covered: boolean; swipeMode: boolean }) => useCoverRelease({ ...props, release }),
    { initialProps: initial },
  )
  const api = () => hook.result.current as CoverRelease
  return { release, hook, api }
}

describe("useCoverRelease", () => {
  test("the style load alone does not release: it waits for a rendered-fully after it", async () => {
    const { release, api } = await setup()
    act(() => api().onStyleLoaded())
    advance(COVER_RENDER_TIMEOUT_MS - 1)
    expect(release).not.toHaveBeenCalled()
  })

  test("a rendered-fully before the style load is ignored", async () => {
    const { release, api } = await setup()
    act(() => api().onRenderedFully())
    advance(5000)
    expect(release).not.toHaveBeenCalled()
  })

  test("style load then rendered-fully releases COVER_PRESENT_MS after the style load", async () => {
    const { release, api } = await setup()
    act(() => api().onStyleLoaded())
    advance(COVER_PRESENT_MS - 20)
    act(() => api().onRenderedFully())
    advance(19)
    expect(release).not.toHaveBeenCalled()
    advance(1)
    expect(release).toHaveBeenCalledTimes(1)
  })

  test("a late rendered-fully still waits the present time after it is reported", async () => {
    const { release, api } = await setup()
    act(() => api().onStyleLoaded())
    advance(500)
    act(() => api().onRenderedFully())
    advance(0)
    expect(release).toHaveBeenCalledTimes(1)
  })

  test("without a rendered-fully the cover goes after the timeout", async () => {
    const { release, api } = await setup()
    act(() => api().onStyleLoaded())
    advance(COVER_RENDER_TIMEOUT_MS)
    expect(release).toHaveBeenCalledTimes(1)
  })

  test("a second style load re-arms the wait", async () => {
    const { release, api } = await setup()
    act(() => api().onStyleLoaded())
    advance(2000)
    act(() => api().onStyleLoaded())
    advance(COVER_RENDER_TIMEOUT_MS - 1)
    expect(release).not.toHaveBeenCalled()
    advance(1)
    expect(release).toHaveBeenCalledTimes(1)
  })

  test("events with no cover do nothing", async () => {
    const { release, api } = await setup({ covered: false, swipeMode: true })
    act(() => api().onStyleLoaded())
    act(() => api().onRenderedFully())
    advance(5000)
    expect(release).not.toHaveBeenCalled()
  })

  test("a cover that ends cancels the pending release; unmounting too", async () => {
    const { release, hook, api } = await setup()
    act(() => api().onStyleLoaded())
    await hook.rerender({ covered: false, swipeMode: true })
    advance(5000)
    expect(release).not.toHaveBeenCalled()
    await hook.rerender({ covered: true, swipeMode: true })
    act(() => api().onStyleLoaded())
    await hook.unmount()
    advance(5000)
    expect(release).not.toHaveBeenCalled()
  })

  test("after the swipe mode ends the cover waits for the window to be back", async () => {
    const { release, hook, api } = await setup()
    act(() => api().onStyleLoaded())
    await hook.rerender({ covered: true, swipeMode: false })
    act(() => api().onRenderedFully())
    advance(COVER_PRESENT_MS)
    expect(release).not.toHaveBeenCalled()
    advance(IMMERSIVE_OUT_MS - COVER_PRESENT_MS)
    expect(release).toHaveBeenCalledTimes(1)
  })
})
