import { memo, useEffect, useLayoutEffect, useMemo } from "react"
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"
import { useNavigation } from "@react-navigation/native"
import type { CompositeNavigationProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type {
  SearchCommunityResponse,
  SearchParcelItem,
  SearchParcelsResponse,
  SearchPlaceItem,
  SearchPlacesResponse,
} from "@cortege/ibp-domain"
import { searchCommunity, searchParcels, searchPlaces } from "../../api/ibp-api"
import {
  COMMUNITY_RESULT_LIMIT,
  PLACES_MIN_LENGTH,
  PLACES_RESULT_LIMIT,
  isSearchActive,
  matchOwnSurveys,
} from "../../app/global-search"
import { normalizeSearchQuery } from "../../app/search-text"
import { useIsOffline } from "../../hooks/useIsOffline"
import { useSearchGroup } from "../../hooks/useSearchGroup"
import { fr } from "../../i18n"
import { SearchGroupListScreen } from "../../screens/global-search/SearchGroupListScreen"
import type { MineListProps } from "../../screens/global-search/SearchGroupListScreen"
import { parcelFocus, placeFocus } from "../../screens/public-map/focus-region"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { saveSearchRecent } from "../../storage/search-recents"
import { feedback } from "../../ui/feedback"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"
import type { RootTabParamList, SearchGroupRouteProps, SearchStackParamList } from "../types"

type SearchGroupNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<SearchStackParamList, "searchGroup">,
  BottomTabNavigationProp<RootTabParamList>
>

type GroupData = SearchCommunityResponse | SearchPlacesResponse | SearchParcelsResponse

const t = fr.search

/**
 * The full list of one search group (25-12, D-02 "Voir les N", D-04, U-11, U-12), pushed from the
 * search page. "Mes relevés" matches the member's own surveys on the phone through the surveys
 * context, so the chips and the sort of the survey list apply (and are reset when the page closes);
 * the three other groups ask the API for this page's own query, with the loading, offline, error
 * and retry of `useSearchGroup`. A member result lands here as the community list of that author
 * (`memberName`), without any profile page. Every row opens the target it opens in the summary;
 * the query is kept as a recent search and the selection haptic plays. The query lives in the
 * route params, never in a context, and this page never calls the sync orchestrator.
 *
 * 12.2-17: under the native iOS large title the header names the page ("Communauté · 6"); the
 * title is set once the count is known and is the group name before that.
 */
export const SearchGroupRoute = memo(function SearchGroupRoute({ route }: SearchGroupRouteProps) {
  const { group, query, memberName } = route.params
  const navigation = useNavigation<SearchGroupNavigation>()
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()
  const offline = useIsOffline()
  const normalized = normalizeSearchQuery(query)
  const author = memberName?.trim() || undefined

  // The three network groups share one hook call (hooks cannot be conditional): the group decides
  // what is fetched, and "Mes relevés" never is.
  const network = useSearchGroup({
    query: normalized,
    enabled: group !== "mine" && accessToken !== null && isSearchActive(normalized),
    offline,
    immediate: true,
    fetcher: (text): Promise<GroupData> => {
      const token = accessToken ?? ""
      if (group === "community") {
        return searchCommunity(session.apiUrl, token, {
          q: text,
          ...(author ? { author } : {}),
          limit: COMMUNITY_RESULT_LIMIT,
        })
      }
      if (group === "places") {
        // The geocoder refuses short text: no call, an empty list.
        return text.length < PLACES_MIN_LENGTH
          ? Promise.resolve<SearchPlacesResponse>({ items: [] })
          : searchPlaces(session.apiUrl, token, { q: text, limit: PLACES_RESULT_LIMIT })
      }
      return searchParcels(session.apiUrl, token, { q: text })
    },
  })

  const ownRows = useMemo(
    () => (group === "mine" ? matchOwnSurveys(state.visibleSurveys, normalized) : []),
    [group, state.visibleSurveys, normalized],
  )
  // Before the chips: tells "no survey carries this name" from "the chips filter them all out".
  const ownMatchCount = useMemo(
    () => (group === "mine" ? matchOwnSurveys(state.surveys, normalized).length : 0),
    [group, state.surveys, normalized],
  )

  const community = group === "community" ? (network.data as SearchCommunityResponse | null) : null
  const places = group === "places" ? (network.data as SearchPlacesResponse | null) : null
  const parcels = group === "parcels" ? (network.data as SearchParcelsResponse | null) : null

  let count: number | null = null
  if (group === "mine") count = ownRows.length
  else if (community) count = community.surveys.length + (author ? 0 : community.members.length)
  else if (places) count = places.items.length
  else if (parcels) count = parcels.items.length

  const title = count === null ? t.groups[group] : t.list.title({ group: t.groups[group], count })
  useLayoutEffect(() => {
    navigation.setOptions({ title })
  }, [navigation, title])

  // The chips are the list's own filters: they go back to their defaults when the page closes.
  const resetFilters = useLatestCallback(() => actions.resetFilters())
  useEffect(
    () => () => {
      if (group === "mine") resetFilters()
    },
    [group, resetFilters],
  )

  const mine: MineListProps | undefined =
    group === "mine"
      ? {
          surveys: ownRows,
          matchCount: ownMatchCount,
          surveyDetails: state.surveyDetails,
          selectedSurveyId: state.selectedSurveyId,
          statusFilter: state.statusFilter,
          attachmentFilter: state.attachmentFilter,
          sortMode: state.sortMode,
          onStatusFilterChange: actions.setStatusFilter,
          onAttachmentFilterChange: actions.setAttachmentFilter,
          onSortModeChange: actions.setSortMode,
          onDeleteSurvey: actions.confirmDeleteSurvey,
        }
      : undefined

  /** Keeps the list's query as a recent search once a result is opened (U-14). */
  const remember = useLatestCallback(() => {
    void saveSearchRecent(normalized)
  })
  const choose = useLatestCallback(() => {
    feedback.selection()
    remember()
  })

  // The survey row plays the selection haptic itself.
  const onOpenOwn = useLatestCallback((surveyId: string) => {
    remember()
    actions.openSurvey(surveyId)
    navigation.navigate("surveys", { screen: "surveyDetail", initial: false })
  })
  const onOpenCommunity = useLatestCallback((surveyId: string) => {
    choose()
    navigation.navigate("surveys", {
      screen: "communitySurvey",
      params: { surveyId },
      initial: false,
    })
  })
  const onOpenMember = useLatestCallback((name: string) => {
    choose()
    navigation.push("searchGroup", { group: "community", query: name, memberName: name })
  })
  const onOpenPlace = useLatestCallback((item: SearchPlaceItem) => {
    choose()
    navigation.navigate("publicMap", {
      screen: "publicMapHome",
      params: { focus: placeFocus(item, Date.now()) },
    })
  })
  const onOpenParcel = useLatestCallback((item: SearchParcelItem) => {
    choose()
    navigation.navigate("publicMap", {
      screen: "publicMapHome",
      params: { focus: parcelFocus(item, Date.now()) },
    })
  })

  return (
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <SearchGroupListScreen
        group={group}
        query={query}
        memberName={author}
        count={count}
        status={group === "mine" ? "ready" : network.status}
        error={network.error}
        onRetry={network.retry}
        mine={mine}
        community={community}
        places={places?.items}
        parcels={parcels?.items}
        onOpenOwn={onOpenOwn}
        onOpenCommunity={onOpenCommunity}
        onOpenMember={onOpenMember}
        onOpenPlace={onOpenPlace}
        onOpenParcel={onOpenParcel}
      />
    </ScreenFrame>
  )
})
