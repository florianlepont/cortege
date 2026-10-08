import { NavigationContext } from "@react-navigation/native"
import { useContext, useEffect, useState } from "react"

/**
 * Whether the screen that renders this hook is the focused one in its navigator.
 *
 * `useIsFocused` throws outside a navigator, which would break every screen test rendered without
 * one, so this reads `NavigationContext` directly: with no navigator the screen counts as
 * focused. Used to run decorative loops (contour drift) only while the screen is visible.
 */
export function useScreenFocus(): boolean {
  const navigation = useContext(NavigationContext)
  const [focused, setFocused] = useState<boolean>(() => navigation?.isFocused() ?? true)

  useEffect(() => {
    if (!navigation) return undefined
    setFocused(navigation.isFocused())
    const unsubscribeFocus = navigation.addListener("focus", () => setFocused(true))
    const unsubscribeBlur = navigation.addListener("blur", () => setFocused(false))
    return () => {
      unsubscribeFocus()
      unsubscribeBlur()
    }
  }, [navigation])

  return focused
}
