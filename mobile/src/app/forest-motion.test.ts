import { AURORA_DISCS, auroraRoam, TRACE_PATHS, traceMotion } from "./forest-aurora-shape"
import {
  bloomAmount,
  closedSpline,
  discPoseAt,
  planAurora,
  planDisc,
  planTrace,
  seededRandom,
  type TracePlan,
  traceLineOffset,
  visibleShare,
} from "./forest-motion"

const SEEDS = Array.from({ length: 40 }, (_, i) => 1 + i * 7919)

describe("seeded generator", () => {
  test("the same seed gives the same numbers, all in 0 to 1", () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const first = Array.from({ length: 200 }, () => a())
    expect(Array.from({ length: 200 }, () => b())).toEqual(first)
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
    expect(seededRandom(43)()).not.toBe(first[0])
  })

  test("a plan is drawn from its seed only", () => {
    expect(planAurora(7, AURORA_DISCS)).toEqual(planAurora(7, AURORA_DISCS))
    expect(planAurora(7, AURORA_DISCS)).not.toEqual(planAurora(8, AURORA_DISCS))
  })
})

describe("aurora paths (owner: continuous, random)", () => {
  test("each disc's path takes over a minute, with legs of 9, 13 and 17 s", () => {
    expect(AURORA_DISCS.map((disc) => disc.legMs)).toEqual([9000, 13000, 17000])
    for (const disc of AURORA_DISCS) expect(disc.legs * disc.legMs).toBeGreaterThanOrEqual(60000)
    expect(new Set(AURORA_DISCS.map((disc) => disc.legs * disc.legMs)).size).toBe(3)
  })

  test("the waypoints are drawn inside their ranges, the bloom at the rightmost", () => {
    for (const seed of SEEDS) {
      const random = seededRandom(seed)
      for (const disc of AURORA_DISCS) {
        const plan = planDisc(disc, random)
        expect(plan.across).toHaveLength(disc.legs)
        for (let i = 0; i < disc.legs; i += 1) {
          expect(plan.across[i]).toBeGreaterThanOrEqual(auroraRoam.across[0])
          expect(plan.across[i]).toBeLessThanOrEqual(auroraRoam.across[1])
          expect(plan.down[i]).toBeGreaterThanOrEqual(disc.rows[0])
          expect(plan.down[i]).toBeLessThanOrEqual(disc.rows[1])
          expect(plan.alpha[i]).toBeGreaterThanOrEqual(auroraRoam.alpha[0])
          expect(plan.alpha[i]).toBeLessThanOrEqual(auroraRoam.alpha[1])
        }
        expect(plan.across[plan.bloomAt]).toBe(Math.max(...plan.across))
        expect(plan.bloomHalf * 2 * disc.legMs).toBeCloseTo(auroraRoam.bloomMs)
        expect(plan.start).toBeGreaterThanOrEqual(0)
        expect(plan.start).toBeLessThan(1)
      }
    }
  })

  test("the curve passes through every waypoint and loops without a jump", () => {
    const points = [0.2, 0.9, 0.4, 0.7]
    points.forEach((point, i) => expect(closedSpline(points, i, 0)).toBeCloseTo(point))
    expect(closedSpline(points, 3, 1)).toBeCloseTo(points[0])
    const [moss] = AURORA_DISCS
    const plan = planDisc(moss, seededRandom(3))
    const atStart = discPoseAt(0, plan)
    for (const phase of [1, 2, -1, 0.9999999]) {
      const pose = discPoseAt(phase, plan)
      expect(pose.across).toBeCloseTo(atStart.across, 4)
      expect(pose.down).toBeCloseTo(atStart.down, 4)
      expect(pose.scale).toBeCloseTo(atStart.scale, 4)
      expect(pose.alpha).toBeCloseTo(atStart.alpha, 4)
    }
  })

  test("it never stops: the pose keeps changing all along the path", () => {
    for (const disc of AURORA_DISCS) {
      const plan = planDisc(disc, seededRandom(11))
      const stepMs = 250
      const steps = (disc.legs * disc.legMs) / stepMs
      let still = 0
      for (let k = 0; k < steps; k += 1) {
        const a = discPoseAt(k / steps, plan)
        const b = discPoseAt((k + 1) / steps, plan)
        if (Math.abs(a.across - b.across) + Math.abs(a.down - b.down) < 1e-4) still += 1
      }
      // At most a waypoint where both directions turn at once.
      expect(still).toBeLessThanOrEqual(disc.legs)
    }
  })

  test("it blooms to its full peak once per path, for about two seconds, and stays in bounds", () => {
    for (const seed of SEEDS) {
      AURORA_DISCS.forEach((disc) => {
        const plan = planDisc(disc, seededRandom(seed))
        const steps = disc.legs * 100
        let bloomed = 0
        let inBounds = true
        for (let k = 0; k < steps; k += 1) {
          const pose = discPoseAt(k / steps, plan)
          inBounds &&= pose.alpha >= 0 && pose.alpha <= 1 && pose.scale > 0.5
          if (pose.alpha > 0.995) bloomed += (disc.legs * disc.legMs) / steps
        }
        expect(inBounds).toBe(true)
        const top = discPoseAt(plan.bloomAt / disc.legs, plan)
        expect(top.alpha).toBe(1)
        expect(bloomed).toBeLessThan(auroraRoam.bloomMs)
      })
    }
    const plan = planDisc(AURORA_DISCS[0], seededRandom(5))
    // Measured round the loop: a bloom at the last waypoint reaches over the start.
    const wrapped = { ...plan, bloomAt: 0 }
    expect(bloomAmount(AURORA_DISCS[0].legs - plan.bloomHalf / 2, wrapped, 7)).toBeGreaterThan(0)
    expect(bloomAmount(3, wrapped, 7)).toBe(0)
  })
})

describe("contour relay (owner: never stops, random)", () => {
  const step = 50

  function sample(plan: TracePlan, t: number) {
    return plan.lines.map((line) => traceLineOffset(t, line))
  }

  function moving(plan: TracePlan, t: number): boolean {
    return plan.lines.some((line) =>
      line.starts.some((start, k) => t > start && t < start + line.durations[k]),
    )
  }

  test("a loop lasts over a minute and every line both draws and erases in it", () => {
    for (const seed of SEEDS) {
      const plan = planTrace(seededRandom(seed))
      expect(plan.loopMs).toBeGreaterThanOrEqual(traceMotion.loopMs)
      expect(plan.lines).toHaveLength(TRACE_PATHS.length)
      for (const line of plan.lines) {
        expect(line.kinds).toContain(1)
        expect(line.kinds).toContain(0)
        // One stroke at a time per line, alternating.
        for (let k = 1; k < line.starts.length; k += 1) {
          expect(line.starts[k]).toBeGreaterThanOrEqual(line.starts[k - 1] + line.durations[k - 1])
          expect(line.kinds[k]).not.toBe(line.kinds[k - 1])
        }
      }
    }
  })

  test("at every moment a line is moving and one shows; never all hidden, never all held", () => {
    for (const seed of SEEDS) {
      const plan = planTrace(seededRandom(seed))
      const broken: number[] = []
      for (let t = step / 2; t < plan.loopMs; t += step) {
        const shares = sample(plan, t).map(visibleShare)
        const ok = moving(plan, t) && Math.max(...shares) > 0 && shares.some((share) => share < 1)
        if (!ok) broken.push(t)
      }
      expect(broken).toEqual([])
    }
  })

  test("the holds between strokes vary: a random relay, not a fixed stagger", () => {
    const plan = planTrace(seededRandom(99))
    const holds = plan.lines.flatMap((line) =>
      line.starts.slice(1).map((start, k) => start - (line.starts[k] + line.durations[k])),
    )
    expect(new Set(holds.map((hold) => Math.round(hold / 100))).size).toBeGreaterThan(5)
    // Some lines draw while others erase.
    let crossing = false
    for (let t = 0; t < plan.loopMs && !crossing; t += step) {
      const kinds = plan.lines.flatMap((line) =>
        line.starts
          .map((start, k) => (t > start && t < start + line.durations[k] ? line.kinds[k] : -1))
          .filter((kind) => kind >= 0),
      )
      crossing = kinds.includes(0) && kinds.includes(1)
    }
    expect(crossing).toBe(true)
  })

  test("it loops without a jump: the lines end as they started", () => {
    for (const seed of SEEDS) {
      const plan = planTrace(seededRandom(seed))
      const start = sample(plan, 0).map(visibleShare)
      const end = sample(plan, plan.loopMs).map(visibleShare)
      expect(end).toEqual(start)
      expect(start).toEqual(traceMotion.initialDrawn.map((on) => (on ? 1 : 0)))
    }
  })

  test("a stroke draws a line from its start, then erases it from its start", () => {
    const line = { initial: 0, starts: [0, 5000], durations: [2000, 2000], kinds: [1, 0] }
    expect(traceLineOffset(0, line)).toBe(traceMotion.dash)
    expect(traceLineOffset(1000, line)).toBeCloseTo(traceMotion.dash / 2)
    expect(traceLineOffset(3000, line)).toBe(0)
    expect(traceLineOffset(6000, line)).toBeCloseTo(-traceMotion.dash / 2)
    expect(traceLineOffset(8000, line)).toBe(-traceMotion.dash)
    expect(visibleShare(-traceMotion.dash)).toBe(0)
    expect(visibleShare(traceMotion.dash / 2)).toBe(0.5)
  })

  test("the dash is longer than every line: a line is hidden whole before it is traced", () => {
    // Cubic segments only, so the control polygon bounds each line's length.
    for (const d of TRACE_PATHS) {
      const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
      expect(d).toMatch(/^M[\d\s.]+(C[\d\s.]+)+$/)
      let polygon = 0
      for (let i = 2; i < numbers.length; i += 2) {
        polygon += Math.hypot(numbers[i] - numbers[i - 2], numbers[i + 1] - numbers[i - 1])
      }
      expect(polygon).toBeLessThan(traceMotion.dash)
    }
  })
})
