import React from "react"
import renderer, { act } from "react-test-renderer"

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

jest.mock("react-native", () => ({
  FlatList: "FlatList",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}))

import { setReducedMotion } from "../../test/react-native-reanimated.mock"
import { useEntrance } from "./useEntrance"

afterEach(() => {
  setReducedMotion(false)
})

// What the hook's function returns for rows 0, 7, 8 and 40, read while the component renders (the
// first-mount flag flips in an effect right after the first commit).
type Seen = [unknown, unknown, unknown, unknown]

function mountProbe() {
  const seen: Seen[] = []
  function Probe({ tick }: { tick: number }) {
    const entrance = useEntrance()
    seen.push([entrance(0), entrance(7), entrance(8), entrance(40)])
    return <>{tick}</>
  }
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<Probe tick={0} />)
  })
  const rerender = () =>
    act(() => {
      tree!.update(<Probe tick={1} />)
    })
  return { seen, rerender }
}

describe("useEntrance (D-08 entrances)", () => {
  test("rows 0 to 7 get a builder on the first render, row 8 and beyond do not", () => {
    const { seen } = mountProbe()
    const [row0, row7, row8, row40] = seen[0]
    expect(row0).toBeDefined()
    expect(row7).toBeDefined()
    expect(row8).toBeUndefined()
    expect(row40).toBeUndefined()
  })

  test("after the first mount no row gets an entrance", () => {
    const { seen, rerender } = mountProbe()
    rerender()
    expect(seen[seen.length - 1]).toEqual([undefined, undefined, undefined, undefined])
  })

  test("under Reduce Motion there is no entrance at all", () => {
    setReducedMotion(true)
    const { seen } = mountProbe()
    expect(seen[0]).toEqual([undefined, undefined, undefined, undefined])
  })
})
