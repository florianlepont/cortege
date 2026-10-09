import { useEffect, useMemo, useRef, useState } from "react"
import type { MapRegion } from "../../app/map-viewport"
import type { PublicMapFocus } from "../../navigation/types"
import { useScreenFocus } from "../../ui/useScreenFocus"
import { focusParcelIds, focusRegionFor } from "./focus-region"

type PlacePin = { lat: number; lng: number }

type UseExplorerFocusArgs = {
  focus: PublicMapFocus | undefined
  focusTo: (target: MapRegion, durationMs: number) => void
  setHighlightedId: (id: string | null) => void
}

/**
 * What a focus request does to Explorer (OA-59, D-05, D-06): moves the camera to the region of
 * its kind, selects the survey marker (survey), draws one static pin (place) or hands back the
 * parcel to draw selected (survey, parcel). A screen opened for a focus starts the camera there;
 * one already open moves there. No panel opens by itself.
 *
 * A focus is consumed once per nonce: the navigation rebuilds the focus object and the Explorer
 * tab-press reload re-renders the screen, neither moves the camera again. The pin stays until the
 * next focus or until the screen loses focus.
 */
export function useExplorerFocus({ focus, focusTo, setHighlightedId }: UseExplorerFocusArgs): {
  initialRegion: MapRegion | undefined
  highlightedParcelIds: string[] | undefined
  placePin: PlacePin | null
} {
  const initialRegion = useRef(focus ? focusRegionFor(focus) : undefined).current
  const screenFocused = useScreenFocus()
  const [placePin, setPlacePin] = useState<PlacePin | null>(null)

  const focusNonce = focus?.nonce
  useEffect(() => {
    if (!focus) return
    setHighlightedId(focus.kind === "survey" ? focus.surveyId : null)
    setPlacePin(focus.kind === "place" ? { lat: focus.lat, lng: focus.lng } : null)
    focusTo(focusRegionFor(focus), 0)
    // The nonce identifies one request; the focus object itself is rebuilt by the navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce, focusTo])

  useEffect(() => {
    if (!screenFocused) setPlacePin(null)
  }, [screenFocused])

  const highlightedParcelIds = useMemo(() => focusParcelIds(focus), [focus])

  return { initialRegion, highlightedParcelIds, placePin }
}
