import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { DmhGuideRoute } from "../routes/DmhGuideRoute"
import { HomeRoute } from "../routes/HomeRoute"
import { styles } from "../styles"
import type { HomeStackParamList } from "../types"
import { createBaseStackScreenOptions, dmhGuideScreenOptions } from "./stack-options"
import {
  ACCOUNT_SCREENS,
  makeAccountHomeOptions,
  makeOfflineAreasScreenOptions,
  makeSettingsScreenOptions,
} from "./AccountStack"

const HomeStack = createNativeStackNavigator<HomeStackParamList>()

export function HomeTabNavigator() {
  const theme = useBrandTheme()
  return (
    <View style={styles.tabScreenContainer}>
      <HomeStack.Navigator
        // D-19: the transparent halo header by default (Compte, Paramètres, Cartes hors ligne draw
        // a ScreenFrame; Accueil draws its own halo).
        screenOptions={{ ...createBaseStackScreenOptions(theme), headerShown: false }}
      >
        <HomeStack.Screen name="homeRoot" component={HomeRoute} />
        <HomeStack.Screen
          name="surveyDmhGuide"
          // Phase 32 (owner request): the same guide sheet as in the survey stack, opened from the
          // Outils section; closing it returns to Accueil.
          options={dmhGuideScreenOptions(theme)}
          component={DmhGuideRoute}
        />
        <HomeStack.Screen
          name="accountHome"
          options={makeAccountHomeOptions(theme)}
          component={ACCOUNT_SCREENS.accountHome}
        />
        <HomeStack.Screen
          name="settings"
          options={makeSettingsScreenOptions(theme)}
          component={ACCOUNT_SCREENS.settings}
        />
        <HomeStack.Screen
          name="offlineAreas"
          options={makeOfflineAreasScreenOptions(theme)}
          component={ACCOUNT_SCREENS.offlineAreas}
        />
      </HomeStack.Navigator>
    </View>
  )
}
