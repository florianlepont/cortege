import { useCallback, useEffect, useRef, useState } from "react"
import { AccessibilityInfo, Platform } from "react-native"

/** How long the "bring the count back to 0" caption stays under a locked row (O-32-3). */
export const LOCKED_CAPTION_MS = 4000

/**
 * The locked caption of a row of the F group list: `show()` displays it for a few seconds and
 * announces it on iOS. Shared by a group row (untick while counted) and the "no tree" row (choose
 * while a count is above 0), so the two behave alike.
 */
export function useLockedCaption(message: string): { shown: boolean; show: () => void } {
  const [shown, setShown] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )
  const show = useCallback((): void => {
    if (timer.current !== null) clearTimeout(timer.current)
    setShown(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setShown(false)
    }, LOCKED_CAPTION_MS)
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(message)
  }, [message])
  return { shown, show }
}
