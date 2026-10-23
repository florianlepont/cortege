import {
  FULL_WALK,
  PLOT,
  SCHEMA_STAND,
  SCHEMA_VIEWBOX,
  STRIP_BAND,
  STRIP_WALK,
  measureWalk,
  pointAlong,
  walkFor,
} from "./route-schema-geometry"

describe("route schema geometry", () => {
  test("every drawing sits inside the stand, inside the box", () => {
    const stand = SCHEMA_STAND
    expect(stand.x + stand.width).toBeLessThanOrEqual(SCHEMA_VIEWBOX.width)
    expect(stand.y + stand.height).toBeLessThanOrEqual(SCHEMA_VIEWBOX.height)
    for (const [x, y] of [...FULL_WALK, ...STRIP_WALK]) {
      expect(x).toBeGreaterThan(stand.x)
      expect(x).toBeLessThan(stand.x + stand.width)
      expect(y).toBeGreaterThan(stand.y)
      expect(y).toBeLessThan(stand.y + stand.height)
    }
    expect(PLOT.cx - PLOT.radius).toBeGreaterThan(stand.x)
    expect(PLOT.cx + PLOT.radius).toBeLessThan(stand.x + stand.width)
    expect(PLOT.cy - PLOT.radius).toBeGreaterThan(stand.y)
    expect(PLOT.cy + PLOT.radius).toBeLessThan(stand.y + stand.height)
    expect(STRIP_BAND.y).toBeGreaterThan(stand.y)
    expect(STRIP_BAND.y + STRIP_BAND.height).toBeLessThan(stand.y + stand.height)
  })

  test("the full walk covers the stand in regular strips: same gap between them", () => {
    const rows = FULL_WALK.map(([, y]) => y).filter((y, index, all) => all.indexOf(y) === index)
    const gaps = rows.slice(1).map((y, index) => y - rows[index])
    expect(new Set(gaps).size).toBe(1)
  })

  test("measures a polyline", () => {
    const walk = measureWalk([
      [0, 0],
      [30, 40],
      [30, 90],
    ])
    expect(walk.length).toBe(100)
    expect(walk.shares).toEqual([0, 0.5, 1])
    expect(walk.xs).toEqual([0, 30, 30])
    expect(walk.ys).toEqual([0, 40, 90])
    expect(walk.path).toBe("M0 0 L30 40 L30 90")
  })

  test("a single point has no length and no share", () => {
    const walk = measureWalk([[5, 5]])
    expect(walk.length).toBe(0)
    expect(walk.shares).toEqual([0])
  })

  test("the point along a walk follows the corners", () => {
    const walk = measureWalk([
      [0, 0],
      [30, 40],
      [30, 90],
    ])
    expect(pointAlong(walk, 0)).toEqual([0, 0])
    expect(pointAlong(walk, 0.25)).toEqual([15, 20])
    expect(pointAlong(walk, 0.5)).toEqual([30, 40])
    expect(pointAlong(walk, 0.75)).toEqual([30, 65])
    expect(pointAlong(walk, 1)).toEqual([30, 90])
    expect(pointAlong(walk, -3)).toEqual([0, 0])
    expect(pointAlong(walk, 7)).toEqual([30, 90])
  })

  test("a zero length segment does not divide by zero", () => {
    const walk = measureWalk([
      [1, 1],
      [1, 1],
      [11, 1],
    ])
    expect(pointAlong(walk, 0)).toEqual([1, 1])
    expect(pointAlong(walk, 0.5)).toEqual([6, 1])
  })

  test("only the two walking parcours have a walk", () => {
    expect(walkFor("full")?.length).toBeGreaterThan(walkFor("partial_strip")?.length ?? Infinity)
    expect(walkFor("partial_strip")?.points).toEqual(STRIP_WALK)
    expect(walkFor("partial_plot")).toBeNull()
  })
})
