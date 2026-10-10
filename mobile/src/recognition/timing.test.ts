import { formatGenusTimingLine, monotonicNow, reportGenusTiming } from "./timing"
import type { GenusTimingReport } from "./timing"

const REPORT: GenusTimingReport = {
  timings: { loadMs: 61.234, preprocessMs: 35.06, inferenceMs: 28.01, totalMs: 63.07 },
  captureToSuggestionMs: 190.56,
  outcome: "ok",
}

const EXPECTED_PAYLOAD = {
  outcome: "ok",
  loadMs: 61.2,
  preprocessMs: 35.1,
  inferenceMs: 28,
  totalMs: 63.1,
  captureToSuggestionMs: 190.6,
}

describe("formatGenusTimingLine", () => {
  it("prints the outcome and the numbers rounded to one decimal, in a fixed key order", () => {
    expect(formatGenusTimingLine(REPORT)).toBe(
      '[genus-timing] {"outcome":"ok","loadMs":61.2,"preprocessMs":35.1,"inferenceMs":28,"totalMs":63.1,"captureToSuggestionMs":190.6}',
    )
  })

  it("carries an unavailable reason as the outcome", () => {
    const line = formatGenusTimingLine({ ...REPORT, outcome: "load_failed" })
    expect(line).toContain('"outcome":"load_failed"')
  })

  it("holds only the outcome and numbers: no uri, id or coordinate key", () => {
    const payload = JSON.parse(formatGenusTimingLine(REPORT).replace("[genus-timing] ", ""))
    expect(Object.keys(payload).sort()).toEqual(
      [
        "captureToSuggestionMs",
        "inferenceMs",
        "loadMs",
        "outcome",
        "preprocessMs",
        "totalMs",
      ].sort(),
    )
    for (const key of ["uri", "id", "lat", "lng"]) expect(payload).not.toHaveProperty(key)
  })
})

describe("reportGenusTiming", () => {
  it("prints the line and logs the detail when the build flag is on", () => {
    const info = jest.fn()
    const log = jest.fn()

    reportGenusTiming(REPORT, { enabled: true, info, log })

    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith(formatGenusTimingLine(REPORT))
    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith("genus.timing", EXPECTED_PAYLOAD)
  })

  it("only logs the detail when the flag is off", () => {
    const info = jest.fn()
    const log = jest.fn()

    reportGenusTiming(REPORT, { enabled: false, info, log })

    expect(info).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(1)
  })

  it("defaults to the build flag, the console and the status log, printing nothing when unset", () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined)
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => undefined)
    try {
      expect(() => reportGenusTiming(REPORT)).not.toThrow()
      expect(infoSpy).not.toHaveBeenCalled()
    } finally {
      infoSpy.mockRestore()
      debugSpy.mockRestore()
    }
  })

  it("prints through console.info by default when the flag is set at build time", async () => {
    const previous = process.env.EXPO_PUBLIC_GENUS_TIMING
    process.env.EXPO_PUBLIC_GENUS_TIMING = "true"
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined)
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => undefined)
    try {
      await jest.isolateModulesAsync(async () => {
        const isolated = await import("./timing")
        isolated.reportGenusTiming(REPORT)
      })
      expect(infoSpy).toHaveBeenCalledWith(formatGenusTimingLine(REPORT))
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_GENUS_TIMING
      else process.env.EXPO_PUBLIC_GENUS_TIMING = previous
      infoSpy.mockRestore()
      debugSpy.mockRestore()
    }
  })
})

describe("monotonicNow", () => {
  it("returns performance.now() when the runtime has it", () => {
    const spy = jest.spyOn(globalThis.performance, "now").mockReturnValue(1234.5)
    try {
      expect(monotonicNow()).toBe(1234.5)
    } finally {
      spy.mockRestore()
    }
  })

  it("falls back to Date.now() when there is no performance clock", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "performance")
    Object.defineProperty(globalThis, "performance", { value: undefined, configurable: true })
    const dateSpy = jest.spyOn(Date, "now").mockReturnValue(987654)
    try {
      expect(monotonicNow()).toBe(987654)
    } finally {
      dateSpy.mockRestore()
      if (original) Object.defineProperty(globalThis, "performance", original)
    }
  })
})
