jest.mock("react-native", () => ({
  Platform: { select: (opts: Record<string, unknown>) => opts.default ?? Object.values(opts)[0] },
}))
jest.mock("../../ui/feedback", () => ({
  feedback: { selection: jest.fn() },
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { feedback } from "../../ui/feedback"
import { useExportChoice } from "./useExportChoice"

afterEach(async () => {
  await cleanup()
  jest.clearAllMocks()
})

type Params = Parameters<typeof useExportChoice>[0]

async function setup(overrides: Partial<Params> = {}) {
  const params: Params = {
    isDraft: false,
    surveyFound: true,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  }
  const view = await renderHook((props: Params) => useExportChoice(props), {
    initialProps: params,
  })
  // Not spread: the render result is a thenable, which would be unwrapped by the async return.
  return { view, params }
}

describe("useExportChoice", () => {
  test("starts on the complete PDF, nothing is remembered", async () => {
    const { view } = await setup()
    expect(view.result.current.mode).toBe("complete")
  })

  test("selecting the summary moves the mode with one haptic", async () => {
    const { view } = await setup()
    await act(async () => {
      view.result.current.select("summary")
    })
    expect(view.result.current.mode).toBe("summary")
    expect(feedback.selection).toHaveBeenCalledTimes(1)
  })

  test("selecting the current mode does nothing", async () => {
    const { view } = await setup()
    await act(async () => {
      view.result.current.select("complete")
    })
    expect(view.result.current.mode).toBe("complete")
    expect(feedback.selection).not.toHaveBeenCalled()
  })

  test("confirm hands the chosen mode to the caller once", async () => {
    const { view, params } = await setup()
    await act(async () => {
      view.result.current.select("summary")
    })
    await act(async () => {
      view.result.current.confirm()
    })
    expect(params.onConfirm).toHaveBeenCalledTimes(1)
    expect(params.onConfirm).toHaveBeenCalledWith("summary")
    expect(params.onClose).not.toHaveBeenCalled()
  })

  test("a draft can never select the summary", async () => {
    const { view, params } = await setup({ isDraft: true })
    await act(async () => {
      view.result.current.select("summary")
    })
    expect(view.result.current.mode).toBe("complete")
    expect(feedback.selection).not.toHaveBeenCalled()
    await act(async () => {
      view.result.current.confirm()
    })
    expect(params.onConfirm).toHaveBeenCalledWith("complete")
  })

  test("a survey that turns into a draft falls back to the complete PDF", async () => {
    const { view, params } = await setup()
    await act(async () => {
      view.result.current.select("summary")
    })
    expect(view.result.current.mode).toBe("summary")
    await view.rerender({ ...params, isDraft: true })
    expect(view.result.current.mode).toBe("complete")
    await act(async () => {
      view.result.current.confirm()
    })
    expect(params.onConfirm).toHaveBeenCalledWith("complete")
  })

  test("a missing survey closes the sheet once and never confirms", async () => {
    const { view, params } = await setup({ surveyFound: false })
    expect(params.onClose).toHaveBeenCalledTimes(1)
    await view.rerender({ ...params })
    expect(params.onClose).toHaveBeenCalledTimes(1)
    expect(params.onConfirm).not.toHaveBeenCalled()
  })

  test("a found survey does not close the sheet", async () => {
    const { params } = await setup()
    expect(params.onClose).not.toHaveBeenCalled()
  })
})
