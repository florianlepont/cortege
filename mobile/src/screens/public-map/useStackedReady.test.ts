jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import {
  STACKED_QUICK_READY_MS,
  STACKED_READY_TIMEOUT_MS,
  useStackedReady,
} from "./useStackedReady"

beforeEach(() => {
  jest.useFakeTimers()
})
afterEach(async () => {
  await cleanup()
  jest.useRealTimers()
})

async function setup(style = "a", quick = false) {
  const hook = await renderHook(
    (props: { style: string }) => useStackedReady(props.style, undefined, quick),
    { initialProps: { style } },
  )
  const api = () => hook.result.current
  return { hook, api }
}

describe("useStackedReady", () => {
  test("not ready at first, ready after the style load then a rendered-fully", async () => {
    const { api } = await setup()
    expect(api().ready.value).toBe(0)
    await act(async () => api().onStyleLoaded())
    expect(api().ready.value).toBe(0)
    await act(async () => api().onRenderedFully())
    expect(api().ready.value).toBe(1)
  })

  test("a rendered-fully before the style load does not count", async () => {
    const { api } = await setup()
    await act(async () => api().onRenderedFully())
    expect(api().ready.value).toBe(0)
  })

  test("a new style makes it not ready again, and an old rendered-fully does not count", async () => {
    const { hook, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await act(async () => api().onRenderedFully())
    expect(api().ready.value).toBe(1)
    await hook.rerender({ style: "b" })
    expect(api().ready.value).toBe(0)
    await act(async () => api().onRenderedFully())
    expect(api().ready.value).toBe(0)
    await act(async () => api().onStyleLoaded())
    await act(async () => api().onRenderedFully())
    expect(api().ready.value).toBe(1)
  })

  test("the timeout after the style load shows the map anyway", async () => {
    const { api } = await setup()
    await act(async () => api().onStyleLoaded())
    await act(async () => {
      jest.advanceTimersByTime(STACKED_READY_TIMEOUT_MS - 1)
    })
    expect(api().ready.value).toBe(0)
    await act(async () => {
      jest.advanceTimersByTime(1)
    })
    expect(api().ready.value).toBe(1)
  })

  test("a style change or an unmount cancels the pending timeout", async () => {
    const { hook, api } = await setup()
    await act(async () => api().onStyleLoaded())
    await hook.rerender({ style: "b" })
    await act(async () => {
      jest.advanceTimersByTime(STACKED_READY_TIMEOUT_MS * 2)
    })
    expect(api().ready.value).toBe(0)
    await act(async () => api().onStyleLoaded())
    const { ready } = api()
    await hook.unmount()
    await act(async () => {
      jest.advanceTimersByTime(STACKED_READY_TIMEOUT_MS * 2)
    })
    expect(ready.value).toBe(0)
  })
})

describe("useStackedReady hide and restore", () => {
  test("hide drops the map at once; restore brings it back only if it was ready for this style", async () => {
    const { api } = await setup()
    await act(async () => api().hide())
    await act(async () => api().restore())
    expect(api().ready.value).toBe(0)
    await act(async () => api().onStyleLoaded())
    await act(async () => api().onRenderedFully())
    expect(api().ready.value).toBe(1)
    await act(async () => api().hide())
    expect(api().ready.value).toBe(0)
    await act(async () => api().restore())
    expect(api().ready.value).toBe(1)
  })
})

describe("useStackedReady offline (quick)", () => {
  test("a map that cannot report rendered-fully is ready a short while after its style load", async () => {
    const { api } = await setup("a", true)
    await act(async () => api().onStyleLoaded())
    await act(async () => {
      jest.advanceTimersByTime(STACKED_QUICK_READY_MS - 1)
    })
    expect(api().ready.value).toBe(0)
    await act(async () => {
      jest.advanceTimersByTime(1)
    })
    expect(api().ready.value).toBe(1)
    expect(STACKED_QUICK_READY_MS).toBeLessThan(STACKED_READY_TIMEOUT_MS)
  })

  test("a rendered-fully after the style load still ends the wait at once, one before does not", async () => {
    const { api } = await setup("a", true)
    await act(async () => api().onRenderedFully())
    expect(api().ready.value).toBe(0)
    await act(async () => api().onStyleLoaded())
    await act(async () => api().onRenderedFully())
    expect(api().ready.value).toBe(1)
  })

  test("online keeps the strict wait", async () => {
    const { api } = await setup("a", false)
    await act(async () => api().onStyleLoaded())
    await act(async () => {
      jest.advanceTimersByTime(STACKED_QUICK_READY_MS * 2)
    })
    expect(api().ready.value).toBe(0)
  })
})
