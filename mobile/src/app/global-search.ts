import type {
  CommunitySurveyItem,
  SearchMemberItem,
  SearchParcelItem,
  SearchPlaceItem,
} from "@cortege/ibp-domain"
import type { LocalSurvey } from "../storage/types"
import { foldSearchText, normalizeSearchQuery } from "./search-text"

// Pure rules of the global search (phase 25: D-02, D-03, D-13, D-14). No React, no I/O, no
// user-facing text: the screens and hooks take their decisions from here.

export type SearchGroupKey = "mine" | "community" | "places" | "parcels"

/** Characters needed before any search runs. */
export const SEARCH_MIN_LENGTH = 2
/** Characters needed before the places group runs: the IGN geocoder refuses shorter text. */
export const PLACES_MIN_LENGTH = 3
/** Rows a group summary shows before "Voir les N". */
export const SUMMARY_ROW_COUNT = 3
/** Lowest provider score for a place to become the best result. */
export const PLACE_CONFIDENCE_MIN = 0.85
/** Community surveys requested at most (the API caps the endpoint at 50). */
export const COMMUNITY_RESULT_LIMIT = 50
/** Places requested at most. */
export const PLACES_RESULT_LIMIT = 10
/** Parcels requested at most. */
export const PARCELS_RESULT_LIMIT = 10

/** True once the trimmed query is long enough to search. */
export function isSearchActive(query: string): boolean {
  return normalizeSearchQuery(query).length >= SEARCH_MIN_LENGTH
}

/**
 * The member's own surveys whose name contains the query, ignoring case and accents, in input
 * order (D-03). Only the survey name is compared: never its id, status or sync error text.
 */
export function matchOwnSurveys(surveys: readonly LocalSurvey[], query: string): LocalSurvey[] {
  const normalized = normalizeSearchQuery(query)
  if (normalized.length < SEARCH_MIN_LENGTH) return []
  const needle = foldSearchText(normalized)
  return surveys.filter((survey) => foldSearchText(survey.site_name).includes(needle))
}

const COMPACT_IDU = /^\d{5}[0-9A-Z]{3}[0-9A-Z]{2}\d{4}$/
const COMPACT_SHORT = /^\d{5}[A-Z]{1,2}\d{1,4}$/
const LETTER_TOKEN = /^[A-Z]{1,2}$/

/**
 * Coarse and over-inclusive gate deciding whether the parcels endpoint is worth calling: a digit
 * and a token of one or two letters, or a compact IDU-like run. The server decides what really is
 * a parcel (D-13).
 */
export function looksLikeParcelQuery(query: string): boolean {
  const upper = foldSearchText(normalizeSearchQuery(query)).toUpperCase()
  if (!/\d/.test(upper)) return false
  return upper
    .split(" ")
    .some(
      (token) => LETTER_TOKEN.test(token) || COMPACT_IDU.test(token) || COMPACT_SHORT.test(token),
    )
}

/**
 * True when the query matches the member's display name by whole-word prefix ("dup" and "marie"
 * match "Marie Dupont", "marie" matches "Anne-Marie Roy" but not "Rosemarie"). Hyphens and
 * apostrophes are word breaks.
 */
export function memberMatches(displayName: string, query: string): boolean {
  const needle = foldSearchText(normalizeSearchQuery(query))
  if (needle.length === 0) return false
  const name = foldSearchText(displayName).replace(/[-'’]/g, " ")
  return name.startsWith(needle) || name.includes(` ${needle}`)
}

export type BestResult =
  | { kind: "parcel"; item: SearchParcelItem }
  | { kind: "member"; item: SearchMemberItem }
  | { kind: "place"; item: SearchPlaceItem }
  | { kind: "mine"; survey: LocalSurvey }
  | { kind: "community"; item: CommunitySurveyItem }

export type BestResultInput = {
  query: string
  parcels: readonly SearchParcelItem[]
  members: readonly SearchMemberItem[]
  places: readonly SearchPlaceItem[]
  mine: readonly LocalSurvey[]
  community: readonly CommunitySurveyItem[]
}

/**
 * The best result, first match wins (D-14): a parcel found, a member whose name matches the query
 * by whole-word prefix, a place scoring at least 0.85 that is a municipality or a point of
 * interest, the first own survey, the first community survey. Null when nothing qualifies.
 */
export function pickBestResult(input: BestResultInput): BestResult | null {
  const parcel = input.parcels[0]
  if (parcel) return { kind: "parcel", item: parcel }
  const matchingMember = input.members.find((item) => memberMatches(item.author_name, input.query))
  if (matchingMember) return { kind: "member", item: matchingMember }
  const strongPlace = input.places.find(
    (item) =>
      item.score >= PLACE_CONFIDENCE_MIN && (item.kind === "municipality" || item.kind === "other"),
  )
  if (strongPlace) return { kind: "place", item: strongPlace }
  const own = input.mine[0]
  if (own) return { kind: "mine", survey: own }
  const community = input.community[0]
  if (community) return { kind: "community", item: community }
  return null
}

const GROUP_ORDER: readonly SearchGroupKey[] = ["mine", "community", "places", "parcels"]

/** The four groups in their fixed order, Parcelles first when the best result is a parcel. */
export function groupOrder(parcelFirst: boolean): SearchGroupKey[] {
  if (!parcelFirst) return [...GROUP_ORDER]
  return ["parcels", ...GROUP_ORDER.filter((key) => key !== "parcels")]
}

/** True when a list reached its request limit, so more results may exist on the server. */
export function isCapped(count: number, limit: number): boolean {
  return count >= limit
}

export type Summary<T> = { rows: T[]; total: number; hasMore: boolean }

/**
 * The rows a group summary draws: at most `limit`, never the promoted item (compared by
 * identity). `total` counts every item; `hasMore` is true when rows remain beyond those drawn.
 */
export function summaryRows<T>(
  items: readonly T[],
  promoted: T | null,
  limit: number = SUMMARY_ROW_COUNT,
): Summary<T> {
  const candidates = items.filter((item) => item !== promoted)
  const rows = candidates.slice(0, limit)
  return { rows, total: items.length, hasMore: candidates.length > rows.length }
}

export type CommunityRow =
  | { kind: "member"; item: SearchMemberItem }
  | { kind: "community"; item: CommunitySurveyItem }

export type CommunitySummary = Summary<CommunityRow> & { capped: boolean }

/**
 * The Communauté summary: the first member not promoted, then surveys not promoted, at most three
 * rows. `capped` tells the survey list reached the request limit.
 */
export function communitySummary(
  members: readonly SearchMemberItem[],
  surveys: readonly CommunitySurveyItem[],
  best: BestResult | null,
): CommunitySummary {
  const promotedMember = best?.kind === "member" ? best.item : null
  const promotedSurvey = best?.kind === "community" ? best.item : null
  const otherMembers = members.filter((item) => item !== promotedMember)
  const otherSurveys = surveys.filter((item) => item !== promotedSurvey)
  const candidates: CommunityRow[] = [
    ...otherMembers.slice(0, 1).map((item): CommunityRow => ({ kind: "member", item })),
    ...otherSurveys.map((item): CommunityRow => ({ kind: "community", item })),
  ]
  const rows = candidates.slice(0, SUMMARY_ROW_COUNT)
  return {
    rows,
    total: members.length + surveys.length,
    hasMore: otherMembers.length + otherSurveys.length > rows.length,
    capped: isCapped(surveys.length, COMMUNITY_RESULT_LIMIT),
  }
}
