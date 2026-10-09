import {
  TREND_HEIGHT,
  TREND_PAD_X,
  TREND_PLOT_BOTTOM,
  TREND_PLOT_TOP,
  TREND_VALUE_OFFSET,
  TREND_YEAR_BASELINE,
  buildTrend,
  pathLength,
  yDomain,
  type TrendInputPoint,
} from "./trend-geometry"

const point = (
  surveyId: string,
  total: number,
  methodKey = "a",
  overrides: Partial<TrendInputPoint> = {},
): TrendInputPoint => ({
  surveyId,
  total,
  year: 2024,
  isCurrent: false,
  methodKey,
  ...overrides,
})

describe("constants", () => {
  test("pin the curve box of the UI contract", () => {
    expect(TREND_HEIGHT).toBe(128)
    expect(TREND_PAD_X).toBe(24)
    expect(TREND_PLOT_TOP).toBe(32)
    expect(TREND_PLOT_BOTTOM).toBe(96)
    expect(TREND_YEAR_BASELINE).toBe(120)
    expect(TREND_VALUE_OFFSET).toBe(12)
  })
})

describe("yDomain", () => {
  test.each([
    [[34], { lo: 25, hi: 45 }],
    [[50, 50], { lo: 30, hi: 50 }],
    [[0, 3], { lo: 0, hi: 20 }],
    [[21, 34], { lo: 15, hi: 40 }],
    [[], { lo: 0, hi: 50 }],
  ])("%j gives %j", (totals, expected) => {
    expect(yDomain(totals)).toEqual(expected)
  })

  test("the span is at least 20 and the domain stays within 0..50", () => {
    for (let min = 0; min <= 50; min += 1) {
      for (let max = min; max <= 50; max += 7) {
        const { lo, hi } = yDomain([min, max])
        expect(hi - lo).toBeGreaterThanOrEqual(20)
        expect(lo).toBeGreaterThanOrEqual(0)
        expect(hi).toBeLessThanOrEqual(50)
        expect(lo).toBeLessThanOrEqual(min)
        expect(hi).toBeGreaterThanOrEqual(max)
      }
    }
  })

  test("clamps out of range and non-finite totals", () => {
    expect(yDomain([-5, 80])).toEqual({ lo: 0, hi: 50 })
    expect(yDomain([Number.NaN])).toEqual({ lo: 0, hi: 20 })
    expect(yDomain([Number.POSITIVE_INFINITY])).toEqual({ lo: 0, hi: 20 })
  })
})

describe("buildTrend", () => {
  test("two points on a 311 wide plot sit at x 24 and 287, highest at y 32 and lowest at y 96", () => {
    const geometry = buildTrend([point("s1", 30), point("s2", 40)], 311)
    expect(geometry.domain).toEqual({ lo: 25, hi: 45 })
    expect(geometry.points.map((p) => p.x)).toEqual([24, 287])
    const [low, high] = geometry.points
    expect(low.y).toBeCloseTo(96 - ((30 - 25) / 20) * 64, 6)
    expect(high.y).toBeCloseTo(96 - ((40 - 25) / 20) * 64, 6)
  })

  test("a total at the top of the domain is at y 32 and one at the bottom is at y 96", () => {
    const geometry = buildTrend([point("s1", 0), point("s2", 50)], 311)
    expect(geometry.domain).toEqual({ lo: 0, hi: 50 })
    expect(geometry.points[0].y).toBe(96)
    expect(geometry.points[1].y).toBe(32)
  })

  test("eight points are spread evenly between x 24 and width minus 24", () => {
    const points = Array.from({ length: 8 }, (_, index) => point(`s${index}`, 20 + index))
    const geometry = buildTrend(points, 328)
    const xs = geometry.points.map((p) => p.x)
    expect(xs[0]).toBe(24)
    expect(xs[7]).toBe(304)
    const step = (328 - 48) / 7
    xs.forEach((x, index) => expect(x).toBeCloseTo(24 + index * step, 6))
  })

  test("keeps the input fields on each point", () => {
    const geometry = buildTrend(
      [point("s1", 30, "a", { year: null }), point("s2", 31, "a", { isCurrent: true })],
      300,
    )
    expect(geometry.points[0]).toMatchObject({ surveyId: "s1", year: null, isCurrent: false })
    expect(geometry.points[1]).toMatchObject({ surveyId: "s2", isCurrent: true, methodKey: "a" })
  })

  test("one method gives one segment with n minus 1 line commands and no link", () => {
    const geometry = buildTrend(
      [point("a", 20), point("b", 25), point("c", 30), point("d", 28)],
      300,
    )
    expect(geometry.segments).toHaveLength(1)
    expect(geometry.links).toEqual([])
    const { d } = geometry.segments[0]
    expect(d.startsWith("M")).toBe(true)
    expect(d.match(/L/g)).toHaveLength(3)
    expect(d.match(/M/g)).toHaveLength(1)
  })

  test("a method change cuts the line into two segments and one dashed link", () => {
    const geometry = buildTrend(
      [point("p0", 20, "a"), point("p1", 22, "a"), point("p2", 30, "b"), point("p3", 31, "b")],
      300,
    )
    expect(geometry.segments).toHaveLength(2)
    expect(geometry.links).toHaveLength(1)
    const [first, second] = geometry.points.slice(1, 3)
    const fmt = (n: number) => String(Math.round(n * 100) / 100)
    expect(geometry.links[0].d).toBe(
      `M ${fmt(first.x)} ${fmt(first.y)} L ${fmt(second.x)} ${fmt(second.y)}`,
    )
  })

  test("[a, b, a] omits the one point runs and keeps two links", () => {
    const geometry = buildTrend(
      [point("p0", 20, "a"), point("p1", 30, "b"), point("p2", 25, "a")],
      300,
    )
    expect(geometry.segments).toEqual([])
    expect(geometry.links).toHaveLength(2)
  })

  test("a flat series gives a horizontal segment", () => {
    const geometry = buildTrend([point("a", 30), point("b", 30), point("c", 30)], 300)
    expect(new Set(geometry.points.map((p) => p.y)).size).toBe(1)
    expect(geometry.segments).toHaveLength(1)
    expect(geometry.segments[0].length).toBeCloseTo(300 - 48, 6)
  })

  test("a single point has a point but no segment and no link", () => {
    const geometry = buildTrend([point("a", 30)], 300)
    expect(geometry.points).toHaveLength(1)
    expect(geometry.points[0].x).toBe(24)
    expect(geometry.segments).toEqual([])
    expect(geometry.links).toEqual([])
  })

  test("untrusted totals are clamped so every coordinate is finite", () => {
    const geometry = buildTrend(
      [
        point("a", Number.NaN),
        point("b", -5),
        point("c", 80),
        point("d", "12" as unknown as number),
        point("e", Number.POSITIVE_INFINITY),
      ],
      300,
    )
    for (const p of geometry.points) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
      expect(p.total).toBeGreaterThanOrEqual(0)
      expect(p.total).toBeLessThanOrEqual(50)
    }
    expect(geometry.points.map((p) => p.total)).toEqual([0, 0, 50, 0, 0])
    expect(geometry.domain).toEqual({ lo: 0, hi: 50 })
    for (const segment of geometry.segments) {
      expect(segment.d).not.toMatch(/NaN|Infinity/)
      expect(Number.isFinite(segment.length)).toBe(true)
    }
  })

  test.each([0, -10])("width %d returns no points, no segments and no links", (width) => {
    const geometry = buildTrend([point("a", 30), point("b", 31)], width)
    expect(geometry.points).toEqual([])
    expect(geometry.segments).toEqual([])
    expect(geometry.links).toEqual([])
    expect(geometry.domain).toEqual(yDomain([30, 31]))
  })

  test("a non-finite width is treated as no width", () => {
    expect(buildTrend([point("a", 30), point("b", 31)], Number.NaN).points).toEqual([])
  })

  test("an empty input gives an empty geometry", () => {
    const geometry = buildTrend([], 300)
    expect(geometry).toEqual({
      domain: { lo: 0, hi: 50 },
      points: [],
      segments: [],
      links: [],
    })
  })

  test("path strings round coordinates to two decimals", () => {
    const geometry = buildTrend([point("a", 21), point("b", 34), point("c", 29)], 311)
    const numbers = geometry.segments[0].d.match(/-?\d+(\.\d+)?/g) ?? []
    for (const value of numbers) {
      expect(value.split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2)
    }
  })

  test("a segment length equals the path length of its points", () => {
    const geometry = buildTrend([point("a", 20), point("b", 35), point("c", 28)], 300)
    expect(geometry.segments[0].length).toBeCloseTo(pathLength(geometry.points), 6)
  })

  test("the same input gives the same output", () => {
    const input = [point("a", 20, "a"), point("b", 26, "b"), point("c", 31, "b")]
    expect(buildTrend(input, 280)).toEqual(buildTrend(input, 280))
  })
})

describe("pathLength", () => {
  test("sums the Euclidean segment lengths", () => {
    expect(
      pathLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 6, y: 8 },
      ]),
    ).toBe(10)
  })

  test("is 0 for fewer than two points", () => {
    expect(pathLength([])).toBe(0)
    expect(pathLength([{ x: 1, y: 1 }])).toBe(0)
  })
})
