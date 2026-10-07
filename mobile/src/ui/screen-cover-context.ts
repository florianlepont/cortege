import { createContext, useContext } from "react"

/**
 * True while a full-screen overlay (sign-in, onboarding, profile setup, welcome, owner conflict)
 * covers the navigation tree. The tree stays mounted under those overlays, so a screen cannot tell
 * from its own mount or focus that nobody sees it yet. Provided by `AppShell` in `App.tsx`; with no
 * provider (tests, storybook-like renders) nothing is covered.
 */
export const ScreenCoverContext = createContext(false)

export function useScreenCovered(): boolean {
  return useContext(ScreenCoverContext)
}
