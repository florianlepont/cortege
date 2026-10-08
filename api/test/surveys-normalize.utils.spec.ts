import { BadRequestException } from "@nestjs/common"
import { parseWfsParcelProperties } from "../src/surveys/cadastre-provider.service"
import {
  apiCartoSection,
  arrondissementCity,
  buildSyncChangesCursor,
  featureCommuneCode,
  classifySameVersionContent,
  getChangedSubmittedReadOnlyFields,
  getSubmittedReadOnlyFields,
  buildParcelKey,
  isStrictTimestamp,
  normalizeParcelPartToDigits,
  normalizeParcelSection,
  parseParcelIdentifier,
  parseParcelIdu,
  parseSyncChangesCursor,
  resolveSurveyMethodColumns,
  sameSurveyMethodColumns,
} from "../src/surveys/surveys-normalize.utils"
import { SurveyRow, SurveyUpsertBody } from "../src/surveys/surveys.types"

function makeRow(overrides: Partial<SurveyRow> = {}): SurveyRow {
  return {
    id: "survey-1",
    user_id: "user-1",
    site_name: "Parcelle Nord",
    status: "submitted",
    visibility: "private",
    parcel_id: "12345AB0042",
    parcel_ids: ["12345AB0042"],
    observation_year: 2025,
    version_number: 1,
    previous_survey_id: null,
    region_version: "ACA",
    vegetation_stage: "collineen",
    ibp_method_version: null,
    ibp_cas: null,
    ibp_cas3_scale: null,
    factors: { A: 1, B: 2 },
    factor_results: {},
    scores: { ibp_total: 10 },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    submitted_at: "2026-01-01T00:00:00.000Z",
    sync_version: 1,
    last_sync_error: null,
    deleted_at: null,
    ...overrides,
  }
}

describe("getChangedSubmittedReadOnlyFields", () => {
  it("returns [] when every read-only field is identical", () => {
    const existing = makeRow()
    const body: SurveyUpsertBody = {
      site_name: existing.site_name,
      parcel_ids: existing.parcel_ids,
      observation_year: existing.observation_year ?? undefined,
      version_number: existing.version_number ?? undefined,
      previous_survey_id: existing.previous_survey_id ?? undefined,
      region_version: existing.region_version as SurveyUpsertBody["region_version"],
      vegetation_stage: existing.vegetation_stage ?? undefined,
      factors: existing.factors,
    }

    expect(getChangedSubmittedReadOnlyFields(body, existing, existing.parcel_ids ?? [])).toEqual([])
  })

  it("does not report a field that is absent, undefined or null on the body", () => {
    const existing = makeRow()
    const body: SurveyUpsertBody = {
      site_name: undefined,
      // parcel_ids intentionally omitted
      // observation_year intentionally omitted
    }

    expect(getChangedSubmittedReadOnlyFields(body, existing, existing.parcel_ids ?? [])).toEqual([])
  })

  it("reports site_name when it differs", () => {
    const existing = makeRow()
    const body: SurveyUpsertBody = { site_name: "Parcelle Sud" }

    expect(getChangedSubmittedReadOnlyFields(body, existing, existing.parcel_ids ?? [])).toEqual([
      "site_name",
    ])
  })

  it("does not report parcel_ids when the same set differs only in order/case/whitespace", () => {
    const existing = makeRow({ parcel_ids: ["12345AB0042", "12345AB0043"] })
    const body: SurveyUpsertBody = { parcel_ids: [" 12345ab0043 ", "12345AB0042"] }

    expect(getChangedSubmittedReadOnlyFields(body, existing, existing.parcel_ids ?? [])).toEqual([])
  })

  it("reports parcel_ids when the set actually changed", () => {
    const existing = makeRow({ parcel_ids: ["12345AB0042"] })
    const body: SurveyUpsertBody = { parcel_ids: ["12345AB0099"] }

    expect(getChangedSubmittedReadOnlyFields(body, existing, existing.parcel_ids ?? [])).toEqual([
      "parcel_ids",
    ])
  })

  it("falls back to [existing.parcel_id] when existingParcelIds is empty", () => {
    const existing = makeRow({ parcel_id: "12345AB0042", parcel_ids: undefined })
    const body: SurveyUpsertBody = { parcel_ids: ["12345AB0099"] }

    expect(getChangedSubmittedReadOnlyFields(body, existing, [])).toEqual(["parcel_ids"])
  })

  it("compares parcel_id after normalizeParcelId", () => {
    const existing = makeRow({ parcel_id: "12345AB0042" })
    const body: SurveyUpsertBody = { parcel_id: " 12345ab0042 " }

    expect(getChangedSubmittedReadOnlyFields(body, existing, existing.parcel_ids ?? [])).toEqual([])
  })

  it("compares observation_year, version_number and previous_survey_id after their normalize helpers", () => {
    const existing = makeRow({
      observation_year: 2025,
      version_number: 2,
      previous_survey_id: "prev-1",
    })

    expect(
      getChangedSubmittedReadOnlyFields(
        { observation_year: 2025, version_number: 2, previous_survey_id: "prev-1" },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual([])

    expect(
      getChangedSubmittedReadOnlyFields(
        { observation_year: 2026, version_number: 3, previous_survey_id: "prev-2" },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual(["observation_year", "version_number", "previous_survey_id"])
  })

  it("reports region_version and vegetation_stage when they differ", () => {
    const existing = makeRow({ region_version: "ACA", vegetation_stage: "collineen" })

    expect(
      getChangedSubmittedReadOnlyFields(
        { region_version: "M", vegetation_stage: "montagnard" },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual(["region_version", "vegetation_stage"])
  })

  it("does not report factors with the same content but different key order", () => {
    const existing = makeRow({ factors: { A: 1, B: 2 } })

    expect(
      getChangedSubmittedReadOnlyFields(
        { factors: { B: 2, A: 1 } },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual([])
  })

  it("reports factors when a value changed", () => {
    const existing = makeRow({ factors: { A: 1, B: 2 } })

    expect(
      getChangedSubmittedReadOnlyFields(
        { factors: { A: 2, B: 2 } },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual(["factors"])
  })

  it("reports factors when a key was added or removed", () => {
    const existing = makeRow({ factors: { A: 1, B: 2 } })

    expect(
      getChangedSubmittedReadOnlyFields(
        { factors: { A: 1, B: 2, C: 3 } },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual(["factors"])

    expect(
      getChangedSubmittedReadOnlyFields({ factors: { A: 1 } }, existing, existing.parcel_ids ?? []),
    ).toEqual(["factors"])
  })

  it("compares nested objects recursively and arrays in order", () => {
    const existing = makeRow({ factors: { A: { nested: [1, 2, 3] } } })

    expect(
      getChangedSubmittedReadOnlyFields(
        { factors: { A: { nested: [1, 2, 3] } } },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual([])

    expect(
      getChangedSubmittedReadOnlyFields(
        { factors: { A: { nested: [1, 3, 2] } } },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual(["factors"])
  })

  it("never reports scores even when they differ (D-13)", () => {
    const existing = makeRow({ scores: { ibp_total: 10 } })

    expect(
      getChangedSubmittedReadOnlyFields(
        { scores: { ibp_total: 999 } },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual([])
  })

  it("reports several differences, all in readonly-list order", () => {
    const existing = makeRow({
      site_name: "Parcelle Nord",
      observation_year: 2025,
      factors: { A: 1 },
    })

    expect(
      getChangedSubmittedReadOnlyFields(
        { site_name: "Parcelle Sud", observation_year: 2026, factors: { A: 2 } },
        existing,
        existing.parcel_ids ?? [],
      ),
    ).toEqual(["site_name", "observation_year", "factors"])
  })
})

const V3_0 = "cnpf_ibp_fr_v3_0_2023-03-23"
const V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"
const V3_2_ROW: Partial<SurveyRow> = {
  ibp_method_version: V3_2,
  ibp_cas: 1,
  ibp_cas3_scale: null,
  region_version: null,
  vegetation_stage: null,
}

describe("getChangedSubmittedReadOnlyFields: method fields (phase 01.8, Pattern 3)", () => {
  const changed = (body: SurveyUpsertBody, overrides: Partial<SurveyRow> = {}) => {
    const existing = makeRow(overrides)
    return getChangedSubmittedReadOnlyFields(body, existing, existing.parcel_ids ?? [])
  }

  it("treats a stored NULL version and the explicit v3.0 tag as the same method", () => {
    expect(changed({ ibp_method_version: V3_0 })).toEqual([])
  })

  it("reports a v3.0 row replayed as v3.2, and the cas it now carries", () => {
    expect(changed({ ibp_method_version: V3_2 }, { ibp_method_version: V3_0 })).toEqual([
      "ibp_method_version",
    ])
    expect(changed({ ibp_method_version: V3_2, ibp_cas: 1 })).toEqual([
      "ibp_method_version",
      "ibp_cas",
    ])
  })

  it("reports a v3.2 row replayed with the v3.0 tag", () => {
    expect(changed({ ibp_method_version: V3_0 }, V3_2_ROW)).toEqual(["ibp_method_version"])
  })

  it("reports a changed cas and cas-3 flag on a v3.2 row", () => {
    expect(changed({ ibp_cas: 2 }, V3_2_ROW)).toEqual(["ibp_cas"])
    expect(
      changed({ ibp_method_version: V3_2, ibp_cas: 1, ibp_cas3_scale: true }, V3_2_ROW),
    ).toEqual(["ibp_cas3_scale"])
  })

  it("does not report null or undefined method fields", () => {
    expect(
      changed({ ibp_method_version: null, ibp_cas: null, ibp_cas3_scale: null }, V3_2_ROW),
    ).toEqual([])
    expect(changed({ ibp_method_version: undefined, ibp_cas: undefined }, V3_2_ROW)).toEqual([])
  })

  it("treats a missing cas-3 flag as false", () => {
    expect(changed({ ibp_cas3_scale: false }, V3_2_ROW)).toEqual([])
  })

  it("ignores the fields the other method never stores", () => {
    // A cas sent for a v3.0 row, and a region sent for a v3.2 row, are cleared on write.
    expect(changed({ ibp_cas: 3, ibp_cas3_scale: true })).toEqual([])
    expect(changed({ region_version: "M", vegetation_stage: "montagnard" }, V3_2_ROW)).toEqual([])
  })

  it("still compares region and stage on a v3.0 row", () => {
    expect(changed({ ibp_method_version: V3_0, region_version: "M" })).toEqual(["region_version"])
  })
})

describe("getSubmittedReadOnlyFields (PATCH key presence)", () => {
  it("lists the three method fields when present, even when null", () => {
    expect(
      getSubmittedReadOnlyFields({
        visibility: "public",
        ibp_method_version: null,
        ibp_cas: 2,
        ibp_cas3_scale: false,
      }),
    ).toEqual(["ibp_method_version", "ibp_cas", "ibp_cas3_scale"])
  })
})

describe("resolveSurveyMethodColumns (RESEARCH §4.2 rules 1-2)", () => {
  const legacyRow = makeRow()

  it("stores no region or stage for a v3.2 body, and keeps its cas", () => {
    expect(
      resolveSurveyMethodColumns(
        {
          ibp_method_version: V3_2,
          ibp_cas: 3,
          ibp_cas3_scale: false,
          region_version: "ACA",
          vegetation_stage: "subalpin",
        },
        null,
      ),
    ).toEqual({
      ibp_method_version: V3_2,
      ibp_cas: 3,
      ibp_cas3_scale: false,
      region_version: null,
      vegetation_stage: null,
    })
  })

  it("stores no cas for a v3.0 body (tagged or untagged)", () => {
    const expected = {
      ibp_cas: null,
      ibp_cas3_scale: null,
      region_version: "M",
      vegetation_stage: "montagnard",
    }
    expect(
      resolveSurveyMethodColumns(
        {
          ibp_method_version: V3_0,
          ibp_cas: 2,
          ibp_cas3_scale: true,
          region_version: "M",
          vegetation_stage: "montagnard",
        },
        null,
      ),
    ).toEqual({ ibp_method_version: V3_0, ...expected })
    expect(
      resolveSurveyMethodColumns(
        { ibp_cas: 2, region_version: "M", vegetation_stage: "montagnard" },
        null,
      ),
    ).toEqual({ ibp_method_version: null, ...expected })
  })

  it("keeps a stored v3.2 draft v3.2 when the body has no version (old app edit)", () => {
    expect(
      resolveSurveyMethodColumns(
        { region_version: "ACA", vegetation_stage: "collineen" },
        makeRow({ ...V3_2_ROW, ibp_cas: 2, ibp_cas3_scale: true }),
      ),
    ).toEqual({
      ibp_method_version: V3_2,
      ibp_cas: 2,
      ibp_cas3_scale: true,
      region_version: null,
      vegetation_stage: null,
    })
  })

  it("never stamps an untagged row: its version stays NULL", () => {
    expect(resolveSurveyMethodColumns({}, legacyRow)).toEqual({
      ibp_method_version: null,
      ibp_cas: null,
      ibp_cas3_scale: null,
      region_version: "ACA",
      vegetation_stage: "collineen",
    })
  })

  it("clears the region and stage when a v3.0 draft switches to v3.2", () => {
    expect(
      resolveSurveyMethodColumns({ ibp_method_version: V3_2, ibp_cas: 1 }, legacyRow),
    ).toMatchObject({ ibp_method_version: V3_2, ibp_cas: 1, region_version: null })
  })

  it("clears the cas when a v3.2 draft switches back to v3.0", () => {
    expect(
      resolveSurveyMethodColumns(
        { ibp_method_version: V3_0, region_version: "ACA", vegetation_stage: "collineen" },
        makeRow(V3_2_ROW),
      ),
    ).toEqual({
      ibp_method_version: V3_0,
      ibp_cas: null,
      ibp_cas3_scale: null,
      region_version: "ACA",
      vegetation_stage: "collineen",
    })
  })

  it("compares column sets field by field", () => {
    const columns = resolveSurveyMethodColumns({}, legacyRow)
    expect(sameSurveyMethodColumns(columns, { ...columns })).toBe(true)
    expect(sameSurveyMethodColumns(columns, { ...columns, ibp_cas: 1 })).toBe(false)
    expect(sameSurveyMethodColumns(columns, { ...columns, vegetation_stage: null })).toBe(false)
  })
})

describe("parseSyncChangesCursor", () => {
  it.each([undefined, "", "   "])("returns kind none for an empty cursor (%p)", (cursor) => {
    expect(parseSyncChangesCursor(cursor)).toEqual({ kind: "none", original: null })
  })

  it("parses a v2 cursor into string xid8 and seq", () => {
    expect(parseSyncChangesCursor("v2:9843:7")).toEqual({
      kind: "position",
      xid8: "9843",
      seq: "7",
      original: "v2:9843:7",
    })
  })

  it("keeps values beyond Number.MAX_SAFE_INTEGER as exact strings", () => {
    const cursor = "v2:18446744073709551615:9223372036854775807"
    expect(parseSyncChangesCursor(cursor)).toEqual({
      kind: "position",
      xid8: "18446744073709551615",
      seq: "9223372036854775807",
      original: cursor,
    })
  })

  it.each([
    ["2026-03-09 10:20:31.991+00|8ac1", "2026-03-09 10:20:31.991+00", "8ac1"],
    [
      "2026-03-09T10:20:31.991Z|survey-1712345678901",
      "2026-03-09T10:20:31.991Z",
      "survey-1712345678901",
    ],
  ])("parses the legacy cursor %p", (cursor, timestamp, eventId) => {
    expect(parseSyncChangesCursor(cursor)).toEqual({
      kind: "legacy",
      timestamp,
      eventId,
      original: cursor,
    })
  })

  it.each([
    "v2:abc:1",
    "v2:1",
    "v2:1:2:3",
    "v2:-1:2",
    "not-a-date|x",
    "seq:5",
    "seq:5|x",
    "2026-03-09T10:20:31.991Z",
    "v2:18446744073709551616:1",
    "v2:99999999999999999999:1",
    "v2:1:9223372036854775808",
    "2024-02-30T00:00:00Z|x",
    "2024-01-01 12:00:00 junk|x",
  ])("rejects the malformed cursor %p with 400 Invalid sync cursor", (cursor) => {
    expect(() => parseSyncChangesCursor(cursor)).toThrow(BadRequestException)
    expect(() => parseSyncChangesCursor(cursor)).toThrow("Invalid sync cursor")
  })
})

describe("isStrictTimestamp", () => {
  it.each([
    "2026-03-09 10:20:31.991234+00",
    "2026-03-09 10:20:31.991+00",
    "2026-03-09T10:20:31Z",
    "2026-03-09T10:20:31.991Z",
    "2024-02-29T00:00:00+02:00",
    "2026-01-01 00:00:00-0530",
    "2024-01-01 00:00:00+15:59",
    "0001-01-01 00:00:00Z",
  ])("accepts %p", (value) => {
    expect(isStrictTimestamp(value)).toBe(true)
  })

  it.each([
    "2024-02-30T00:00:00Z",
    "2023-02-29T00:00:00Z",
    "2024-13-01T00:00:00Z",
    "2024-00-10T00:00:00Z",
    "2024-01-00T00:00:00Z",
    "2024-01-01T24:00:00Z",
    "2024-01-01T23:60:00Z",
    "2024-01-01T23:59:60Z",
    "2024-01-01 12:00:00 junk",
    "2024-01-01",
    "2024-01-01T00:00:00.1234567Z",
    "2024-01-01T00:00:00",
    "2024-01-01 00:00:00+16",
    "2024-01-01 00:00:00+05:99",
    "0000-01-01 00:00:00Z",
    "",
  ])("rejects %p", (value) => {
    expect(isStrictTimestamp(value)).toBe(false)
  })
})

describe("parseSyncChangesCursor strict legacy form", () => {
  it("still parses a PostgreSQL timestamptz::text legacy cursor", () => {
    expect(parseSyncChangesCursor("2026-03-09 10:20:31.991+00|survey-1")).toEqual({
      kind: "legacy",
      timestamp: "2026-03-09 10:20:31.991+00",
      eventId: "survey-1",
      original: "2026-03-09 10:20:31.991+00|survey-1",
    })
  })

  it("never echoes the rejected cursor", () => {
    let thrown: unknown
    try {
      parseSyncChangesCursor("2024-02-30T00:00:00Z|secret-marker")
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(BadRequestException)
    const exception = thrown as BadRequestException
    expect(exception.message).toBe("Invalid sync cursor")
    expect(JSON.stringify(exception.getResponse())).not.toContain("secret-marker")
  })
})

describe("buildSyncChangesCursor", () => {
  it("builds a v2 cursor that round-trips through the parser", () => {
    const cursor = buildSyncChangesCursor("9843", "7")
    expect(cursor).toBe("v2:9843:7")
    expect(parseSyncChangesCursor(cursor)).toEqual({
      kind: "position",
      xid8: "9843",
      seq: "7",
      original: cursor,
    })
  })
})

describe("classifySameVersionContent", () => {
  function sameBody(existing: SurveyRow): SurveyUpsertBody {
    return {
      site_name: existing.site_name,
      visibility: existing.visibility,
      parcel_ids: existing.parcel_ids,
      observation_year: existing.observation_year ?? undefined,
      version_number: existing.version_number ?? undefined,
      region_version: existing.region_version as SurveyUpsertBody["region_version"],
      vegetation_stage: existing.vegetation_stage ?? undefined,
      factors: existing.factors,
    }
  }

  it("returns identical when the body matches the stored row", () => {
    const existing = makeRow()
    expect(classifySameVersionContent(sameBody(existing), existing, ["12345AB0042"])).toBe(
      "identical",
    )
  })

  it("ignores factor key order", () => {
    const existing = makeRow({ factors: { A: 1, B: { x: 1, y: [1, 2] } } })
    const body = { ...sameBody(existing), factors: { B: { y: [1, 2], x: 1 }, A: 1 } }
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("identical")
  })

  it("ignores parcel id order and case", () => {
    const existing = makeRow({ parcel_ids: ["12345AB0042", "12345AB0043"] })
    const body = { ...sameBody(existing), parcel_ids: ["12345ab0043", "12345AB0042"] }
    expect(classifySameVersionContent(body, existing, ["12345AB0042", "12345AB0043"])).toBe(
      "identical",
    )
  })

  it("returns conflict when site_name differs", () => {
    const existing = makeRow()
    const body = { ...sameBody(existing), site_name: "Autre parcelle" }
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("conflict")
  })

  it("returns conflict when one factor value differs", () => {
    const existing = makeRow()
    const body = { ...sameBody(existing), factors: { A: 1, B: 3 } }
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("conflict")
  })

  it("returns conflict when the parcel id set differs", () => {
    const existing = makeRow()
    const body = { ...sameBody(existing), parcel_ids: ["12345AB0042", "12345AB0099"] }
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("conflict")
  })

  it("returns visibility_only when only visibility differs", () => {
    const existing = makeRow({ visibility: "private" })
    const body: SurveyUpsertBody = { ...sameBody(existing), visibility: "public" }
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("visibility_only")
  })

  it("returns identical when visibility is absent from the body", () => {
    const existing = makeRow({ visibility: "public" })
    const body = sameBody(existing)
    delete body.visibility
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("identical")
  })

  it("returns conflict when site_name and visibility both differ", () => {
    const existing = makeRow({ visibility: "private" })
    const body: SurveyUpsertBody = {
      ...sameBody(existing),
      site_name: "Autre parcelle",
      visibility: "public",
    }
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("conflict")
  })

  it("excludes scores and status", () => {
    const existing = makeRow()
    const body: SurveyUpsertBody = {
      ...sameBody(existing),
      scores: { ibp_total: 99 },
      status: "draft",
    }
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("identical")
  })

  it("does not treat absent or null fields as changes", () => {
    const existing = makeRow()
    const body = {
      site_name: null,
      factors: null,
      parcel_ids: undefined,
      visibility: null,
    } as unknown as SurveyUpsertBody
    expect(classifySameVersionContent(body, existing, ["12345AB0042"])).toBe("identical")
    expect(classifySameVersionContent({}, existing, ["12345AB0042"])).toBe("identical")
  })
})

describe("parseParcelIdentifier (12.2-19: a parcel registered by its IGN identifier)", () => {
  test("an IDU gives its commune, section and number", () => {
    expect(parseParcelIdentifier("94080000AB0012")).toEqual({
      communeCode: "94080",
      section: "AB",
      number: "0012",
    })
    expect(parseParcelIdentifier(" 75112000ce0001 ")).toEqual({
      communeCode: "75112",
      section: "CE",
      number: "0001",
    })
  })

  test("a one-letter section keeps its letter only, as the WFS features do", () => {
    expect(parseParcelIdentifier("940800000A0012")).toEqual({
      communeCode: "94080",
      section: "A",
      number: "0012",
    })
  })

  test("its key is the key of the WFS feature of the same parcel", () => {
    // parseWfsFeatures keys a feature by code_insee, section and numero, normalised like this.
    for (const [idu, props] of [
      ["94080000AB0012", { code_insee: "94080", section: "AB", numero: "12" }],
      ["94080000OA0007", { code_insee: "94080", section: "OA", numero: "7" }],
      ["751120000C0450", { code_insee: "75112", section: "0C", numero: "450" }],
    ] as const) {
      const parsed = parseParcelIdentifier(idu)
      expect(buildParcelKey(parsed.communeCode, parsed.section, parsed.number)).toBe(
        buildParcelKey(
          normalizeParcelPartToDigits(props.code_insee, 5)!,
          normalizeParcelSection(props.section)!,
          normalizeParcelPartToDigits(props.numero, 4)!,
        ),
      )
    }
  })

  test("the short form and unknown ids keep their earlier result", () => {
    expect(parseParcelIdentifier("75104ae3")).toEqual({
      communeCode: "75104",
      section: "AE",
      number: "0003",
    })
    expect(parseParcelIdentifier("75104B12")).toEqual({
      communeCode: "75104",
      section: "BA",
      number: "0012",
    })
    for (const unknown of ["bad", "", "94080000000012", "9408000AB0012"]) {
      expect(parseParcelIdentifier(unknown)).toEqual({
        communeCode: "00000",
        section: "AA",
        number: "0000",
      })
    }
  })
})

describe("cadastral sections, lettered and numbered (Alsace-Moselle)", () => {
  test("a lettered section keeps its letters only, as before", () => {
    expect(normalizeParcelSection("0A")).toBe("A")
    expect(normalizeParcelSection("ab")).toBe("AB")
    expect(normalizeParcelSection(" 0c ")).toBe("C")
    expect(normalizeParcelSection("ABCD")).toBe("ABC")
  })

  test("a numbered section keeps two digits and never collides with a lettered one", () => {
    expect(normalizeParcelSection("09")).toBe("09")
    expect(normalizeParcelSection("22")).toBe("22")
    expect(normalizeParcelSection("9")).toBe("09")
    expect(normalizeParcelSection(9)).toBe("09")
    expect(normalizeParcelSection("A")).not.toBe(normalizeParcelSection("01"))
  })

  test("no section, or an all-zero one, is none", () => {
    for (const value of ["", "  ", "00", "0", null, undefined, {}]) {
      expect(normalizeParcelSection(value)).toBeNull()
    }
  })

  test("API Carto is always asked for two characters", () => {
    expect(apiCartoSection("A")).toBe("0A")
    expect(apiCartoSection("AB")).toBe("AB")
    expect(apiCartoSection("09")).toBe("09")
  })

  test("an Alsace-Moselle IDU gives its numbered section", () => {
    expect(parseParcelIdentifier("67392000090001")).toEqual({
      communeCode: "67392",
      section: "09",
      number: "0001",
    })
    expect(parseParcelIdu("57250000220220")).toEqual({
      communeCode: "57250",
      section: "22",
      number: "0220",
    })
    expect(parseParcelIdu("675350000C0109")).toEqual({
      communeCode: "67535",
      section: "C",
      number: "0109",
    })
    expect(parseParcelIdu("94080000000012")).toBeNull()
    expect(parseParcelIdu("75104AE3")).toBeNull()
  })
})

describe("Paris, Lyon and Marseille arrondissements", () => {
  test("an arrondissement code gives its city and code_arr", () => {
    expect(arrondissementCity("75112")).toEqual({ city: "75056", codeArr: "112" })
    expect(arrondissementCity("75101")).toEqual({ city: "75056", codeArr: "101" })
    expect(arrondissementCity("75120")).toEqual({ city: "75056", codeArr: "120" })
    expect(arrondissementCity("69381")).toEqual({ city: "69123", codeArr: "381" })
    expect(arrondissementCity("69389")).toEqual({ city: "69123", codeArr: "389" })
    expect(arrondissementCity("13201")).toEqual({ city: "13055", codeArr: "201" })
    expect(arrondissementCity("13216")).toEqual({ city: "13055", codeArr: "216" })
    for (const other of ["75056", "75121", "69123", "69390", "13055", "13217", "94080", "2A004"]) {
      expect(arrondissementCity(other)).toBeNull()
    }
  })

  test("a feature's commune is its IDU's, else code_dep + code_arr, else code_insee", () => {
    expect(featureCommuneCode({ idu: "75112000BL0010", code_insee: "75056" })).toBe("75112")
    expect(featureCommuneCode({ idu: "132018010B0128", code_insee: "13055" })).toBe("13201")
    expect(featureCommuneCode({ code_dep: "69", code_arr: "381", code_insee: "69123" })).toBe(
      "69381",
    )
    expect(featureCommuneCode({ code_dep: "77", code_arr: "000", code_insee: "77186" })).toBe(
      "77186",
    )
    expect(featureCommuneCode({ code_insee: "94080" })).toBe("94080")
    expect(featureCommuneCode({})).toBeNull()
  })
})

describe("one key for a parcel, registered by id and drawn from the IGN", () => {
  // WFS properties as the IGN Parcellaire Express returns them (checked 2026-10-08).
  const cases: Array<[string, Record<string, unknown>]> = [
    [
      "771860000K0311",
      {
        idu: "771860000K0311",
        code_dep: "77",
        code_com: "186",
        code_arr: "000",
        code_insee: "77186",
        section: "0K",
        numero: "0311",
      },
    ],
    [
      "67392000090001",
      {
        idu: "67392000090001",
        code_dep: "67",
        code_com: "392",
        code_arr: "000",
        code_insee: "67392",
        section: "09",
        numero: "0001",
      },
    ],
    [
      "75112000BL0010",
      {
        idu: "75112000BL0010",
        code_dep: "75",
        code_com: "056",
        code_arr: "112",
        code_insee: "75056",
        section: "BL",
        numero: "0010",
      },
    ],
    [
      "69381000AR0166",
      {
        idu: "69381000AR0166",
        code_dep: "69",
        code_com: "123",
        code_arr: "381",
        code_insee: "69123",
        section: "AR",
        numero: "0166",
      },
    ],
    [
      "132018010B0128",
      {
        idu: "132018010B0128",
        code_dep: "13",
        code_com: "055",
        code_arr: "201",
        code_insee: "13055",
        section: "0B",
        numero: "0128",
      },
    ],
  ]

  test.each(cases)("%s", (parcelId, properties) => {
    const registered = parseParcelIdentifier(parcelId)
    const drawn = parseWfsParcelProperties(properties)
    expect(drawn?.parcel_id).toBe(parcelId)
    expect(buildParcelKey(registered.communeCode, registered.section, registered.number)).toBe(
      buildParcelKey(drawn!.commune_code, drawn!.section, drawn!.number),
    )
  })

  test("a feature without an IDU keeps its properties, arrondissement included", () => {
    expect(
      parseWfsParcelProperties({
        code_dep: "75",
        code_arr: "112",
        code_insee: "75056",
        section: "BL",
        numero: "10",
      }),
    ).toEqual({ parcel_id: "75112BL0010", commune_code: "75112", section: "BL", number: "0010" })
    expect(parseWfsParcelProperties({ code_insee: "67392", section: "09", numero: "1" })).toEqual({
      parcel_id: "6739209" + "0001",
      commune_code: "67392",
      section: "09",
      number: "0001",
    })
    expect(parseWfsParcelProperties({ code_insee: "67392", section: "00", numero: "1" })).toBeNull()
  })
})
