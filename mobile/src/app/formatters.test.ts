import {
  formatDateTime,
  formatDay,
  formatEventPayload,
  formatPoints,
  formatShortDateTime,
  formatSyncErrorForUser,
  parseTimestamp,
} from "./formatters"
import { fr } from "../i18n"

describe("formatSyncErrorForUser", () => {
  test("returns null when there is no error", () => {
    expect(formatSyncErrorForUser(null)).toBeNull()
    expect(formatSyncErrorForUser("   ", null)).toBeNull()
    expect(formatSyncErrorForUser(undefined, "sync_failed")).toBeNull()
  })

  test("uses the French text of a known error code", () => {
    expect(formatSyncErrorForUser("x", "sync_version_conflict")).toBe(
      fr.syncErrors.byCode.sync_version_conflict,
    )
    expect(formatSyncErrorForUser("HTTP 503 survey-12 failed", "parcel_required")).toBe(
      fr.syncErrors.byCode.parcel_required,
    )
  })

  test("gives every error code the app stores a French text", () => {
    // Client codes: storage/utils.ts deriveSurveyErrorCode/deriveAttachmentErrorCode
    // and storage/sync.ts; server codes: the sync result error.code from the API.
    const codes = [
      "sync_version_conflict",
      "survey_validation_failed",
      "bad_request",
      "unauthorized",
      "forbidden",
      "not_found",
      "rate_limited",
      "transient_upstream_error",
      "network_gateway_error",
      "retry_cap_reached",
      "sync_failed",
      "local_file_missing",
      "attachment_bad_request",
      "attachment_validation_failed",
      "attachment_sync_failed",
      "invalid_local_payload",
      "invalid_attachment_response",
      "submit_validation",
      "submit_failed",
      "invalid_operation",
      "sync_fatal_error",
      "invalid_sync_operation",
      "parcel_required",
      "parcel_invalid",
      "parcel_version_conflict",
      "survey_id_conflict",
      "survey_submitted_read_only",
      "submitted_read_only_fields",
      "attachment_not_uploaded",
      "attachment_size_mismatch",
    ]
    const byCode: Record<string, string> = fr.syncErrors.byCode
    for (const code of codes) {
      expect({ code, text: formatSyncErrorForUser("raw", code) }).toEqual({
        code,
        text: byCode[code],
      })
      expect(byCode[code]).toEqual(expect.any(String))
    }
  })

  test("falls back to the stored text for rows written before error codes", () => {
    expect(formatSyncErrorForUser("HTTP 503", null)).toBe(fr.syncErrors.patterns.network)
    expect(formatSyncErrorForUser("site_name is required")).toBe(
      fr.syncErrors.patterns.siteNameMissing,
    )
    expect(formatSyncErrorForUser("region required", "http_400")).toBe(
      fr.syncErrors.patterns.regionMissing,
    )
    expect(formatSyncErrorForUser("vegetation required")).toBe(
      fr.syncErrors.patterns.vegetationMissing,
    )
    expect(formatSyncErrorForUser("HTTP 422 bad payload")).toBe(fr.syncErrors.patterns.invalidData)
    expect(formatSyncErrorForUser("Unauthorized")).toBe(fr.syncErrors.patterns.session)
  })

  test("returns the generic text for an unknown code with unmatched text", () => {
    expect(formatSyncErrorForUser("something odd", "brand_new_code")).toBe(fr.syncErrors.generic)
  })

  test("ignores inherited object keys used as codes", () => {
    expect(formatSyncErrorForUser("something odd", "toString")).toBe(fr.syncErrors.generic)
  })

  test("never echoes the raw error text", () => {
    const raw = "HTTP 503 for survey 9f1c2d3e-aaaa-bbbb-cccc-123456789abc"
    for (const code of [null, "sync_failed", "brand_new_code"]) {
      const text = formatSyncErrorForUser(raw, code)
      expect(text).not.toContain(raw)
      expect(text).not.toContain("9f1c2d3e")
    }
  })
})

describe("formatPoints", () => {
  test("pluralises from two points", () => {
    expect(formatPoints(1)).toBe("1 point")
    expect(formatPoints(2)).toBe("2 points")
  })
})

describe("formatEventPayload", () => {
  test("is empty without a payload and prints a short one as JSON", () => {
    expect(formatEventPayload(null)).toBe("")
    expect(formatEventPayload(undefined)).toBe("")
    expect(formatEventPayload({ a: 1 })).toBe('{"a":1}')
  })

  test("cuts a long payload to 120 characters", () => {
    const text = formatEventPayload({ note: "x".repeat(200) })
    expect(text).toHaveLength(120)
    expect(text.endsWith("...")).toBe(true)
  })
})

describe("formatDateTime", () => {
  test("reads n/a when empty and keeps an unreadable value as it is", () => {
    expect(formatDateTime(null)).toBe("n/a")
    expect(formatDateTime("not a date")).toBe("not a date")
  })

  test("formats a valid ISO date", () => {
    expect(formatDateTime("2026-03-10T12:00:00.000Z")).not.toBe("n/a")
  })
})

describe("parseTimestamp (OA-112)", () => {
  test("reads the PostgreSQL text the API sends for event dates", () => {
    expect(parseTimestamp("2026-10-06 10:24:20.217289+00").toISOString()).toBe(
      "2026-10-06T10:24:20.217Z",
    )
  })

  test("reads the offset forms PostgreSQL can print", () => {
    expect(parseTimestamp("2026-10-06 12:24:20+02").toISOString()).toBe("2026-10-06T10:24:20.000Z")
    expect(parseTimestamp("2026-10-06 12:24:20.5+0200").toISOString()).toBe(
      "2026-10-06T10:24:20.500Z",
    )
    expect(parseTimestamp("2026-10-06 05:54:20-04:30").toISOString()).toBe(
      "2026-10-06T10:24:20.000Z",
    )
    expect(parseTimestamp("2026-10-06 10:24:20Z").toISOString()).toBe("2026-10-06T10:24:20.000Z")
  })

  test("leaves a standard ISO date to the date parser", () => {
    expect(parseTimestamp("2026-10-06T10:24:20.217Z").toISOString()).toBe(
      "2026-10-06T10:24:20.217Z",
    )
  })

  test("is invalid for text that is not a date", () => {
    expect(Number.isNaN(parseTimestamp("not a date").getTime())).toBe(true)
  })
})

describe("formatShortDateTime (OA-112)", () => {
  test("shows a PostgreSQL timestamp as a readable French date, not the raw text", () => {
    const text = formatShortDateTime("2026-10-06 10:24:20.217289+00")
    expect(text).not.toContain("217289")
    expect(text).not.toContain("+00")
    expect(text).toMatch(/2026/)
  })

  test("reads n/a when empty and keeps an unreadable value as it is", () => {
    expect(formatShortDateTime(null)).toBe("n/a")
    expect(formatShortDateTime("not a date")).toBe("not a date")
  })
})

describe("formatDateTime with a PostgreSQL timestamp (OA-112)", () => {
  test("is not the raw text", () => {
    expect(formatDateTime("2026-10-06 10:24:20.217289+00")).not.toBe(
      "2026-10-06 10:24:20.217289+00",
    )
  })
})

describe("formatDay", () => {
  test("reads the server's timestamp and writes the day in words, long or short", () => {
    expect(formatDay("2026-05-16 10:00:00+00")).toBe("16 mai 2026")
    expect(formatDay("2026-08-22T10:00:00.000Z", "short")).toMatch(/^22 août 2026$/)
  })

  test("an unreadable value comes back unchanged", () => {
    expect(formatDay("pas une date")).toBe("pas une date")
  })
})
