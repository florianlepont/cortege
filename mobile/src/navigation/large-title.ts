import { getNativeTabsAvailability } from "./native-tabs-availability"

/**
 * 12.2-17 (collapsing titles): whether the pages with a title of their own use the native iOS large
 * title. Only in the native iOS tab tree (the Release builds, D-08): that is where the tab bar is the
 * system's, so the system insets of a scroll view (the header above, the tab bar below) are the
 * real ones. Android and Expo Go keep the page's own title and today's insets.
 *
 * Read by the stacks (header options) and by the routes (`<ScreenFrame largeTitle>`): one source,
 * so a page never gets the native title without the matching insets, or the reverse.
 */
export function usesNativeLargeTitle(): boolean {
  return getNativeTabsAvailability().native
}
