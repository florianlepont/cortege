import {
  clampLine,
  EDGE_EXIT_FRACTION,
  edgeExitKeeps,
  LINE_MARGIN,
  revealedFraction,
  settledStrip,
  halfBounds,
  immersiveTarget,
  IMMERSIVE_ASPECT_STRETCH,
  IMMERSIVE_MAX_SCALE,
  IMMERSIVE_MIN_SCALE,
  sideBounds,
  TAG_GAP,
  TAG_MIN_WIDTH,
  tagMaxWidth,
  tagVisible,
  windowX,
  wipeStrip,
} from "./wipe-geometry"

describe("constants", () => {
  it("are the UI-SPEC numbers", () => {
    expect(LINE_MARGIN).toBe(22)
    expect(EDGE_EXIT_FRACTION).toBe(1 / 5)
    expect(TAG_GAP).toBe(24)
    expect(TAG_MIN_WIDTH).toBe(72)
  })
})

describe("sideBounds", () => {
  it("gives the x range a gesture acts in", () => {
    expect(sideBounds("full", 200, 400)).toEqual([0, 400])
    expect(sideBounds("left", 200, 400)).toEqual([0, 200])
    expect(sideBounds("right", 200, 400)).toEqual([200, 400])
  })
})

describe("wipeStrip", () => {
  it("covers from the finger to the edge the incoming layer comes from", () => {
    expect(wipeStrip([0, 400], -50, 250)).toEqual({ left: 250, right: 400 })
    expect(wipeStrip([0, 400], 50, 150)).toEqual({ left: 0, right: 150 })
  })

  it("never leaves its side", () => {
    expect(wipeStrip([200, 400], -30, 100)).toEqual({ left: 200, right: 400 })
    expect(wipeStrip([0, 200], 30, 350)).toEqual({ left: 0, right: 200 })
    expect(wipeStrip([0, 400], -50, -20)).toEqual({ left: 0, right: 400 })
  })

  it("falls back to the start of the side for a finger that is not a number", () => {
    expect(wipeStrip([100, 400], 50, Number.NaN)).toEqual({ left: 100, right: 100 })
  })
})

describe("revealedFraction", () => {
  it("is the share of the side the incoming layer covers", () => {
    expect(revealedFraction([0, 400], -100, 300)).toBe(0.25)
    expect(revealedFraction([0, 400], 100, 100)).toBe(0.25)
    expect(revealedFraction([200, 400], -50, 300)).toBe(0.5)
  })

  it("is clamped to 0 and 1", () => {
    expect(revealedFraction([0, 400], -100, -50)).toBe(1)
    expect(revealedFraction([0, 400], -100, 900)).toBe(0)
    expect(revealedFraction([0, 400], 100, 900)).toBe(1)
    expect(revealedFraction([0, 400], 100, -50)).toBe(0)
  })

  it("is 0 for an empty side or a position that is not a number", () => {
    expect(revealedFraction([100, 100], -10, 100)).toBe(0)
    expect(revealedFraction([0, 400], -10, Number.NaN)).toBe(0)
  })
})

describe("settledStrip", () => {
  it("commit covers the whole side", () => {
    expect(settledStrip([0, 400], -50, "commit")).toEqual({ left: 0, right: 400 })
    expect(settledStrip([0, 400], 50, "commit")).toEqual({ left: 0, right: 400 })
  })

  it("cancel retracts the strip to the edge it came from", () => {
    expect(settledStrip([0, 400], -50, "cancel")).toEqual({ left: 400, right: 400 })
    expect(settledStrip([0, 400], 50, "cancel")).toEqual({ left: 0, right: 0 })
  })
})

describe("clampLine", () => {
  it("keeps the line 22 pt from each edge", () => {
    expect(clampLine(0, 400)).toBe(22)
    expect(clampLine(500, 400)).toBe(378)
    expect(clampLine(150, 400)).toBe(150)
  })

  it("centres the line on a screen too narrow for both margins, and on a position that is not a number", () => {
    expect(clampLine(10, 30)).toBe(15)
    expect(clampLine(Number.NaN, 400)).toBe(200)
  })
})

describe("edgeExitKeeps", () => {
  it("in the outer fifth on the left keeps B, in the outer fifth on the right keeps A", () => {
    expect(edgeExitKeeps(22, 400)).toBe("B")
    expect(edgeExitKeeps(79, 400)).toBe("B")
    expect(edgeExitKeeps(321, 400)).toBe("A")
    expect(edgeExitKeeps(378, 400)).toBe("A")
  })

  it("does nothing from a fifth of the width in", () => {
    expect(edgeExitKeeps(80, 400)).toBeNull()
    expect(edgeExitKeeps(320, 400)).toBeNull()
    expect(edgeExitKeeps(200, 400)).toBeNull()
  })

  it("follows the width", () => {
    expect(edgeExitKeeps(99, 500)).toBe("B")
    expect(edgeExitKeeps(100, 500)).toBeNull()
    expect(edgeExitKeeps(401, 500)).toBe("A")
  })
})

describe("halfBounds", () => {
  it("cuts the map at its fixed centre", () => {
    expect(halfBounds("left", 400)).toEqual([0, 200])
    expect(halfBounds("right", 400)).toEqual([200, 400])
  })
})

describe("tags", () => {
  it("get the visible side width minus the gap and 14", () => {
    expect(tagMaxWidth("left", 200, 400)).toBe(162)
    expect(tagMaxWidth("right", 200, 400)).toBe(162)
    expect(tagMaxWidth("left", 187.5, 375)).toBe(187.5 - 24 - 14)
    expect(tagMaxWidth("left", 60, 400)).toBe(22)
    expect(tagMaxWidth("right", 380, 400)).toBe(0)
  })

  it("fade out under 72 pt", () => {
    expect(tagVisible(16)).toBe(false)
    expect(tagVisible(71)).toBe(false)
    expect(tagVisible(72)).toBe(true)
  })
})

describe("windowX", () => {
  it("maps a screen x about the centre of the receded window", () => {
    expect(windowX(200, 400, 0.94)).toBe(200)
    expect(windowX(106, 400, 0.94)).toBeCloseTo(100, 3)
    expect(windowX(294, 400, 0.94)).toBeCloseTo(300, 3)
  })

  it("counts a touch in the margin as the nearest edge", () => {
    expect(windowX(12, 400, 0.94)).toBe(0)
    expect(windowX(388, 400, 0.94)).toBe(400)
    expect(windowX(-50, 400, 0.94)).toBe(0)
    expect(windowX(900, 400, 0.94)).toBe(400)
  })

  it("is the clamped x at full size", () => {
    expect(windowX(123, 400, 1)).toBe(123)
    expect(windowX(-5, 400, 1)).toBe(0)
    expect(windowX(405, 400, 1)).toBe(400)
  })

  it("returns the clamped x for a scale of 0, a negative scale or NaN", () => {
    expect(windowX(123, 400, 0)).toBe(123)
    expect(windowX(500, 400, 0)).toBe(400)
    expect(windowX(123, 400, -1)).toBe(123)
    expect(windowX(123, 400, Number.NaN)).toBe(123)
  })

  it("falls back to the left edge for a NaN x", () => {
    expect(windowX(Number.NaN, 400, 0.94)).toBe(0)
    expect(windowX(Number.NaN, 400, 0)).toBe(0)
  })
})

describe("immersiveTarget", () => {
  it("fits the window between the top margin and the bottom reserve, a little wider than tall", () => {
    // 800 tall, 60 top, 140 bottom: 600 left, scaleY 0.75, centre from 400 to 60 + 300 = 360.
    const target = immersiveTarget(800, 60, 140)
    expect(IMMERSIVE_ASPECT_STRETCH).toBe(1.1)
    expect(target.scaleY).toBeCloseTo(0.75, 6)
    expect(target.scaleX).toBeCloseTo(0.825, 6)
    expect(target.shiftY).toBeCloseTo(-40, 6)
  })

  it("never grows past the maximum scale, 0.94 by default", () => {
    expect(IMMERSIVE_MAX_SCALE).toBe(0.94)
    expect(immersiveTarget(800, 0, 0)).toMatchObject({ scaleX: 0.94, scaleY: 0.94 })
    expect(immersiveTarget(800, 0, 0, 0.8)).toMatchObject({ scaleY: 0.8 })
    expect(immersiveTarget(800, 0, 0, 0.8).scaleX).toBeCloseTo(0.88, 6)
    // The width stops at the maximum even when the height is under it.
    expect(immersiveTarget(800, 40, 0).scaleX).toBe(0.94)
  })

  it("never shrinks under half the height", () => {
    expect(IMMERSIVE_MIN_SCALE).toBe(0.5)
    expect(immersiveTarget(800, 300, 300).scaleY).toBe(0.5)
  })

  it("keeps the window full size on a height or margin that is not a number", () => {
    const full = { scaleX: 1, scaleY: 1, shiftY: 0 }
    expect(immersiveTarget(0, 10, 10)).toEqual(full)
    expect(immersiveTarget(Number.NaN, 10, 10)).toEqual(full)
    expect(immersiveTarget(800, Number.NaN, 10)).toEqual(full)
    expect(immersiveTarget(800, 10, Number.NaN)).toEqual(full)
  })
})
