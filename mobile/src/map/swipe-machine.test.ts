import type { BaseLayerKey } from "./layers"
import {
  beginGesture,
  COMPARE_MAX,
  COMPARE_MIN,
  compareSidesFor,
  EDGE_EXIT,
  HINT_MS,
  idleExitEnabled,
  IDLE_MS,
  LINE_MARGIN,
  liveHint,
  moveGesture,
  releaseGesture,
  SETTLE_MS,
  SIDE_COMMIT,
  SWIPE_SLOP,
  tapAction,
} from "./swipe-machine"
import type { SideKey } from "./wipe-geometry"
import type { WipeGesture } from "./swipe-machine"

const WIDTH = 400

type MoveOptions = Parameters<typeof moveGesture>[2]

const options = (overrides: Partial<MoveOptions> = {}): MoveOptions => ({
  width: WIDTH,
  lineX: null,
  layerOf: () => "map",
  otherOf: () => null,
  isAvailable: () => true,
  ...overrides,
})

/** A full-width gesture dragged left from the right edge until the finger is at `fingerX`. */
const draggedLeft = (fingerX: number, extra: Partial<MoveOptions> = {}): WipeGesture =>
  moveGesture(
    beginGesture({ x: WIDTH, y: 100, lineX: null }),
    { x: fingerX, y: 100 },
    options(extra),
  )

/** The same gesture at a revealed fraction `rev` of the width. */
const atRev = (rev: number, extra: Partial<MoveOptions> = {}) =>
  draggedLeft(Math.round(WIDTH * (1 - rev)), extra)

describe("constants", () => {
  it("are the engine numbers of the UI-SPEC list", () => {
    expect(SWIPE_SLOP).toBe(6)
    expect(COMPARE_MIN).toBe(0.2)
    expect(COMPARE_MAX).toBe(0.8)
    expect(SIDE_COMMIT).toBe(0.33)
    expect(EDGE_EXIT).toBe(40)
    expect(IDLE_MS).toBe(8000)
    expect(HINT_MS).toBe(3000)
    expect(SETTLE_MS).toBe(240)
    expect(LINE_MARGIN).toBe(22)
  })
})

describe("beginGesture", () => {
  it("acts on the whole map when there is no comparison line", () => {
    const gesture = beginGesture({ x: 300, y: 100, lineX: null })
    expect(gesture).toEqual({
      side: "full",
      x0: 300,
      y0: 100,
      started: false,
      blocked: false,
      dx: 0,
      dy: 0,
      fingerX: 300,
      incoming: null,
      rev: 0,
    })
  })

  it("acts on the side the touch is on when there is a comparison line", () => {
    expect(beginGesture({ x: 300, y: 100, lineX: 200 }).side).toBe("right")
    expect(beginGesture({ x: 100, y: 100, lineX: 200 }).side).toBe("left")
  })
})

describe("moveGesture", () => {
  it("is a tap candidate under 6 pt of horizontal movement", () => {
    const gesture = draggedLeft(WIDTH - 5)
    expect(gesture.started).toBe(false)
    expect(gesture.incoming).toBeNull()
    expect(gesture.blocked).toBe(false)
    expect(gesture.dx).toBe(-5)
  })

  it("starts at 6 pt: dragging left uncovers the next layer, right the previous one", () => {
    const left = draggedLeft(WIDTH - 6)
    expect(left.started).toBe(true)
    expect(left.incoming).toBe("satellite")
    const right = moveGesture(
      beginGesture({ x: 100, y: 100, lineX: null }),
      { x: 106, y: 100 },
      options(),
    )
    expect(right.started).toBe(true)
    expect(right.incoming).toBe("photos-1950")
  })

  it("follows the finger: the revealed fraction and the incoming layer when the direction flips", () => {
    const moved = atRev(0.5)
    expect(moved.rev).toBe(0.5)
    expect(moved.fingerX).toBe(200)
    expect(moved.dy).toBe(0)
    const flipped = moveGesture(moved, { x: WIDTH + 20, y: 100 }, options())
    expect(flipped.started).toBe(true)
    expect(flipped.incoming).toBe("photos-1950")
  })

  it("skips the unavailable layers and, in a comparison side, the other side's layer", () => {
    expect(draggedLeft(300, { isAvailable: (key) => key !== "satellite" }).incoming).toBe(
      "etat-major",
    )
    const side = moveGesture(
      beginGesture({ x: 100, y: 100, lineX: 200 }),
      { x: 60, y: 100 },
      options({
        lineX: 200,
        layerOf: () => "map",
        otherOf: () => "satellite",
      }),
    )
    expect(side.side).toBe("left")
    expect(side.incoming).toBe("etat-major")
  })

  it("stays inside its side when it acts on a side of the comparison", () => {
    const rightSide = moveGesture(
      beginGesture({ x: 300, y: 100, lineX: 200 }),
      { x: 100, y: 100 },
      options({ lineX: 200, layerOf: () => "satellite", otherOf: () => "map" }),
    )
    // Dragged past the line: the strip stops at the line, the whole right side is revealed.
    expect(rightSide.rev).toBe(1)
    const asked: SideKey[] = []
    moveGesture(
      beginGesture({ x: 100, y: 100, lineX: 200 }),
      { x: 60, y: 100 },
      options({
        lineX: 200,
        layerOf: (side) => {
          asked.push(side)
          return "map"
        },
        otherOf: () => null,
      }),
    )
    expect(asked).toEqual(["left"])
  })

  it("is blocked, and nothing starts, when no other layer is available", () => {
    const blocked = draggedLeft(300, { isAvailable: (key) => key === "map" })
    expect(blocked.blocked).toBe(true)
    expect(blocked.started).toBe(false)
    expect(blocked.incoming).toBeNull()
    const later = moveGesture(blocked, { x: 100, y: 100 }, options({ isAvailable: () => true }))
    expect(later.blocked).toBe(true)
    expect(later.started).toBe(false)
    expect(later.dx).toBe(-300)
  })

  it("does not mutate the gesture it is given", () => {
    const begun = beginGesture({ x: WIDTH, y: 100, lineX: null })
    moveGesture(begun, { x: 200, y: 100 }, options())
    expect(begun.started).toBe(false)
    expect(begun.dx).toBe(0)
  })
})

describe("releaseGesture, full width with the comparison allowed", () => {
  it("cancels under 0.2, compares from 0.2 to 0.8 inclusive, commits above 0.8", () => {
    expect(releaseGesture(atRev(0.19), true).outcome).toBe("cancel")
    expect(releaseGesture(atRev(0.2), true).outcome).toBe("compare")
    expect(releaseGesture(atRev(0.5), true).outcome).toBe("compare")
    expect(releaseGesture(atRev(0.8), true).outcome).toBe("compare")
    expect(releaseGesture(atRev(0.81), true).outcome).toBe("commit")
  })

  it("returns the incoming layer, the side and the release x", () => {
    expect(releaseGesture(atRev(0.5), true)).toEqual({
      outcome: "compare",
      incoming: "satellite",
      side: "full",
      releaseX: 200,
    })
  })
})

describe("releaseGesture, comparison not allowed (spike fallback)", () => {
  it("commits above 0.33 and cancels otherwise, never compares", () => {
    expect(releaseGesture(atRev(0.32), false).outcome).toBe("cancel")
    expect(releaseGesture(atRev(0.33), false).outcome).toBe("cancel")
    expect(releaseGesture(atRev(0.34), false).outcome).toBe("commit")
    expect(releaseGesture(atRev(0.5), false).outcome).toBe("commit")
    expect(releaseGesture(atRev(0.9), false).outcome).toBe("commit")
  })
})

describe("releaseGesture, a side of the comparison", () => {
  const sideRev = (rev: number) => {
    // The left side spans 0 to 200; dragged right from x 0 it reveals `rev` of it.
    const start = beginGesture({ x: 0, y: 100, lineX: 200 })
    return moveGesture(
      start,
      { x: 200 * rev, y: 100 },
      options({ lineX: 200, layerOf: () => "map", otherOf: () => "satellite" }),
    )
  }

  it("commits above 0.33, cancels otherwise, and never compares", () => {
    expect(releaseGesture(sideRev(0.32), true).outcome).toBe("cancel")
    expect(releaseGesture(sideRev(0.34), true).outcome).toBe("commit")
    expect(releaseGesture(sideRev(0.9), true).outcome).toBe("commit")
    expect(releaseGesture(sideRev(0.5), true).side).toBe("left")
  })
})

describe("releaseGesture, taps and gestures that never started", () => {
  it("is a tap under 6 pt in both axes", () => {
    const begun = beginGesture({ x: 200, y: 100, lineX: null })
    const moved = moveGesture(begun, { x: 203, y: 104 }, options())
    expect(releaseGesture(moved, true)).toEqual({
      outcome: "tap",
      incoming: null,
      side: "full",
      releaseX: 203,
    })
    expect(releaseGesture(begun, true).outcome).toBe("tap")
  })

  it("is none for 5 pt horizontal and 20 pt vertical", () => {
    const begun = beginGesture({ x: 200, y: 100, lineX: null })
    const moved = moveGesture(begun, { x: 205, y: 120 }, options())
    expect(releaseGesture(moved, true).outcome).toBe("none")
    expect(releaseGesture(moved, true).incoming).toBeNull()
  })

  it("is none for a blocked gesture, even back at its start", () => {
    const blocked = draggedLeft(300, { isAvailable: (key) => key === "map" })
    expect(releaseGesture(blocked, true).outcome).toBe("none")
    const back = moveGesture(blocked, { x: WIDTH, y: 100 }, options())
    expect(releaseGesture(back, true).outcome).toBe("none")
  })
})

describe("liveHint", () => {
  it("full width with the comparison allowed: nothing, compare, change", () => {
    expect(liveHint(atRev(0.1), true)).toBeNull()
    expect(liveHint(atRev(0.2), true)).toBe("compare")
    expect(liveHint(atRev(0.5), true)).toBe("compare")
    expect(liveHint(atRev(0.8), true)).toBe("compare")
    expect(liveHint(atRev(0.9), true)).toBe("change")
  })

  it("full width with the comparison not allowed: change only where a release would commit", () => {
    expect(liveHint(atRev(0.2), false)).toBeNull()
    expect(liveHint(atRev(0.33), false)).toBeNull()
    expect(liveHint(atRev(0.5), false)).toBe("change")
  })

  it("a side gesture always says change once started", () => {
    const side = (x: number) =>
      moveGesture(
        beginGesture({ x: 0, y: 100, lineX: 200 }),
        { x, y: 100 },
        options({ lineX: 200, layerOf: () => "map", otherOf: () => "satellite" }),
      )
    expect(liveHint(side(20), true)).toBe("change")
    expect(liveHint(side(150), true)).toBe("change")
  })

  it("a blocked gesture says none available, a gesture not started says nothing", () => {
    expect(liveHint(draggedLeft(300, { isAvailable: (key) => key === "map" }), true)).toBe(
      "none-available",
    )
    expect(liveHint(draggedLeft(WIDTH - 3), true)).toBeNull()
  })
})

describe("compareSidesFor", () => {
  it("dragging left: the shown layer is A on the left, the incoming one B on the right", () => {
    expect(compareSidesFor(-1, "map", "photos-1950")).toEqual({
      sideA: "map",
      sideB: "photos-1950",
      secondSide: "right",
    })
  })

  it("dragging right: the incoming layer is A on the left, the shown one B", () => {
    expect(compareSidesFor(1, "map", "satellite")).toEqual({
      sideA: "satellite",
      sideB: "map",
      secondSide: "left",
    })
  })
})

describe("modes", () => {
  it("a tap exits the swipe mode only when no comparison exists", () => {
    expect(tapAction(false)).toBe("exit-swipe")
    expect(tapAction(true)).toBe("nothing")
  })

  it("the idle exit is off while a screen reader is on", () => {
    expect(idleExitEnabled(false)).toBe(true)
    expect(idleExitEnabled(true)).toBe(false)
  })
})

describe("types", () => {
  it("accept every base layer as a gesture layer", () => {
    const layer: BaseLayerKey = "carte-1950"
    expect(draggedLeft(300, { layerOf: () => layer }).incoming).toBe("photos-1950")
  })
})
