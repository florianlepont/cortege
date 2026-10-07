import { useMemo } from "react"
import { Platform, View } from "react-native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { brandColors, brandMediaBackdrop } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { useSurveyActions } from "../../state/surveys-context"
import { FactorDetailRoute } from "../routes/FactorDetailRoute"
import { CommunitySurveyRoute } from "../routes/CommunitySurveyRoute"
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
import { createBaseStackScreenOptions, hiddenNativeTitle } from "./stack-options"
import {
  ACCOUNT_SCREENS,
  makeAccountHomeOptions,
  makeOfflineAreasScreenOptions,
  makeSettingsScreenOptions,
} from "./AccountStack"
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
            // D-19: the transparent halo header by default; every page with a header draws a
            // ScreenFrame in its route, the factor pager included (12.2-15).
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
              // D-19: the halo runs on behind the header (stack default); the route's ScreenFrame
              // starts the list below it. The header items are set by SurveyListRoute.
            }}
            component={SurveyListRoute}
          />
          <SurveysStack.Screen
            name="surveyDetail"
            options={{
              // OA-94: the page names the survey itself, a "Détail" title says nothing.
              title: "",
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
            name="communitySurvey"
            options={{
              title: headers.communitySurvey,
              headerLargeTitle: false,
              ...hiddenNativeTitle,
            }}
            component={CommunitySurveyRoute}
          />
          <SurveysStack.Screen
            name="surveyContext"
            options={{
              title: headers.surveyContext,
              headerLargeTitle: false,
              ...hiddenNativeTitle,
            }}
            component={SurveyContextRoute}
          />
          <SurveysStack.Screen
            name="surveyScore"
            options={{
              title: headers.surveyScore,
              headerLargeTitle: false,
              ...hiddenNativeTitle,
            }}
            component={SurveyScoreRoute}
          />
          <SurveysStack.Screen
            name="surveyHistory"
            options={{
              title: headers.surveyHistory,
              headerLargeTitle: false,
              ...hiddenNativeTitle,
            }}
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
              // The pager draws the factor's name and the running total (OA-21).
              ...hiddenNativeTitle,
              // OA-111: iOS 26 and later pops a screen with a swipe from anywhere, which would take
              // the slide along the A to J strip for a "back". The back button stays.
              gestureEnabled: false,
              // D-19: the stack's transparent halo header; FactorDetailRoute draws the ScreenFrame.
            })}
            component={FactorDetailRoute}
          />
          <SurveysStack.Screen
            name="surveyParcels"
            options={({ route }) => ({
              title: route.params.mode === "wizard" ? headers.parcelsWizard : headers.parcels,
              headerLargeTitle: false,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: brandMediaBackdrop },
              // OA-91, OA-97: one full-screen map for the wizard step and the edit. On iOS the
              // header is transparent over the map with only the native glass back button; the
              // screen draws its own title pill. Android keeps its dark opaque header.
              presentation: "card" as const,
              ...(Platform.OS === "ios"
                ? {
                    headerTransparent: true,
                    headerBlurEffect: "none" as const,
                    headerStyle: { backgroundColor: "transparent" },
                    headerTintColor: brandColors.forest,
                    ...hiddenNativeTitle,
                  }
                : {
                    // The stack default is transparent (D-19); this map keeps its opaque bar.
                    headerTransparent: false,
                    headerStyle: { backgroundColor: brandMediaBackdrop },
                    headerTintColor: brandColors.white,
                    headerTitleStyle: {
                      color: brandColors.white,
                      fontSize: 18,
                      fontWeight: "800" as const,
                    },
                  }),
            })}
            component={ParcelSelectionRoute}
          />
          <SurveysStack.Screen
            name="accountHome"
            options={makeAccountHomeOptions(theme)}
            component={ACCOUNT_SCREENS.accountHome}
          />
          <SurveysStack.Screen
            name="settings"
            options={makeSettingsScreenOptions(theme)}
            component={ACCOUNT_SCREENS.settings}
          />
          <SurveysStack.Screen
            name="offlineAreas"
            options={makeOfflineAreasScreenOptions(theme)}
            component={ACCOUNT_SCREENS.offlineAreas}
          />
        </SurveysStack.Navigator>
      </View>
    </SurveysStackConfigContext.Provider>
  )
}
