// SQL of the community group of the global search (phase 25, D-04, D-16, D-17): finished surveys
// of the other members, and the members themselves. Same inclusion rule as the map
// (PUBLIC_SURVEY_PREDICATE plus a submission date). Every user value is a bound parameter, and the
// match folds case and accents on both sides with unaccent (migration 022).

import { escapeLikePattern, PUBLIC_SURVEY_PREDICATE } from "./public-map.queries"

/** Surveys per /search/community answer when `limit` is not given. */
export const SEARCH_COMMUNITY_DEFAULT_LIMIT = 30

/** Largest `limit` accepted for the community surveys. */
export const SEARCH_COMMUNITY_MAX_LIMIT = 50

/** Members per /search/community answer. */
export const SEARCH_MEMBERS_LIMIT = 5

/**
 * The finished surveys of members other than the caller, newest first. With `q`: those whose
 * survey name or author display name contains the text. With `author`: those whose author's display
 * name is exactly that name (case and accent insensitive), and `q` is ignored. The author is a LEFT
 * JOIN because an account deletion anonymises the survey (user_id becomes NULL, migration 012):
 * `IS DISTINCT FROM` keeps those surveys visible while excluding the caller's own.
 */
export function buildSearchCommunitySurveysQuery(input: {
  q: string
  author: string | null
  excludeUserId: string
  limit: number
}): { text: string; values: unknown[] } {
  const values: unknown[] = []
  const conditions: string[] = [PUBLIC_SURVEY_PREDICATE, `s.submitted_at IS NOT NULL`]
  if (input.author) {
    values.push(input.author)
    conditions.push(`lower(unaccent(u.display_name)) = lower(unaccent($${values.length}))`)
  } else {
    values.push(`%${escapeLikePattern(input.q)}%`)
    conditions.push(
      `(unaccent(s.site_name) ILIKE unaccent($${values.length})` +
        ` OR unaccent(u.display_name) ILIKE unaccent($${values.length}))`,
    )
  }
  values.push(input.excludeUserId)
  conditions.push(`s.user_id IS DISTINCT FROM $${values.length}`)
  values.push(input.limit)
  const text = `SELECT
   s.id,
   s.site_name,
   s.ibp_method_version,
   s.scores,
   s.submitted_at::text,
   u.display_name AS author_name
 FROM surveys s
 LEFT JOIN users u
   ON u.id = s.user_id
 WHERE ${conditions.join("\n   AND ")}
 ORDER BY s.submitted_at DESC
 LIMIT $${values.length}`
  return { text, values }
}

/**
 * Members whose display name contains the text, one row per display name with the number of their
 * finished surveys (no id, email or first/last name is selected, D-17). Inner joins: a member
 * without a finished survey, an anonymised survey and an empty name never appear. The caller is
 * excluded.
 */
export function buildSearchMembersQuery(input: {
  q: string
  excludeUserId: string
  limit: number
}): { text: string; values: unknown[] } {
  const values: unknown[] = [`%${escapeLikePattern(input.q)}%`, input.excludeUserId, input.limit]
  const text = `SELECT
   u.display_name AS author_name,
   COUNT(*)::int AS survey_count
 FROM surveys s
 INNER JOIN users u
   ON u.id = s.user_id
 WHERE ${PUBLIC_SURVEY_PREDICATE}
   AND s.submitted_at IS NOT NULL
   AND u.display_name <> ''
   AND unaccent(u.display_name) ILIKE unaccent($1)
   AND u.id <> $2
 GROUP BY u.display_name
 ORDER BY survey_count DESC, u.display_name
 LIMIT $3`
  return { text, values }
}
