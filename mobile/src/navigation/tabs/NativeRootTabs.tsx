import { useCallback, useRef, type ElementType } from "react"
import { useBrandTheme } from "../../app/theme"
import { HomeTabNavigator } from "../stacks/HomeStack"
import { PublicMapTabNavigator } from "../stacks/PublicMapStack"
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
 * the avatar). Search
 * is the native header search bar of Mes Relevés, not a tab (D-08).
 */
export function NativeRootTabs({ tabBarHidden = false }: NativeRootTabsProps) {
  const deps = useTabListenerDeps()
  const theme = useBrandTheme()
  // Sketch 001 A: the active tab takes the accent (light green) in dark mode.
  const activeTint = theme.scheme === "dark" ? theme.semanticColors.accent : theme.colors.forest
  const screenOptions = useCallback(
    (props: Parameters<typeof nativeTabScreenOptions>[0]) => ({
      ...nativeTabScreenOptions(props),
      tabBarActiveTintColor: activeTint,
    }),
    [activeTint],
  )
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
    </NativeTab.Navigator>
  )
}
