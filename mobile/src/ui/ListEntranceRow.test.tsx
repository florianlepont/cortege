import React from "react"
import renderer, { act } from "react-test-renderer"
import { ListEntranceRow } from "./ListEntranceRow"

jest.mock("./EntranceView", () => ({ EntranceView: "EntranceView" }))

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

function mount(index: number, canAnimate: (index: number) => boolean) {
  const element = (can: (index: number) => boolean) => (
    <ListEntranceRow index={index} canAnimate={can}>
      <>{"row"}</>
    </ListEntranceRow>
  )
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(element(canAnimate))
  })
  return {
    entrances: () => tree!.root.findAllByType("EntranceView" as never),
    update: (can: (index: number) => boolean) => act(() => tree!.update(element(can))),
    toJSON: () => tree!.toJSON(),
    unmount: () => act(() => tree!.unmount()),
  }
}

describe("ListEntranceRow", () => {
  test("an eligible row is wrapped in an entrance view carrying its index", () => {
    const row = mount(3, () => true)
    expect(row.entrances()).toHaveLength(1)
    expect(row.entrances()[0].props.index).toBe(3)
    row.unmount()
  })

  test("a row that is not eligible renders its children alone, with no animated wrapper", () => {
    const row = mount(9, () => false)
    expect(row.entrances()).toHaveLength(0)
    expect(row.toJSON()).toBe("row")
    row.unmount()
  })

  test("the choice is made once at mount: later answers do not change it", () => {
    const asked: number[] = []
    const first = mount(2, (index) => {
      asked.push(index)
      return true
    })
    first.update(() => false)
    expect(first.entrances()).toHaveLength(1)
    expect(asked).toEqual([2])
    first.unmount()

    const second = mount(2, () => false)
    second.update(() => true)
    expect(second.entrances()).toHaveLength(0)
    second.unmount()
  })
})
