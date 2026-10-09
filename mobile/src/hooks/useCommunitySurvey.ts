import { useCallback, useEffect, useState } from "react"
import type { CommunitySurveyDetail } from "@cortege/ibp-domain"
import {
  fetchCommunityAttachmentDownload,
  fetchCommunitySurvey,
  fetchCommunitySurveyAttachments,
} from "../api/ibp-api"
import { logStatusDetail } from "../i18n"

/** A photo ready to show: where to read it, and the headers when the API itself serves it. */
export type CommunityPhoto = {
  id: string
  uri: string
  headers?: Record<string, string>
}

export type CommunitySurveyState = {
  detail: CommunitySurveyDetail | null
  photos: CommunityPhoto[]
  status: "loading" | "ready" | "error"
  /** The page loaded but its photos did not (a photo failing never hides the survey). */
  photosFailed: boolean
  reload: () => void
}

/**
 * The page of a finished survey of another member (OA-59): the survey, then its photos. The photos
 * load after the page so a slow or failing file never delays it; a stale answer for a survey the
 * screen has since left is dropped. The history page reads the survey for its `history` only and
 * passes `{ withPhotos: false }`, which skips every attachment request.
 */
export function useCommunitySurvey(
  apiUrl: string,
  accessToken: string | null,
  surveyId: string,
  options: { withPhotos?: boolean } = {},
): CommunitySurveyState {
  // The boolean, not the options object, is the effect dependency: an inline object never reloads.
  const withPhotos = options.withPhotos !== false
  const [detail, setDetail] = useState<CommunitySurveyDetail | null>(null)
  const [photos, setPhotos] = useState<CommunityPhoto[]>([])
  const [phase, setPhase] = useState<CommunitySurveyState["status"]>("loading")
  const [photosFailed, setPhotosFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setDetail(null)
    setPhotos([])
    setPhotosFailed(false)
    setPhase("loading")

    const load = async (): Promise<void> => {
      try {
        const loaded = await fetchCommunitySurvey(apiUrl, accessToken, surveyId)
        if (cancelled) return
        setDetail(loaded)
        setPhase("ready")
      } catch (error) {
        logStatusDetail("communitySurvey.load", error)
        if (!cancelled) setPhase("error")
        return
      }

      if (!withPhotos) return

      try {
        const listed = await fetchCommunitySurveyAttachments(apiUrl, accessToken, surveyId)
        const images = listed.items.filter((item) => item.mime_type?.startsWith("image/"))
        const resolved = await Promise.all(
          images.map(async (item): Promise<CommunityPhoto> => {
            const download = await fetchCommunityAttachmentDownload(
              apiUrl,
              accessToken,
              surveyId,
              item.id,
            )
            return download.requires_auth
              ? {
                  id: item.id,
                  uri: `${apiUrl}${download.url}`,
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              : { id: item.id, uri: download.url }
          }),
        )
        if (!cancelled) setPhotos(resolved)
      } catch (error) {
        logStatusDetail("communitySurvey.photos", error)
        if (!cancelled) setPhotosFailed(true)
      }
    }
    void load()

    return () => {
      cancelled = true
    }
  }, [apiUrl, accessToken, surveyId, attempt, withPhotos])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return { detail, photos, status: phase, photosFailed, reload }
}
