import { fetchDarkPlanIgnStyle, fetchPlanIgnStyle, resetPlanIgnStyleCache } from "./plan-ign-style"
import { PLAN_IGN_STYLE_URL } from "./styles"

const plan = {
  version: 8,
  sources: { plan_ign: { type: "vector", url: "x" } },
  layers: [{ id: "land", type: "fill", source: "plan_ign", paint: { "fill-color": "#FFFFFF" } }],
}

beforeEach(() => {
  resetPlanIgnStyleCache()
})

describe("fetchPlanIgnStyle", () => {
  test("fetches the published style once and reuses it", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => plan }))
    await fetchPlanIgnStyle(fetchImpl)
    await fetchPlanIgnStyle(fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(PLAN_IGN_STYLE_URL)
  })

  test("a failed fetch rejects and is retried next time", async () => {
    const failing = jest.fn(async () => ({ ok: false, json: async () => ({}) }))
    await expect(fetchPlanIgnStyle(failing)).rejects.toThrow("could not be fetched")
    const working = jest.fn(async () => ({ ok: true, json: async () => plan }))
    await expect(fetchPlanIgnStyle(working)).resolves.toEqual(plan)
  })
})

describe("fetchDarkPlanIgnStyle", () => {
  test("returns the recoloured style with its dark ground", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => plan }))
    const dark = await fetchDarkPlanIgnStyle(fetchImpl)
    expect(dark.layers[0].id).toBe("basemap-dark-ground")
    expect(dark.layers).toHaveLength(2)
  })
})
