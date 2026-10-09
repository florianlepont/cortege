import { PUBLIC_SURVEY_PREDICATE, toCommunitySurveyItem } from "../src/surveys/public-map.queries"
import {
  buildSearchCommunitySurveysQuery,
  buildSearchMembersQuery,
  SEARCH_COMMUNITY_DEFAULT_LIMIT,
  SEARCH_COMMUNITY_MAX_LIMIT,
  SEARCH_MEMBERS_LIMIT,
} from "../src/surveys/search.queries"

function flat(sql: string): string {
  return sql.replace(/\s+/g, " ").trim()
}

describe("search limits", () => {
  it("keeps the documented defaults", () => {
    expect(SEARCH_COMMUNITY_DEFAULT_LIMIT).toBe(30)
    expect(SEARCH_COMMUNITY_MAX_LIMIT).toBe(50)
    expect(SEARCH_MEMBERS_LIMIT).toBe(5)
  })
})

describe("buildSearchCommunitySurveysQuery", () => {
  it("matches the survey name or the author with one escaped, accent-folded pattern", () => {
    const query = buildSearchCommunitySurveysQuery({
      q: "50%_x",
      author: null,
      excludeUserId: "u1",
      limit: 30,
    })
    const sql = flat(query.text)
    expect(sql).toContain("unaccent(s.site_name) ILIKE unaccent($1)")
    expect(sql).toContain("unaccent(u.display_name) ILIKE unaccent($1)")
    expect(sql).toContain(PUBLIC_SURVEY_PREDICATE)
    expect(sql).toContain("s.submitted_at IS NOT NULL")
    expect(sql).toContain("s.user_id IS DISTINCT FROM $2")
    expect(sql).toContain("LEFT JOIN users u ON u.id = s.user_id")
    expect(sql).toContain("ORDER BY s.submitted_at DESC LIMIT $3")
    expect(query.values).toEqual(["%50\\%\\_x%", "u1", 30])
  })

  it("escapes a backslash so it is taken literally", () => {
    const query = buildSearchCommunitySurveysQuery({
      q: "a\\b",
      author: null,
      excludeUserId: "u1",
      limit: 5,
    })
    expect(query.values[0]).toBe("%a\\\\b%")
  })

  it("narrows to one author by exact display name, without any ILIKE", () => {
    const query = buildSearchCommunitySurveysQuery({
      q: "ignored",
      author: "Marie Dupont",
      excludeUserId: "u1",
      limit: 30,
    })
    const sql = flat(query.text)
    expect(sql).toContain("lower(unaccent(u.display_name)) = lower(unaccent($1))")
    expect(sql).not.toContain("ILIKE")
    expect(sql).toContain("s.user_id IS DISTINCT FROM $2")
    expect(sql).toContain("LIMIT $3")
    expect(query.values).toEqual(["Marie Dupont", "u1", 30])
  })

  it("never interpolates a user value into the SQL text", () => {
    const query = buildSearchCommunitySurveysQuery({
      q: "'; DROP TABLE surveys; --",
      author: null,
      excludeUserId: "u1",
      limit: 30,
    })
    expect(query.text).not.toContain("DROP TABLE")
    expect(query.values[0]).toBe("%'; DROP TABLE surveys; --%")
    const byAuthor = buildSearchCommunitySurveysQuery({
      q: "x",
      author: "o'brien",
      excludeUserId: "u1",
      limit: 30,
    })
    expect(byAuthor.text).not.toContain("brien")
  })
})

describe("buildSearchMembersQuery", () => {
  it("groups the matching members by display name, caller excluded, ids never selected", () => {
    const query = buildSearchMembersQuery({ q: "mar", excludeUserId: "u1", limit: 5 })
    const sql = flat(query.text)
    expect(sql).toContain("INNER JOIN users u ON u.id = s.user_id")
    expect(sql).toContain("u.display_name <> ''")
    expect(sql).toContain("unaccent(u.display_name) ILIKE unaccent($1)")
    expect(sql).toContain("u.id <> $2")
    expect(sql).toContain("GROUP BY u.display_name")
    expect(sql).toContain("COUNT(*)::int AS survey_count")
    expect(sql).toContain("ORDER BY survey_count DESC, u.display_name LIMIT $3")
    expect(sql).toContain(PUBLIC_SURVEY_PREDICATE)
    expect(sql).toContain("s.submitted_at IS NOT NULL")
    expect(sql).not.toMatch(/u\.(id|email|first_name|last_name)\s*(,|AS|FROM)/)
    expect(sql.split("FROM")[0]).not.toContain("email")
    expect(query.values).toEqual(["%mar%", "u1", 5])
  })

  it("escapes the LIKE wildcards of the name", () => {
    const query = buildSearchMembersQuery({ q: "100%", excludeUserId: "u1", limit: 5 })
    expect(query.values).toEqual(["%100\\%%", "u1", 5])
  })
})

describe("toCommunitySurveyItem", () => {
  const row = {
    id: "s-1",
    site_name: "Forêt de Bercé",
    ibp_method_version: "cnpf_ibp_fr_v3_2_2026-02-02",
    scores: { ibp_total: 34 },
    submitted_at: "2026-09-28 09:41:00+00",
    author_name: "Camille",
  }

  it("maps the row to the wire shape", () => {
    expect(toCommunitySurveyItem(row)).toEqual({
      survey_id: "s-1",
      site_name: "Forêt de Bercé",
      author_name: "Camille",
      submitted_at: "2026-09-28 09:41:00+00",
      ibp_total: 34,
      ibp_method_version: "cnpf_ibp_fr_v3_2_2026-02-02",
    })
  })

  it("gives a zero score when missing and keeps a null author and method", () => {
    expect(
      toCommunitySurveyItem({ ...row, scores: {}, author_name: null, ibp_method_version: null }),
    ).toMatchObject({ ibp_total: 0, author_name: null, ibp_method_version: null })
  })
})
