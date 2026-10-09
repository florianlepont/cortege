import { useMemo } from "react"
import type {
  SearchCommunityResponse,
  SearchParcelsResponse,
  SearchPlacesResponse,
} from "@cortege/ibp-domain"
import { searchCommunity, searchParcels, searchPlaces } from "../api/ibp-api"
import {
  COMMUNITY_RESULT_LIMIT,
  PLACES_MIN_LENGTH,
  PLACES_RESULT_LIMIT,
  groupOrder,
  isSearchActive,
  looksLikeParcelQuery,
  matchOwnSurveys,
  pickBestResult,
} from "../app/global-search"
import type { BestResult, SearchGroupKey } from "../app/global-search"
import { normalizeSearchQuery } from "../app/search-text"
import type { LocalSurvey } from "../storage/types"
import { useIsOffline } from "./useIsOffline"
import { useSearchGroup } from "./useSearchGroup"
import type { SearchGroupState, SearchGroupStatus } from "./useSearchGroup"

type Params = {
  query: string
  /** The member's own surveys, passed in: this hook never reads or writes the surveys context. */
  surveys: readonly LocalSurvey[]
  apiUrl: string
  accessToken: string | null
  /** Request a changed text at once (a tapped recent search, the full-list page). */
  immediate?: boolean
}

export type GlobalSearch = {
  normalized: string
  /** True once the text is long enough to search. */
  active: boolean
  offline: boolean
  mine: LocalSurvey[]
  community: SearchGroupState<SearchCommunityResponse>
  places: SearchGroupState<SearchPlacesResponse>
  parcels: SearchGroupState<SearchParcelsResponse>
  /** The Parcelles group is on screen (parcel-looking text online, any search offline, U-09). */
  parcelsShown: boolean
  best: BestResult | null
  order: SearchGroupKey[]
  /** A network group is waiting for the pause or loading: the field spinner shows. */
  busy: boolean
  settled: boolean
  resultCount: number
}

const EMPTY_PLACES: SearchPlacesResponse = { items: [] }

const isBusy = (status: SearchGroupStatus) => status === "waiting" || status === "loading"

/**
 * The four groups of the global search for one query (D-02, D-10, D-14, U-09): the member's own
 * surveys matched on every keystroke from local data, and the community, places and parcels
 * groups, each requested, failed and retried on its own. The best result and the group order come
 * from the pure rules of `app/global-search`.
 */
export function useGlobalSearch({
  query,
  surveys,
  apiUrl,
  accessToken,
  immediate,
}: Params): GlobalSearch {
  const normalized = normalizeSearchQuery(query)
  const active = isSearchActive(query)
  const offline = useIsOffline()
  const networked = active && accessToken !== null
  const token = accessToken ?? ""
  const parcelsShown = active && (offline || looksLikeParcelQuery(normalized))

  const mine = useMemo(() => matchOwnSurveys(surveys, normalized), [surveys, normalized])

  const community = useSearchGroup<SearchCommunityResponse>({
    query: normalized,
    enabled: networked,
    offline,
    immediate,
    fetcher: (text) => searchCommunity(apiUrl, token, { q: text, limit: COMMUNITY_RESULT_LIMIT }),
  })
  const places = useSearchGroup<SearchPlacesResponse>({
    query: normalized,
    enabled: networked,
    offline,
    immediate,
    // The geocoder refuses short text: no call, an empty group (the Lieux group disappears).
    fetcher: (text) =>
      text.length < PLACES_MIN_LENGTH
        ? Promise.resolve(EMPTY_PLACES)
        : searchPlaces(apiUrl, token, { q: text, limit: PLACES_RESULT_LIMIT }),
  })
  const parcels = useSearchGroup<SearchParcelsResponse>({
    query: normalized,
    enabled: networked && parcelsShown,
    offline,
    immediate,
    fetcher: (text) => searchParcels(apiUrl, token, { q: text }),
  })

  const members = community.data?.members
  const communitySurveys = community.data?.surveys
  const placeItems = places.data?.items
  const parcelItems = parcels.data?.items

  const best = useMemo(
    () =>
      pickBestResult({
        query: normalized,
        parcels: parcelItems ?? [],
        members: members ?? [],
        places: placeItems ?? [],
        mine,
        community: communitySurveys ?? [],
      }),
    [normalized, parcelItems, members, placeItems, mine, communitySurveys],
  )
  const order = useMemo(() => groupOrder(best?.kind === "parcel"), [best])

  const busy = isBusy(community.status) || isBusy(places.status) || isBusy(parcels.status)
  const resultCount =
    mine.length +
    (members?.length ?? 0) +
    (communitySurveys?.length ?? 0) +
    (placeItems?.length ?? 0) +
    (parcelItems?.length ?? 0)

  return {
    normalized,
    active,
    offline,
    mine,
    community,
    places,
    parcels,
    parcelsShown,
    best,
    order,
    busy,
    settled: !busy,
    resultCount,
  }
}
