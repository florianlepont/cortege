import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { PublicMapRoute } from "../routes/PublicMapRoute"
import { styles } from "../styles"
import type { PublicMapStackParamList } from "../types"
import { createBaseStackScreenOptions } from "./stack-options"
import { ACCOUNT_SCREENS, makeAccountHomeOptions, settingsScreenOptions } from "./AccountStack"

const PublicMapStack = createNativeStackNavigator<PublicMapStackParamList>()

export function PublicMapTabNavigator() {
  const theme = useBrandTheme()
  return (
    <View style={styles.tabScreenContainer}>
      <PublicMapStack.Navigator
        screenOptions={{ ...createBaseStackScreenOptions(theme), headerShown: false }}
      >
        <PublicMapStack.Screen name="publicMapHome" component={PublicMapRoute} />
        <PublicMapStack.Screen
          name="accountHome"
          options={makeAccountHomeOptions(theme.semanticColors.textStrong)}
          component={ACCOUNT_SCREENS.accountHome}
        />
        <PublicMapStack.Screen
          name="settings"
          options={settingsScreenOptions}
          component={ACCOUNT_SCREENS.settings}
        />
      </PublicMapStack.Navigator>
    </View>
  )
}
