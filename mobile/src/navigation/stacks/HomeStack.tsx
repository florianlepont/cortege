import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { HomeRoute } from "../routes/HomeRoute"
import { styles } from "../styles"
import type { HomeStackParamList } from "../types"
import { createBaseStackScreenOptions } from "./stack-options"
import {
  ACCOUNT_SCREENS,
  makeAccountHomeOptions,
  offlineAreasScreenOptions,
  settingsScreenOptions,
} from "./AccountStack"

const HomeStack = createNativeStackNavigator<HomeStackParamList>()

export function HomeTabNavigator() {
  const theme = useBrandTheme()
  return (
    <View style={styles.tabScreenContainer}>
      <HomeStack.Navigator
        screenOptions={{ ...createBaseStackScreenOptions(theme), headerShown: false }}
      >
        <HomeStack.Screen name="homeRoot" component={HomeRoute} />
        <HomeStack.Screen
          name="accountHome"
          options={makeAccountHomeOptions(theme.semanticColors.textStrong)}
          component={ACCOUNT_SCREENS.accountHome}
        />
        <HomeStack.Screen
          name="settings"
          options={settingsScreenOptions}
          component={ACCOUNT_SCREENS.settings}
        />
        <HomeStack.Screen
          name="offlineAreas"
          options={offlineAreasScreenOptions}
          component={ACCOUNT_SCREENS.offlineAreas}
        />
      </HomeStack.Navigator>
    </View>
  )
}
