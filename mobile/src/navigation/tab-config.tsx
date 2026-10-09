import { useContext } from "react"
import { Platform, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandColors,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../app/brand-tokens"
import { tabDot } from "../app/visual-tokens"
import { BrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { feedback } from "../ui/feedback"
import { useSession, type SessionActions } from "../state/session-context"
import { useSurveyActions } from "../state/surveys-context"
import { useSyncActions } from "../state/sync-actions-context"
import { PublicMapReloadContext, type PublicMapReloadSignal } from "./public-map-reload"
import type { RootTabParamList } from "./types"

// ─── Tab icons and titles ─────────────────────────────────────────────────────

const IOS_TAB_ICONS = {
  home: {
    focused: { sfSymbol: "house.fill" },
    unfocused: { sfSymbol: "house" },
  },
  surveys: {
    focused: { sfSymbol: "list.bullet.clipboard.fill" },
    unfocused: { sfSymbol: "list.bullet.clipboard" },
  },
  publicMap: {
    focused: { sfSymbol: "map.fill" },
    unfocused: { sfSymbol: "map" },
  },
  search: {
    focused: { sfSymbol: "magnifyingglass" },
    unfocused: { sfSymbol: "magnifyingglass" },
  },
} as const

// BUG-07 (UX audit, Phase 2): Accueil had Mes Relevés' icon on Android's native tab bar.
const ANDROID_TAB_ICONS = {
  home: require("../../assets/tabs/home.png"),
  surveys: require("../../assets/tabs/surveys.png"),
  publicMap: require("../../assets/tabs/public-map.png"),
  // Only read by the native-tabs options, which Android never mounts (the JS tree draws search-outline).
  search: require("../../assets/tabs/surveys.png"),
} as const

export const TAB_TITLES: Record<keyof RootTabParamList, string> = fr.navigation.tabs

const JS_TAB_ICONS: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  home: "home-outline",
  surveys: "list-outline",
  publicMap: "map-outline",
  search: "search-outline",
}

// ─── Native tab screen options ────────────────────────────────────────────────

export const nativeTabScreenOptions = ({ route }: { route: { name: keyof RootTabParamList } }) => ({
  title: TAB_TITLES[route.name],
  tabBarActiveTintColor: brandColors.forest,
  tabBarIcon: ({ focused }: { focused: boolean }) => {
    if (Platform.OS === "ios") {
      return focused ? IOS_TAB_ICONS[route.name].focused : IOS_TAB_ICONS[route.name].unfocused
    }
    return ANDROID_TAB_ICONS[route.name]
  },
})

// ─── JS tab screen options (Android, Expo Go fallback) ────────────────────────

// DS-13: the bar's content area (icons + labels) is a fixed size; only the bottom padding — and
// so the overall height — grows with the device's own home-indicator/gesture-bar inset, instead
// of the two hard-coded per-platform guesses this replaces.
const JS_TAB_BAR_CONTENT_HEIGHT = 56
const JS_TAB_BAR_PADDING_TOP = 8
const JS_TAB_BAR_MIN_PADDING_BOTTOM = 16

export type TabBarInsets = { bottom: number }

/** The JS bar style; the surveys tab swaps it for `display: none` (tab-bar.ts). Call with the
 * caller's `useBrandTheme()` value. */
export function buildJsTabBarStyle(theme: BrandTheme, insets: TabBarInsets = { bottom: 0 }) {
  const paddingBottom = Math.max(insets.bottom, JS_TAB_BAR_MIN_PADDING_BOTTOM)
  return {
    // Variant I glass fill and hairline (D-08). The bar stays in the layout flow with the same
    // height (RESEARCH Pitfall 10): no position key, so useTabBarClearance keeps working.
    backgroundColor: theme.visual.tab.background,
    borderTopColor: theme.visual.tab.border,
    borderTopWidth: 1,
    height: JS_TAB_BAR_CONTENT_HEIGHT + JS_TAB_BAR_PADDING_TOP + paddingBottom,
    paddingBottom,
    paddingTop: JS_TAB_BAR_PADDING_TOP,
  }
}

const tabIconStyles = StyleSheet.create({
  column: { alignItems: "center", justifyContent: "center", gap: brandSpacing4.xs },
  dot: { width: tabDot.size, height: tabDot.size, borderRadius: brandRadius.pill },
})

type JsTabIconProps = {
  name: keyof typeof Ionicons.glyphMap
  color: string
  size: number
  focused: boolean
  theme: BrandTheme
}

/** The JS bar icon with the decorative moss dot under the active glyph; the dot is hidden from
 * accessibility because the tab label carries the selected state. */
export function JsTabIcon({ name, color, size, focused, theme }: JsTabIconProps) {
  return (
    <View style={tabIconStyles.column}>
      <Ionicons name={name} size={size} color={color} />
      <View
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={[
          tabIconStyles.dot,
          focused
            ? { backgroundColor: theme.visual.tab.dot, boxShadow: theme.visual.tab.dotShadow }
            : { backgroundColor: "transparent" },
        ]}
      />
    </View>
  )
}

export function jsTabScreenOptions(
  theme: BrandTheme,
  { route }: { route: { name: keyof RootTabParamList } },
  insets: TabBarInsets = { bottom: 0 },
  options: { reducedMotion?: boolean } = {},
) {
  return {
    headerShown: false,
    title: TAB_TITLES[route.name],
    tabBarLabel: TAB_TITLES[route.name],
    animation: options.reducedMotion ? ("none" as const) : ("fade" as const),
    tabBarActiveTintColor: theme.visual.tab.activeTint,
    tabBarInactiveTintColor: theme.visual.tab.inactiveTint,
    tabBarStyle: buildJsTabBarStyle(theme, insets),
    tabBarLabelStyle: {
      fontFamily: brandTypography.meta.fontFamily,
      fontSize: brandTypeScale.caption.fontSize,
    },
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
      <JsTabIcon
        name={JS_TAB_ICONS[route.name]}
        color={color}
        size={size}
        focused={focused}
        theme={theme}
      />
    ),
  }
}

// ─── Shared tab listeners ─────────────────────────────────────────────────────

export type TabListenerDeps = {
  isAuthenticated: boolean
  handlePullChanges: () => Promise<void>
  handleLoadMyProfile: SessionActions["handleLoadMyProfile"]
  closeSurveyDetailSelection: () => void
  publicMapReload: PublicMapReloadSignal
}

export function makeSurveysTabListeners({ isAuthenticated, handlePullChanges }: TabListenerDeps) {
  return {
    tabPress: () => {
      if (isAuthenticated) {
        void handlePullChanges()
      }
    },
  }
}

export function makePublicMapTabListeners({
  closeSurveyDetailSelection,
  publicMapReload,
}: TabListenerDeps) {
  return {
    tabPress: () => {
      closeSurveyDetailSelection()
      // The map route reloads the public map (pending until it mounts).
      publicMapReload.request()
    },
  }
}

/** Reads only the session and stable action objects. */
export function useTabListenerDeps(): TabListenerDeps {
  const { state: session, actions: sessionActions } = useSession()
  const syncActions = useSyncActions()
  const surveyActions = useSurveyActions()
  const publicMapReload = useContext(PublicMapReloadContext)
  if (publicMapReload === null) {
    throw new Error("The root tabs must be rendered inside AppNavigation")
  }
  return {
    isAuthenticated: session.isAuthenticated,
    handlePullChanges: syncActions.handlePullChanges,
    handleLoadMyProfile: sessionActions.handleLoadMyProfile,
    closeSurveyDetailSelection: surveyActions.closeSurveyDetailSelection,
    publicMapReload,
  }
}

/** A selection tick when a tab is pressed, in both the native and the JS tab trees. */
export const tabPressHaptics = {
  tabPress: () => feedback.selection(),
}
