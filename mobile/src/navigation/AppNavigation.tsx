import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StatusBar } from "react-native"
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native"
import { useBrandTheme } from "../app/theme"
import { useSession } from "../state/session-context"
import { buildNavigationTheme, statusBarStyleForScheme } from "./navigation-theme"
import { getNativeTabsAvailability, type NativeTabsAvailability } from "./native-tabs-availability"
import { PublicMapReloadContext, createPublicMapReloadSignal } from "./public-map-reload"
import { getFocusedLeafRouteName, shouldHideTabBar, type NavigationStateLike } from "./tab-bar"
import { JsRootTabs } from "./tabs/JsRootTabs"
import { NativeRootTabs } from "./tabs/NativeRootTabs"

/*
 * The navigation tree (phase 01.9-18 and 01.9-24, D-01 and D-04). One
 * NavigationContainer holds either the native (iOS) or the JS root tabs. The
 * tree passes no data: every screen is a route component under routes/ that
 * reads its own contexts, and the tree itself reads only stable action objects
 * and the session (for the isAuthenticated check in the tab listeners).
 *
 * Tabs (01.9-25, D-08): four tabs; the native tree is chosen by
 * native-tabs-availability.ts and the tab bar hides by the tab-bar.ts rule.
 *
 * Layout: tab-config.tsx (icons, titles, options, listeners), tabs/ (the two
 * root tab navigators), stacks/ (one stack navigator per tab), routes/ (the
 * screens), types.ts (param lists and the global RootParamList).
 */

// ─── Root (single NavigationContainer) ───────────────────────────────────────

function AppTabs({
  availability,
  tabBarHidden,
}: {
  availability: NativeTabsAvailability
  tabBarHidden: boolean
}) {
  const { scheme } = useBrandTheme()

  useEffect(() => {
    if (!availability.native) {
      console.warn(`[tabs] native=false reason=${availability.reason}`)
    } else if (availability.envOptOutIgnored) {
      console.info(
        "[tabs] native=true reason=ok (EXPO_PUBLIC_ENABLE_NATIVE_TABS=false ignored in Release)",
      )
    }
  }, [availability])

  return (
    <>
      {/* BUG-06 (UX audit, Phase 2) + DS-12 (Phase 12): every tab screen has a canvas/map
          background matching the active theme, so the status bar always reads against it —
          dark-content on light canvas, light-content on the dark theme's near-black canvas. */}
      <StatusBar barStyle={statusBarStyleForScheme(scheme)} />
      {availability.native ? <NativeRootTabs tabBarHidden={tabBarHidden} /> : <JsRootTabs />}
    </>
  )
}

const navigationRef = createNavigationContainerRef<ReactNavigation.RootParamList>()

/**
 * OA-07: sign-out happens from the Compte tab, and the tabs stayed there, so the next sign-in
 * (and a new account's profile setup) landed on Compte. Every session end resets the tree to
 * Accueil.
 */
function useResetToHomeOnSignOut(isAuthenticated: boolean): void {
  const wasAuthenticated = useRef(isAuthenticated)
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated && navigationRef.isReady()) {
      navigationRef.resetRoot({ index: 0, routes: [{ name: "home" }] })
    }
    wasAuthenticated.current = isAuthenticated
  }, [isAuthenticated])
}

export function AppNavigation() {
  const { scheme, semanticColors } = useBrandTheme()
  const { state: session } = useSession()
  useResetToHomeOnSignOut(session.isAuthenticated)
  const [publicMapReload] = useState(createPublicMapReloadSignal)
  // Decided once per mount: the inputs are fixed for the lifetime of the bundle.
  const [availability] = useState(() => getNativeTabsAvailability())
  // The native tab bar can only be hidden at the navigator level, so the
  // focused leaf route is tracked here (D-13). The boolean state only changes
  // when entering or leaving a route without a tab bar, so ordinary navigation
  // does not re-render the tabs. The JS tree hides its bar per screen instead.
  const [tabBarHidden, setTabBarHidden] = useState(false)
  const onStateChange = useCallback((state: NavigationStateLike | undefined) => {
    setTabBarHidden(shouldHideTabBar(getFocusedLeafRouteName(state)))
  }, [])

  // DS-12: the container theme colors the brief flash a screen transition can show before a
  // screen's own themed background paints, and native-stack's default header/border colors on any
  // screen that does not set its own headerStyle.
  const navigationTheme = useMemo(
    () => buildNavigationTheme(scheme, semanticColors),
    [scheme, semanticColors],
  )

  return (
    <PublicMapReloadContext.Provider value={publicMapReload}>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onStateChange={availability.native ? onStateChange : undefined}
      >
        <AppTabs availability={availability} tabBarHidden={tabBarHidden} />
      </NavigationContainer>
    </PublicMapReloadContext.Provider>
  )
}
