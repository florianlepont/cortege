import { useMemo } from "react"
import type { StyleProp, ViewStyle } from "react-native"
import { brandSpacing4 } from "../../app/brand-tokens"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"

/** The room left under the last item of a page, above the tab bar. */
export const PAGE_END_MARGIN = brandSpacing4.md

/** The bottom padding of a scroll content: the tab bar's clearance plus a small margin. */
export function pageBottomPadding(clearance: number): number {
  return clearance + PAGE_END_MARGIN
}

/**
 * The tab bar floats over the page and stays visible on every screen (owner rule, OA-28): the last
 * item of a scrolling page must be able to scroll above it. Returns the scroll content style with
 * that bottom padding, replacing the fixed padding of the base style. A page that already ends
 * with its own bar laid out above the tab bar (the summary's button) passes `false`: its scroll
 * area stops above that bar, so it needs no extra room.
 */
export function useSubPageContentStyle(
  base: ViewStyle,
  needsClearance = true,
): StyleProp<ViewStyle> {
  const clearance = useTabBarClearance()
  return useMemo(
    () => (needsClearance ? [base, { paddingBottom: pageBottomPadding(clearance) }] : base),
    [base, clearance, needsClearance],
  )
}
