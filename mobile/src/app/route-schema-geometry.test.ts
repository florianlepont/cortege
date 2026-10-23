import {
  FULL_ROWS,
  NEIGHBOURS,
  PARCEL,
  PLOT,
  ROAD,
  SCHEMA_VIEWBOX,
  STRIP_ROWS,
  clipRows,
  fullWalkPoints,
  insideWithMargin,
  measureWalk,
  pointAlong,
  pointsAttribute,
  rowSpan,
  stripBand,
  stripWalkPoints,
  treeCrowns,
  walkFor,
} from "./route-schema-geometry"

function area(polygon: readonly (readonly [number, number])[]): number {
  let sum = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const [x0, y0] = polygon[index]
    const [x1, y1] = polygon[(index + 1) % polygon.length]
    sum += x0 * y1 - x1 * y0
  }
  return Math.abs(sum) / 2
}

describe("route schema geometry: the map", () => {
  test("the parcel, its neighbours and the road tile the whole box", () => {
    const total =
      area(PARCEL) + NEIGHBOURS.reduce((sum, piece) => sum + area(piece), 0) + area(ROAD)
    expect(Math.round(total)).toBe(SCHEMA_VIEWBOX.width * SCHEMA_VIEWBOX.height)
  })

  test("the parcel is convex and inside the box", () => {
    let side = 0
    for (let index = 0; index < PARCEL.length; index += 1) {
      const [x0, y0] = PARCEL[index]
      const [x1, y1] = PARCEL[(index + 1) % PARCEL.length]
      const [x2, y2] = PARCEL[(index + 2) % PARCEL.length]
      const cross = (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1)
      const direction = Math.sign(cross)
      if (side === 0) side = direction
      expect(direction).toBe(side)
      expect(x0).toBeGreaterThan(0)
      expect(x0).toBeLessThan(SCHEMA_VIEWBOX.width)
      expect(y0).toBeGreaterThan(0)
      expect(y0).toBeLessThan(SCHEMA_VIEWBOX.height)
    }
  })

  test("writes a polygon as an SVG points attribute", () => {
    expect(
      pointsAttribute([
        [1, 2],
        [3, 4],
      ]),
    ).toBe("1,2 3,4")
  })

  test("finds the ends of a convex polygon at a height", () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ] as const
    expect(rowSpan(square, 5)).toEqual([0, 10])
    expect(rowSpan(square, 0)).toEqual([0, 10])
    expect(rowSpan(square, 11)).toBeNull()
    const diamond = [
      [5, 0],
      [10, 5],
      [5, 10],
      [0, 5],
    ] as const
    expect(rowSpan(diamond, 2.5)).toEqual([2.5, 7.5])
  })

  test("cuts a polygon at a height, on either side", () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ] as const
    expect(area(clipRows(square, 4, "below"))).toBe(60)
    expect(area(clipRows(square, 4, "above"))).toBe(40)
    expect(clipRows(square, 20, "below")).toEqual([])
  })

  test("the strip band is the parcel cut between its two heights", () => {
    const band = stripBand()
    const ys = band.map(([, y]) => y)
    expect(Math.min(...ys)).toBeCloseTo(STRIP_ROWS.top, 5)
    expect(Math.max(...ys)).toBeCloseTo(STRIP_ROWS.bottom, 5)
    expect(area(band)).toBeGreaterThan(0)
    expect(area(band)).toBeLessThan(area(PARCEL))
  })

  test("tells whether a point is inside the outline, away from its edges", () => {
    expect(insideWithMargin(PARCEL, [150, 98], 5)).toBe(true)
    expect(insideWithMargin(PARCEL, [10, 10], 0)).toBe(false)
    expect(insideWithMargin(PARCEL, [150, 24], 5)).toBe(false)
  })

  test("the plot circle lies wholly inside the parcel", () => {
    for (let angle = 0; angle < 360; angle += 30) {
      const radians = (angle * Math.PI) / 180
      const edge: [number, number] = [
        PLOT.cx + PLOT.radius * Math.cos(radians),
        PLOT.cy + PLOT.radius * Math.sin(radians),
      ]
      expect(insideWithMargin(PARCEL, edge, 4)).toBe(true)
    }
  })

  test("the tree crowns are the same every time and stay inside the parcel", () => {
    const crowns = treeCrowns()
    expect(crowns).toEqual(treeCrowns())
    expect(crowns.length).toBeGreaterThan(60)
    for (const { cx, cy, r, tone } of crowns) {
      expect(insideWithMargin(PARCEL, [cx, cy], r)).toBe(true)
      expect(tone).toBeGreaterThanOrEqual(0)
      expect(tone).toBeLessThanOrEqual(1)
    }
    expect(new Set(crowns.map((crown) => Math.round(crown.r * 10))).size).toBeGreaterThan(5)
  })
})

describe("route schema geometry: the walks", () => {
  test("the full walk covers the parcel in regular strips, every row inside the outline", () => {
    const points = fullWalkPoints()
    expect(points).toHaveLength(FULL_ROWS.length * 2)
    const gaps = FULL_ROWS.slice(1).map((y, index) => y - FULL_ROWS[index])
    expect(new Set(gaps).size).toBe(1)
    for (const point of points) expect(insideWithMargin(PARCEL, point, 2)).toBe(true)
    // Back and forth: the first row goes right, the second comes back left.
    expect(points[1][0]).toBeGreaterThan(points[0][0])
    expect(points[3][0]).toBeLessThan(points[2][0])
  })

  test("the strip walk runs end to end along the middle of the strip", () => {
    const [start, end] = stripWalkPoints()
    expect(start[1]).toBe((STRIP_ROWS.top + STRIP_ROWS.bottom) / 2)
    expect(end[0]).toBeGreaterThan(start[0] + 100)
    expect(insideWithMargin(PARCEL, start, 2)).toBe(true)
    expect(insideWithMargin(PARCEL, end, 2)).toBe(true)
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
    expect(walkFor("partial_strip")?.points).toEqual(stripWalkPoints())
    expect(walkFor("partial_plot")).toBeNull()
  })
})
