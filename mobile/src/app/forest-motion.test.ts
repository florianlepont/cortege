import { FLOW_PATHS, flowMotion, layLines, MIST_DISCS, mistMotion } from "./forest-aurora-shape"
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

describe("the owner's mist (round5.html: spd 2, fogA 1.6, size 0.7)", () => {
  test("three discs of 294 pt at the sketch's places, legs of 7, 9 and 11.5 s", () => {
    expect(MIST_DISCS.map((disc) => disc.size)).toEqual([294, 294, 294])
    expect(MIST_DISCS.map((disc) => disc.legMs)).toEqual([7000, 9000, 11500])
    expect(MIST_DISCS.map((disc) => disc.anchor)).toEqual([
      { left: -60, top: -120 },
      { right: -120, top: -40 },
      { left: 60, bottom: -220 },
    ])
    expect(MIST_DISCS.map((disc) => disc.drift)).toEqual([
      { x: 210, y: 110, scale: 1.2 },
      { x: -210, y: 90, scale: 0.85 },
      { x: 230, y: -110, scale: 1.25 },
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

  test("legs a few percent apart per mount, each disc starting anywhere on its drift", () => {
    const plans = Array.from({ length: 30 }, (_, seed) => planMist(seed + 1))
    for (const plan of plans) {
      plan.discs.forEach((disc, index) => {
        const base = MIST_DISCS[index].legMs
        expect(Math.abs(disc.legMs - base) / base).toBeLessThanOrEqual(mistMotion.jitter)
        expect(disc.start).toBeGreaterThanOrEqual(0)
        expect(disc.start).toBeLessThan(2)
      })
    }
    expect(planMist(7)).toEqual(planMist(7))
    expect(new Set(plans.map((plan) => plan.discs[0].legMs)).size).toBe(plans.length)
    expect(mistMotion.jitter).toBeLessThanOrEqual(0.1)
  })
})

describe("the flowing light (round5.html: flowSpd 1, flowA 1)", () => {
  test("the sketch's lines: 7, 10, 13 and 10 s a pass, each 2.3 s ahead of the one before", () => {
    expect(FLOW_PATHS).toHaveLength(4)
    const { flows } = planMist(3)
    expect(flows.map((flow) => flow.periodMs)).toEqual([7000, 10000, 13000, 10000])
    flows.forEach((flow, index) => {
      expect(flow.start).toBeCloseTo(((index * 2300) / flow.periodMs) % 1)
    })
    // The same on every mount: the sketch's delays.
    expect(planMist(4).flows).toEqual(flows)
  })

  test("a dash of 26 and a gap of 300 run from the line's start, then come round again", () => {
    expect([flowMotion.dash, flowMotion.gap]).toEqual([26, 300])
    expect(flowOffset(0)).toBe(326)
    expect(flowOffset(0.5)).toBeCloseTo(163)
    expect(flowOffset(1)).toBe(326)
    expect(flowOffset(-0.25)).toBeCloseTo(flowOffset(0.75))
  })

  test("lines laid on a card: the sketch's 340 pt across, its shares down", () => {
    const [first] = layLines({ width: 340, height: 250 })
    // The sketch's `M-10 ${h*0.55} C60 ${h*0.50} 90 ${h*0.62} 150 ${h*0.30} S270 ...`.
    expect(first.d).toBe("M-10 137.5 C 60 125 90 155 150 75 C 210 -5 270 12.5 350 -12.5")
    // Wider: stretched across.
    expect(layLines({ width: 680, height: 250 })[0].points[2]).toBe(120)
    // Short: never flatter than the sketch's hero (158 over 340), centred.
    const short = layLines({ width: 340, height: 79 })[0].points
    expect(short[1]).toBeCloseTo(79 / 2 + (0.55 - 0.5) * 158)
    expect(short[short.length - 1]).toBeCloseTo(79 / 2 + (-0.05 - 0.5) * 158)
  })
})
