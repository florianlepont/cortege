import { brandComponentTokens } from "../../app/brand-tokens"

/**
 * The floating bar under the survey summary (12.2-14, D-27c): it has no background, so the page
 * scrolls behind it, and it sits above the floating tab bar. `paddingTop` is the air above the
 * button, `tabBarGap` the air between the button and the tab bar.
 */
export const FINISH_BAR = { paddingTop: 10, tabBarGap: 8 } as const

/** The bar's bottom padding: the tab bar's clearance (it floats over the page) plus the gap. */
export function finishBarBottomPadding(clearance: number): number {
  return clearance + FINISH_BAR.tabBarGap
}

/**
 * The bar's height with a one-line button: the air above, the large button and the bottom padding.
 * The real height is measured (a long label wraps at large text sizes); this is the floor.
 */
export function estimateFinishBarHeight(clearance: number): number {
  return (
    FINISH_BAR.paddingTop +
    brandComponentTokens.button.minHeightLarge +
    finishBarBottomPadding(clearance)
  )
}
