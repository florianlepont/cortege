import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SearchGroupRoute } from "../routes/SearchGroupRoute"
import { SearchHomeRoute } from "../routes/SearchHomeRoute"
import { styles } from "../styles"
import type { SearchStackParamList } from "../types"
import { createBaseStackScreenOptions, pageTitleOptions } from "./stack-options"

const SearchStack = createNativeStackNavigator<SearchStackParamList>()

/**
 * The search tab on every platform (D-01): the native search tab on iOS, the fourth JS tab
 * elsewhere, both mounting this one stack. `searchHome` is the search page (no native header, it
 * draws its own field); `searchGroup` is the full list of one group, pushed from "Voir les N" or a
 * member, with the native large title on iOS and the back label "Rechercher".
 */
export function SearchTabNavigator() {
  const theme = useBrandTheme()
  return (
    <View style={styles.tabScreenContainer}>
      <SearchStack.Navigator
        screenOptions={{ ...createBaseStackScreenOptions(theme), headerShown: false }}
      >
        <SearchStack.Screen name="searchHome" component={SearchHomeRoute} />
        <SearchStack.Screen
          name="searchGroup"
          options={{
            // The route sets the counted title itself once the group answered.
            title: fr.navigation.tabs.search,
            headerShown: true,
            headerBackTitle: fr.search.list.backLabel,
            ...pageTitleOptions(theme),
          }}
          component={SearchGroupRoute}
        />
      </SearchStack.Navigator>
    </View>
  )
}
