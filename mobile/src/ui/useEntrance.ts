import { useCallback, useEffect, useRef } from "react"
import { FadeInDown, ReduceMotion, useReducedMotion } from "react-native-reanimated"
import { brandMotion } from "../app/brand-tokens"

function buildEntrance(index: number) {
  return FadeInDown.delay(Math.min(index, brandMotion.staggerMax) * brandMotion.staggerMs)
    .duration(brandMotion.durations.base)
    .reduceMotion(ReduceMotion.System)
}

/** The `entering` value of one row: a FadeInDown builder, or undefined when no entrance plays. */
export type EntranceBuilder = ReturnType<typeof buildEntrance>

/**
 * First-mount staggered entrance for list rows and cards (D-08): 240 ms FadeInDown, 40 ms apart,
 * for rows 0 to 7 only. Rows remounted by a virtualised list get no entrance, because the hook's
 * first-mount flag is per component instance and a recycled or scrolled-back row would otherwise
 * replay it (RESEARCH Pitfall 6). Nothing at all under Reduce Motion. Screen sections (Accueil) use
 * `useFocusEntrance` instead, which replays when the screen becomes visible (12.2-10).
 */
export function useEntrance(): (index: number) => EntranceBuilder | undefined {
  const reduced = useReducedMotion()
  const firstMount = useRef(true)

  useEffect(() => {
    firstMount.current = false
  }, [])

  return useCallback(
    (index: number) => {
      if (reduced || !firstMount.current || index >= brandMotion.staggerMax) return undefined
      return buildEntrance(index)
    },
    [reduced],
  )
}
