import { ReactElement, ReactNode, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import type {
  SearchCommunityResponse,
  SearchParcelItem,
  SearchParcelsResponse,
  SearchPlaceItem,
  SearchPlacesResponse,
} from "@cortege/ibp-domain"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import {
  PARCELS_RESULT_LIMIT,
  PLACES_RESULT_LIMIT,
  communitySummary,
  isCapped,
  summaryRows,
} from "../../app/global-search"
import type { BestResult, SearchGroupKey } from "../../app/global-search"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { SurveyDetailResponse } from "../../app/types"
import type { SearchGroupState } from "../../hooks/useSearchGroup"
import { fr } from "../../i18n"
import type { LocalSurvey } from "../../storage/types"
import { AppText as Text } from "../../ui/AppText"
import { ScoreRing } from "../../ui/ScoreRing"
import { CommunityRow } from "../community-survey/CommunityRow"
import { CompactSurveyRow } from "../survey-list/CompactSurveyRow"
import { RowIndicator } from "../survey-list/row-indicator"
import { resolveRowScore } from "../survey-list/row-score"
import { SearchBestResult } from "./SearchBestResult"
import { SearchGroupCard } from "./SearchGroupCard"
import { SearchGroupNotice } from "./SearchGroupNotice"
import type { SearchNoticeGroup } from "./SearchGroupNotice"
import { SearchResultRow } from "./SearchResultRow"
import { bestResultLabels, memberLabels, parcelLabels, placeLabels } from "./result-labels"

const t = fr.search

const NO_RESULT_BODY_MAX_WIDTH = 280

export type SearchResultsProps = {
  /** The trimmed query, for the no-result sentence. */
  normalized: string
  offline: boolean
  /** The member's own surveys that match, from local data. */
  mine: readonly LocalSurvey[]
  community: SearchGroupState<SearchCommunityResponse>
  places: SearchGroupState<SearchPlacesResponse>
  parcels: SearchGroupState<SearchParcelsResponse>
  /** False: the Parcelles group is not drawn at all (U-09). */
  parcelsShown: boolean
  best: BestResult | null
  /** The groups in display order (Parcelles first when the best result is a parcel). */
  order: readonly SearchGroupKey[]
  surveyDetails: Readonly<Record<string, SurveyDetailResponse | undefined>>
  onOpenOwn: (surveyId: string) => void
  onOpenCommunity: (surveyId: string) => void
  onOpenMember: (name: string) => void
  onOpenPlace: (item: SearchPlaceItem) => void
  onOpenParcel: (item: SearchParcelItem) => void
  /** "Voir les N" of a group. */
  onSeeAll: (group: SearchGroupKey) => void
}

const isLoading = (state: SearchGroupState<unknown>) =>
  state.status === "waiting" || state.status === "loading"

/**
 * The line that stands in for the rows of a network group: no connection, a failed request (that
 * group alone re-runs), or the first load. A group that has rows keeps them while it loads again.
 */
function networkNotice(
  group: SearchNoticeGroup,
  state: SearchGroupState<unknown>,
): ReactElement | null {
  if (state.status === "offline") {
    return <SearchGroupNotice key="notice" group={group} variant="offline" />
  }
  if (state.status === "error") {
    return (
      <SearchGroupNotice
        key="notice"
        group={group}
        variant="error"
        error={state.error}
        onRetry={state.retry}
      />
    )
  }
  if (isLoading(state) && state.data === null) {
    return <SearchGroupNotice key="notice" group={group} variant="loading" />
  }
  return null
}

/**
 * The results of an active query (25-11, D-02, D-10, D-11, UI-SPEC section 3): the "Meilleur
 * résultat" card, then the groups in the given order, each at most three slim rows in one glass card
 * with "Voir les N" when more exist. A group without a row and without a notice disappears; the
 * result promoted to the best-result card is not drawn twice. A network group keeps its header
 * with a line for "offline", "error" (with its own "Réessayer") or the first load. When nothing is
 * loading and nothing matched, the no-result block shows above the groups that still have a line.
 * Presentational: the page hands in the `useGlobalSearch` fields and the open handlers.
 */
export function SearchResults({
  normalized,
  offline,
  mine,
  community,
  places,
  parcels,
  parcelsShown,
  best,
  order,
  surveyDetails,
  onOpenOwn,
  onOpenCommunity,
  onOpenMember,
  onOpenPlace,
  onOpenParcel,
  onSeeAll,
}: SearchResultsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const seeAll = (group: SearchGroupKey, count: number, capped: boolean) => ({
    count,
    capped,
    onPress: () => onSeeAll(group),
  })

  const renderMine = (): ReactNode => {
    const summary = summaryRows(mine, best?.kind === "mine" ? best.survey : null)
    if (summary.rows.length === 0) return null
    return (
      <SearchGroupCard
        key="mine"
        group="mine"
        seeAll={summary.hasMore ? seeAll("mine", summary.total, false) : null}
      >
        {summary.rows.map((survey, position) => (
          <CompactSurveyRow
            key={survey.id}
            testID={`search-mine-${survey.id}`}
            survey={survey}
            surveyDetails={surveyDetails}
            index={position}
            onOpen={onOpenOwn}
          />
        ))}
      </SearchGroupCard>
    )
  }

  const renderCommunity = (): ReactNode => {
    const notice = networkNotice("community", community)
    const summary = community.data
      ? communitySummary(community.data.members, community.data.surveys, best)
      : null
    const rows = summary?.rows ?? []
    if (rows.length === 0 && !notice) return null
    return (
      <SearchGroupCard
        key="community"
        group="community"
        seeAll={summary?.hasMore ? seeAll("community", summary.total, summary.capped) : null}
      >
        {notice ??
          rows.map((row, position) => {
            if (row.kind === "community") {
              return (
                <CommunityRow
                  key={row.item.survey_id}
                  density="compact"
                  item={row.item}
                  onOpen={onOpenCommunity}
                />
              )
            }
            const labels = memberLabels(row.item)
            return (
              <SearchResultRow
                key={`member:${row.item.author_name}`}
                kind="member"
                title={labels.title}
                meta={labels.meta}
                accessibilityLabel={labels.accessibilityLabel}
                onPress={() => onOpenMember(row.item.author_name)}
                testID={`search-member-${position}`}
              />
            )
          })}
      </SearchGroupCard>
    )
  }

  const renderPlaces = (): ReactNode => {
    const notice = networkNotice("places", places)
    const items = places.data?.items ?? []
    const summary = summaryRows(items, best?.kind === "place" ? best.item : null)
    if (summary.rows.length === 0 && !notice) return null
    return (
      <SearchGroupCard
        key="places"
        group="places"
        seeAll={
          summary.hasMore
            ? seeAll("places", summary.total, isCapped(summary.total, PLACES_RESULT_LIMIT))
            : null
        }
      >
        {notice ??
          summary.rows.map((item) => {
            const labels = placeLabels(item)
            return (
              <SearchResultRow
                key={item.id}
                kind="place"
                title={labels.title}
                meta={labels.meta}
                accessibilityLabel={labels.accessibilityLabel}
                onPress={() => onOpenPlace(item)}
                testID={`search-place-${item.id}`}
              />
            )
          })}
      </SearchGroupCard>
    )
  }

  const renderParcels = (): ReactNode => {
    if (!parcelsShown) return null
    const notice = networkNotice("parcels", parcels)
    const items = parcels.data?.items ?? []
    const summary = summaryRows(items, best?.kind === "parcel" ? best.item : null)
    if (summary.rows.length === 0 && !notice) return null
    return (
      <SearchGroupCard
        key="parcels"
        group="parcels"
        seeAll={
          summary.hasMore
            ? seeAll("parcels", summary.total, isCapped(summary.total, PARCELS_RESULT_LIMIT))
            : null
        }
      >
        {notice ??
          summary.rows.map((item) => {
            const labels = parcelLabels(item)
            return (
              <SearchResultRow
                key={item.parcel_id}
                kind="parcel"
                title={labels.title}
                meta={labels.meta}
                accessibilityLabel={labels.accessibilityLabel}
                onPress={() => onOpenParcel(item)}
                testID={`search-parcel-${item.parcel_id}`}
              />
            )
          })}
      </SearchGroupCard>
    )
  }

  const renderers: Record<SearchGroupKey, () => ReactNode> = {
    mine: renderMine,
    community: renderCommunity,
    places: renderPlaces,
    parcels: renderParcels,
  }

  const renderBest = (result: BestResult): ReactNode => {
    const labels = bestResultLabels(result)
    switch (result.kind) {
      case "mine":
        return (
          <SearchBestResult
            kind={labels.kind}
            title={labels.title}
            meta={labels.meta}
            onPress={() => onOpenOwn(result.survey.id)}
            trailing={
              <RowIndicator
                surveyId={result.survey.id}
                isSubmitted={result.survey.status === "submitted"}
                score={resolveRowScore(result.survey, surveyDetails)}
                completionRate={result.survey.completion_rate}
                index={0}
              />
            }
          />
        )
      case "community":
        return (
          <SearchBestResult
            kind={labels.kind}
            title={labels.title}
            meta={labels.meta}
            onPress={() => onOpenCommunity(result.item.survey_id)}
            trailing={<ScoreRing score={result.item.ibp_total} />}
          />
        )
      case "member":
        return (
          <SearchBestResult
            kind={labels.kind}
            title={labels.title}
            meta={labels.meta}
            onPress={() => onOpenMember(result.item.author_name)}
          />
        )
      case "place":
        return (
          <SearchBestResult
            kind={labels.kind}
            title={labels.title}
            meta={labels.meta}
            onPress={() => onOpenPlace(result.item)}
          />
        )
      case "parcel":
        return (
          <SearchBestResult
            kind={labels.kind}
            title={labels.title}
            meta={labels.meta}
            onPress={() => onOpenParcel(result.item)}
          />
        )
    }
  }

  // Nothing is left to wait for and nothing matched (D-11). A failed group does not hide the block:
  // its error line is drawn under it.
  const networkStates = parcelsShown ? [community, places, parcels] : [community, places]
  const loading = networkStates.some(isLoading)
  const matched =
    mine.length > 0 ||
    (community.data?.members.length ?? 0) > 0 ||
    (community.data?.surveys.length ?? 0) > 0 ||
    (places.data?.items.length ?? 0) > 0 ||
    (parcelsShown && (parcels.data?.items.length ?? 0) > 0)
  const noResult = !loading && !matched

  return (
    <View style={styles.container} testID="search-results">
      {best ? renderBest(best) : null}
      {noResult ? (
        <View style={styles.noResult} accessibilityLiveRegion="polite" testID="search-no-result">
          <Text style={styles.noResultTitle}>
            {offline ? t.noResult.offlineTitle(normalized) : t.noResult.title(normalized)}
          </Text>
          <Text style={styles.noResultBody}>
            {offline ? t.noResult.offlineBody : t.noResult.body}
          </Text>
        </View>
      ) : null}
      {order.map((key) => renderers[key]())}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: brandSpacing4.md,
      gap: brandSpacing4.smd,
    },
    // 32 pt under the field, which already leaves 12 pt above the scroll area.
    noResult: {
      alignItems: "center",
      paddingTop: brandSpacing4.xl - brandSpacing4.smd,
      gap: brandSpacing4.sm,
    },
    noResultTitle: {
      ...brandTypography.input,
      textAlign: "center",
      color: theme.colors.textPrimary,
    },
    noResultBody: {
      ...brandTypeScale.footnote,
      maxWidth: NO_RESULT_BODY_MAX_WIDTH,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
  })
}
