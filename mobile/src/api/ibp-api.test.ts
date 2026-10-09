const mockApiRequest = jest.fn()

jest.mock("./client", () => ({
  ...jest.requireActual("./client"),
  apiRequest: mockApiRequest,
}))

import * as FileSystem from "expo-file-system/legacy"
import { ApiError } from "./client"
import {
  deleteMyAccount,
  deleteMyProfilePicture,
  fetchCommunityAttachmentDownload,
  fetchCommunitySurvey,
  fetchCommunitySurveyAttachments,
  fetchParcelSurveyHistory,
  fetchPublicMapItems,
  fetchPublicParcelStatuses,
  getAttachmentDownloadUrl,
  getMyProfile,
  loadSurveyDetail,
  loadSurveyEvents,
  patchMyProfile,
  resetIbpData,
  resetUserData,
  searchCommunity,
  searchParcels,
  searchPlaces,
  uploadMyProfilePicture,
} from "./ibp-api"

describe("ibp-api", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApiRequest.mockResolvedValue({})
  })

  it("builds authenticated profile and debug requests", async () => {
    await getMyProfile("https://api.example.com", "access-token")
    await patchMyProfile("https://api.example.com", "access-token", {
      first_name: "Flo",
      last_name: "Lepont",
      display_name: "Algernon",
      profile_picture_url: null,
    })
    await deleteMyProfilePicture("https://api.example.com", "access-token")
    await deleteMyAccount("https://api.example.com", "access-token")
    await resetIbpData("https://api.example.com", "access-token")
    await resetUserData("https://api.example.com", "access-token")

    expect(mockApiRequest.mock.calls).toEqual([
      [
        {
          baseUrl: "https://api.example.com",
          path: "/me",
          method: "GET",
          token: "access-token",
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/me",
          method: "PATCH",
          token: "access-token",
          json: {
            first_name: "Flo",
            last_name: "Lepont",
            display_name: "Algernon",
            profile_picture_url: null,
          },
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/me/profile-picture",
          method: "DELETE",
          token: "access-token",
          expectJson: false,
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/me",
          method: "DELETE",
          token: "access-token",
          expectJson: false,
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/debug/reset-ibp-data",
          method: "POST",
          token: "access-token",
          json: {},
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/debug/reset-user-data",
          method: "POST",
          token: "access-token",
          json: {},
        },
      ],
    ])
  })

  it("builds survey detail and events endpoints", async () => {
    await loadSurveyDetail("https://api.example.com", "access-token", "survey-1")
    await loadSurveyEvents("https://api.example.com", "access-token", "survey-1")

    expect(mockApiRequest.mock.calls).toEqual([
      [
        {
          baseUrl: "https://api.example.com",
          path: "/surveys/survey-1",
          method: "GET",
          token: "access-token",
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/surveys/survey-1/events",
          method: "GET",
          token: "access-token",
        },
      ],
    ])
  })

  it("builds an attachment download-url request with encoded ids", async () => {
    await getAttachmentDownloadUrl("https://api.example.com", "access-token", "s 1", "a/1")

    expect(mockApiRequest.mock.calls).toEqual([
      [
        {
          baseUrl: "https://api.example.com",
          path: "/surveys/s%201/attachments/a%2F1/download-url",
          method: "GET",
          token: "access-token",
        },
      ],
    ])
  })

  it("builds the per-group search requests with trimmed, encoded parameters (T-25-20)", async () => {
    const api = "https://api.example.com"
    await searchCommunity(api, "access-token", { q: " Marie D ", limit: 50 })
    await searchCommunity(api, "access-token", { q: "forêt", author: "Marie Dupont" })
    await searchPlaces(api, "access-token", { q: "forêt & co", limit: 10 })
    await searchPlaces(api, "access-token", { q: "Lyon" })
    await searchParcels(api, "access-token", { q: "77186 AB 0123" })

    const paths = mockApiRequest.mock.calls.map(([options]) => options.path)
    expect(paths).toEqual([
      "/search/community?q=Marie%20D&limit=50",
      "/search/community?q=for%C3%AAt&author=Marie%20Dupont",
      "/search/places?q=for%C3%AAt%20%26%20co&limit=10",
      "/search/places?q=Lyon",
      "/search/parcels?q=77186%20AB%200123",
    ])
    for (const [options] of mockApiRequest.mock.calls) {
      expect(options).toMatchObject({ baseUrl: api, method: "GET", token: "access-token" })
    }
  })

  it("returns the typed body of a search request", async () => {
    mockApiRequest.mockResolvedValueOnce({ items: [] })
    await expect(searchParcels("https://api.example.com", "t", { q: "x" })).resolves.toEqual({
      items: [],
    })
  })

  it("builds the community survey page, photo list and photo download requests", async () => {
    await fetchCommunitySurvey("https://api.example.com", "access-token", "s 1")
    await fetchCommunitySurveyAttachments("https://api.example.com", "access-token", "s-1")
    await fetchCommunityAttachmentDownload("https://api.example.com", "access-token", "s-1", "a/1")

    expect(mockApiRequest.mock.calls.map(([call]) => call.path)).toEqual([
      "/public/community-surveys/s%201",
      "/public/community-surveys/s-1/attachments",
      "/public/community-surveys/s-1/attachments/a%2F1/download-url",
    ])
    expect(mockApiRequest.mock.calls.every(([call]) => call.method === "GET")).toBe(true)
  })

  it("builds public map and parcel status queries, authenticated (Phase 2)", async () => {
    await fetchPublicMapItems("https://api.example.com", "access-token", {
      from: "2026-01-01",
      to: "2026-12-31",
      region: "aca",
    })
    await fetchPublicMapItems("https://api.example.com", "access-token")
    await fetchPublicParcelStatuses("https://api.example.com", "access-token", {
      bbox: "1.0,43.0,2.0,44.0",
      zoom: 15.7,
      year: 2026.9,
    })
    await fetchPublicParcelStatuses("https://api.example.com", "access-token", {
      bbox: "1.0,43.0,2.0,44.0",
      zoom: 16,
    })

    expect(mockApiRequest.mock.calls).toEqual([
      [
        {
          baseUrl: "https://api.example.com",
          path: "/public/map-items?from=2026-01-01&to=2026-12-31&region=ACA",
          method: "GET",
          token: "access-token",
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/public/map-items",
          method: "GET",
          token: "access-token",
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/public/parcels/status?bbox=1.0%2C43.0%2C2.0%2C44.0&zoom=16&year=2026",
          method: "GET",
          token: "access-token",
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/public/parcels/status?bbox=1.0%2C43.0%2C2.0%2C44.0&zoom=16",
          method: "GET",
          token: "access-token",
        },
      ],
    ])
  })

  it("adds the bbox to the public map query only when it is given", async () => {
    await fetchPublicMapItems("https://api.example.com", "access-token", { bbox: "1,2,3,4" })
    await fetchPublicMapItems("https://api.example.com", "access-token", {
      bbox: "1,2,3,4",
      region: "ara",
    })
    await fetchPublicMapItems("https://api.example.com", "access-token", { bbox: "   " })

    expect(mockApiRequest.mock.calls.map(([request]) => request.path)).toEqual([
      "/public/map-items?bbox=1%2C2%2C3%2C4",
      "/public/map-items?region=ARA&bbox=1%2C2%2C3%2C4",
      "/public/map-items",
    ])
  })

  it("builds the parcel survey-history request, with and without a limit", async () => {
    await fetchParcelSurveyHistory("https://api.example.com", "access-token", "75056000AB0001")
    await fetchParcelSurveyHistory("https://api.example.com", "access-token", "75056000AB0001", 10)

    expect(mockApiRequest.mock.calls).toEqual([
      [
        {
          baseUrl: "https://api.example.com",
          path: "/parcels/75056000AB0001/surveys/history",
          method: "GET",
          token: "access-token",
        },
      ],
      [
        {
          baseUrl: "https://api.example.com",
          path: "/parcels/75056000AB0001/surveys/history?limit=10",
          method: "GET",
          token: "access-token",
        },
      ],
    ])
  })

  describe("uploadMyProfilePicture (OA-76)", () => {
    const file = { uri: "file:///cache/photo.png", mimeType: "image/png" }
    const upload = (result: unknown) => {
      const task = {
        uploadAsync: jest.fn(() => Promise.resolve(result)),
        cancelAsync: jest.fn(),
      }
      ;(FileSystem.createUploadTask as jest.Mock).mockReturnValueOnce(task)
      return task
    }

    it("sends a multipart PUT with the token and returns the parsed body", async () => {
      upload({
        status: 200,
        body: JSON.stringify({ profile_picture_url: "/me/profile-picture?v=1" }),
      })
      const body = await uploadMyProfilePicture("https://api.example.com/", "access-token", file)
      expect(body).toEqual({ profile_picture_url: "/me/profile-picture?v=1" })
      expect(FileSystem.createUploadTask).toHaveBeenCalledWith(
        "https://api.example.com/me/profile-picture",
        file.uri,
        expect.objectContaining({
          httpMethod: "PUT",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "file",
          mimeType: "image/png",
          headers: { Authorization: "Bearer access-token" },
        }),
      )
    })

    it("returns an empty object for an empty success body", async () => {
      upload({ status: 200, body: "" })
      expect(await uploadMyProfilePicture("https://api.example.com", "t", file)).toEqual({})
    })

    it("throws an ApiError carrying the server message on a refusal", async () => {
      upload({ status: 400, body: JSON.stringify({ message: "Unsupported profile picture type" }) })
      await expect(
        uploadMyProfilePicture("https://api.example.com", "t", file),
      ).rejects.toMatchObject({ status: 400, message: "Unsupported profile picture type" })
    })

    it("falls back to the HTTP status when the refusal body is not a message", async () => {
      upload({ status: 502, body: "<html>bad gateway</html>" })
      await expect(
        uploadMyProfilePicture("https://api.example.com", "t", file),
      ).rejects.toMatchObject({ status: 502, message: "HTTP 502" })
    })

    it("throws a 408 ApiError when the task resolves with nothing", async () => {
      upload(null)
      await expect(
        uploadMyProfilePicture("https://api.example.com", "t", file),
      ).rejects.toBeInstanceOf(ApiError)
    })

    it("cancels the task and throws a 408 after the upload timeout", async () => {
      jest.useFakeTimers()
      try {
        const task = {
          uploadAsync: jest.fn(() => new Promise(() => undefined)),
          cancelAsync: jest.fn(),
        }
        ;(FileSystem.createUploadTask as jest.Mock).mockReturnValueOnce(task)
        const pending = uploadMyProfilePicture("https://api.example.com", "t", file)
        const assertion = expect(pending).rejects.toMatchObject({ status: 408 })
        await jest.advanceTimersByTimeAsync(60_000)
        await assertion
        expect(task.cancelAsync).toHaveBeenCalled()
      } finally {
        jest.useRealTimers()
      }
    })
  })
})
