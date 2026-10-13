jest.mock("react-native", () => ({}))

import { cleanup, renderHook } from "@testing-library/react-native/pure"
import type { BaseLayerKey } from "../../map/layers"
import { offlineKeep, useOfflineCompareExit } from "./useOfflineCompareExit"

afterEach(async () => {
  await cleanup()
})

const sides = { sideA: "map" as BaseLayerKey, sideB: "satellite" as BaseLayerKey }
const all = () => true

describe("offlineKeep", () => {
  test("keeps the left layer, unless only the right one is downloaded here", () => {
    expect(offlineKeep(sides, all)).toBe("A")
    expect(offlineKeep(sides, (key) => key === "map")).toBe("A")
    expect(offlineKeep(sides, () => false)).toBe("A")
    expect(offlineKeep(sides, (key) => key === "satellite")).toBe("B")
    expect(offlineKeep(null, all)).toBe("A")
  })
})

describe("useOfflineCompareExit", () => {
  test("does nothing while the connection holds", async () => {
    const exit = jest.fn()
    await renderHook(() => useOfflineCompareExit(false, sides, all, exit))
    expect(exit).not.toHaveBeenCalled()
  })

  test("ends the comparison once when the connection is lost, keeping the picked side", async () => {
    const exit = jest.fn()
    const { rerender } = await renderHook(
      ({ active }: { active: boolean }) =>
        useOfflineCompareExit(active, sides, (key) => key === "satellite", exit),
      { initialProps: { active: false } },
    )
    expect(exit).not.toHaveBeenCalled()
    await rerender({ active: true })
    expect(exit).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith("B")
    await rerender({ active: true })
    expect(exit).toHaveBeenCalledTimes(1)
  })
})
