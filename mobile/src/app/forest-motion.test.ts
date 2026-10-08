import { FLOW_PATHS, flowMotion, MIST_DISCS, mistMotion } from "./forest-aurora-shape"
import { discPose, flowOffset, pingPong, planMist, seededRandom } from "./forest-motion"

describe("seeded generator", () => {
  test("the same seed gives the same numbers, all in 0 to 1", () => {
    const first = seededRandom(42)
    const second = seededRandom(42)
    const numbers = Array.from({ length: 200 }, () => first())
    expect(Array.from({ length: 200 }, () => second())).toEqual(numbers)
    expect(numbers.every((value) => value >= 0 && value < 1)).toBe(true)
    expect(seededRandom(43)()).not.toBe(numbers[0])
  })
})

describe("the owner's mist (round4.html: spd 2, size 0.7)", () => {
  test("three discs of 294 pt, legs of 7, 9 and 11.5 s, the sketch's drifts", () => {
    expect(MIST_DISCS.map((disc) => disc.size)).toEqual([294, 294, 294])
    expect(MIST_DISCS.map((disc) => disc.legMs)).toEqual([7000, 9000, 11500])
    expect(MIST_DISCS.map((disc) => disc.drift)).toEqual([
      { x: 210, y: 110, scale: 1.2 },
      { x: -210, y: 90, scale: 0.85 },
      { x: 230, y: -110, scale: 1.25 },
    ])
    expect(MIST_DISCS.map((disc) => disc.anchor)).toEqual([
      { left: -60, top: -120 },
      { right: -120, top: -40 },
      { left: 60, bottom: -220 },
    ])
  })

  test("a disc drifts there and back, eased, seamless over each period of 2", () => {
    expect(pingPong(0)).toBe(0)
    expect(pingPong(0.5)).toBeCloseTo(0.5)
    expect(pingPong(1)).toBe(1)
    expect(pingPong(1.5)).toBeCloseTo(0.5)
    expect(pingPong(2)).toBe(0)
    expect(pingPong(-0.5)).toBeCloseTo(pingPong(1.5))
    expect(pingPong(0.1)).toBeLessThan(0.1)
    expect(pingPong(0.9)).toBeGreaterThan(0.9)
  })

  test("its pose runs from its rest to the far end of its drift", () => {
    const [moss] = MIST_DISCS
    expect(discPose(0, moss)).toEqual({ translateX: 0, translateY: 0, scale: 1 })
    expect(discPose(1, moss)).toEqual({ translateX: 210, translateY: 110, scale: 1.2 })
  })

  test("legs and flow periods a few percent apart per mount, every start drawn at random", () => {
    const plans = Array.from({ length: 30 }, (_, seed) => planMist(seed + 1))
    for (const plan of plans) {
      plan.discs.forEach((disc, index) => {
        const base = MIST_DISCS[index].legMs
        expect(Math.abs(disc.legMs - base) / base).toBeLessThanOrEqual(mistMotion.jitter)
        expect(disc.start).toBeGreaterThanOrEqual(0)
        expect(disc.start).toBeLessThan(2)
      })
      plan.flows.forEach((flow, index) => {
        const base = flowMotion.periodsMs[index]
        expect(Math.abs(flow.periodMs - base) / base).toBeLessThanOrEqual(mistMotion.jitter)
        expect(flow.start).toBeGreaterThanOrEqual(0)
        expect(flow.start).toBeLessThan(1)
      })
    }
    expect(planMist(7)).toEqual(planMist(7))
    expect(new Set(plans.map((plan) => plan.discs[0].legMs)).size).toBe(plans.length)
    expect(mistMotion.jitter).toBeLessThanOrEqual(0.1)
  })
})

describe("the flowing light (round4.html: flowSpd 1)", () => {
  test("one pass every 7, 10 and 13 s", () => {
    expect(flowMotion.periodsMs).toEqual([7000, 10000, 13000])
    expect(FLOW_PATHS).toHaveLength(3)
  })

  test("the dash runs from the line's start to past its end, then comes round again", () => {
    const pattern = flowMotion.dash + flowMotion.gap
    expect(flowOffset(0)).toBe(pattern)
    expect(flowOffset(0.5)).toBeCloseTo(pattern / 2)
    expect(flowOffset(1)).toBe(pattern)
    expect(flowOffset(-0.25)).toBeCloseTo(flowOffset(0.75))
  })

  test("a short dash, and a pattern longer than every line: one dash at a time", () => {
    expect(flowMotion.dash).toBeLessThanOrEqual(30)
    for (const d of FLOW_PATHS) {
      // Cubic segments only, so the control polygon bounds each line's length.
      expect(d).toMatch(/^M[\d\s.]+(C[\d\s.]+)+$/)
      const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
      let polygon = 0
      for (let i = 2; i < numbers.length; i += 2) {
        polygon += Math.hypot(numbers[i] - numbers[i - 2], numbers[i + 1] - numbers[i - 1])
      }
      expect(polygon + flowMotion.dash).toBeLessThanOrEqual(flowMotion.dash + flowMotion.gap)
    }
  })
})
