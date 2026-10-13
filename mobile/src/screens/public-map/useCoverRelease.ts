import { useCallback, useEffect, useRef } from "react"
import { IMMERSIVE_OUT_MS } from "../../map/swipe-machine"
import { useLatestCallback } from "../../state/useLatestCallback"

/** The compositor needs this long (ms) after the map reports it rendered, to present the frame. */
export const COVER_PRESENT_MS = 120
/** No "rendered fully" event this long (ms) after the style load: the cover goes anyway. */
export const COVER_RENDER_TIMEOUT_MS = 2500
/** Offline the tiles are local: a map that cannot report rendered-fully is not waited for long. */
export const COVER_QUICK_RENDER_TIMEOUT_MS = 350

type Input = {
  /** A cover (a stacked map over the Explorer map) is up. */
  covered: boolean
  /** The swipe mode: when it ends the receded window grows back over `IMMERSIVE_OUT_MS`. */
  swipeMode: boolean
  /** Drops the cover. */
  release: () => void
  /** Offline: wait `COVER_QUICK_RENDER_TIMEOUT_MS` for the render report, not the online cap. */
  quick?: boolean
}

export type CoverRelease = {
  /** The Explorer map finished loading a style. */
  onStyleLoaded: () => void
  /** The Explorer map reported it finished rendering (`onDidFinishRenderingMapFully`). */
  onRenderedFully: () => void
}

/**
 * When a cover goes. The style of the Explorer map loads before its raster tiles are drawn, so the
 * cover is dropped only when the style has loaded AND a "rendered fully" event came after it (one
 * that arrived before does not count), `COVER_PRESENT_MS` after that event, and never before the
 * receded window has finished growing back when the swipe mode just ended. If no rendered-fully
 * event comes within `COVER_RENDER_TIMEOUT_MS` of the style load, the cover goes anyway.
 */
export function useCoverRelease({
  covered,
  swipeMode,
  release,
  quick = false,
}: Input): CoverRelease {
  const coveredRef = useRef(covered)
  coveredRef.current = covered
  const styleAt = useRef<number | null>(null)
  const returnUntil = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasSwipe = useRef(swipeMode)
  const doRelease = useLatestCallback(release)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  // Releases after `ms`, but not before the window is back.
  const schedule = useCallback(
    (ms: number) => {
      clear()
      const wait = Math.max(ms, returnUntil.current - Date.now())
      timer.current = setTimeout(() => {
        timer.current = null
        styleAt.current = null
        doRelease()
      }, wait)
    },
    [clear, doRelease],
  )

  useEffect(() => {
    if (wasSwipe.current && !swipeMode) returnUntil.current = Date.now() + IMMERSIVE_OUT_MS
    wasSwipe.current = swipeMode
  }, [swipeMode])

  // A cover that goes (or a new one) starts from nothing.
  useEffect(() => {
    styleAt.current = null
    clear()
    return clear
  }, [covered, clear])

  const onStyleLoaded = useCallback(() => {
    if (!coveredRef.current) return
    styleAt.current = Date.now()
    schedule(quick ? COVER_QUICK_RENDER_TIMEOUT_MS : COVER_RENDER_TIMEOUT_MS)
  }, [schedule, quick])
  const onRenderedFully = useCallback(() => {
    const at = styleAt.current
    if (!coveredRef.current || at === null) return
    schedule(Math.max(0, COVER_PRESENT_MS - (Date.now() - at)))
  }, [schedule])

  return { onStyleLoaded, onRenderedFully }
}
