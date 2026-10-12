import {
  INITIAL_MAP_LAYERS_STATE,
  displayedBase,
  globeDot,
  isSavedKind,
  layerOfSide,
  mapLayersReducer,
  overlayDot,
  secondMapLayer,
  secondSideFor,
  shownBases,
} from "./map-layers-state"
import type { MapLayersAction, MapLayersState } from "./map-layers-state"

const run = (actions: MapLayersAction[], from: MapLayersState = INITIAL_MAP_LAYERS_STATE) =>
  actions.reduce(mapLayersReducer, from)

describe("initial state", () => {
  test("no override, overlay off, Toutes, no comparison, no swipe mode", () => {
    expect(INITIAL_MAP_LAYERS_STATE).toEqual({
      baseOverride: null,
      overlay: false,
      parcels: "all",
      compare: null,
      swipeMode: false,
      loadingBase: null,
      failedLayer: null,
    })
    expect(displayedBase(INITIAL_MAP_LAYERS_STATE, "satellite")).toBe("satellite")
    expect(globeDot(INITIAL_MAP_LAYERS_STATE, "satellite")).toBe(false)
    expect(overlayDot(INITIAL_MAP_LAYERS_STATE)).toBe(false)
  })
})

describe("swipe mode", () => {
  test("enter, exit and toggle set swipeMode without a comparison", () => {
    expect(run([{ type: "enterSwipe" }]).swipeMode).toBe(true)
    expect(run([{ type: "enterSwipe" }, { type: "exitSwipe" }]).swipeMode).toBe(false)
    expect(run([{ type: "toggleSwipe" }]).swipeMode).toBe(true)
    expect(run([{ type: "toggleSwipe" }, { type: "toggleSwipe" }]).swipeMode).toBe(false)
  })

  test("startCompare ends the swipe mode in the same state change", () => {
    const state = run([
      { type: "enterSwipe" },
      { type: "startCompare", sideA: "map", sideB: "photos-1950", secondSide: "right", x: 200 },
    ])
    expect(state.swipeMode).toBe(false)
    expect(state.compare).toMatchObject({ sideA: "map", sideB: "photos-1950", x: 200 })
  })

  test("no swipe mode while comparing: enterSwipe and toggleSwipe change nothing", () => {
    const comparing = run([
      { type: "startCompare", sideA: "map", sideB: "photos-1950", secondSide: "right", x: 200 },
    ])
    expect(mapLayersReducer(comparing, { type: "enterSwipe" })).toBe(comparing)
    expect(mapLayersReducer(comparing, { type: "toggleSwipe" })).toBe(comparing)
    expect(mapLayersReducer(comparing, { type: "exitSwipe" })).toMatchObject({ swipeMode: false })
  })

  test("quitCompare then enterSwipe turns the swipe mode on again", () => {
    const state = run([
      { type: "startCompare", sideA: "map", sideB: "photos-1950", secondSide: "right", x: 200 },
      { type: "quitCompare", keep: "A" },
      { type: "enterSwipe" },
    ])
    expect(state.compare).toBeNull()
    expect(state.swipeMode).toBe(true)
  })
})

describe("committing a base", () => {
  test("an old base shows, loads and lights the globe dot", () => {
    const state = run([{ type: "commitBase", key: "carte-1950" }])
    expect(displayedBase(state, "map")).toBe("carte-1950")
    expect(state.loadingBase).toBe("carte-1950")
    expect(globeDot(state, "map")).toBe(true)
  })

  test("Plan or Satellite clears the override: the saved preference is the base", () => {
    const state = run([
      { type: "commitBase", key: "carte-1950" },
      { type: "commitBase", key: "satellite" },
    ])
    expect(state.baseOverride).toBeNull()
    expect(displayedBase(state, "satellite")).toBe("satellite")
    expect(globeDot(state, "satellite")).toBe(false)
  })

  test("a new commit clears an earlier failure", () => {
    const failed = run([{ type: "styleFailed", layer: "photos-1950" }])
    expect(run([{ type: "commitBase", key: "etat-major" }], failed).failedLayer).toBeNull()
  })

  test("isSavedKind is true for Plan and Satellite only", () => {
    expect(isSavedKind("map")).toBe(true)
    expect(isSavedKind("satellite")).toBe(true)
    expect(isSavedKind("etat-major")).toBe(false)
    expect(isSavedKind("carte-1950")).toBe(false)
    expect(isSavedKind("photos-1950")).toBe(false)
  })
})

describe("comparison", () => {
  const right = run([
    { type: "startCompare", sideA: "map", sideB: "photos-1950", secondSide: "right", x: 200 },
  ])
  const left = run([
    { type: "startCompare", sideA: "satellite", sideB: "map", secondSide: "left", x: 150 },
  ])

  test("the second map on the right: the Explorer map shows side A", () => {
    expect(displayedBase(right, "map")).toBe("map")
    expect(secondMapLayer(right)).toBe("photos-1950")
    expect(shownBases(right, "map")).toEqual(["map", "photos-1950"])
    expect(globeDot(right, "map")).toBe(true)
    expect(layerOfSide(right, "map", "left")).toBe("map")
    expect(layerOfSide(right, "map", "right")).toBe("photos-1950")
  })

  test("the second map on the left: the Explorer map shows side B", () => {
    expect(displayedBase(left, "map")).toBe("map")
    expect(secondMapLayer(left)).toBe("satellite")
    expect(shownBases(left, "map")).toEqual(["satellite", "map"])
    expect(layerOfSide(left, "map", "left")).toBe("satellite")
  })

  test("without a comparison there is no second map and one base on screen", () => {
    expect(secondMapLayer(INITIAL_MAP_LAYERS_STATE)).toBeNull()
    expect(shownBases(INITIAL_MAP_LAYERS_STATE, "map")).toEqual(["map"])
    expect(layerOfSide(INITIAL_MAP_LAYERS_STATE, "map", "left")).toBe("map")
    expect(layerOfSide(INITIAL_MAP_LAYERS_STATE, "map", "right")).toBe("map")
  })

  test("setSide changes one side only and leaves the start of the line alone", () => {
    const b = run([{ type: "setSide", side: "B", key: "carte-1950" }], right)
    expect(b.compare).toMatchObject({ sideA: "map", sideB: "carte-1950", x: 200 })
    const a = run([{ type: "setSide", side: "A", key: "etat-major" }], right)
    expect(a.compare).toMatchObject({ sideA: "etat-major", sideB: "photos-1950" })
  })

  test("setSide does nothing without a comparison", () => {
    expect(run([{ type: "setSide", side: "A", key: "map" }])).toBe(INITIAL_MAP_LAYERS_STATE)
  })

  test("quitting keeps a side as the base: an old base is the override", () => {
    const keptB = run([{ type: "quitCompare", keep: "B" }], right)
    expect(keptB.compare).toBeNull()
    expect(displayedBase(keptB, "map")).toBe("photos-1950")
    const keptA = run([{ type: "quitCompare", keep: "A" }], right)
    expect(keptA.baseOverride).toBeNull()
    expect(displayedBase(keptA, "map")).toBe("map")
  })

  test("quitting without a comparison does nothing", () => {
    expect(run([{ type: "quitCompare", keep: "A" }])).toBe(INITIAL_MAP_LAYERS_STATE)
  })
})

describe("secondSideFor", () => {
  test("the second map draws the side the Explorer map does not show", () => {
    expect(secondSideFor("map", "photos-1950", "map")).toBe("right")
    expect(secondSideFor("satellite", "map", "map")).toBe("left")
  })

  test("falls back to the right when neither side is displayed", () => {
    expect(secondSideFor("satellite", "etat-major", "map")).toBe("right")
  })
})

describe("overlay, Parcelles and the style flags", () => {
  test("the overlay dot follows the overlay and Parcelles", () => {
    const on = run([{ type: "toggleOverlay" }])
    expect(on.overlay).toBe(true)
    expect(overlayDot(on)).toBe(true)
    expect(overlayDot(run([{ type: "toggleOverlay" }, { type: "toggleOverlay" }]))).toBe(false)
    const withIbp = run([{ type: "setParcels", mode: "withIbp" }])
    expect(withIbp.parcels).toBe("withIbp")
    expect(overlayDot(withIbp)).toBe(true)
    expect(overlayDot(run([{ type: "setParcels", mode: "none" }]))).toBe(true)
    expect(
      overlayDot(
        run([
          { type: "setParcels", mode: "withIbp" },
          { type: "setParcels", mode: "all" },
        ]),
      ),
    ).toBe(false)
  })

  test("styleLoaded clears the loading base and the failure, styleFailed sets the failure", () => {
    const busy = run([
      { type: "commitBase", key: "photos-1950" },
      { type: "styleFailed", layer: "photos-1950" },
    ])
    expect(busy.failedLayer).toBe("photos-1950")
    const done = run([{ type: "styleLoaded" }], busy)
    expect(done.loadingBase).toBeNull()
    expect(done.failedLayer).toBeNull()
  })
})
