import {
  DEFAULT_IBP_METHOD_VERSION,
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  IBP_METHOD_VERSIONS,
  isSameMethodVersion,
  resolveMethodVersion,
} from "./method-version"

describe("method version constants", () => {
  it("uses the ADR-003 tags", () => {
    expect(IBP_METHOD_V3_0).toBe("cnpf_ibp_fr_v3_0_2023-03-23")
    expect(IBP_METHOD_V3_2).toBe("cnpf_ibp_fr_v3_2_2026-02-02")
    expect(IBP_METHOD_VERSIONS).toEqual([IBP_METHOD_V3_0, IBP_METHOD_V3_2])
  })

  it("defaults new surveys to v3.2 (D-01)", () => {
    expect(DEFAULT_IBP_METHOD_VERSION).toBe(IBP_METHOD_V3_2)
  })
})

describe("resolveMethodVersion", () => {
  it.each([undefined, null, ""])("treats a missing version (%p) as v3.0 (D-02)", (raw) => {
    expect(resolveMethodVersion(raw)).toBe(IBP_METHOD_V3_0)
  })

  it("returns each known tag unchanged", () => {
    expect(resolveMethodVersion(IBP_METHOD_V3_0)).toBe(IBP_METHOD_V3_0)
    expect(resolveMethodVersion(IBP_METHOD_V3_2)).toBe(IBP_METHOD_V3_2)
  })

  it.each(["v3.1", 42, true, {}, " "])("rejects an unknown value (%p) as unsupported", (raw) => {
    expect(resolveMethodVersion(raw)).toBeNull()
  })
})

describe("isSameMethodVersion", () => {
  it("treats a missing version and the v3.0 tag as equal", () => {
    expect(isSameMethodVersion(null, IBP_METHOD_V3_0)).toBe(true)
    expect(isSameMethodVersion(IBP_METHOD_V3_0, undefined)).toBe(true)
    expect(isSameMethodVersion("", null)).toBe(true)
  })

  it("compares known versions", () => {
    expect(isSameMethodVersion(IBP_METHOD_V3_2, IBP_METHOD_V3_2)).toBe(true)
    expect(isSameMethodVersion(IBP_METHOD_V3_0, IBP_METHOD_V3_2)).toBe(false)
    expect(isSameMethodVersion(null, IBP_METHOD_V3_2)).toBe(false)
  })

  it("never treats an unsupported value as equal to anything", () => {
    expect(isSameMethodVersion("v3.1", "v3.1")).toBe(false)
    expect(isSameMethodVersion("v3.1", IBP_METHOD_V3_0)).toBe(false)
    expect(isSameMethodVersion(IBP_METHOD_V3_2, 42)).toBe(false)
  })
})
