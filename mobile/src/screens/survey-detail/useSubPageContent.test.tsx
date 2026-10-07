import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandSpacing4 } from "../../app/brand-tokens"
import { FrameLargeTitleContext } from "../../ui/frame-large-title"
import { PAGE_END_MARGIN, pageBottomPadding, useSubPageContentStyle } from "./useSubPageContent"

let mockClearance = 100
jest.mock("../../app/useAppBottomTabBarHeight", () => ({
  useTabBarClearance: () => mockClearance,
}))

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

const base = { padding: 16, gap: 24, paddingBottom: 48 }

function readStyle(barHeight?: number | null): unknown {
  let result: unknown
  function Probe() {
    result = useSubPageContentStyle(base, barHeight)
    return null
  }
  act(() => {
    renderer.create(<Probe />)
  })
  return result
}

describe("useSubPageContentStyle", () => {
  test("adds the tab bar clearance and a 16 pt margin under the last item", () => {
    expect(PAGE_END_MARGIN).toBe(brandSpacing4.md)
    expect(pageBottomPadding(100)).toBe(116)
    expect(readStyle()).toEqual([base, { paddingBottom: 116 }])
  })

  test("follows the clearance of the tab bar", () => {
    mockClearance = 84
    expect(readStyle()).toEqual([base, { paddingBottom: 84 + PAGE_END_MARGIN }])
    mockClearance = 100
  })

  test("the padding is larger than the old fixed 48 pt for a real tab bar", () => {
    const [, extra] = readStyle() as [unknown, { paddingBottom: number }]
    expect(extra.paddingBottom).toBeGreaterThan(base.paddingBottom)
  })

  test("a page with its own floating bar ends above it: the bar height replaces the clearance", () => {
    // The bar's height is measured from the page's bottom edge, so it already includes the clearance.
    expect(readStyle(158)).toEqual([base, { paddingBottom: 158 + PAGE_END_MARGIN }])
    const [, extra] = readStyle(158) as [unknown, { paddingBottom: number }]
    expect(extra.paddingBottom).toBeGreaterThan(mockClearance + PAGE_END_MARGIN)
  })

  test("no bar (null) means the tab bar clearance alone", () => {
    expect(readStyle(null)).toEqual([base, { paddingBottom: 100 + PAGE_END_MARGIN }])
  })
})

describe("useSubPageContentStyle under the native large title (12.2-17)", () => {
  function readLarge(barHeight?: number | null): unknown {
    let result: unknown
    function Probe() {
      result = useSubPageContentStyle(base, barHeight)
      return null
    }
    act(() => {
      renderer.create(
        <FrameLargeTitleContext.Provider value>
          <Probe />
        </FrameLargeTitleContext.Provider>,
      )
    })
    return result
  }

  test("iOS insets the tab bar itself: only the margin is left under the last item", () => {
    expect(readLarge()).toEqual([base, { paddingBottom: PAGE_END_MARGIN }])
    expect(readLarge(null)).toEqual([base, { paddingBottom: PAGE_END_MARGIN }])
  })

  test("a floating bar adds only its part above the tab bar's clearance", () => {
    expect(readLarge(158)).toEqual([base, { paddingBottom: 158 - 100 + PAGE_END_MARGIN }])
  })

  test("a bar shorter than the clearance adds nothing", () => {
    expect(readLarge(60)).toEqual([base, { paddingBottom: PAGE_END_MARGIN }])
  })
})
