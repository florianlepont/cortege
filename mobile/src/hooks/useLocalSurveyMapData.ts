import { useEffect, useState } from "react"
import { resolveDraftParcelIds } from "../app/ibp-scoring"
import type { PublicParcelStatusItem } from "../app/types"
import { logStatusDetail } from "../i18n"
import { getCachedParcelById } from "../storage/offline-map"
import { listLocalSurveyMapSources } from "../storage/surveys"
import type { LocalSurvey, LocalSurveyMapSource } from "../storage/types"
import { useScreenFocus } from "../ui/useScreenFocus"

export type LocalSurveyMapData = {
  sources: LocalSurveyMapSource[]
  parcels: PublicParcelStatusItem[]
}

const EMPTY: LocalSurveyMapData = { sources: [], parcels: [] }

/**
 * The Explorer's own markers (phase 29, D-01) from the owner's local rows and the parcels of the
 * downloaded areas (D-09). Called only by `PublicMapRoute`, never inside `useSurveySync` (single
 * assembler rule). The `surveys` argument is the survey list of the surveys context, whose identity
 * changes when a survey is written; a flip of `isOffline` reloads too, and nothing loads while the
 * Explorer is not focused (regaining focus reloads).
 */
export function useLocalSurveyMapData(
  surveys: readonly LocalSurvey[],
  isOffline: boolean,
): LocalSurveyMapData {
  const [data, setData] = useState<LocalSurveyMapData>(EMPTY)
  const focused = useScreenFocus()

  useEffect(() => {
    if (!focused) return undefined
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const sources = await listLocalSurveyMapSources()
        const ids = new Set<string>()
        for (const source of sources) {
          for (const id of resolveDraftParcelIds(source.payload)) ids.add(id)
        }
        const cached = await Promise.all(
          [...ids].map((id) => getCachedParcelById<PublicParcelStatusItem>(id)),
        )
        const parcels = cached.filter((parcel): parcel is PublicParcelStatusItem => parcel !== null)
        if (!cancelled) setData({ sources, parcels })
      } catch (error) {
        logStatusDetail("ownSurveyMap.load", error)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
    // `surveys` and `isOffline` are reload triggers, not inputs of the read.
  }, [surveys, isOffline, focused])

  return data
}
