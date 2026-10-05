import {
  AuthUser,
  ParcelSurveyHistoryResponse,
  PublicMapItem,
  PublicParcelStatusItem,
  SurveyDetailResponse,
  SurveyEventsResponse,
} from "../app/types"
import type { CommunitySurveyItem } from "@cortege/ibp-domain"
import * as FileSystem from "expo-file-system/legacy"
import { ApiError, apiRequest } from "./client"

type PatchProfilePayload = {
  first_name: string
  last_name: string
  display_name: string
  profile_picture_url?: string | null
}

type ProfilePictureUploadResponse = {
  profile_picture_url?: string
  message?: string
}

type ResetIbpDataResponse = {
  surveys_deleted?: number
  attachments_deleted?: number
  events_deleted?: number
  message?: string
}

type ResetUserDataResponse = {
  users_deleted?: number
  surveys_deleted?: number
  attachments_deleted?: number
  events_deleted?: number
  message?: string
}

export async function getMyProfile(apiUrl: string, accessToken: string): Promise<AuthUser> {
  return apiRequest<AuthUser>({
    baseUrl: apiUrl,
    path: "/me",
    method: "GET",
    token: accessToken,
  })
}

export async function patchMyProfile(
  apiUrl: string,
  accessToken: string,
  payload: PatchProfilePayload,
): Promise<AuthUser> {
  return apiRequest<AuthUser>({
    baseUrl: apiUrl,
    path: "/me",
    method: "PATCH",
    token: accessToken,
    json: payload,
  })
}

export async function changeMyEmail(
  apiUrl: string,
  accessToken: string,
  email: string,
): Promise<void> {
  return apiRequest<void>({
    baseUrl: apiUrl,
    path: "/me/email",
    method: "PATCH",
    token: accessToken,
    json: { email },
  })
}

export async function requestPasswordReset(apiUrl: string, accessToken: string): Promise<void> {
  return apiRequest<void>({
    baseUrl: apiUrl,
    path: "/me/password-reset",
    method: "POST",
    token: accessToken,
  })
}

const PROFILE_PICTURE_UPLOAD_TIMEOUT_MS = 60_000

/**
 * OA-76: the global `fetch` of this Expo version cannot send the React Native `{ uri, type, name }`
 * FormData part ("Unsupported FormDataPart implementation"), so the photo goes through the native
 * upload task, as the survey attachments already do. It streams the file from disk as a multipart
 * PUT with the field name the API expects.
 */
export async function uploadMyProfilePicture(
  apiUrl: string,
  accessToken: string,
  file: { uri: string; mimeType: string },
): Promise<ProfilePictureUploadResponse> {
  const task = FileSystem.createUploadTask(
    `${apiUrl.replace(/\/+$/, "")}/me/profile-picture`,
    file.uri,
    {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: file.mimeType,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  let timer: ReturnType<typeof setTimeout> | undefined
  let result: { status: number; body: string } | null | undefined
  try {
    result = await Promise.race([
      task.uploadAsync(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          void task.cancelAsync()
          reject(new ApiError(408, "Request timeout", null))
        }, PROFILE_PICTURE_UPLOAD_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }

  if (!result) {
    throw new ApiError(408, "Request timeout", null)
  }

  let body: unknown = null
  try {
    body = result.body ? (JSON.parse(result.body) as unknown) : null
  } catch {
    body = result.body
  }
  if (result.status < 200 || result.status >= 300) {
    const message =
      body &&
      typeof body === "object" &&
      typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : `HTTP ${result.status}`
    throw new ApiError(result.status, message, body)
  }
  return (body ?? {}) as ProfilePictureUploadResponse
}

export async function deleteMyProfilePicture(apiUrl: string, accessToken: string): Promise<void> {
  await apiRequest<void>({
    baseUrl: apiUrl,
    path: "/me/profile-picture",
    method: "DELETE",
    token: accessToken,
    expectJson: false,
  })
}

export async function deleteMyAccount(apiUrl: string, accessToken: string): Promise<void> {
  await apiRequest<void>({
    baseUrl: apiUrl,
    path: "/me",
    method: "DELETE",
    token: accessToken,
    expectJson: false,
  })
}

export async function loadSurveyDetail(
  apiUrl: string,
  accessToken: string,
  surveyId: string,
): Promise<SurveyDetailResponse> {
  return apiRequest<SurveyDetailResponse>({
    baseUrl: apiUrl,
    path: `/surveys/${surveyId}`,
    method: "GET",
    token: accessToken,
  })
}

export async function loadSurveyEvents(
  apiUrl: string,
  accessToken: string,
  surveyId: string,
): Promise<SurveyEventsResponse> {
  return apiRequest<SurveyEventsResponse>({
    baseUrl: apiUrl,
    path: `/surveys/${surveyId}/events`,
    method: "GET",
    token: accessToken,
  })
}

export async function resetIbpData(
  apiUrl: string,
  accessToken: string,
): Promise<ResetIbpDataResponse> {
  return apiRequest<ResetIbpDataResponse>({
    baseUrl: apiUrl,
    path: "/debug/reset-ibp-data",
    method: "POST",
    token: accessToken,
    json: {},
  })
}

export async function resetUserData(
  apiUrl: string,
  accessToken: string,
): Promise<ResetUserDataResponse> {
  return apiRequest<ResetUserDataResponse>({
    baseUrl: apiUrl,
    path: "/debug/reset-user-data",
    method: "POST",
    token: accessToken,
    json: {},
  })
}

export async function fetchPublicMapItems(
  apiUrl: string,
  accessToken: string,
  input?: { from?: string; to?: string; region?: string; bbox?: string },
): Promise<{ items: PublicMapItem[] }> {
  const queryParts: string[] = []
  if (input?.from?.trim()) queryParts.push(`from=${encodeURIComponent(input.from.trim())}`)
  if (input?.to?.trim()) queryParts.push(`to=${encodeURIComponent(input.to.trim())}`)
  if (input?.region?.trim())
    queryParts.push(`region=${encodeURIComponent(input.region.trim().toUpperCase())}`)
  // Viewport filter, minLng,minLat,maxLng,maxLat (D-05); the server validates it (01.9-07).
  if (input?.bbox?.trim()) queryParts.push(`bbox=${encodeURIComponent(input.bbox.trim())}`)
  const suffix = queryParts.length > 0 ? `?${queryParts.join("&")}` : ""

  return apiRequest<{ items: PublicMapItem[] }>({
    baseUrl: apiUrl,
    path: `/public/map-items${suffix}`,
    method: "GET",
    token: accessToken,
  })
}

/** The community search (OA-52): finished surveys of every member, matched on name or author. */
export async function searchCommunitySurveys(
  apiUrl: string,
  accessToken: string,
  input: { q: string; limit?: number },
): Promise<{ items: CommunitySurveyItem[] }> {
  const queryParts: string[] = []
  if (input.q.trim()) queryParts.push(`q=${encodeURIComponent(input.q.trim())}`)
  if (input.limit) queryParts.push(`limit=${encodeURIComponent(String(input.limit))}`)
  const suffix = queryParts.length > 0 ? `?${queryParts.join("&")}` : ""

  return apiRequest<{ items: CommunitySurveyItem[] }>({
    baseUrl: apiUrl,
    path: `/public/community-surveys${suffix}`,
    method: "GET",
    token: accessToken,
  })
}

export async function fetchPublicParcelStatuses(
  apiUrl: string,
  accessToken: string,
  input: { bbox: string; zoom: number; year?: number },
): Promise<{ items: PublicParcelStatusItem[] }> {
  const queryParts = [
    `bbox=${encodeURIComponent(input.bbox)}`,
    `zoom=${encodeURIComponent(String(Math.round(input.zoom)))}`,
  ]
  if (typeof input.year === "number" && Number.isFinite(input.year)) {
    queryParts.push(`year=${encodeURIComponent(String(Math.trunc(input.year)))}`)
  }

  return apiRequest<{ items: PublicParcelStatusItem[] }>({
    baseUrl: apiUrl,
    path: `/public/parcels/status?${queryParts.join("&")}`,
    method: "GET",
    token: accessToken,
  })
}

/** Previous submitted surveys of a parcel, oldest first (REQ-B-survey-detail, REQ-C-versioning). */
export async function fetchParcelSurveyHistory(
  apiUrl: string,
  accessToken: string,
  parcelId: string,
  limit?: number,
): Promise<ParcelSurveyHistoryResponse> {
  const suffix = typeof limit === "number" ? `?limit=${encodeURIComponent(String(limit))}` : ""
  return apiRequest<ParcelSurveyHistoryResponse>({
    baseUrl: apiUrl,
    path: `/parcels/${encodeURIComponent(parcelId)}/surveys/history${suffix}`,
    method: "GET",
    token: accessToken,
  })
}

export type AttachmentDownloadUrlResponse = {
  url: string
  expires_at: string
  requires_auth: boolean
}

export async function getAttachmentDownloadUrl(
  apiUrl: string,
  accessToken: string,
  surveyId: string,
  attachmentId: string,
): Promise<AttachmentDownloadUrlResponse> {
  return apiRequest<AttachmentDownloadUrlResponse>({
    baseUrl: apiUrl,
    path: `/surveys/${encodeURIComponent(surveyId)}/attachments/${encodeURIComponent(attachmentId)}/download-url`,
    method: "GET",
    token: accessToken,
  })
}

export type { PatchProfilePayload, ResetIbpDataResponse, ResetUserDataResponse }
