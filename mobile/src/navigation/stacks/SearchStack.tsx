import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { SurveySearchRoute } from "../routes/SurveySearchRoute"
import { styles } from "../styles"
import type { SearchStackParamList } from "../types"
import { createBaseStackScreenOptions } from "./stack-options"

const SearchStack = createNativeStackNavigator<SearchStackParamList>()

/** The iOS search tab (OA-52): one screen, the same page the other platforms push from Mes Relevés. */
export function SearchTabNavigator() {
  const theme = useBrandTheme()
  return (
    <View style={styles.tabScreenContainer}>
      <SearchStack.Navigator
        screenOptions={{ ...createBaseStackScreenOptions(theme), headerShown: false }}
      >
        <SearchStack.Screen name="searchHome" component={SurveySearchRoute} />
      </SearchStack.Navigator>
    </View>
  )
}
