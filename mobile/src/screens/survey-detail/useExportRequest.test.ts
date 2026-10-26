jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
}))

import { cleanup, renderHook } from "@testing-library/react-native/pure"
import type { ExportMode } from "../../app/survey-pdf-export"
import type { SurveyExportRequest } from "../../navigation/types"
import { useExportRequest } from "./useExportRequest"

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

afterEach(async () => {
  await cleanup()
})

type Props = { request: SurveyExportRequest | undefined }

async function setup(initial: SurveyExportRequest | undefined) {
  const share = jest.fn<Promise<void>, [ExportMode]>().mockResolvedValue(undefined)
  const onHandled = jest.fn()
  const view = await renderHook(
    (props: Props) => useExportRequest(props.request, share, onHandled),
    {
      initialProps: { request: initial },
    },
  )
  return { share, onHandled, view }
}

describe("useExportRequest", () => {
  test("does nothing without a request", async () => {
    const { share, onHandled } = await setup(undefined)

    expect(share).not.toHaveBeenCalled()
    expect(onHandled).not.toHaveBeenCalled()
  })

  test("exports once in the requested mode and clears the request", async () => {
    const { share, onHandled } = await setup({ mode: "summary", nonce: 1 })

    expect(share).toHaveBeenCalledTimes(1)
    expect(share).toHaveBeenCalledWith("summary")
    expect(onHandled).toHaveBeenCalledTimes(1)
  })

  test("a re-render with the same request exports nothing more", async () => {
    const { share, onHandled, view } = await setup({ mode: "summary", nonce: 1 })

    await view.rerender({ request: { mode: "summary", nonce: 1 } })
    await view.rerender({ request: { mode: "summary", nonce: 1 } })

    expect(share).toHaveBeenCalledTimes(1)
    expect(onHandled).toHaveBeenCalledTimes(1)
  })

  test("a request whose nonce was already handled is ignored even if the route did not clear it", async () => {
    const { share, view } = await setup({ mode: "summary", nonce: 1 })

    await view.rerender({ request: undefined })
    await view.rerender({ request: { mode: "summary", nonce: 1 } })
    await view.rerender({ request: { mode: "complete", nonce: 1 } })

    expect(share).toHaveBeenCalledTimes(1)
  })

  test("a new nonce exports again, in its own mode", async () => {
    const { share, onHandled, view } = await setup({ mode: "summary", nonce: 1 })

    await view.rerender({ request: { mode: "complete", nonce: 2 } })

    expect(share).toHaveBeenCalledTimes(2)
    expect(share).toHaveBeenLastCalledWith("complete")
    expect(onHandled).toHaveBeenCalledTimes(2)
  })

  test("new callbacks alone trigger no export", async () => {
    const first = jest.fn().mockResolvedValue(undefined)
    const second = jest.fn().mockResolvedValue(undefined)
    const handled = jest.fn()
    const view = await renderHook(
      (props: { share: (mode: ExportMode) => Promise<void> }) =>
        useExportRequest(undefined, props.share, handled),
      { initialProps: { share: first } },
    )

    await view.rerender({ share: second })

    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
  })
})
