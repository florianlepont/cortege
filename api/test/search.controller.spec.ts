import { AuthGuard } from "../src/auth/auth.guard"
import type { AuthenticatedUser } from "../src/auth/auth.types"
import { SEARCH_THROTTLE } from "../src/common/rate-limit.config"
import { GeocoderService } from "../src/surveys/geocoder.service"
import { ParcelSearchService } from "../src/surveys/parcel-search.service"
import { SearchController } from "../src/surveys/search.controller"
import { SearchService } from "../src/surveys/search.service"

// The controller only delegates: each route reaches its service with the validated query, and the
// community route also gets the caller's id so the caller's own data is left out.
describe("SearchController", () => {
  const user = { id: "user-1" } as AuthenticatedUser

  function setup() {
    const search = { community: jest.fn().mockResolvedValue("community") }
    const geocoder = { searchPlaces: jest.fn().mockResolvedValue("places") }
    const parcelSearch = { search: jest.fn().mockResolvedValue("parcels") }
    const controller = new SearchController(
      search as unknown as SearchService,
      geocoder as unknown as GeocoderService,
      parcelSearch as unknown as ParcelSearchService,
    )
    return { controller, search, geocoder, parcelSearch }
  }

  it("delegates the community search with the caller id", async () => {
    const { controller, search } = setup()
    await expect(
      controller.community(user, { q: "Marie", author: undefined, limit: 50 }),
    ).resolves.toBe("community")
    expect(search.community).toHaveBeenCalledWith(
      { q: "Marie", author: undefined, limit: 50 },
      "user-1",
    )
  })

  it("passes the author filter through", async () => {
    const { controller, search } = setup()
    await controller.community(user, { q: "bois", author: "Marie Durand", limit: undefined })
    expect(search.community).toHaveBeenCalledWith(
      { q: "bois", author: "Marie Durand", limit: undefined },
      "user-1",
    )
  })

  it("delegates the place search with the default limit of 10", async () => {
    const { controller, geocoder } = setup()
    await expect(controller.places({ q: "Fontainebleau", limit: undefined })).resolves.toBe(
      "places",
    )
    expect(geocoder.searchPlaces).toHaveBeenCalledWith("Fontainebleau", 10)
  })

  it("delegates the place search with the requested limit", async () => {
    const { controller, geocoder } = setup()
    await controller.places({ q: "Fontainebleau", limit: 4 })
    expect(geocoder.searchPlaces).toHaveBeenCalledWith("Fontainebleau", 4)
  })

  it("delegates the parcel search with the raw text", async () => {
    const { controller, parcelSearch } = setup()
    await expect(controller.parcels({ q: "77186 AB 0123" })).resolves.toBe("parcels")
    expect(parcelSearch.search).toHaveBeenCalledWith("77186 AB 0123")
  })

  describe("metadata", () => {
    it("is behind the auth guard", () => {
      expect(Reflect.getMetadata("__guards__", SearchController)).toContain(AuthGuard)
    })

    it.each(["community", "places", "parcels"] as const)(
      "gives %s its own search throttle",
      (handler) => {
        const target = SearchController.prototype[handler]
        expect(Reflect.getMetadata("THROTTLER:TTL" + "default", target)).toBe(
          SEARCH_THROTTLE.default.ttl,
        )
        expect(Reflect.getMetadata("THROTTLER:LIMIT" + "default", target)).toBe(
          SEARCH_THROTTLE.default.limit,
        )
      },
    )

    it("serves the three routes under /search", () => {
      expect(Reflect.getMetadata("path", SearchController)).toBe("search")
      const paths = (["community", "places", "parcels"] as const).map((handler) =>
        Reflect.getMetadata("path", SearchController.prototype[handler]),
      )
      expect(paths).toEqual(["community", "places", "parcels"])
    })
  })
})
