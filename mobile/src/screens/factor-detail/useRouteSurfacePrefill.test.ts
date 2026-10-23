import React from "react"
import renderer, { act } from "react-test-renderer"
import { formatSurfaceForField, useRouteSurfacePrefill } from "./useRouteSurfacePrefill"

type Props = Parameters<typeof useRouteSurfacePrefill>[0]

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

function mount(initial: Props) {
  const result: { current: ReturnType<typeof useRouteSurfacePrefill> | null } = { current: null }
  function Probe(props: Props) {
    result.current = useRouteSurfacePrefill(props)
    return null
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(React.createElement(Probe, initial))
  })
  return {
    result,
    rerender: (next: Props) => act(() => tree.update(React.createElement(Probe, next))),
  }
}

describe("formatSurfaceForField", () => {
  test("a decimal comma, no grouping, at most two decimals", () => {
    expect(formatSurfaceForField(1.2)).toBe("1,2")
    expect(formatSurfaceForField(1200)).toBe("1200")
    expect(formatSurfaceForField(0.35)).toBe("0,35")
    expect(formatSurfaceForField(0.3)).toBe("0,3")
  })
})

describe("useRouteSurfacePrefill", () => {
  test("fills an empty field once with the zone and reports it comes from the route", () => {
    const onChangeSurface = jest.fn()
    const { result, rerender } = mount({
      zoneSurfaceHa: 1.2,
      surfaceText: "",
      onChangeSurface,
      enabled: true,
    })
    expect(onChangeSurface).toHaveBeenCalledTimes(1)
    expect(onChangeSurface).toHaveBeenCalledWith("1,2")
    // The form now carries the value: no second call, the caption shows.
    rerender({ zoneSurfaceHa: 1.2, surfaceText: "1,2", onChangeSurface, enabled: true })
    expect(onChangeSurface).toHaveBeenCalledTimes(1)
    expect(result.current?.fromRoute).toBe(true)
  })

  test("never writes into a field that already has a value", () => {
    const onChangeSurface = jest.fn()
    const { result } = mount({
      zoneSurfaceHa: 1.2,
      surfaceText: "3",
      onChangeSurface,
      enabled: true,
    })
    expect(onChangeSurface).not.toHaveBeenCalled()
    expect(result.current?.fromRoute).toBe(false)
  })

  test("a value typed by the observer is never replaced, even when cleared afterwards", () => {
    const onChangeSurface = jest.fn()
    const { result, rerender } = mount({
      zoneSurfaceHa: 1.2,
      surfaceText: "",
      onChangeSurface,
      enabled: true,
    })
    rerender({ zoneSurfaceHa: 1.2, surfaceText: "1,2", onChangeSurface, enabled: true })
    rerender({ zoneSurfaceHa: 1.2, surfaceText: "2", onChangeSurface, enabled: true })
    expect(result.current?.fromRoute).toBe(false)
    rerender({ zoneSurfaceHa: 1.2, surfaceText: "", onChangeSurface, enabled: true })
    expect(onChangeSurface).toHaveBeenCalledTimes(1)
    expect(result.current?.fromRoute).toBe(false)
  })

  test("does nothing without a known zone, then fills when the route arrives", () => {
    const onChangeSurface = jest.fn()
    const { result, rerender } = mount({
      zoneSurfaceHa: null,
      surfaceText: "",
      onChangeSurface,
      enabled: true,
    })
    expect(onChangeSurface).not.toHaveBeenCalled()
    expect(result.current?.fromRoute).toBe(false)
    rerender({ zoneSurfaceHa: 0.8, surfaceText: "", onChangeSurface, enabled: true })
    expect(onChangeSurface).toHaveBeenCalledWith("0,8")
  })

  test("does nothing when disabled", () => {
    const onChangeSurface = jest.fn()
    mount({ zoneSurfaceHa: 1.2, surfaceText: "", onChangeSurface, enabled: false })
    expect(onChangeSurface).not.toHaveBeenCalled()
  })

  test("a value equal to the zone in number counts, whatever the decimal sign", () => {
    const onChangeSurface = jest.fn()
    const { result } = mount({
      zoneSurfaceHa: 1.2,
      surfaceText: "1.20",
      onChangeSurface,
      enabled: true,
    })
    expect(result.current?.fromRoute).toBe(true)
  })
})
