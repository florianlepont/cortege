import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { Throttle } from "@nestjs/throttler"
import { AuthGuard } from "../auth/auth.guard"
import { AuthenticatedUser } from "../auth/auth.types"
import { CurrentUser } from "../auth/current-user.decorator"
import { SEARCH_THROTTLE } from "../common/rate-limit.config"
import {
  SearchCommunityQueryDto,
  SearchParcelsQueryDto,
  SearchPlacesQueryDto,
} from "./dtos/search-query.dto"
import { GeocoderService } from "./geocoder.service"
import { ParcelSearchService } from "./parcel-search.service"
import { SearchService } from "./search.service"

/** Default and highest number of places answered by `GET /v1/search/places`. */
const PLACES_DEFAULT_LIMIT = 10

/**
 * The global search (phase 25), one endpoint per group so each group loads, fails and is limited
 * on its own (D-15). The handlers only delegate: the rules live in the services.
 */
@Controller("search")
@UseGuards(AuthGuard)
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly geocoder: GeocoderService,
    private readonly parcelSearch: ParcelSearchService,
  ) {}

  @Get("community")
  @Throttle(SEARCH_THROTTLE)
  async community(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchCommunityQueryDto) {
    return this.search.community({ q: query.q, author: query.author, limit: query.limit }, user.id)
  }

  @Get("places")
  @Throttle(SEARCH_THROTTLE)
  async places(@Query() query: SearchPlacesQueryDto) {
    return this.geocoder.searchPlaces(query.q, query.limit ?? PLACES_DEFAULT_LIMIT)
  }

  @Get("parcels")
  @Throttle(SEARCH_THROTTLE)
  async parcels(@Query() query: SearchParcelsQueryDto) {
    return this.parcelSearch.search(query.q)
  }
}
