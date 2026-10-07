import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { CommunitySurveyRoute } from "../routes/CommunitySurveyRoute"
import { PublicMapRoute } from "../routes/PublicMapRoute"
import { styles } from "../styles"
import type { PublicMapStackParamList } from "../types"
import { createBaseStackScreenOptions, hiddenNativeTitle } from "./stack-options"
import {
  ACCOUNT_SCREENS,
  makeAccountHomeOptions,
  makeOfflineAreasScreenOptions,
  makeSettingsScreenOptions,
} from "./AccountStack"

const PublicMapStack = createNativeStackNavigator<PublicMapStackParamList>()

export function PublicMapTabNavigator() {
  const theme = useBrandTheme()
  return (
    <View style={styles.tabScreenContainer}>
      <PublicMapStack.Navigator
        // D-19: the transparent halo header by default; the pushed pages draw a ScreenFrame. The map
        // (no header) gets its halo with plan 12.2-18.
        screenOptions={{ ...createBaseStackScreenOptions(theme), headerShown: false }}
      >
        <PublicMapStack.Screen name="publicMapHome" component={PublicMapRoute} />
        <PublicMapStack.Screen
          name="communitySurvey"
          options={{
            title: fr.navigation.headers.communitySurvey,
            headerShown: true,
            headerLargeTitle: false,
            ...hiddenNativeTitle,
          }}
          component={CommunitySurveyRoute}
        />
        <PublicMapStack.Screen
          name="accountHome"
          options={makeAccountHomeOptions(theme)}
          component={ACCOUNT_SCREENS.accountHome}
        />
        <PublicMapStack.Screen
          name="settings"
          options={makeSettingsScreenOptions(theme)}
          component={ACCOUNT_SCREENS.settings}
        />
        <PublicMapStack.Screen
          name="offlineAreas"
          options={makeOfflineAreasScreenOptions(theme)}
          component={ACCOUNT_SCREENS.offlineAreas}
        />
      </PublicMapStack.Navigator>
    </View>
  )
}
