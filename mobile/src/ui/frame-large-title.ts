import { createContext, useContext } from "react"

/**
 * 12.2-17 (collapsing titles): set by `<ScreenFrame largeTitle>` (`ui/ScreenFrame.tsx`) for the
 * page inside it. Its own module, so the title components read it without importing the frame.
 */
export const FrameLargeTitleContext = createContext(false)

/**
 * True inside `<ScreenFrame largeTitle>`: the native iOS large title names the page, so the page
 * does not draw its own title (`PageTitle` and the survey titles render nothing) and its first
 * scroll view leaves the insets to the system.
 */
export function useFrameLargeTitle(): boolean {
  return useContext(FrameLargeTitleContext)
}

/**
 * The `contentInsetAdjustmentBehavior` of a framed page's first scroll view. Under the native
 * large title it is "automatic": iOS insets the content below the header (large or collapsed) and
 * above the tab bar, which is also what makes the title collapse as the page scrolls. Otherwise
 * "never", the frame's header padding and the page's own tab bar padding place it (D-19).
 */
export function useFrameInsetBehavior(): "automatic" | "never" {
  return useFrameLargeTitle() ? "automatic" : "never"
}
