import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import { AppNavigation } from "./src/navigation/AppNavigation"
import { brandColors } from "./src/app/brand-tokens"
import { formatUnsyncedWorkSummary } from "./src/app/local-data-owner"
import { OnboardingFlow } from "./src/screens/onboarding/OnboardingFlow"
import { AuthGateScreen } from "./src/screens/AuthGateScreen"
import { LocalDataOwnerConflictScreen } from "./src/screens/LocalDataOwnerConflictScreen"
import { ProfileSetupScreen } from "./src/screens/ProfileSetupScreen"
import { AppStateProvider } from "./src/state/AppStateProvider"
import { useSession } from "./src/state/session-context"
import { loadOnboardingSeen } from "./src/storage/onboarding-preference"

/**
 * App shell: the navigation tree plus the three session overlays. All state
 * lives in AppStateProvider (phase 01.9, D-01); this component reads only the
 * session context, so a status update or a keystroke does not re-render it.
 */
function AppShell() {
  const { state: session, actions } = useSession()
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

  const showAuthOverlay = !session.isAuthenticated
  const showOwnerConflictOverlay =
    session.isAuthenticated && session.localDataOwnerStatus === "conflict"
  const showProfileSetupOverlay =
    session.isAuthenticated && needsProfileSetup && !showOwnerConflictOverlay

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
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
      {showOnboarding && (
        <View style={styles.overlay}>
          <OnboardingFlow onDone={() => setShowOnboarding(false)} />
        </View>
      )}
    </View>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <AppShell />
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.canvas,
  },
  appLayout: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
})
