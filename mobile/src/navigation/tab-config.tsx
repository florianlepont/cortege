import { useContext } from "react"
import { Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandColors } from "../app/brand-tokens"
import { BrandTheme } from "../app/theme"
import { fr } from "../i18n"
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
  account: {
    focused: { sfSymbol: "person.crop.circle.fill" },
    unfocused: { sfSymbol: "person.crop.circle" },
  },
} as const

// BUG-07 (UX audit, Phase 2): Accueil had Mes Relevés' icon on Android's native tab bar.
const ANDROID_TAB_ICONS = {
  home: require("../../assets/tabs/home.png"),
  surveys: require("../../assets/tabs/surveys.png"),
  publicMap: require("../../assets/tabs/public-map.png"),
  account: require("../../assets/tabs/account.png"),
} as const

export const TAB_TITLES: Record<keyof RootTabParamList, string> = fr.navigation.tabs

const JS_TAB_ICONS: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  home: "home-outline",
  surveys: "list-outline",
  publicMap: "map-outline",
  account: "person-outline",
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
const JS_TAB_BAR_CONTENT_HEIGHT = 50
const JS_TAB_BAR_PADDING_TOP = Platform.select({ ios: 8, default: 6 })
const JS_TAB_BAR_MIN_PADDING_BOTTOM = 10

export type TabBarInsets = { bottom: number }

/** The JS bar style; the surveys tab swaps it for `display: none` (tab-bar.ts). Call with the
 * caller's `useBrandTheme()` value. */
export function buildJsTabBarStyle(theme: BrandTheme, insets: TabBarInsets = { bottom: 0 }) {
  const paddingBottom = Math.max(insets.bottom, JS_TAB_BAR_MIN_PADDING_BOTTOM)
  return {
    backgroundColor: theme.colors.panel,
    borderTopColor: theme.colors.divider,
    borderTopWidth: 1,
    height: JS_TAB_BAR_CONTENT_HEIGHT + JS_TAB_BAR_PADDING_TOP + paddingBottom,
    paddingBottom,
    paddingTop: JS_TAB_BAR_PADDING_TOP,
  }
}

export function jsTabScreenOptions(
  theme: BrandTheme,
  { route }: { route: { name: keyof RootTabParamList } },
  insets: TabBarInsets = { bottom: 0 },
) {
  return {
    headerShown: false,
    title: TAB_TITLES[route.name],
    tabBarLabel: TAB_TITLES[route.name],
    tabBarActiveTintColor: theme.colors.forest,
    tabBarInactiveTintColor: theme.colors.textSecondary,
    tabBarStyle: buildJsTabBarStyle(theme, insets),
    tabBarLabelStyle: { fontSize: 12, fontWeight: "600" as const },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <Ionicons name={JS_TAB_ICONS[route.name]} size={size} color={color} />
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

export function makeAccountTabListeners({
  isAuthenticated,
  handleLoadMyProfile,
  closeSurveyDetailSelection,
}: TabListenerDeps) {
  return {
    tabPress: () => {
      closeSurveyDetailSelection()
      if (isAuthenticated) {
        void handleLoadMyProfile({ silent: true })
      }
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
