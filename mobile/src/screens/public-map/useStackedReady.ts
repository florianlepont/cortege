import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { useSharedValue, type SharedValue } from "react-native-reanimated"

/** No rendered-fully event this long (ms) after a style load: the stacked map shows anyway. */
export const STACKED_READY_TIMEOUT_MS = 1500

export type StackedReady = {
  /** 0 until the current style has loaded and been rendered, then 1 (a UI-thread value). */
  ready: SharedValue<number>
  onStyleLoaded: () => void
  onRenderedFully: () => void
}

/**
 * Whether a stacked map may be revealed. A new style (`styleKey` changes, first style included)
 * makes the map not ready; it becomes ready when its `onDidFinishRenderingMapFully` arrives AFTER
 * that style's `onDidFinishLoadingStyle` (an earlier one belongs to the old style), or
 * `STACKED_READY_TIMEOUT_MS` after the style load, so a missing event never blocks it. While not
 * ready `MapStack` clips the map to nothing: what shows is the map underneath, never a blank frame.
 */
export function useStackedReady(styleKey: unknown): StackedReady {
  const created = useSharedValue(0)
  const keptRef = useRef(created)
  const ready = keptRef.current
  const loaded = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])
  const show = useCallback(() => {
    clear()
    ready.value = 1
  }, [clear, ready])

  useLayoutEffect(() => {
    ready.value = 0
    loaded.current = false
    clear()
  }, [styleKey, ready, clear])
  useEffect(() => clear, [clear])

  const onStyleLoaded = useCallback(() => {
    loaded.current = true
    clear()
    timer.current = setTimeout(show, STACKED_READY_TIMEOUT_MS)
  }, [clear, show])
  const onRenderedFully = useCallback(() => {
    if (loaded.current) show()
  }, [show])

  return { ready, onStyleLoaded, onRenderedFully }
}
