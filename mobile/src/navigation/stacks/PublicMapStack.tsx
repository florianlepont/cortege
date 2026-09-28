import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { PublicMapRoute } from "../routes/PublicMapRoute"
import { styles } from "../styles"
import type { PublicMapStackParamList } from "../types"
import { createBaseStackScreenOptions } from "./stack-options"

const PublicMapStack = createNativeStackNavigator<PublicMapStackParamList>()

export function PublicMapTabNavigator() {
  const theme = useBrandTheme()
  return (
    <View style={styles.tabScreenContainer}>
      <PublicMapStack.Navigator
        screenOptions={{ ...createBaseStackScreenOptions(theme), headerShown: false }}
      >
        <PublicMapStack.Screen name="publicMapHome" component={PublicMapRoute} />
      </PublicMapStack.Navigator>
    </View>
  )
}
