jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { IMMERSIVE_OUT_MS } from "../../map/swipe-machine"
import {
  COVER_PRESENT_MS,
  COVER_QUICK_RENDER_TIMEOUT_MS,
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
  act(async () => {
    jest.advanceTimersByTime(ms)
  })

async function setup(initial = { covered: true, swipeMode: true }, quick = false) {
  const release = jest.fn()
  const hook = await renderHook(
    (props: { covered: boolean; swipeMode: boolean }) =>
      useCoverRelease({ ...props, release, quick }),
    { initialProps: initial },
  )
  const api = () => hook.result.current as CoverRelease
  return { release, hook, api }
}

describe("useCoverRelease", () => {
  test("the style load alone does not release: it waits for a rendered-fully after it", async () => {
    const { release, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await advance(COVER_RENDER_TIMEOUT_MS - 1)
    expect(release).not.toHaveBeenCalled()
  })

  test("a rendered-fully before the style load is ignored", async () => {
    const { release, api } = await setup()
    await act(async () => api().onRenderedFully())
    await advance(5000)
    expect(release).not.toHaveBeenCalled()
  })

  test("style load then rendered-fully releases COVER_PRESENT_MS after the style load", async () => {
    const { release, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await advance(COVER_PRESENT_MS - 20)
    await act(async () => api().onRenderedFully())
    await advance(19)
    expect(release).not.toHaveBeenCalled()
    await advance(1)
    expect(release).toHaveBeenCalledTimes(1)
  })

  test("a rendered-fully long after the style load releases at once", async () => {
    const { release, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await advance(500)
    await act(async () => api().onRenderedFully())
    await advance(0)
    expect(release).toHaveBeenCalledTimes(1)
  })

  test("without a rendered-fully the cover goes after the timeout", async () => {
    const { release, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await advance(COVER_RENDER_TIMEOUT_MS)
    expect(release).toHaveBeenCalledTimes(1)
  })

  test("a second style load re-arms the wait", async () => {
    const { release, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await advance(2000)
    await act(async () => api().onStyleLoaded())
    await advance(COVER_RENDER_TIMEOUT_MS - 1)
    expect(release).not.toHaveBeenCalled()
    await advance(1)
    expect(release).toHaveBeenCalledTimes(1)
  })

  test("events with no cover do nothing", async () => {
    const { release, api } = await setup({ covered: false, swipeMode: true })
    await act(async () => api().onStyleLoaded())
    await act(async () => api().onRenderedFully())
    await advance(5000)
    expect(release).not.toHaveBeenCalled()
  })

  test("a cover that ends cancels the pending release; unmounting too", async () => {
    const { release, hook, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await hook.rerender({ covered: false, swipeMode: true })
    await advance(5000)
    expect(release).not.toHaveBeenCalled()
    await hook.rerender({ covered: true, swipeMode: true })
    await act(async () => api().onStyleLoaded())
    await hook.unmount()
    await advance(5000)
    expect(release).not.toHaveBeenCalled()
  })

  test("after the swipe mode ends the cover waits for the window to be back", async () => {
    const { release, hook, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await hook.rerender({ covered: true, swipeMode: false })
    await act(async () => api().onRenderedFully())
    await advance(COVER_PRESENT_MS)
    expect(release).not.toHaveBeenCalled()
    await advance(IMMERSIVE_OUT_MS - COVER_PRESENT_MS)
    expect(release).toHaveBeenCalledTimes(1)
  })
})

describe("useCoverRelease offline (quick)", () => {
  test("a map that never reports rendered-fully is not waited for the online cap", async () => {
    const { release, api } = await setup(undefined, true)
    await act(async () => api().onStyleLoaded())
    await advance(COVER_QUICK_RENDER_TIMEOUT_MS - 1)
    expect(release).not.toHaveBeenCalled()
    await advance(1)
    expect(release).toHaveBeenCalledTimes(1)
    expect(COVER_QUICK_RENDER_TIMEOUT_MS).toBeLessThan(COVER_RENDER_TIMEOUT_MS)
  })

  test("a rendered-fully still releases after the present time", async () => {
    const { release, api } = await setup(undefined, true)
    await act(async () => api().onStyleLoaded())
    await act(async () => api().onRenderedFully())
    await advance(COVER_PRESENT_MS)
    expect(release).toHaveBeenCalledTimes(1)
  })
})
