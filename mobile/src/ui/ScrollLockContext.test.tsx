import React from "react"
import renderer, { act } from "react-test-renderer"
import { ScrollLockProvider, useScrollLock } from "./ScrollLockContext"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})
afterAll(() => jest.restoreAllMocks())

function Probe({ onReady }: { onReady: (lock: (locked: boolean) => void) => void }) {
  onReady(useScrollLock())
  return null
}

describe("ScrollLockContext", () => {
  test("outside a provider locking does nothing and does not throw", () => {
    let lock!: (locked: boolean) => void
    act(() => {
      renderer.create(<Probe onReady={(l) => (lock = l)} />)
    })
    expect(() => lock(true)).not.toThrow()
  })

  test("inside a provider the call reaches the provider's setter", () => {
    const setter = jest.fn()
    let lock!: (locked: boolean) => void
    act(() => {
      renderer.create(
        <ScrollLockProvider value={setter}>
          <Probe onReady={(l) => (lock = l)} />
        </ScrollLockProvider>,
      )
    })
    lock(true)
    lock(false)
    expect(setter.mock.calls).toEqual([[true], [false]])
  })
})
