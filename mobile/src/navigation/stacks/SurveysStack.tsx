import { useMemo } from "react"
import { Platform, View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { brandColors, brandMediaBackdrop } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { useSurveyActions } from "../../state/surveys-context"
import { FactorDetailRoute } from "../routes/FactorDetailRoute"
import { ParcelSelectionRoute } from "../routes/ParcelSelectionRoute"
import { SurveyContextRoute } from "../routes/SurveyContextRoute"
import { SurveyDetailRoute } from "../routes/SurveyDetailRoute"
import { SurveyHistoryRoute } from "../routes/SurveyHistoryRoute"
import { SurveyScoreRoute } from "../routes/SurveyScoreRoute"
import { SurveySearchRoute } from "../routes/SurveySearchRoute"
import { SurveyFormRoute } from "../routes/SurveyFormRoute"
import { SurveyListRoute } from "../routes/SurveyListRoute"
import { styles } from "../styles"
import type { SurveysStackParamList } from "../types"
import { createBaseStackScreenOptions } from "./stack-options"
import { ACCOUNT_SCREENS, makeAccountHomeOptions, settingsScreenOptions } from "./AccountStack"
import { SurveysStackConfigContext, type SurveysStackConfig } from "./surveys-stack-config"

const SurveysStack = createNativeStackNavigator<SurveysStackParamList>()
const headers = fr.navigation.headers

type SurveysTabNavigatorProps = { useNativeNav?: boolean }

/**
 * The one survey stack (D-08). In the native iOS tree, Mes Relevés shows the
 * native header with its search bar (set up by SurveyListRoute); elsewhere the
 * list keeps its own inline search.
 */
export function SurveysTabNavigator({ useNativeNav = false }: SurveysTabNavigatorProps) {
  const surveyActions = useSurveyActions()
  const theme = useBrandTheme()
  const nativeSearchEnabled = useNativeNav && Platform.OS === "ios"
  const config = useMemo<SurveysStackConfig>(() => ({ useNativeNav }), [useNativeNav])

  return (
    <SurveysStackConfigContext.Provider value={config}>
      <View style={styles.tabScreenContainer}>
        <SurveysStack.Navigator
          screenOptions={{
            ...createBaseStackScreenOptions(theme),
            headerLargeTitle: false,
            ...(useNativeNav
              ? {}
              : {
                  headerShown: true,
                  headerTitleAlign: "left",
                  headerTitleStyle: {
                    fontSize: 30,
                    fontWeight: "900" as const,
                    color: theme.colors.forest,
                  },
                  headerStyle: { backgroundColor: theme.colors.canvas },
                  headerShadowVisible: false,
                  headerTintColor: theme.colors.forest,
                }),
          }}
        >
          <SurveysStack.Screen
            name="surveysHome"
            options={{
              title: headers.surveys,
              headerShown: nativeSearchEnabled,
              headerLargeTitle: false,
              headerTransparent: nativeSearchEnabled ? false : undefined,
              headerShadowVisible: false,
              // headerSearchBarOptions are set by SurveyListRoute (it owns the query).
            }}
            component={SurveyListRoute}
          />
          <SurveysStack.Screen
            name="surveyDetail"
            options={{
              title: headers.detail,
              headerLargeTitle: false,
            }}
            listeners={{
              beforeRemove: () => {
                surveyActions.closeSurveyDetailSelection()
              },
            }}
            component={SurveyDetailRoute}
          />
          <SurveysStack.Screen
            name="surveySearch"
            options={{ headerShown: false }}
            component={SurveySearchRoute}
          />
          <SurveysStack.Screen
            name="surveyContext"
            options={{ title: headers.surveyContext, headerLargeTitle: false }}
            component={SurveyContextRoute}
          />
          <SurveysStack.Screen
            name="surveyScore"
            options={{ title: headers.surveyScore, headerLargeTitle: false }}
            component={SurveyScoreRoute}
          />
          <SurveysStack.Screen
            name="surveyHistory"
            options={{ title: headers.surveyHistory, headerLargeTitle: false }}
            component={SurveyHistoryRoute}
          />
          <SurveysStack.Screen
            name="surveyForm"
            options={{
              // The wizard draws its own top bar (step counter and progress).
              headerShown: false,
            }}
            component={SurveyFormRoute}
          />
          <SurveysStack.Screen
            name="surveyFactorDetail"
            options={({ route }) => ({
              title: headers.factor(route.params.factor),
              headerLargeTitle: false,
            })}
            component={FactorDetailRoute}
          />
          <SurveysStack.Screen
            name="surveyParcels"
            options={({ route }) => ({
              title: route.params.mode === "wizard" ? headers.parcelsWizard : headers.parcels,
              headerLargeTitle: false,
              headerStyle: { backgroundColor: brandMediaBackdrop },
              headerShadowVisible: false,
              headerTintColor: brandColors.white,
              headerTitleStyle: {
                color: brandColors.white,
                fontSize: 18,
                fontWeight: "800" as const,
              },
              contentStyle: { backgroundColor: brandMediaBackdrop },
              // New survey (step 4 of 4): a full-screen push, like the other steps. Editing a
              // survey's parcels keeps the DS-15 (UX audit, Phase 12) formSheet with detents, a
              // partial sheet that keeps the map visible, expandable to nearly full height.
              ...(route.params.mode === "wizard"
                ? { presentation: "card" as const }
                : {
                    presentation: "formSheet" as const,
                    sheetAllowedDetents: [0.62, 0.94],
                    sheetInitialDetentIndex: 1,
                    sheetGrabberVisible: true,
                    sheetCornerRadius: 24,
                    sheetExpandsWhenScrolledToEdge: true,
                  }),
            })}
            component={ParcelSelectionRoute}
          />
          <SurveysStack.Screen
            name="accountHome"
            options={makeAccountHomeOptions(theme.semanticColors.textStrong)}
            component={ACCOUNT_SCREENS.accountHome}
          />
          <SurveysStack.Screen
            name="settings"
            options={settingsScreenOptions}
            component={ACCOUNT_SCREENS.settings}
          />
        </SurveysStack.Navigator>
      </View>
    </SurveysStackConfigContext.Provider>
  )
}
