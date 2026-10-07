import { useCallback, useEffect, useRef } from "react"
import { useReducedMotion } from "react-native-reanimated"
import { brandMotion } from "../app/brand-tokens"
import { useScreenVisible } from "./useScreenVisible"

/**
 * How long after the screen became visible rows may still join the entrance. A row that mounts
 * later (scrolled into the window, a survey added while the list is on screen) is shown at once.
 * It covers the longest stagger (7 x 40 ms) plus the slide (360 ms) with a margin.
 */
export const LIST_ENTRANCE_GRACE_MS = 1000

/**
 * Which rows of a virtualised list take part in the screen entrance (12.2-11 fix). Returns a stable
 * `canAnimate(index)` that a row asks once, when it mounts.
 *
 * A row is eligible when its index is below the stagger cap (rows 0 to 7), Reduce Motion is off and
 * it mounts either before the screen has been seen (at launch under the splash, in a hidden tab, a
 * stack page still sliding in) or within `LIST_ENTRANCE_GRACE_MS` of the screen becoming visible.
 * A row the list remounts while the user scrolls mounts long after that, so it is never eligible
 * and cannot replay (RESEARCH Pitfall 6). The first version used a mount-time `entering` builder,
 * which had already played under the splash when the owner opened Mes Relevés.
 *
 * Eligible rows then replay with the screen, through `ListEntranceRow` and `useFocusEntrance`.
 */
export function useListEntrance(): (index: number) => boolean {
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  // null: the screen has not been seen yet (also the case during its first render).
  const visibleSince = useRef<number | null>(null)

  useEffect(() => {
    visibleSince.current = visible ? Date.now() : null
  }, [visible])

  return useCallback(
    (index: number) => {
      if (reduced || index >= brandMotion.staggerMax) return false
      const since = visibleSince.current
      return since === null || Date.now() - since < LIST_ENTRANCE_GRACE_MS
    },
    [reduced],
  )
}
