import { useMemo } from "react"
import type { StyleProp, ViewStyle } from "react-native"
import { brandSpacing4 } from "../../app/brand-tokens"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { useFrameLargeTitle } from "../../ui/frame-large-title"

/** The room left under the last item of a page, above the tab bar. */
export const PAGE_END_MARGIN = brandSpacing4.md

/** The bottom padding of a scroll content: what covers the page's bottom (tab bar, floating bar) plus a small margin. */
export function pageBottomPadding(clearance: number): number {
  return clearance + PAGE_END_MARGIN
}

/**
 * The tab bar floats over the page and stays visible on every screen (owner rule, OA-28): the last
 * item of a scrolling page must be able to scroll above it. Returns the scroll content style with
 * that bottom padding, replacing the fixed padding of the base style. A page with its own floating
 * bar above the tab bar (the summary's button, which has no background since D-27c, so the page
 * scrolls behind it) passes that bar's `barHeight`, measured from the page's bottom edge and so
 * already including the tab bar's clearance: the last item then ends above the bar.
 *
 * 12.2-17: under the native large title (`<ScreenFrame largeTitle>`) the scroll view uses automatic
 * insets, so iOS already keeps the content above the tab bar: the padding then holds only what
 * covers the page above that (the floating bar's part over the tab bar's clearance) and the margin.
 *
 * `keyboardInset` (D-46) is the height of the keyboard while it is up: the content then has at least
 * that much room at the bottom, so the last card can be scrolled to the top of the keyboard. It
 * replaces the padding above while it is larger (the keyboard covers the bars) and is 0 otherwise.
 */
export function useSubPageContentStyle(
  base: ViewStyle,
  barHeight: number | null = null,
  keyboardInset = 0,
): StyleProp<ViewStyle> {
  const clearance = useTabBarClearance()
  const largeTitle = useFrameLargeTitle()
  return useMemo(() => {
    const covered = barHeight === null ? clearance : barHeight
    const own = largeTitle ? Math.max(0, covered - clearance) : covered
    const padding = Math.max(
      pageBottomPadding(own),
      keyboardInset > 0 ? pageBottomPadding(keyboardInset) : 0,
    )
    return [base, { paddingBottom: padding }]
  }, [base, clearance, barHeight, largeTitle, keyboardInset])
}
