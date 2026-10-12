import { useRef } from "react"

/**
 * The bottom reserve of the receded window. The notices zone is reserved only when a notice is up
 * as the swipe mode starts (decided once per entry, so the window never jumps while receded);
 * without one the window ends just above the hint bubble.
 */
export function useSwipeWindowBottom(
  swipeMode: boolean,
  hasNotices: boolean,
  base: number,
  noticesZone: number,
): number {
  const latched = useRef(false)
  const wasOn = useRef(false)
  if (swipeMode && !wasOn.current) latched.current = hasNotices
  wasOn.current = swipeMode
  return latched.current ? base + noticesZone : base
}
