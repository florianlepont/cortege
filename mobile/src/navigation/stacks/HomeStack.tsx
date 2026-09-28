import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { HomeRoute } from "../routes/HomeRoute"
import { styles } from "../styles"
import type { HomeStackParamList } from "../types"
import { createBaseStackScreenOptions } from "./stack-options"

const HomeStack = createNativeStackNavigator<HomeStackParamList>()

export function HomeTabNavigator() {
  const theme = useBrandTheme()
  return (
    <View style={styles.tabScreenContainer}>
      <HomeStack.Navigator
        screenOptions={{ ...createBaseStackScreenOptions(theme), headerShown: false }}
      >
        <HomeStack.Screen name="homeRoot" component={HomeRoute} />
      </HomeStack.Navigator>
    </View>
  )
}
