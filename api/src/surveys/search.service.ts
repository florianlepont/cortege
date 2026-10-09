import type { SearchCommunityResponse, SearchMemberItem } from "@cortege/ibp-domain"
import { Injectable } from "@nestjs/common"
import { DatabaseService } from "../database/database.service"
import { CommunitySurveyDbRow, toCommunitySurveyItem } from "./public-map.queries"
import {
  buildSearchCommunitySurveysQuery,
  buildSearchMembersQuery,
  SEARCH_COMMUNITY_DEFAULT_LIMIT,
  SEARCH_COMMUNITY_MAX_LIMIT,
  SEARCH_MEMBERS_LIMIT,
} from "./search.queries"

/** Shortest search text (after trimming) that is answered; shorter ones answer nothing. */
const SEARCH_MIN_LENGTH = 2

type MemberDbRow = {
  author_name: string | null
  survey_count: number | string
}

/**
 * The server side of the global search (phase 25). The community group: finished surveys of the
 * other members and the members themselves (D-04, D-17). This service has no logger on purpose:
 * the search text is never written to a log.
 */
@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Members and finished surveys of members other than `userId` matching `input.q`; with
   * `input.author`, only that author's surveys and no members (UI-SPEC U-11).
   */
  async community(
    input: { q: string; author?: string | null; limit?: number },
    userId: string,
  ): Promise<SearchCommunityResponse> {
    const q = input.q.trim()
    const author = input.author?.trim() || null
    if (!author && q.length < SEARCH_MIN_LENGTH) {
      return { members: [], surveys: [] }
    }
    const limit = Math.min(
      Math.max(input.limit ?? SEARCH_COMMUNITY_DEFAULT_LIMIT, 1),
      SEARCH_COMMUNITY_MAX_LIMIT,
    )
    const surveysQuery = buildSearchCommunitySurveysQuery({
      q,
      author,
      excludeUserId: userId,
      limit,
    })
    const membersQuery = author
      ? null
      : buildSearchMembersQuery({ q, excludeUserId: userId, limit: SEARCH_MEMBERS_LIMIT })

    const [surveys, members] = await Promise.all([
      this.db.query<CommunitySurveyDbRow>(surveysQuery.text, surveysQuery.values),
      membersQuery
        ? this.db.query<MemberDbRow>(membersQuery.text, membersQuery.values)
        : Promise.resolve(null),
    ])

    return {
      members: (members?.rows ?? []).flatMap((row): SearchMemberItem[] => {
        const name = row.author_name?.trim()
        return name ? [{ author_name: name, survey_count: Number(row.survey_count) }] : []
      }),
      surveys: surveys.rows.map(toCommunitySurveyItem),
    }
  }
}
