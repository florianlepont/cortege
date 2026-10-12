jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import type { BasemapKey } from "../../map/basemaps"
import { useMapLayersState } from "./useMapLayersState"
import type { MapLayers } from "./useMapLayersState"

const saveBasemap = jest.fn<void, [BasemapKey]>()

beforeEach(() => {
  saveBasemap.mockReset()
})

afterEach(async () => {
  await cleanup()
})

const setup = (savedBasemap: BasemapKey = "map") =>
  renderHook(() => useMapLayersState({ savedBasemap, saveBasemap }))

describe("useMapLayersState", () => {
  test("starts on the saved base with no dot", async () => {
    const { result } = await setup("satellite")
    expect(result.current.displayedBase).toBe("satellite")
    expect(result.current.shownBases).toEqual(["satellite"])
    expect(result.current.secondMapLayer).toBeNull()
    expect(result.current.globeDot).toBe(false)
    expect(result.current.overlayDot).toBe(false)
    expect(result.current.layerOfSide("left")).toBe("satellite")
  })

  test("swipe mode actions", async () => {
    const { result } = await setup()
    await act(async () => result.current.actions.enterSwipe())
    expect(result.current.state.swipeMode).toBe(true)
    await act(async () => result.current.actions.exitSwipe())
    expect(result.current.state.swipeMode).toBe(false)
    await act(async () => result.current.actions.toggleSwipe())
    expect(result.current.state.swipeMode).toBe(true)
  })

  test("a comparison started from the swipe mode ends it; the swipe mode cannot start while comparing", async () => {
    const { result } = await setup()
    await act(async () => result.current.actions.enterSwipe())
    expect(result.current.state.swipeMode).toBe(true)
    await act(async () =>
      result.current.actions.startCompare({ sideA: "map", sideB: "photos-1950", x: 200 }),
    )
    expect(result.current.state.swipeMode).toBe(false)
    expect(result.current.state.compare).not.toBeNull()
    await act(async () => result.current.actions.toggleSwipe())
    expect(result.current.state.swipeMode).toBe(false)
    await act(async () => result.current.actions.enterSwipe())
    expect(result.current.state.swipeMode).toBe(false)
    await act(async () => result.current.actions.quitCompare("A"))
    await act(async () => result.current.actions.enterSwipe())
    expect(result.current.state.swipeMode).toBe(true)
  })

  test("commitBase writes the preference for Plan and Satellite only", async () => {
    const { result } = await setup()
    await act(async () => result.current.actions.commitBase("satellite"))
    expect(saveBasemap).toHaveBeenCalledTimes(1)
    expect(saveBasemap).toHaveBeenCalledWith("satellite")

    await act(async () => result.current.actions.commitBase("etat-major"))
    expect(saveBasemap).toHaveBeenCalledTimes(1)
    expect(result.current.displayedBase).toBe("etat-major")
    expect(result.current.globeDot).toBe(true)
    expect(result.current.state.loadingBase).toBe("etat-major")
  })

  test("startCompare derives the second side from the displayed base", async () => {
    const right = await setup("map")
    await act(async () =>
      right.result.current.actions.startCompare({ sideA: "map", sideB: "photos-1950", x: 200 }),
    )
    expect(right.result.current.state.compare).toMatchObject({ secondSide: "right", x: 200 })
    expect(right.result.current.displayedBase).toBe("map")
    expect(right.result.current.secondMapLayer).toBe("photos-1950")
    expect(right.result.current.shownBases).toEqual(["map", "photos-1950"])
    expect(right.result.current.globeDot).toBe(true)
    expect(right.result.current.layerOfSide("right")).toBe("photos-1950")

    const left = await setup("map")
    await act(async () =>
      left.result.current.actions.startCompare({ sideA: "satellite", sideB: "map", x: 200 }),
    )
    expect(left.result.current.state.compare?.secondSide).toBe("left")
    expect(left.result.current.secondMapLayer).toBe("satellite")
  })

  test("setSide changes one side and never writes the preference; moveLine sets x", async () => {
    const { result } = await setup()
    await act(async () =>
      result.current.actions.startCompare({ sideA: "map", sideB: "photos-1950", x: 200 }),
    )
    await act(async () => result.current.actions.setSide("B", "carte-1950"))
    expect(result.current.state.compare).toMatchObject({ sideA: "map", sideB: "carte-1950" })
    await act(async () => result.current.actions.setSide("A", "satellite"))
    expect(result.current.state.compare).toMatchObject({ sideA: "satellite", sideB: "carte-1950" })
    await act(async () => result.current.actions.moveLine(120))
    expect(result.current.state.compare?.x).toBe(120)
    expect(saveBasemap).not.toHaveBeenCalled()
  })

  test("quitCompare keeps the chosen side as the base and writes Plan or Satellite", async () => {
    const { result } = await setup("satellite")
    await act(async () =>
      result.current.actions.startCompare({ sideA: "map", sideB: "photos-1950", x: 200 }),
    )
    await act(async () => result.current.actions.quitCompare("A"))
    expect(result.current.state.compare).toBeNull()
    expect(saveBasemap).toHaveBeenCalledTimes(1)
    expect(saveBasemap).toHaveBeenCalledWith("map")
  })

  test("quitCompare keeping an old base does not write the preference", async () => {
    const { result } = await setup("map")
    await act(async () =>
      result.current.actions.startCompare({ sideA: "map", sideB: "photos-1950", x: 200 }),
    )
    await act(async () => result.current.actions.quitCompare("B"))
    expect(result.current.displayedBase).toBe("photos-1950")
    expect(saveBasemap).not.toHaveBeenCalled()
  })

  test("quitCompare without a comparison does nothing", async () => {
    const { result } = await setup()
    await act(async () => result.current.actions.quitCompare("A"))
    expect(saveBasemap).not.toHaveBeenCalled()
    expect(result.current.state.compare).toBeNull()
  })

  test("overlay and Parcelles drive the overlay dot", async () => {
    const { result } = await setup()
    await act(async () => result.current.actions.toggleOverlay())
    expect(result.current.state.overlay).toBe(true)
    expect(result.current.overlayDot).toBe(true)
    await act(async () => result.current.actions.toggleOverlay())
    expect(result.current.overlayDot).toBe(false)
    await act(async () => result.current.actions.setParcels("withIbp"))
    expect(result.current.state.parcels).toBe("withIbp")
    expect(result.current.overlayDot).toBe(true)
    await act(async () => result.current.actions.setParcels("all"))
    expect(result.current.overlayDot).toBe(false)
  })

  test("style flags", async () => {
    const { result } = await setup()
    await act(async () => result.current.actions.commitBase("photos-1950"))
    await act(async () => result.current.actions.styleFailed("photos-1950"))
    expect(result.current.state.failedLayer).toBe("photos-1950")
    await act(async () => result.current.actions.styleLoaded())
    expect(result.current.state.loadingBase).toBeNull()
    expect(result.current.state.failedLayer).toBeNull()
  })

  test("the actions keep their identity across renders and match the public signatures", async () => {
    const { result, rerender } = await setup()
    const first = result.current.actions
    await act(async () => result.current.actions.toggleOverlay())
    await rerender(undefined)
    expect(result.current.actions).toBe(first)

    // Compile-time check: a drifting signature fails `tsc --noEmit`.
    const actions: MapLayers["actions"] = result.current.actions
    const checked = (): void => {
      actions.enterSwipe()
      actions.exitSwipe()
      actions.toggleSwipe()
      actions.commitBase("map")
      actions.startCompare({ sideA: "map", sideB: "satellite", x: 1 })
      actions.setSide("A", "map")
      actions.moveLine(1)
      actions.quitCompare("B")
      actions.toggleOverlay()
      actions.setParcels("none")
      actions.styleLoaded()
      actions.styleFailed("types-foret")
    }
    expect(typeof checked).toBe("function")
  })
})
