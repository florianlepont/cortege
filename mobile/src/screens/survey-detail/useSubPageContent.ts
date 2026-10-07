import { useMemo } from "react"
import type { StyleProp, ViewStyle } from "react-native"
import { brandSpacing4 } from "../../app/brand-tokens"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"

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
 */
export function useSubPageContentStyle(
  base: ViewStyle,
  barHeight: number | null = null,
): StyleProp<ViewStyle> {
  const clearance = useTabBarClearance()
  return useMemo(
    () => [base, { paddingBottom: pageBottomPadding(barHeight === null ? clearance : barHeight) }],
    [base, clearance, barHeight],
  )
}
