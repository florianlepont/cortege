export {}

// The history of the demo surveys (api/scripts/lib/demo-history.js): every demo parcel gets 3 to 8
// surveys on consecutive years, a third of them switching from the v3.0 to the v3.2 method, and
// the owner has 20 surveys with history. Pure planning: no database, no network.

type Step = {
  year: number
  month: number
  day: number
  hour: number
  quality: number
  method: "v3.0" | "v3.2"
}
type OwnerEntry = {
  name: string
  site: number
  status: "draft" | "submitted"
  visibility: string
  quality: number
  kept: number
  year: number
  month: number
  day: number
  method: "v3.0" | "v3.2"
}
type HistoryModule = {
  FIRST_YEAR: number
  LAST_YEAR: number
  MAX_PER_SITE: number
  MIN_PER_SITE: number
  OWNER_PLAN: OwnerEntry[]
  distributeCounts: (count: number, siteTotal: number, random: () => number) => number[]
  planSiteHistory: (count: number, random: () => number) => Step[]
  siteTotalFor: (count: number, maxSites: number) => number
}
type DemoParcelsModule = { makeRandom: (seed: number) => () => number }

const demoHistory = jest.requireActual<HistoryModule>("../scripts/lib/demo-history")
const { makeRandom } = jest.requireActual<DemoParcelsModule>("../scripts/lib/demo-parcels")

// The seed runs on 2026-10-09: no survey may be dated after that.
const TODAY = Date.UTC(2026, 9, 9)
const when = (step: { year: number; month: number; day: number; hour?: number }) =>
  Date.UTC(step.year, step.month, step.day, step.hour ?? 10)

describe("siteTotalFor", () => {
  it("uses about one site per five surveys, within the maximum", () => {
    expect(demoHistory.siteTotalFor(1000, 216)).toBe(200)
    expect(demoHistory.siteTotalFor(100, 216)).toBe(20)
    expect(demoHistory.siteTotalFor(1728, 216)).toBe(216)
  })

  it("never needs more than 8 surveys per site, and never fewer than one site", () => {
    expect(demoHistory.siteTotalFor(1, 216)).toBe(1)
    expect(demoHistory.siteTotalFor(40, 216)).toBeGreaterThanOrEqual(5)
    expect(demoHistory.siteTotalFor(5000, 216)).toBe(216)
  })
})

describe("distributeCounts", () => {
  it("keeps the total and stays within 3 to 8 surveys per site for the default run", () => {
    const counts = demoHistory.distributeCounts(1000, 200, makeRandom(11))
    expect(counts).toHaveLength(200)
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(1000)
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(demoHistory.MIN_PER_SITE)
    expect(Math.max(...counts)).toBeLessThanOrEqual(demoHistory.MAX_PER_SITE)
    // The moves spread the counts: not every site has the same number.
    expect(new Set(counts).size).toBeGreaterThan(2)
  })

  it("is deterministic for a seed", () => {
    expect(demoHistory.distributeCounts(1000, 200, makeRandom(5))).toEqual(
      demoHistory.distributeCounts(1000, 200, makeRandom(5)),
    )
  })

  it("splits a small run evenly without going under what it can give", () => {
    const counts = demoHistory.distributeCounts(7, 2, makeRandom(1))
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(7)
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(3)
    expect(demoHistory.distributeCounts(2, 1, makeRandom(1))).toEqual([2])
  })
})

describe("planSiteHistory", () => {
  const plans = Array.from({ length: 300 }, (_, index) =>
    demoHistory.planSiteHistory(3 + (index % 6), makeRandom(1000 + index)),
  )

  it("gives the requested number of surveys, one per consecutive year, oldest first", () => {
    plans.forEach((plan, index) => {
      expect(plan).toHaveLength(3 + (index % 6))
      plan.forEach((step, position) => {
        if (position > 0) expect(step.year).toBe(plan[position - 1].year + 1)
      })
      expect(plan[0].year).toBeGreaterThanOrEqual(demoHistory.FIRST_YEAR)
      expect(plan[plan.length - 1].year).toBeLessThanOrEqual(demoHistory.LAST_YEAR)
    })
  })

  it("never dates a survey after the day of the seed, nor outside the field season", () => {
    for (const plan of plans) {
      for (const step of plan) {
        expect(when(step)).toBeLessThan(TODAY)
        expect(step.month).toBeGreaterThanOrEqual(2)
        expect(step.month).toBeLessThanOrEqual(9)
        expect(step.day).toBeGreaterThanOrEqual(1)
        expect(step.day).toBeLessThanOrEqual(27)
        expect(step.hour).toBeGreaterThanOrEqual(9)
        expect(step.hour).toBeLessThanOrEqual(16)
      }
    }
  })

  it("keeps the quality within the scale", () => {
    for (const plan of plans) {
      for (const step of plan) {
        expect(step.quality).toBeGreaterThanOrEqual(0.05)
        expect(step.quality).toBeLessThanOrEqual(0.97)
      }
    }
  })

  it("only moves from v3.0 to v3.2, never back", () => {
    for (const plan of plans) {
      const methods = plan.map((step) => step.method)
      const firstV32 = methods.indexOf("v3.2")
      if (firstV32 >= 0) expect(methods.slice(firstV32).every((m) => m === "v3.2")).toBe(true)
    }
  })

  it("mixes the methods on about a third of the sites, and keeps most of them on v3.2", () => {
    const kinds = plans.map((plan) => new Set(plan.map((step) => step.method)).size)
    const mixed = kinds.filter((size) => size === 2).length
    const allV30 = plans.filter((plan) => plan.every((step) => step.method === "v3.0")).length
    expect(mixed).toBeGreaterThan(plans.length * 0.2)
    expect(mixed).toBeLessThan(plans.length * 0.4)
    expect(allV30).toBeLessThan(plans.length * 0.12)
  })

  it("makes the curves differ: some parcels improve, some decline", () => {
    const trends = plans.map((plan) => plan[plan.length - 1].quality - plan[0].quality)
    expect(trends.some((delta) => delta > 0.1)).toBe(true)
    expect(trends.some((delta) => delta < -0.02)).toBe(true)
  })

  it("is deterministic for a seed", () => {
    expect(demoHistory.planSiteHistory(5, makeRandom(42))).toEqual(
      demoHistory.planSiteHistory(5, makeRandom(42)),
    )
  })
})

describe("OWNER_PLAN", () => {
  const plan = demoHistory.OWNER_PLAN

  it("has 20 surveys: 6 drafts and 14 finished ones, on the 6 owner sites", () => {
    expect(plan).toHaveLength(20)
    expect(plan.filter((entry) => entry.status === "draft")).toHaveLength(6)
    expect(plan.filter((entry) => entry.status === "submitted")).toHaveLength(14)
    expect(new Set(plan.map((entry) => entry.site))).toEqual(new Set([0, 1, 2, 3, 4, 5]))
  })

  it("gives every site at most one draft, and keeps a draft's factor count below ten", () => {
    for (let site = 0; site < 6; site += 1) {
      expect(plan.filter((e) => e.site === site && e.status === "draft")).toHaveLength(1)
    }
    for (const entry of plan.filter((e) => e.status === "draft")) {
      expect(entry.kept).toBeGreaterThanOrEqual(1)
      expect(entry.kept).toBeLessThan(10)
    }
    for (const entry of plan.filter((e) => e.status === "submitted")) expect(entry.kept).toBe(10)
  })

  it("dates nothing after the day of the seed, and lists a site's surveys in time order", () => {
    for (const entry of plan) expect(when(entry)).toBeLessThan(TODAY)
    for (let site = 0; site < 6; site += 1) {
      const dates = plan.filter((e) => e.site === site).map(when)
      expect(dates).toEqual([...dates].sort((a, b) => a - b))
    }
  })

  it("never finishes two surveys of one parcel in the same year, so each history year is unique", () => {
    for (let site = 0; site < 6; site += 1) {
      const years = plan
        .filter((e) => e.site === site && e.status === "submitted")
        .map((e) => e.year)
      expect(new Set(years).size).toBe(years.length)
    }
  })

  it("covers the cases the phone check needs", () => {
    const finished = (site: number) =>
      plan.filter((e) => e.site === site && e.status === "submitted")
    // Mixed methods: v3.0 first, then v3.2, on three parcels.
    const mixedSites = [0, 1, 5].filter((site) => {
      const methods = finished(site).map((e) => e.method)
      return methods.includes("v3.0") && methods.includes("v3.2")
    })
    expect(mixedSites).toEqual([0, 1, 5])
    // A decline (Fontainebleau), three finished years (Bois de Boulogne), a first survey.
    const fontainebleau = finished(3)
    expect(fontainebleau[1].quality).toBeLessThan(fontainebleau[0].quality)
    expect(finished(2)).toHaveLength(3)
    expect(finished(4)).toHaveLength(1)
  })
})
