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
  releaseHaptic,
  SETTLE_MS,
  SIDE_COMMIT,
  SWIPE_SLOP,
  swipeZone,
  tapAction,
  ZONE_HYSTERESIS,
  zoneHaptic,
} from "./swipe-machine"
import type { SideKey } from "./wipe-geometry"
import type { SwipeZone, WipeGesture } from "./swipe-machine"

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
    expect(COMPARE_MIN).toBe(1 / 3)
    expect(COMPARE_MAX).toBe(2 / 3)
    expect(SIDE_COMMIT).toBe(1 / 3)
    expect(ZONE_HYSTERESIS).toBe(0.03)
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
      zone: null,
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
  it("cancels under a third, compares between a third and two thirds, commits above", () => {
    expect(releaseGesture(atRev(0.1), true).outcome).toBe("cancel")
    expect(releaseGesture(atRev(0.3), true).outcome).toBe("cancel")
    expect(releaseGesture(atRev(0.34), true).outcome).toBe("compare")
    expect(releaseGesture(atRev(0.5), true).outcome).toBe("compare")
    expect(releaseGesture(atRev(0.66), true).outcome).toBe("compare")
    expect(releaseGesture(atRev(0.7), true).outcome).toBe("commit")
    expect(releaseGesture(atRev(0.95), true).outcome).toBe("commit")
  })

  it("returns the incoming layer, the side and the release x", () => {
    expect(releaseGesture(atRev(0.5), true)).toEqual({
      outcome: "compare",
      incoming: "satellite",
      side: "full",
      releaseX: 200,
    })
  })

  it("a release between a boundary and its hysteresis follows the zone the finger was in", () => {
    const just = (x: number, from: WipeGesture) => moveGesture(from, { x, y: 100 }, options())
    // Up: from the cancel zone, 0.34 (past 1/3 by 0.007) is still cancel, 0.37 compares.
    const cancelling = atRev(0.3)
    expect(releaseGesture(just(264, cancelling), true).outcome).toBe("cancel")
    expect(releaseGesture(just(252, cancelling), true).outcome).toBe("compare")
    // Down: from the compare zone, 0.32 (under 1/3 by 0.013) still compares, 0.30 cancels.
    const comparing = atRev(0.5)
    expect(releaseGesture(just(272, comparing), true).outcome).toBe("compare")
    expect(releaseGesture(just(280, comparing), true).outcome).toBe("cancel")
    // The same at two thirds, in both directions.
    expect(releaseGesture(just(132, comparing), true).outcome).toBe("compare")
    expect(releaseGesture(just(120, comparing), true).outcome).toBe("commit")
    const committing = atRev(0.9)
    expect(releaseGesture(just(136, committing), true).outcome).toBe("commit")
    expect(releaseGesture(just(148, committing), true).outcome).toBe("compare")
  })
})

describe("releaseGesture, comparison not allowed (two zones)", () => {
  it("commits above a third and cancels otherwise, never compares", () => {
    expect(releaseGesture(atRev(0.3), false).outcome).toBe("cancel")
    expect(releaseGesture(atRev(0.34), false).outcome).toBe("commit")
    expect(releaseGesture(atRev(0.5), false).outcome).toBe("commit")
    expect(releaseGesture(atRev(0.66), false).outcome).toBe("commit")
    expect(releaseGesture(atRev(0.9), false).outcome).toBe("commit")
  })

  it("follows the zone the finger was in around the boundary", () => {
    const quiet = options({ comparisonAllowed: false })
    const cancelling = atRev(0.2, { comparisonAllowed: false })
    const at = (x: number, from: WipeGesture) => moveGesture(from, { x, y: 100 }, quiet)
    expect(releaseGesture(at(264, cancelling), false).outcome).toBe("cancel")
    expect(releaseGesture(at(252, cancelling), false).outcome).toBe("commit")
    const committing = atRev(0.6, { comparisonAllowed: false })
    expect(releaseGesture(at(272, committing), false).outcome).toBe("commit")
    expect(releaseGesture(at(280, committing), false).outcome).toBe("cancel")
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

  it("commits above a third, cancels otherwise, and never compares", () => {
    expect(releaseGesture(sideRev(0.3), true).outcome).toBe("cancel")
    expect(releaseGesture(sideRev(0.34), true).outcome).toBe("commit")
    expect(releaseGesture(sideRev(0.5), true).outcome).toBe("commit")
    expect(releaseGesture(sideRev(0.7), true).outcome).toBe("commit")
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
    expect(liveHint(atRev(0.3), true)).toBeNull()
    expect(liveHint(atRev(0.34), true)).toBe("compare")
    expect(liveHint(atRev(0.5), true)).toBe("compare")
    expect(liveHint(atRev(0.66), true)).toBe("compare")
    expect(liveHint(atRev(0.7), true)).toBe("change")
    expect(liveHint(atRev(0.9), true)).toBe("change")
  })

  it("full width with the comparison not allowed: change only where a release would commit", () => {
    expect(liveHint(atRev(0.2), false)).toBeNull()
    expect(liveHint(atRev(0.3), false)).toBeNull()
    expect(liveHint(atRev(0.5), false)).toBe("change")
  })

  it("always agrees with the release outcome", () => {
    for (const allowed of [true, false]) {
      for (let rev = 0.05; rev < 1; rev += 0.05) {
        const gesture = atRev(rev, { comparisonAllowed: allowed })
        const hint = liveHint(gesture, allowed)
        const outcome = releaseGesture(gesture, allowed).outcome
        expect(hint).toBe({ cancel: null, compare: "compare", commit: "change" }[outcome as string])
      }
    }
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

describe("swipeZone", () => {
  const H = ZONE_HYSTERESIS

  it("has exact boundaries without a previous zone (comparison allowed)", () => {
    expect(swipeZone(0, null, true)).toBe("cancel")
    expect(swipeZone(1 / 3 - 0.001, null, true)).toBe("cancel")
    expect(swipeZone(1 / 3, null, true)).toBe("compare")
    expect(swipeZone(2 / 3, null, true)).toBe("compare")
    expect(swipeZone(2 / 3 + 0.001, null, true)).toBe("commit")
    expect(swipeZone(1, null, true)).toBe("commit")
  })

  it("does not flicker around one third, in both directions", () => {
    // Rising out of cancel: stays cancel until 1/3 + H, then compare.
    expect(swipeZone(1 / 3 + 0.001, "cancel", true)).toBe("cancel")
    expect(swipeZone(1 / 3 + H - 0.001, "cancel", true)).toBe("cancel")
    expect(swipeZone(1 / 3 + H, "cancel", true)).toBe("compare")
    // Falling out of compare: stays compare until 1/3 - H, then cancel.
    expect(swipeZone(1 / 3 - 0.001, "compare", true)).toBe("compare")
    expect(swipeZone(1 / 3 - H, "compare", true)).toBe("compare")
    expect(swipeZone(1 / 3 - H - 0.001, "compare", true)).toBe("cancel")
  })

  it("does not flicker around two thirds, in both directions", () => {
    expect(swipeZone(2 / 3 + 0.001, "compare", true)).toBe("compare")
    expect(swipeZone(2 / 3 + H, "compare", true)).toBe("compare")
    expect(swipeZone(2 / 3 + H + 0.001, "compare", true)).toBe("commit")
    expect(swipeZone(2 / 3 - 0.001, "commit", true)).toBe("commit")
    expect(swipeZone(2 / 3 - H + 0.001, "commit", true)).toBe("commit")
    expect(swipeZone(2 / 3 - H, "commit", true)).toBe("compare")
  })

  it("jumps straight across the compare zone when the finger does", () => {
    expect(swipeZone(0.9, "cancel", true)).toBe("commit")
    expect(swipeZone(0.1, "commit", true)).toBe("cancel")
  })

  it("has two zones when the comparison is not allowed, with the same hysteresis", () => {
    expect(swipeZone(1 / 3, null, false)).toBe("cancel")
    expect(swipeZone(1 / 3 + 0.001, null, false)).toBe("commit")
    expect(swipeZone(0.9, null, false)).toBe("commit")
    expect(swipeZone(1 / 3 + H, "cancel", false)).toBe("cancel")
    expect(swipeZone(1 / 3 + H + 0.001, "cancel", false)).toBe("commit")
    expect(swipeZone(1 / 3 - H, "commit", false)).toBe("commit")
    expect(swipeZone(1 / 3 - H - 0.001, "commit", false)).toBe("cancel")
    // A previous compare zone (from a three-zone call) counts as none.
    expect(swipeZone(0.5, "compare", false)).toBe("commit")
    expect(swipeZone(0.2, "compare", false)).toBe("cancel")
  })

  it("is stored on the gesture while it moves and reset by nothing but the finger", () => {
    expect(atRev(0.1).zone).toBe("cancel")
    expect(atRev(0.5).zone).toBe("compare")
    expect(atRev(0.9).zone).toBe("commit")
    expect(draggedLeft(WIDTH - 3).zone).toBeNull()
    expect(atRev(0.5, { comparisonAllowed: false }).zone).toBe("commit")
    // A side gesture has two zones whatever the context says.
    const side = moveGesture(
      beginGesture({ x: 0, y: 100, lineX: 200 }),
      { x: 100, y: 100 },
      options({ lineX: 200, layerOf: () => "map", otherOf: () => "satellite" }),
    )
    expect(side.zone).toBe("commit")
  })
})

describe("zoneHaptic", () => {
  const cases: [SwipeZone | null, SwipeZone, string | null][] = [
    [null, "cancel", null],
    [null, "compare", null],
    [null, "commit", null],
    ["cancel", "cancel", null],
    ["compare", "compare", null],
    ["commit", "commit", null],
    ["cancel", "compare", "detent"],
    ["commit", "compare", "detent"],
    ["compare", "commit", "tick"],
    ["cancel", "commit", "tick"],
    ["compare", "cancel", "tick"],
    ["commit", "cancel", "tick"],
  ]
  it.each(cases)("from %s to %s: %s", (previous, next, cue) => {
    expect(zoneHaptic(previous, next)).toBe(cue)
  })

  it("plays one cue per crossing along a drag, none while the finger stays in a zone", () => {
    let gesture = beginGesture({ x: WIDTH, y: 100, lineX: null })
    const cues: (string | null)[] = []
    for (const rev of [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.6, 0.4, 0.2]) {
      const next = moveGesture(gesture, { x: WIDTH * (1 - rev), y: 100 }, options())
      if (next.zone !== null) cues.push(zoneHaptic(gesture.zone, next.zone))
      gesture = next
    }
    expect(cues.filter((cue) => cue !== null)).toEqual(["detent", "tick", "detent", "tick"])
  })
})

describe("releaseHaptic", () => {
  it("is a detent opening the comparison, a tick committing, nothing otherwise", () => {
    expect(releaseHaptic("compare")).toBe("detent")
    expect(releaseHaptic("commit")).toBe("tick")
    expect(releaseHaptic("cancel")).toBeNull()
    expect(releaseHaptic("tap")).toBeNull()
    expect(releaseHaptic("none")).toBeNull()
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
