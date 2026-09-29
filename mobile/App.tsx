import { useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import * as SplashScreen from "expo-splash-screen"
import { AppNavigation, useResetToHomeOnSignOut } from "./src/navigation/AppNavigation"
import { BrandThemeProvider, useBrandTheme } from "./src/app/theme"
import { formatUnsyncedWorkSummary } from "./src/app/local-data-owner"
import { OnboardingFlow } from "./src/screens/onboarding/OnboardingFlow"
import { AuthGateScreen } from "./src/screens/AuthGateScreen"
import { LocalDataOwnerConflictScreen } from "./src/screens/LocalDataOwnerConflictScreen"
import { ProfileSetupScreen } from "./src/screens/ProfileSetupScreen"
import { WelcomeScreen } from "./src/screens/WelcomeScreen"
import { AppStateProvider } from "./src/state/AppStateProvider"
import { useSession } from "./src/state/session-context"
import { loadOnboardingSeen } from "./src/storage/onboarding-preference"

// ONB-02: keeps the native splash (app.json's "expo-splash-screen" plugin config — same forest
// background and logo mark as TypewriterSplash) on screen until the JS tree has committed its
// first frame, so the OS never falls back to its own default white splash in between.
void SplashScreen.preventAutoHideAsync()

/**
 * App shell: the navigation tree plus the three session overlays. All state
 * lives in AppStateProvider (phase 01.9, D-01); this component reads only the
 * session context, so a status update or a keystroke does not re-render it.
 */
function AppShell() {
  const { state: session, actions } = useSession()
  useResetToHomeOnSignOut(session.isAuthenticated)
  const theme = useBrandTheme()
  const containerStyle = useMemo(
    () => [styles.container, { backgroundColor: theme.semanticColors.backgroundCanvas }],
    [theme],
  )
  const [profileSetupSkipped, setProfileSetupSkipped] = useState(false)
  // ONB-01: optimistically assume the carousel + permissions flow was already seen, so a
  // returning user never sees it flash on screen; the local_meta read (best-effort, see
  // storage/onboarding-preference.ts) flips this once, on a genuine first launch.
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadOnboardingSeen().then((seen) => {
      if (!cancelled && !seen) setShowOnboarding(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const needsProfileSetup =
    !profileSetupSkipped &&
    session.currentUser != null &&
    !session.currentUser.first_name &&
    !session.currentUser.last_name

  // OA-08: the welcome, once, when the profile has just been completed (not skipped, not signed out).
  const [welcomeName, setWelcomeName] = useState<string | null>(null)
  const previousNeedsProfileSetup = useRef(needsProfileSetup)
  useEffect(() => {
    if (
      previousNeedsProfileSetup.current &&
      !needsProfileSetup &&
      !profileSetupSkipped &&
      session.isAuthenticated
    ) {
      setWelcomeName(session.currentUser?.first_name?.trim() ?? "")
    }
    previousNeedsProfileSetup.current = needsProfileSetup
  }, [needsProfileSetup, profileSetupSkipped, session.currentUser, session.isAuthenticated])

  const showOwnerConflictOverlay =
    session.isAuthenticated && session.localDataOwnerStatus === "conflict"
  const showProfileSetupOverlay =
    session.isAuthenticated && needsProfileSetup && !showOwnerConflictOverlay

  const showAuthOverlay =
    !session.isAuthenticated &&
    !showOwnerConflictOverlay &&
    !showProfileSetupOverlay &&
    !showOnboarding

  return (
    <View style={containerStyle}>
      <SafeAreaView style={containerStyle} edges={["left", "right"]}>
        <View style={styles.appLayout}>
          <AppNavigation />
        </View>
      </SafeAreaView>

      {/* Auth screens rendered as overlays — outside the navigation tree so the
        NavigationContainer (and native tab bar) is always mounted and stable. */}
      {showAuthOverlay && (
        <View style={styles.overlay}>
          <AuthGateScreen
            apiUrl={session.apiUrl}
            onApiUrlChange={actions.setApiUrl}
            onLogin={actions.handleLogin}
            onRegister={actions.handleRegister}
            onForgotPassword={actions.handleForgotPassword}
            sessionRestoring={session.sessionRestoring}
            logoSource={require("./assets/logo-app.png")}
            heroMartenSource={require("./assets/auth/marten.png")}
          />
        </View>
      )}
      {showOwnerConflictOverlay && (
        <View style={styles.overlay}>
          <LocalDataOwnerConflictScreen
            foreignWorkSummary={formatUnsyncedWorkSummary(session.foreignWork)}
            foreignOwnerEmail={session.foreignOwnerEmail}
            onSwitchAccount={() => void actions.handleSwitchToOwnerAccount()}
            onDiscard={() => void actions.handleDiscardForeignData()}
            logoSource={require("./assets/logo-app.png")}
          />
        </View>
      )}
      {showProfileSetupOverlay && (
        <View style={styles.overlay}>
          <ProfileSetupScreen
            saving={session.profileUpdating}
            logoSource={require("./assets/logo-app.png")}
            onSave={async (firstName, lastName) => {
              await actions.handleUpdateProfile({
                first_name: firstName,
                last_name: lastName,
                display_name: [firstName, lastName].filter(Boolean).join(" "),
              })
            }}
            onSkip={() => setProfileSetupSkipped(true)}
          />
        </View>
      )}
      {welcomeName !== null && session.isAuthenticated && (
        <View style={styles.overlay}>
          <WelcomeScreen name={welcomeName} onContinue={() => setWelcomeName(null)} />
        </View>
      )}
      {showOnboarding && (
        <View style={styles.overlay}>
          <OnboardingFlow onDone={() => setShowOnboarding(false)} />
        </View>
      )}
    </View>
  )
}

export default function App() {
  useEffect(() => {
    void SplashScreen.hideAsync()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BrandThemeProvider>
          <AppStateProvider>
            <AppShell />
          </AppStateProvider>
        </BrandThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appLayout: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
})
