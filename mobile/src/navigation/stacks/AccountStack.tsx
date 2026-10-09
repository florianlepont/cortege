import { Platform } from "react-native"
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"
import type { BrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AccountRoute } from "../routes/AccountRoute"
import { OfflineAreasRoute } from "../routes/OfflineAreasRoute"
import { SettingsRoute } from "../routes/SettingsRoute"
import { iconHeaderButton } from "../header-items"
import { pageTitleOptions } from "./stack-options"
import { AppPressable } from "../../ui/AppPressable"

/**
 * OA-13 (owner decision, 2026-09-28): Compte is no longer a tab. The avatar pushes these two
 * screens onto the current tab's stack; each tab stack registers them with `ACCOUNT_SCREENS`.
 */

function SettingsHeaderButton({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={fr.navigation.a11y.openSettings}
      hitSlop={8}
      onPress={onPress}
      style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name="settings-outline" size={22} color={color} />
    </AppPressable>
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
    // The gear is a native header item on iOS (SF Symbol, glass drawn by the system, as the plus
    // of Mes Relevés and the avatar of Accueil); native-stack has no header items on Android, so
    // the JS button stays there.
    ...(Platform.OS === "ios"
      ? {
          unstable_headerRightItems: () => [
            iconHeaderButton({
              label: fr.navigation.a11y.openSettings,
              sfSymbol: "gearshape",
              tintColor: theme.semanticColors.accent,
              onPress: () => navigation.navigate("settings"),
            }),
          ],
        }
      : {
          headerRight: () => (
            <SettingsHeaderButton color={tint} onPress={() => navigation.navigate("settings")} />
          ),
        }),
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
