import { useMemo, useRef, type ElementType } from "react"
import { DynamicColorIOS } from "react-native"
import { brandTypography } from "../../app/brand-tokens"
import { tabActiveTint } from "../../app/visual-tokens"
import { HomeTabNavigator } from "../stacks/HomeStack"
import { PublicMapTabNavigator } from "../stacks/PublicMapStack"
import { SearchTabNavigator } from "../stacks/SearchStack"
import { SurveysTabNavigator } from "../stacks/SurveysStack"
import {
  makePublicMapTabListeners,
  makeSurveysTabListeners,
  nativeTabScreenOptions,
  useTabListenerDeps,
  tabPressHaptics,
} from "../tab-config"
import type { RootTabParamList } from "../types"

type TabNavigatorLike = {
  Navigator: ElementType
  Screen: ElementType
}

function getNativeTabNavigator(): TabNavigatorLike {
  // Keep the native tabs package out of module initialization so unsupported
  // runtimes can still boot and fall back cleanly.
  /* eslint-disable @typescript-eslint/no-var-requires */
  const nativeBottomTabsModule =
    require("@bottom-tabs/react-navigation") as typeof import("@bottom-tabs/react-navigation")
  /* eslint-enable @typescript-eslint/no-var-requires */
  return nativeBottomTabsModule.createNativeBottomTabNavigator<RootTabParamList>() as TabNavigatorLike
}

// The native surveys stack: same screens, native header with the search bar.
function NativeSurveysTab() {
  return <SurveysTabNavigator useNativeNav />
}

const nativeTabLabelStyle = { fontFamily: brandTypography.meta.fontFamily }

type NativeRootTabsProps = {
  /**
   * `@bottom-tabs/react-navigation` has no per-screen hide option, only this
   * navigator-level flag, so AppNavigation computes it from the focused leaf
   * route with the rule shared with the JS tree (D-13, tab-bar.ts).
   */
  tabBarHidden?: boolean
}

/**
 * The native (iOS) tab bar from react-native-bottom-tabs: three tabs (OA-13: Compte opens from
 * the avatar) and the search tab (OA-52), which iOS 26 shows as its own button beside the bar.
 */
export function NativeRootTabs({ tabBarHidden = false }: NativeRootTabsProps) {
  const deps = useTabListenerDeps()
  // D-08: the system Liquid Glass bar keeps its material; only the active tint and the label font
  // come from the tokens (no background colour, no dot). 12.2-23: the tint is one dynamic colour,
  // the charter forest in light and the light moss in dark, which UIKit resolves with the bar's own
  // appearance. The bar follows the system's light or dark (the app's theme choice does not reach
  // UIKit), so a tint picked from the app's scheme could land the dark moss on the light bar.
  const screenOptions = useMemo(() => {
    const activeTint = DynamicColorIOS({ light: tabActiveTint.light, dark: tabActiveTint.dark })
    return (props: Parameters<typeof nativeTabScreenOptions>[0]) => ({
      ...nativeTabScreenOptions(props),
      tabBarActiveTintColor: activeTint,
    })
  }, [])
  const nativeTabRef = useRef<TabNavigatorLike | null>(null)

  if (nativeTabRef.current == null) {
    nativeTabRef.current = getNativeTabNavigator()
  }

  const NativeTab = nativeTabRef.current

  return (
    <NativeTab.Navigator
      screenOptions={screenOptions}
      screenListeners={tabPressHaptics}
      minimizeBehavior="automatic"
      tabBarHidden={tabBarHidden}
      tabLabelStyle={nativeTabLabelStyle}
    >
      <NativeTab.Screen name="home" component={HomeTabNavigator} />
      <NativeTab.Screen
        name="surveys"
        listeners={makeSurveysTabListeners(deps)}
        component={NativeSurveysTab}
      />
      <NativeTab.Screen
        name="publicMap"
        listeners={makePublicMapTabListeners(deps)}
        component={PublicMapTabNavigator}
      />
      {/* OA-52: iOS 26 draws the search role as its own round button next to the bar. */}
      <NativeTab.Screen name="search" options={{ role: "search" }} component={SearchTabNavigator} />
    </NativeTab.Navigator>
  )
}
