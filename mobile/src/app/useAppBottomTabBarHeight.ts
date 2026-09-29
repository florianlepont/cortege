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

export function useAppBottomTabBarHeight(fallback = 0): number {
  const JsBottomTabBarHeightContext = getJsBottomTabBarHeightContext()
  const nativeHeight = useContext(NativeBottomTabBarHeightContext)
  const jsHeight = useContext(JsBottomTabBarHeightContext)

  return nativeHeight ?? jsHeight ?? fallback
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
  return Math.max(tabBarHeight || TAB_BAR_FALLBACK_HEIGHT, insets.bottom)
}
