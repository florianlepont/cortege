import { FLOW_LINES, flowMotion, layLine, MIST_DISCS, mistMotion } from "./forest-aurora-shape"
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
  test("three discs of 294 pt, legs of 7, 9 and 11.5 s, crossing the card", () => {
    expect(MIST_DISCS.map((disc) => disc.size)).toEqual([294, 294, 294])
    expect(MIST_DISCS.map((disc) => disc.legMs)).toEqual([7000, 9000, 11500])
    expect(MIST_DISCS.map((disc) => disc.scale)).toEqual([1.2, 0.85, 1.25])
    for (const disc of MIST_DISCS) {
      // Each crosses most of the card one way or the other.
      const across = Math.abs(disc.to[0] - disc.from[0])
      const down = Math.abs(disc.to[1] - disc.from[1])
      expect(Math.max(across, down)).toBeGreaterThanOrEqual(0.55)
    }
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

  test("its pose runs from its rest to the far end of its drift, in the card's points", () => {
    const [moss] = MIST_DISCS
    expect(discPose(0, moss, 300, 200)).toEqual({ x: 30, y: 30, scale: 1 })
    expect(discPose(1, moss, 300, 200)).toEqual({ x: 225, y: 190, scale: 1.2 })
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
  test("one pass every 7, 10 and 13 s along three lines", () => {
    expect(flowMotion.periodsMs).toEqual([7000, 10000, 13000])
    expect(FLOW_LINES).toHaveLength(3)
  })

  test("the dash runs from the line's start to past its end, then comes round again", () => {
    expect(flowOffset(0, 400)).toBe(400)
    expect(flowOffset(0.5, 400)).toBeCloseTo(200)
    expect(flowOffset(1, 400)).toBe(400)
    expect(flowOffset(-0.25, 400)).toBeCloseTo(flowOffset(0.75, 400))
  })

  test("a line laid on a card: cubic segments, a pattern longer than the line", () => {
    const { d, pattern } = layLine([0, 0, 0.5, 0, 0.5, 1, 1, 1], { width: 100, height: 50 })
    expect(d).toBe("M0 0 C 50 0 50 50 100 50")
    // The control polygon (50 + 50 + 50) plus the dash and its rest.
    expect(pattern).toBe(150 + flowMotion.dash + flowMotion.rest)
    expect(flowMotion.dash).toBeLessThanOrEqual(30)
  })
})
