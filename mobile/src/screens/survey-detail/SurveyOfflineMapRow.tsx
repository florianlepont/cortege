import { useMemo } from "react"
import type { SurveyDetailResponse } from "../../app/types"
import { useOfflineMapPrompt } from "../../hooks/useOfflineMapPrompt"
import { OfflineMapPrompt } from "../../ui/OfflineMapPrompt"
import { resolveDisplayCoordinates } from "../survey-screen-helpers"

type SurveyOfflineMapRowProps = {
  apiUrl: string
  accessToken: string | null
  siteName: string
  displayLocation: SurveyDetailResponse["display_location"] | undefined
}

/** Under the map of the survey page: is the map around the survey on the phone, and a way to fetch it. */
export function SurveyOfflineMapRow({
  apiUrl,
  accessToken,
  siteName,
  displayLocation,
}: SurveyOfflineMapRowProps) {
  const coordinates = useMemo(() => resolveDisplayCoordinates(displayLocation), [displayLocation])
  const prompt = useOfflineMapPrompt({ apiUrl, accessToken, point: coordinates })
  return <OfflineMapPrompt prompt={prompt} siteName={siteName} variant="row" />
}
