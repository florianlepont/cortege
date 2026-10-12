import {
  FACTOR_ANNOTATIONS_KEY,
  FACTOR_NOTE_MAX_LENGTH,
  SURVEY_NOTE_MAX_LENGTH,
  WEATHER_EDITABLE_KEYS,
  WEATHER_LOOKBACK_MS,
  WEATHER_RANGES,
  WEATHER_SKY_CODES,
  WEATHER_SOURCES,
  canonicalFactorAnnotations,
  factorAnnotationsIssues,
  isWeatherSkyCode,
  normalizeNoteText,
  readFactorAnnotations,
  withFactorAnnotations,
} from "./conditions"

describe("constants", () => {
  it("pins the note limits and the container key", () => {
    expect(SURVEY_NOTE_MAX_LENGTH).toBe(1000)
    expect(FACTOR_NOTE_MAX_LENGTH).toBe(300)
    expect(FACTOR_ANNOTATIONS_KEY).toBe("annotations")
  })

  it("pins the weather codes, sources, editable keys, ranges and lookback", () => {
    expect(WEATHER_SKY_CODES).toEqual([
      "clear",
      "partly_cloudy",
      "cloudy",
      "overcast",
      "fog",
      "rain",
      "thunderstorm",
      "snow",
    ])
    expect(WEATHER_SOURCES).toEqual(["meteo_france", "manual"])
    expect(WEATHER_EDITABLE_KEYS).toEqual([
      "sky",
      "temperature_c",
      "wind_kmh",
      "rain_24h_mm",
      "observed_at",
    ])
    expect(WEATHER_RANGES.temperature_c).toEqual({ min: -40, max: 55 })
    expect(WEATHER_RANGES.wind_kmh).toEqual({ min: 0, max: 350 })
    expect(WEATHER_RANGES.rain_24h_mm).toEqual({ min: 0, max: 1000 })
    expect(WEATHER_LOOKBACK_MS).toBe(86_400_000)
  })
})

describe("isWeatherSkyCode", () => {
  it("accepts the eight codes only", () => {
    expect(isWeatherSkyCode("rain")).toBe(true)
    for (const code of WEATHER_SKY_CODES) expect(isWeatherSkyCode(code)).toBe(true)
    expect(isWeatherSkyCode("sunny")).toBe(false)
    expect(isWeatherSkyCode(3)).toBe(false)
    expect(isWeatherSkyCode(null)).toBe(false)
  })
})

describe("normalizeNoteText", () => {
  it("turns CRLF and CR into LF and trims", () => {
    expect(normalizeNoteText("  a\r\nb\rc  ", 1000)).toBe("a\nb\nc")
  })

  it("returns null for an empty, blank, null or undefined note", () => {
    expect(normalizeNoteText("", 1000)).toBeNull()
    expect(normalizeNoteText("   ", 1000)).toBeNull()
    expect(normalizeNoteText(" \r\n ", 1000)).toBeNull()
    expect(normalizeNoteText(null, 1000)).toBeNull()
    expect(normalizeNoteText(undefined, 1000)).toBeNull()
  })

  it("clamps to the limit, then trims again", () => {
    expect(normalizeNoteText("a".repeat(1005), 1000)).toBe("a".repeat(1000))
    expect(normalizeNoteText(`${"a".repeat(9)} ${"b".repeat(10)}`, 10)).toBe("a".repeat(9))
  })

  it("returns null when the limit leaves nothing", () => {
    expect(normalizeNoteText("abc", 0)).toBeNull()
  })

  it("is idempotent, so a replay compares equal", () => {
    const once = normalizeNoteText("  x\r\ny  ", 1000)
    expect(normalizeNoteText(once, 1000)).toBe(once)
  })
})

describe("readFactorAnnotations", () => {
  it("keeps valid entries and drops the rest", () => {
    const factors = {
      A: 5,
      annotations: {
        A: { doubt: true, note: " x " },
        B: { doubt: false },
        K: { doubt: true },
        C: "bad",
        D: { note: "   " },
        E: { doubt: "yes", note: 3 },
        F: null,
        G: [],
      },
    }
    expect(readFactorAnnotations(factors)).toEqual({ A: { doubt: true, note: " x " } })
  })

  it("keeps a note alone and a doubt alone", () => {
    expect(
      readFactorAnnotations({ annotations: { H: { note: "n" }, I: { doubt: true } } }),
    ).toEqual({ H: { note: "n" }, I: { doubt: true } })
  })

  it("returns an empty object when there is nothing to read", () => {
    expect(readFactorAnnotations(undefined)).toEqual({})
    expect(readFactorAnnotations(null)).toEqual({})
    expect(readFactorAnnotations("x")).toEqual({})
    expect(readFactorAnnotations([])).toEqual({})
    expect(readFactorAnnotations({})).toEqual({})
    expect(readFactorAnnotations({ annotations: [] })).toEqual({})
    expect(readFactorAnnotations({ annotations: "x" })).toEqual({})
  })
})

describe("canonicalFactorAnnotations", () => {
  it("builds the canonical form in factor order", () => {
    const result = canonicalFactorAnnotations({
      C: { note: "  vu  " },
      A: { doubt: true, note: "" },
      B: { doubt: false },
    })
    expect(result).toEqual({ A: { doubt: true }, C: { note: "vu" } })
    expect(Object.keys(result ?? {})).toEqual(["A", "C"])
  })

  it("keeps a doubt with a note", () => {
    expect(canonicalFactorAnnotations({ J: { doubt: true, note: "n" } })).toEqual({
      J: { doubt: true, note: "n" },
    })
  })

  it("returns undefined when nothing remains", () => {
    expect(canonicalFactorAnnotations({ B: { doubt: false, note: "  " } })).toBeUndefined()
    expect(canonicalFactorAnnotations({})).toBeUndefined()
    expect(canonicalFactorAnnotations({ A: { note: null } })).toBeUndefined()
  })

  it("clamps a long note to 300 characters", () => {
    const result = canonicalFactorAnnotations({ A: { note: "b".repeat(310) } })
    expect(result?.A?.note).toHaveLength(300)
  })
})

describe("withFactorAnnotations", () => {
  it("removes the container when given undefined", () => {
    expect(withFactorAnnotations({ A: 5, annotations: { A: { doubt: true } } }, undefined)).toEqual(
      { A: 5 },
    )
  })

  it("sets the container", () => {
    expect(withFactorAnnotations({ A: 5 }, { B: { note: "n" } })).toEqual({
      A: 5,
      annotations: { B: { note: "n" } },
    })
  })

  it("does not mutate its input", () => {
    const input = { A: 5, annotations: { A: { doubt: true as const } } }
    withFactorAnnotations(input, undefined)
    withFactorAnnotations(input, { B: { doubt: true } })
    expect(input).toEqual({ A: 5, annotations: { A: { doubt: true } } })
  })
})

describe("factorAnnotationsIssues", () => {
  it("accepts absent and valid containers", () => {
    expect(factorAnnotationsIssues(undefined)).toEqual([])
    expect(factorAnnotationsIssues(null)).toEqual([])
    expect(factorAnnotationsIssues({})).toEqual([])
    expect(factorAnnotationsIssues({ A: { doubt: true, note: "ok" } })).toEqual([])
    expect(factorAnnotationsIssues({ A: { doubt: false } })).toEqual([])
    expect(factorAnnotationsIssues({ A: { note: "a".repeat(300) } })).toEqual([])
  })

  it("rejects a container that is not an object", () => {
    expect(factorAnnotationsIssues([])).toEqual(["annotations_not_object"])
    expect(factorAnnotationsIssues("x")).toEqual(["annotations_not_object"])
    expect(factorAnnotationsIssues(3)).toEqual(["annotations_not_object"])
  })

  it("rejects an unknown factor", () => {
    expect(factorAnnotationsIssues({ K: {} })).toContain("annotations_unknown_factor")
  })

  it("rejects an entry that is not an object", () => {
    expect(factorAnnotationsIssues({ A: "x" })).toContain("annotations_entry_not_object")
    expect(factorAnnotationsIssues({ A: null })).toContain("annotations_entry_not_object")
    expect(factorAnnotationsIssues({ A: [] })).toContain("annotations_entry_not_object")
  })

  it("rejects an unknown entry key", () => {
    expect(factorAnnotationsIssues({ A: { extra: 1 } })).toContain("annotations_entry_unknown_key")
  })

  it("rejects a doubt that is not a boolean", () => {
    expect(factorAnnotationsIssues({ A: { doubt: "yes" } })).toContain(
      "annotations_doubt_not_boolean",
    )
  })

  it("rejects a note that is not a string or is too long", () => {
    expect(factorAnnotationsIssues({ A: { note: 3 } })).toContain("annotations_note_not_string")
    expect(factorAnnotationsIssues({ A: { note: "a".repeat(301) } })).toContain(
      "annotations_note_too_long",
    )
  })

  it("lists each problem once", () => {
    const issues = factorAnnotationsIssues({
      K: {},
      L: {},
      A: { note: 1 },
      B: { note: 2 },
    })
    expect(issues).toEqual(["annotations_unknown_factor", "annotations_note_not_string"])
  })
})
