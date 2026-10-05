/**
 * Tests for useCommunitySurvey: the page loads first, the photos after it (a failing photo never
 * hides the survey), the API-served photos carry the bearer token, and a stale answer is dropped.
 */

jest.mock("react-native", () => ({}))

const mockFetchSurvey = jest.fn()
const mockFetchAttachments = jest.fn()
const mockFetchDownload = jest.fn()
jest.mock("../api/ibp-api", () => ({
  fetchCommunitySurvey: (...args: unknown[]) => mockFetchSurvey(...args),
  fetchCommunitySurveyAttachments: (...args: unknown[]) => mockFetchAttachments(...args),
  fetchCommunityAttachmentDownload: (...args: unknown[]) => mockFetchDownload(...args),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { useCommunitySurvey } from "./useCommunitySurvey"

const detail = { survey_id: "s-1", site_name: "Bois" }

async function settle() {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve()
  })
}

beforeEach(() => {
  mockFetchSurvey.mockReset()
  mockFetchAttachments.mockReset()
  mockFetchDownload.mockReset()
  mockFetchAttachments.mockResolvedValue({ items: [] })
  jest.spyOn(console, "log").mockImplementation(() => undefined)
})

afterEach(async () => {
  await cleanup()
  jest.restoreAllMocks()
})

describe("useCommunitySurvey", () => {
  it("does nothing without a token", async () => {
    const { result } = await renderHook(() => useCommunitySurvey("http://api.test/v1", null, "s-1"))
    await settle()
    expect(mockFetchSurvey).not.toHaveBeenCalled()
    expect(result.current.status).toBe("loading")
  })

  it("loads the survey and resolves its photos: presigned as they are, API-served with the token", async () => {
    mockFetchSurvey.mockResolvedValue(detail)
    mockFetchAttachments.mockResolvedValue({
      items: [
        { id: "a-1", mime_type: "image/jpeg" },
        { id: "a-2", mime_type: "image/png" },
        { id: "a-3", mime_type: "application/pdf" },
        { id: "a-4", mime_type: null },
      ],
    })
    mockFetchDownload.mockImplementation(async (_u, _t, _s, attachmentId: string) =>
      attachmentId === "a-1"
        ? { url: "https://files.example/a-1?sig=1", requires_auth: false, expires_at: "x" }
        : {
            url: "/public/community-surveys/s-1/attachments/a-2/content",
            requires_auth: true,
            expires_at: "x",
          },
    )
    const { result } = await renderHook(() =>
      useCommunitySurvey("http://api.test/v1", "token", "s-1"),
    )
    await settle()

    expect(mockFetchSurvey).toHaveBeenCalledWith("http://api.test/v1", "token", "s-1")
    expect(result.current.status).toBe("ready")
    expect(result.current.detail).toBe(detail)
    expect(result.current.photos).toEqual([
      { id: "a-1", uri: "https://files.example/a-1?sig=1" },
      {
        id: "a-2",
        uri: "http://api.test/v1/public/community-surveys/s-1/attachments/a-2/content",
        headers: { Authorization: "Bearer token" },
      },
    ])
    expect(mockFetchDownload).toHaveBeenCalledTimes(2)
  })

  it("keeps the survey when its photos fail", async () => {
    mockFetchSurvey.mockResolvedValue(detail)
    mockFetchAttachments.mockRejectedValue(new Error("boom"))
    const { result } = await renderHook(() =>
      useCommunitySurvey("http://api.test/v1", "token", "s-1"),
    )
    await settle()
    expect(result.current.status).toBe("ready")
    expect(result.current.photosFailed).toBe(true)
    expect(result.current.photos).toEqual([])
  })

  it("reports an error, and retries on reload", async () => {
    mockFetchSurvey.mockRejectedValueOnce(new Error("offline"))
    const { result } = await renderHook(() =>
      useCommunitySurvey("http://api.test/v1", "token", "s-1"),
    )
    await settle()
    expect(result.current.status).toBe("error")
    expect(mockFetchAttachments).not.toHaveBeenCalled()

    mockFetchSurvey.mockResolvedValue(detail)
    await act(async () => result.current.reload())
    await settle()
    expect(result.current.status).toBe("ready")
  })

  it("drops the answer of a survey the screen has left", async () => {
    let resolveFirst: (value: unknown) => void = () => undefined
    mockFetchSurvey.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )
    mockFetchSurvey.mockResolvedValueOnce({ survey_id: "s-2", site_name: "Autre" })
    const { result, rerender } = await renderHook(
      (surveyId: string) => useCommunitySurvey("http://api.test/v1", "token", surveyId),
      { initialProps: "s-1" },
    )
    await rerender("s-2")
    await settle()
    await act(async () => {
      resolveFirst(detail)
      await Promise.resolve()
    })
    expect(result.current.detail).toMatchObject({ survey_id: "s-2" })
  })

  it("drops a failure of a survey the screen has left", async () => {
    let rejectFirst: (error: Error) => void = () => undefined
    mockFetchSurvey.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject
        }),
    )
    mockFetchSurvey.mockResolvedValueOnce(detail)
    const { result, rerender } = await renderHook(
      (surveyId: string) => useCommunitySurvey("http://api.test/v1", "token", surveyId),
      { initialProps: "s-1" },
    )
    await rerender("s-2")
    await settle()
    await act(async () => {
      rejectFirst(new Error("late"))
      await Promise.resolve()
    })
    expect(result.current.status).toBe("ready")
  })
})
