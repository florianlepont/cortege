import { View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { DmhGuideRoute } from "../routes/DmhGuideRoute"
import { SearchGroupRoute } from "../routes/SearchGroupRoute"
import { SearchHomeRoute } from "../routes/SearchHomeRoute"
import { styles } from "../styles"
import type { SearchStackParamList } from "../types"
import {
  createBaseStackScreenOptions,
  dmhGuideScreenOptions,
  pageTitleOptions,
} from "./stack-options"

const SearchStack = createNativeStackNavigator<SearchStackParamList>()

/**
 * The search tab on every platform (D-01): the native search tab on iOS, the fourth JS tab
 * elsewhere, both mounting this one stack. `searchHome` is the search page (no native header, it
 * draws its own field); `searchGroup` is the full list of one group, pushed from "Voir les N" or a
 * member, with the native large title on iOS and the back label "Rechercher". `surveyDmhGuide` is
 * the dendromicrohabitat guide sheet a guide result opens (same route component and options as in
 * the survey and Accueil stacks); closing it returns to the search.
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
        <SearchStack.Screen
          name="surveyDmhGuide"
          component={DmhGuideRoute}
          options={dmhGuideScreenOptions(theme)}
        />
      </SearchStack.Navigator>
    </View>
  )
}
