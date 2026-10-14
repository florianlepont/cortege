import React from "react"
import renderer, { act } from "react-test-renderer"
import type { PublicParcelStatusItem } from "../../app/types"
import {
  GEOMETRY_WAIT_MS,
  parcelIdsWithoutGeometry,
  useChosenParcelGeometry,
} from "./useChosenParcelGeometry"

const SQUARE = {
  type: "Polygon" as const,
  coordinates: [
    [
      [2.0, 48.0],
      [2.001, 48.0],
      [2.001, 48.001],
      [2.0, 48.001],
      [2.0, 48.0],
    ],
  ],
}

const item = (parcelId: string, withGeometry = true): PublicParcelStatusItem =>
  ({
    parcel_id: parcelId,
    study_status: "unstudied",
    ...(withGeometry ? { geometry: SQUARE } : null),
  }) as unknown as PublicParcelStatusItem

type Api = ReturnType<typeof useChosenParcelGeometry>
type Input = Parameters<typeof useChosenParcelGeometry>[0]

function mount(initial: Input) {
  let api!: Api
  function Probe({ input }: { input: Input }) {
    api = useChosenParcelGeometry(input)
    return null
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<Probe input={initial} />)
  })
  return {
    api: () => api,
    update: (input: Input) => act(() => tree.update(<Probe input={input} />)),
  }
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe("parcelIdsWithoutGeometry", () => {
  it("lists the chosen ids with no geometry, ids compared without regard to case", () => {
    expect(
      parcelIdsWithoutGeometry([item("ab1"), item("cd2", false)], ["AB1", "cd2", "ef3"]),
    ).toEqual(["cd2", "ef3"])
  })
})

describe("useChosenParcelGeometry (RC-01)", () => {
  it("answers at once when every chosen parcel has geometry", async () => {
    const m = mount({ items: [item("AB1")], settled: false, selectedParcelIds: ["ab1"] })
    await expect(m.api().waitForGeometry()).resolves.toHaveLength(1)
  })

  it("answers at once when no read is pending (offline), without waiting", async () => {
    const m = mount({ items: [], settled: true, selectedParcelIds: ["AB1"] })
    await expect(m.api().waitForGeometry()).resolves.toEqual([])
  })

  it("delivers the geometry that arrives while a read is pending", async () => {
    const m = mount({ items: [], settled: false, selectedParcelIds: ["AB1"] })
    const waiting = m.api().waitForGeometry()
    await act(async () => {
      jest.advanceTimersByTime(300)
    })
    m.update({ items: [item("AB1")], settled: false, selectedParcelIds: ["AB1"] })
    await act(async () => {
      jest.advanceTimersByTime(200)
    })
    const result = await waiting
    expect(parcelIdsWithoutGeometry(result, ["AB1"])).toEqual([])
  })

  it("gives up after the bounded wait when the read never answers", async () => {
    const m = mount({ items: [], settled: false, selectedParcelIds: ["AB1"] })
    const waiting = m.api().waitForGeometry()
    await act(async () => {
      jest.advanceTimersByTime(GEOMETRY_WAIT_MS + 200)
    })
    await expect(waiting).resolves.toEqual([])
  })

  it("remembers the geometry of a parcel a later read no longer lists", () => {
    const m = mount({ items: [item("AB1")], settled: true, selectedParcelIds: ["AB1"] })
    m.update({ items: [item("ZZ9")], settled: true, selectedParcelIds: ["AB1"] })
    expect(parcelIdsWithoutGeometry(m.api().items, ["AB1", "ZZ9"])).toEqual([])
    expect(m.api().items.map((entry) => entry.parcel_id)).toEqual(["ZZ9", "AB1"])
  })
})
