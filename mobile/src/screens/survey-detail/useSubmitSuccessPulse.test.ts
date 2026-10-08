jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
  StyleSheet: { flatten: (s: unknown) => s },
}))

import { cleanup, renderHook } from "@testing-library/react-native/pure"
import { notificationAsync } from "../../../test/expo-haptics.mock"
import { useSubmitSuccessPulse } from "./useSubmitSuccessPulse"

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
  notificationAsync.mockClear()
})

async function mount(initial: string) {
  return renderHook(({ status }: { status: string }) => useSubmitSuccessPulse(status), {
    initialProps: { status: initial },
  })
}

describe("useSubmitSuccessPulse (D-25: only the real finish celebrates)", () => {
  test("a draft that is finished pulses once with the success haptic", async () => {
    const { result, rerender } = await mount("draft")
    expect(result.current).toBe(0)
    expect(notificationAsync).not.toHaveBeenCalled()

    await rerender({ status: "submitted" })
    expect(result.current).toBe(1)
    expect(notificationAsync).toHaveBeenCalledTimes(1)
    expect(notificationAsync).toHaveBeenCalledWith("success")
  })

  test("an ordinary draft sync (draft to synced) does not pulse", async () => {
    const { result, rerender } = await mount("draft")
    await rerender({ status: "synced" })
    expect(result.current).toBe(0)
    expect(notificationAsync).not.toHaveBeenCalled()
  })

  test("a synced draft that is finished pulses once: the usual finish", async () => {
    const { result, rerender } = await mount("draft")
    await rerender({ status: "synced" })
    await rerender({ status: "submitted" })
    expect(result.current).toBe(1)
    expect(notificationAsync).toHaveBeenCalledTimes(1)
  })

  test("a draft whose last send failed and is then finished pulses once", async () => {
    const { result, rerender } = await mount("error")
    await rerender({ status: "submitted" })
    expect(result.current).toBe(1)
    expect(notificationAsync).toHaveBeenCalledTimes(1)
  })

  test("a survey opened already finished never pulses, nor on a re-render", async () => {
    const { result, rerender } = await mount("submitted")
    expect(result.current).toBe(0)
    await rerender({ status: "submitted" })
    expect(result.current).toBe(0)
    expect(notificationAsync).not.toHaveBeenCalled()
  })

  test("other transitions do not pulse", async () => {
    const { result, rerender } = await mount("draft")
    await rerender({ status: "error" })
    await rerender({ status: "draft" })
    await rerender({ status: "synced" })
    await rerender({ status: "error" })
    expect(result.current).toBe(0)
    expect(notificationAsync).not.toHaveBeenCalled()
  })

  test("a second finish after a return to draft pulses again", async () => {
    const { result, rerender } = await mount("draft")
    await rerender({ status: "submitted" })
    await rerender({ status: "draft" })
    await rerender({ status: "submitted" })
    expect(result.current).toBe(2)
    expect(notificationAsync).toHaveBeenCalledTimes(2)
  })
})
