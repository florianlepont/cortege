import { Pressable } from "react-native"
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import type { BrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AccountRoute } from "../routes/AccountRoute"
import { OfflineAreasRoute } from "../routes/OfflineAreasRoute"
import { SettingsRoute } from "../routes/SettingsRoute"
import { pageTitleOptions } from "./stack-options"

/**
 * OA-13 (owner decision, 2026-09-28): Compte is no longer a tab. The avatar pushes these two
 * screens onto the current tab's stack; each tab stack registers them with `ACCOUNT_SCREENS`.
 */

function SettingsHeaderButton({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fr.navigation.a11y.openSettings}
      hitSlop={8}
      onPress={onPress}
      style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name="settings-outline" size={22} color={color} />
    </Pressable>
  )
}

type AccountHomeOptionsArgs = { navigation: { navigate: (name: "settings") => void } }

/**
 * Header options for Compte. The title is the native large title in the native iOS tab tree
 * (12.2-17: it collapses into the bar as the page scrolls), elsewhere the page draws it (OA-69,
 * OA-70) and the native one is hidden; the header keeps the back and gear buttons either way.
 */
export function makeAccountHomeOptions(theme: BrandTheme) {
  const tint = theme.semanticColors.textStrong
  return ({ navigation }: AccountHomeOptionsArgs): NativeStackNavigationOptions => ({
    title: fr.navigation.headers.account,
    ...pageTitleOptions(theme),
    headerShown: true,
    headerRight: () => (
      <SettingsHeaderButton color={tint} onPress={() => navigation.navigate("settings")} />
    ),
  })
}

/** Paramètres: the same title rule as Compte (12.2-17). */
export function makeSettingsScreenOptions(theme: BrandTheme): NativeStackNavigationOptions {
  return {
    title: fr.navigation.headers.settings,
    ...pageTitleOptions(theme),
    headerShown: true,
  }
}

/** Cartes hors ligne: the same title rule as Compte (12.2-17). */
export function makeOfflineAreasScreenOptions(theme: BrandTheme): NativeStackNavigationOptions {
  return {
    title: fr.navigation.headers.offlineAreas,
    ...pageTitleOptions(theme),
    headerShown: true,
  }
}

export const ACCOUNT_SCREENS = {
  accountHome: AccountRoute,
  settings: SettingsRoute,
  offlineAreas: OfflineAreasRoute,
} as const
