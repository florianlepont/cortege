import { useEffect, useRef } from "react"
import { parseFiniteNumberInput } from "../../app/number-utils"

type UseRouteSurfacePrefillInput = {
  /** The surface décrite of the recorded route, null when there is no valid route. */
  zoneSurfaceHa: number | null
  /** What the surface field holds now. */
  surfaceText: string
  /** The field's change handler. */
  onChangeSurface: (text: string) => void
  /** False for a factor with no surface field to prefill, or a screen that must not write. */
  enabled: boolean
}

/**
 * The zone as the surface field shows it: a decimal comma, no grouping (the field is parsed back
 * by `parseFiniteNumberInput`, which would reject a thin space), at most two decimals.
 */
export function formatSurfaceForField(hectares: number): string {
  return String(Number(hectares.toFixed(2))).replace(".", ",")
}

/**
 * Phase 30 (spec section 7, research Pitfall 11): the surface field of C, D, E (and F's own surface,
 * plan 30-19) starts from the surface décrite of the recorded route. It writes once, only into an
 * empty field. As soon as the field holds a value, the observer's or the prefill's, the hook is done
 * for this mount: a value cleared or typed afterwards is never replaced (T-30-36). `fromRoute` is
 * true while the field still equals the zone (as the prefill writes it), and also on the first
 * render, before the prefill has written into the empty field. Follow-up 32-32: the page then shows
 * one caption line, "Surface décrite : 2,0 ha, d'après le parcours", instead of the surface section.
 * `zoneHa` is the zone as the field holds it, null without a zone.
 */
export function useRouteSurfacePrefill({
  zoneSurfaceHa,
  surfaceText,
  onChangeSurface,
  enabled,
}: UseRouteSurfacePrefillInput): { fromRoute: boolean; zoneHa: number | null } {
  const settled = useRef(false)
  const onChangeRef = useRef(onChangeSurface)
  onChangeRef.current = onChangeSurface

  useEffect(() => {
    if (settled.current) return
    if (surfaceText.trim().length > 0) {
      settled.current = true
      return
    }
    if (!enabled || zoneSurfaceHa === null) return
    settled.current = true
    onChangeRef.current(formatSurfaceForField(zoneSurfaceHa))
  }, [enabled, zoneSurfaceHa, surfaceText])

  const zoneHa = zoneSurfaceHa === null ? null : Number(zoneSurfaceHa.toFixed(2))
  const parsed = parseFiniteNumberInput(surfaceText)
  const awaitingPrefill =
    !settled.current && enabled && zoneHa !== null && surfaceText.trim().length === 0
  const fromRoute = awaitingPrefill || (zoneHa !== null && parsed !== null && parsed === zoneHa)
  return { fromRoute, zoneHa }
}
