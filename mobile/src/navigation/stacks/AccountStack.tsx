import { Pressable } from "react-native"
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import { fr } from "../../i18n"
import { AccountRoute } from "../routes/AccountRoute"
import { OfflineAreasRoute } from "../routes/OfflineAreasRoute"
import { SettingsRoute } from "../routes/SettingsRoute"

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

/** Header options for Compte; `tint` is the theme's strong text colour. */
export function makeAccountHomeOptions(tint: string) {
  return ({ navigation }: AccountHomeOptionsArgs): NativeStackNavigationOptions => ({
    title: fr.navigation.headers.account,
    // The page draws its own large title (OA-69, OA-70); the header keeps the back and gear buttons.
    headerTitle: () => null,
    headerShown: true,
    headerLargeTitle: false,
    headerRight: () => (
      <SettingsHeaderButton color={tint} onPress={() => navigation.navigate("settings")} />
    ),
  })
}

export const settingsScreenOptions: NativeStackNavigationOptions = {
  title: fr.navigation.headers.settings,
  headerTitle: () => null,
  headerShown: true,
  headerLargeTitle: false,
}

export const offlineAreasScreenOptions: NativeStackNavigationOptions = {
  title: fr.navigation.headers.offlineAreas,
  headerTitle: () => null,
  headerShown: true,
  headerLargeTitle: false,
}

export const ACCOUNT_SCREENS = {
  accountHome: AccountRoute,
  settings: SettingsRoute,
  offlineAreas: OfflineAreasRoute,
} as const
