import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { AppState } from "react-native"
import type { SurveyWeather } from "@cortege/ibp-domain"
import { ApiError } from "../api/client"
import { fetchWeather } from "../api/weather-api"
import {
  mergeWeatherObservation,
  needsWeatherLookup,
  resetWeatherForRefill,
  weatherRequestTime,
} from "../app/weather"
import type { PublicParcelStatusItem } from "../app/types"
import { logStatusDetail } from "../i18n"
import { cachedParcelCentre } from "../map/own-surveys"
import { getCachedParcelById } from "../storage/offline-map"
import type { LocalSurvey } from "../storage/types"
import {
  listWeatherCandidates,
  loadWeatherPoint,
  saveWeatherPoint,
  type WeatherPoint,
} from "../storage/weather"
import { useStableActions } from "../state/useLatestCallback"
import { useIsOffline } from "./useIsOffline"

/**
 * App-level weather lookup and catch-up (phase 27, D-10, D-11, D-20).
 *
 * D-10: once a parcel is chosen and the network is there, the weather is requested at once for the
 * centre of the parcel and the survey time, with no button, prompt or toast. D-11 and D-20: offline
 * nothing is requested and nothing fails; when the network returns (a network change or the app
 * coming back to the foreground) every draft that still needs weather and whose `requested_at` is
 * at most 24 h old is filled for its `requested_at`, never for the reconnection time (the
 * candidate rules are `needsWeatherLookup`). An answer is merged per value through the surveys
 * context, so a hand edit is never overwritten and a survey submitted meanwhile is refused by the
 * storage write.
 *
 * Why app-level, called once by `useAppController` (like `useNearbyParcels`): a hook inside a
 * screen would only fill the weather while that survey is open, but a draft chosen offline must
 * fill itself when the network comes back wherever the observer is in the app. The single-sync
 * rule of the app is about `useSurveySync` and is unchanged.
 *
 * Requests run one at a time in a single-flight pass; a trigger that arrives during a pass queues
 * one more pass. There is no interval timer: a pass starts from the online flag turning true, the
 * app returning to the foreground, a new token, or a change of the drafts. A 200 answer with no
 * observation (no_station, no_data, too_old, disabled) settles the survey for an hour; a
 * rejection marks it unavailable until the next network change, foreground or `retry`.
 */

/** How long a survey is left alone after the provider said nothing exists for it. */
export const WEATHER_SETTLED_RETRY_MS = 60 * 60 * 1000

export type WeatherPrefillState = {
  /** Surveys whose request is running now. */
  inFlightIds: ReadonlySet<string>
  /** Surveys whose last request was rejected (provider down, no network): retried later. */
  unavailableIds: ReadonlySet<string>
}

export type WeatherPrefillActions = {
  /** Keeps the parcel centre of a survey and asks for its weather at once when online. */
  rememberPoint(surveyId: string, point: WeatherPoint): Promise<void>
  /** "Réessayer": asks again at once. */
  retry(surveyId: string): Promise<void>
  /** "Remplir à nouveau": clears the values and asks again at once. */
  refill(surveyId: string): Promise<void>
}

type UseWeatherPrefillParams = {
  apiUrl: string
  accessToken: string | null
  surveys: LocalSurvey[]
  updateSurveyWeather: (
    surveyId: string,
    update: (current: SurveyWeather | null) => SurveyWeather | null,
  ) => Promise<boolean>
}

type PassRequest = {
  /** Restrict the pass to one survey. */
  onlyId?: string
  /** Ask even if the survey is unavailable or settled (an explicit action of the observer). */
  force?: boolean
  /** Forget the unavailable surveys first (network back, foreground). */
  retryUnavailable?: boolean
}

const mergeRequests = (queued: PassRequest | null, next: PassRequest): PassRequest => {
  if (queued === null) return next
  // A queued pass for one survey and another for any widens to every survey.
  return {
    onlyId: queued.onlyId !== undefined && queued.onlyId === next.onlyId ? next.onlyId : undefined,
    force: queued.force === true && next.force === true,
    retryUnavailable: queued.retryUnavailable === true || next.retryUnavailable === true,
  }
}

/** The centre of the cached geometry of the survey's parcels, null when none is on the phone. */
async function centreFromCachedParcels(parcelIds: string[]): Promise<WeatherPoint | null> {
  const parcels = await Promise.all(
    parcelIds.map((id) => getCachedParcelById<PublicParcelStatusItem>(id)),
  )
  return cachedParcelCentre(
    parcels.filter((parcel): parcel is PublicParcelStatusItem => parcel !== null),
    parcelIds,
  )
}

/** The drafts, as a string that changes when one is added, removed or written. */
const draftsSignature = (surveys: LocalSurvey[]): string =>
  surveys
    .filter((survey) => survey.status === "draft")
    .map((survey) => `${survey.id}:${survey.updated_at}`)
    .join("|")

const sameIds = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((id) => b.has(id))

export function useWeatherPrefill(params: UseWeatherPrefillParams): {
  state: WeatherPrefillState
  actions: WeatherPrefillActions
} {
  const { apiUrl, accessToken, surveys } = params
  const online = !useIsOffline()

  const [state, setState] = useState<WeatherPrefillState>({
    inFlightIds: new Set(),
    unavailableIds: new Set(),
  })

  const inFlight = useRef(new Set<string>())
  const unavailable = useRef(new Set<string>())
  const settledAt = useRef(new Map<string, number>())
  const running = useRef(false)
  const queued = useRef<PassRequest | null>(null)

  // The latest inputs, read by the pass without making the actions change.
  const latest = useRef({
    apiUrl,
    accessToken,
    online,
    updateSurveyWeather: params.updateSurveyWeather,
  })

  const publish = (): void => {
    setState((previous) =>
      sameIds(previous.inFlightIds, inFlight.current) &&
      sameIds(previous.unavailableIds, unavailable.current)
        ? previous
        : { inFlightIds: new Set(inFlight.current), unavailableIds: new Set(unavailable.current) },
    )
  }

  const canAsk = (): boolean => latest.current.online && latest.current.accessToken !== null

  const askOne = async (id: string, point: WeatherPoint, requestedAt: string): Promise<void> => {
    const { apiUrl: baseUrl, accessToken: token } = latest.current
    if (token === null) return
    inFlight.current.add(id)
    publish()
    try {
      const response = await fetchWeather(baseUrl, token, {
        lat: point.lat,
        lng: point.lng,
        at: requestedAt,
      })
      unavailable.current.delete(id)
      const observation = response.observation
      if (observation) {
        settledAt.current.delete(id)
        // A draft that was never stamped (D-39) keeps the survey time the lookup was for.
        await latest.current.updateSurveyWeather(id, (current) =>
          mergeWeatherObservation(
            current?.requested_at ? current : { ...current, requested_at: requestedAt },
            observation,
          ),
        )
      } else {
        settledAt.current.set(id, Date.now())
      }
    } catch (error) {
      unavailable.current.add(id)
      // Never the token or the point: only the kind of failure (T-27-45).
      logStatusDetail(
        "weather.prefill",
        error instanceof ApiError ? `status ${error.status}` : "request failed",
      )
    } finally {
      inFlight.current.delete(id)
      publish()
    }
  }

  const runPass = async (request: PassRequest): Promise<void> => {
    if (request.retryUnavailable) {
      unavailable.current.clear()
      publish()
    }
    if (!canAsk()) return

    let candidates: Awaited<ReturnType<typeof listWeatherCandidates>>
    try {
      candidates = await listWeatherCandidates()
    } catch (error) {
      logStatusDetail("weather.candidates", error instanceof Error ? error.name : "failed")
      return
    }

    for (const candidate of candidates) {
      // Offline or signed out meanwhile: stop the pass, the next trigger resumes it.
      if (!canAsk()) return
      if (request.onlyId !== undefined && candidate.id !== request.onlyId) continue
      // D-39 safety net: a draft with parcels that was never stamped takes the time it was created
      // (inside the 24 h window only, never invented); a stamped one keeps its own.
      const requestedAt = weatherRequestTime(candidate.weather, candidate.created_at, Date.now())
      if (requestedAt === null) continue
      if (!needsWeatherLookup({ ...candidate.weather, requested_at: requestedAt }, Date.now())) {
        continue
      }
      if (inFlight.current.has(candidate.id)) continue
      if (!request.force) {
        if (unavailable.current.has(candidate.id)) continue
        const settled = settledAt.current.get(candidate.id)
        if (settled !== undefined && Date.now() - settled < WEATHER_SETTLED_RETRY_MS) continue
      }

      let point: WeatherPoint | null = null
      try {
        point = await loadWeatherPoint(candidate.id)
        if (point === null) {
          point = await centreFromCachedParcels(candidate.parcel_ids)
          // Kept, so the next pass does not read the geometry again (D-39).
          if (point !== null) await saveWeatherPoint(candidate.id, point)
        }
      } catch (error) {
        logStatusDetail("weather.point", error instanceof Error ? error.name : "failed")
      }
      // No point and no geometry: nothing to ask, nothing to report.
      if (point === null) continue

      await askOne(candidate.id, point, requestedAt)
    }
  }

  const startPass = async (request: PassRequest): Promise<void> => {
    if (running.current) {
      queued.current = mergeRequests(queued.current, request)
      return
    }
    running.current = true
    try {
      let next: PassRequest | null = request
      while (next !== null) {
        queued.current = null
        await runPass(next)
        next = queued.current
      }
    } finally {
      running.current = false
    }
  }

  const actions = useStableActions<WeatherPrefillActions>({
    async rememberPoint(surveyId, point) {
      await saveWeatherPoint(surveyId, point)
      // A new parcel choice: a past "nothing exists" answer is for another place.
      settledAt.current.delete(surveyId)
      await startPass({ onlyId: surveyId, force: true })
    },
    async retry(surveyId) {
      settledAt.current.delete(surveyId)
      await startPass({ onlyId: surveyId, force: true })
    },
    async refill(surveyId) {
      const written = await latest.current.updateSurveyWeather(surveyId, (current) =>
        resetWeatherForRefill(current),
      )
      if (!written) return
      settledAt.current.delete(surveyId)
      await startPass({ onlyId: surveyId, force: true })
    },
  })

  const startPassRef = useRef(startPass)
  // Layout effects run before every passive effect of the commit, so the effects below and the
  // actions always see the latest inputs.
  useLayoutEffect(() => {
    latest.current = {
      apiUrl,
      accessToken,
      online,
      updateSurveyWeather: params.updateSurveyWeather,
    }
    startPassRef.current = startPass
  })

  // A new token or a change of the drafts (a parcel chosen, a draft created): ask for what is new.
  // After a merge the draft no longer needs a lookup, so the list refresh it causes ends here.
  const signature = draftsSignature(surveys)
  useEffect(() => {
    void startPassRef.current({})
  }, [signature, accessToken])

  // The network came back: forget the rejections and catch up (the first value needs no pass, the
  // effect above already ran one at mount).
  const wasOnline = useRef(online)
  useEffect(() => {
    if (online && !wasOnline.current) {
      void startPassRef.current({ retryUnavailable: true })
    }
    wasOnline.current = online
  }, [online])

  // Back to the foreground: expo-network can miss events while the app is suspended.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (appState) => {
      if (appState === "active") {
        void startPassRef.current({ retryUnavailable: true })
      }
    })
    return () => subscription.remove()
  }, [])

  return useMemo(() => ({ state, actions }), [state, actions])
}
