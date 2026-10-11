import { createContext, useContext } from "react"
import type { WeatherPrefillActions, WeatherPrefillState } from "../hooks/useWeatherPrefill"

/**
 * Weather prefill (phase 27, D-10, D-11): which drafts have a weather request in flight and which
 * were rejected. Like the nearby parcels, it has its own narrow context: a request that starts or
 * ends re-renders only the screens that read it (the Conditions section, the summary card), never
 * the surveys, form or status readers. The actions are stable.
 */
export type WeatherPrefillContextValue = {
  state: WeatherPrefillState
  actions: WeatherPrefillActions
}

export const WeatherPrefillContext = createContext<WeatherPrefillContextValue | null>(null)

export const WeatherPrefillProvider = WeatherPrefillContext.Provider

export function useWeatherPrefillState(): WeatherPrefillContextValue {
  const value = useContext(WeatherPrefillContext)
  if (value === null) {
    throw new Error("useWeatherPrefillState must be used inside AppStateProvider")
  }
  return value
}
