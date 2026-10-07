import { type RefObject, useCallback, useRef } from "react"
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native"

/**
 * Scrolls a page back to its top (D-25: the finish shows the score card's halo and pop).
 *
 * 12.2-17: under the native large title the top of the page is not the offset 0. iOS insets the
 * content below the header (automatic insets), so at rest the page sits at minus that inset, and
 * an offset of 0 would leave the first block under the bar with the title collapsed. The page
 * opens at its top, so the offset when the first drag begins is that resting offset (0 without a
 * large title); the scroll goes back there. Until a first drag the page has not moved.
 */
export function useScrollTop(scrollRef: RefObject<ScrollView | null>): {
  onScrollBeginDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  scrollToTop: (animated: boolean) => void
} {
  const top = useRef<number | null>(null)
  const onScrollBeginDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (top.current === null) top.current = Math.min(0, event.nativeEvent.contentOffset.y)
  }, [])
  const scrollToTop = useCallback(
    (animated: boolean) => {
      scrollRef.current?.scrollTo({ y: top.current ?? 0, animated })
    },
    [scrollRef],
  )
  return { onScrollBeginDrag, scrollToTop }
}
