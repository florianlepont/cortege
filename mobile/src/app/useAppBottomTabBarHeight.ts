import { createContext, useContext } from "react"
import { Platform } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BottomTabBarHeightContext as NativeBottomTabBarHeightContext } from "react-native-bottom-tabs"

const FallbackBottomTabBarHeightContext = createContext<number | undefined>(undefined)

function getJsBottomTabBarHeightContext() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bottomTabs = require("@react-navigation/bottom-tabs") as {
      BottomTabBarHeightContext?: typeof FallbackBottomTabBarHeightContext
    }

    return bottomTabs.BottomTabBarHeightContext ?? FallbackBottomTabBarHeightContext
  } catch {
    return FallbackBottomTabBarHeightContext
  }
}

/**
 * How much of the screen's bottom the tab bar covers, which is what a bottom-fixed control must
 * clear. The native iOS bar floats over the page: its height. The JS bar (Android, Expo Go) stays
 * in the layout flow, so the screen already ends above it and nothing is covered: 0. Without a
 * tab navigator (or before the native bar is measured) it is `fallback`.
 */
export function useAppBottomTabBarHeight(fallback = 0): number {
  const JsBottomTabBarHeightContext = getJsBottomTabBarHeightContext()
  const nativeHeight = useContext(NativeBottomTabBarHeightContext)
  const jsHeight = useContext(JsBottomTabBarHeightContext)

  if (nativeHeight) return nativeHeight
  if (jsHeight !== undefined) return 0
  return fallback
}

/** The tab bar's height when neither tree has measured it yet (iOS native bar, Android JS bar). */
export const TAB_BAR_FALLBACK_HEIGHT = Platform.select({ ios: 84, default: 68 }) ?? 68

/**
 * OA-28: the tab bar stays visible on every screen (owner rule), so a bottom-fixed control sits
 * above it. Returns the bottom padding that clears the tab bar, and the home indicator when the
 * bar is shorter than the safe area.
 */
export function useTabBarClearance(): number {
  const tabBarHeight = useAppBottomTabBarHeight(TAB_BAR_FALLBACK_HEIGHT)
  const insets = useSafeAreaInsets()
  // An in-flow bar covers nothing, and its own padding already takes the home indicator.
  if (tabBarHeight === 0) return 0
  return Math.max(tabBarHeight, insets.bottom)
}
