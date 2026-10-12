import {
  clampLine,
  EDGE_EXIT_FRACTION,
  edgeExitKeeps,
  LINE_MARGIN,
  revealedFraction,
  settledStrip,
  sideBounds,
  TAG_GAP,
  TAG_MIN_WIDTH,
  tagMaxWidth,
  tagVisible,
  wipeStrip,
} from "./wipe-geometry"

describe("constants", () => {
  it("are the UI-SPEC numbers", () => {
    expect(LINE_MARGIN).toBe(22)
    expect(EDGE_EXIT_FRACTION).toBe(1 / 5)
    expect(TAG_GAP).toBe(30)
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

describe("tags", () => {
  it("get the visible side width minus the gap and 14", () => {
    expect(tagMaxWidth("left", 200, 400)).toBe(156)
    expect(tagMaxWidth("right", 200, 400)).toBe(156)
    expect(tagMaxWidth("left", 60, 400)).toBe(16)
    expect(tagMaxWidth("right", 380, 400)).toBe(0)
  })

  it("fade out under 72 pt", () => {
    expect(tagVisible(16)).toBe(false)
    expect(tagVisible(71)).toBe(false)
    expect(tagVisible(72)).toBe(true)
  })
})
