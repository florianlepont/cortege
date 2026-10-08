// Why custom: the native bar (react-native-bottom-tabs) is iOS only; Android and Expo Go need the JS bar (D-08), so it stays and is styled to match.
import { getFocusedRouteNameFromRoute } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useReducedMotion } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useBrandTheme } from "../../app/theme"
import { HomeTabNavigator } from "../stacks/HomeStack"
import { PublicMapTabNavigator } from "../stacks/PublicMapStack"
import { SurveysTabNavigator } from "../stacks/SurveysStack"
import { shouldHideTabBar } from "../tab-bar"
import {
  TAB_TITLES,
  buildJsTabBarStyle,
  jsTabScreenOptions,
  makePublicMapTabListeners,
  makeSurveysTabListeners,
  useTabListenerDeps,
  tabPressHaptics,
} from "../tab-config"
import type { RootTabParamList } from "../types"

const JsTab = createBottomTabNavigator<RootTabParamList>()

/**
 * The JS tab bar from @react-navigation/bottom-tabs (Android, Expo Go
 * fallback). Three tabs (OA-13); the bar is hidden on parcel selection through the rule
 * shared with the native tree (D-08, D-13). DS-13: the bar's height/padding are
 * derived from the device's own safe-area bottom inset, read here (the one
 * place in the JS tab tree that's an actual component) and passed down.
 */
export function JsRootTabs() {
  const deps = useTabListenerDeps()
  const insets = useSafeAreaInsets()
  const theme = useBrandTheme()
  // Startup snapshot is enough for the tab fade (D-08).
  const reducedMotion = useReducedMotion()

  return (
    <JsTab.Navigator
      screenOptions={(props) => jsTabScreenOptions(theme, props, insets, { reducedMotion })}
      screenListeners={tabPressHaptics}
    >
      <JsTab.Screen name="home" options={{ headerShown: false }} component={HomeTabNavigator} />
      <JsTab.Screen
        name="surveys"
        options={({ route }) => ({
          tabBarLabel: TAB_TITLES.surveys,
          headerShown: false,
          tabBarStyle: shouldHideTabBar(getFocusedRouteNameFromRoute(route))
            ? { display: "none" as const }
            : buildJsTabBarStyle(theme, insets),
        })}
        listeners={makeSurveysTabListeners(deps)}
        component={SurveysTabNavigator}
      />
      <JsTab.Screen
        name="publicMap"
        options={{ headerShown: false }}
        listeners={makePublicMapTabListeners(deps)}
        component={PublicMapTabNavigator}
      />
    </JsTab.Navigator>
  )
}
