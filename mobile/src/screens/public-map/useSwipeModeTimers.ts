import { useCallback, useEffect, useRef, useState } from "react"
import { AccessibilityInfo } from "react-native"
import { HINT_MS, IDLE_MS, idleExitEnabled } from "../../map/swipe-machine"
import { useLatestCallback } from "../../state/useLatestCallback"

type Params = {
  swipeMode: boolean
  /** How many layers of the cycle are skipped here (the entry notice). */
  skippedCount: number
  /** True while a finger is down: the idle timer does not run then. */
  gestureActive: () => boolean
  exitSwipe: () => void
  /** Called once on each entry into the swipe mode (the announcement). */
  onEnter: () => void
  /** Called when the swipe mode is off (nothing stays drawn). */
  onLeave: () => void
}

/**
 * The clocks of the swipe mode (UI-SPEC section 3): the skipped-layers notice for HINT_MS (the entry
 * hint stays until `dismissIntro`, the first touch of the map), and the idle exit after IDLE_MS without a gesture or an action. The idle timer is
 * restarted by `armIdle` (after every gesture end and action), paused during a gesture and off
 * while a screen reader is on, so nobody is ejected mid-action.
 */
export function useSwipeModeTimers({
  swipeMode,
  skippedCount,
  gestureActive,
  exitSwipe,
  onEnter,
  onLeave,
}: Params) {
  const [introHintVisible, setIntroHintVisible] = useState(false)
  const [skippedVisible, setSkippedVisible] = useState(false)
  const [screenReader, setScreenReader] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearIdle = useCallback(() => {
    if (idleTimer.current === null) return
    clearTimeout(idleTimer.current)
    idleTimer.current = null
  }, [])
  const armIdle = useLatestCallback(() => {
    clearIdle()
    if (!swipeMode || gestureActive() || !idleExitEnabled(screenReader)) return
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null
      exitSwipe()
    }, IDLE_MS)
  })

  const enter = useLatestCallback(() => {
    setIntroHintVisible(true)
    setSkippedVisible(skippedCount > 0)
    onEnter()
    return setTimeout(() => {
      setSkippedVisible(false)
    }, HINT_MS)
  })
  const dismissIntro = useCallback(() => setIntroHintVisible(false), [])
  const leave = useLatestCallback(() => {
    setIntroHintVisible(false)
    setSkippedVisible(false)
    onLeave()
  })

  useEffect(() => {
    if (!swipeMode) {
      leave()
      return undefined
    }
    const timer = enter()
    return () => clearTimeout(timer)
  }, [swipeMode, enter, leave])

  useEffect(() => {
    if (swipeMode) armIdle()
    return clearIdle
  }, [swipeMode, screenReader, armIdle, clearIdle])

  useEffect(() => {
    let active = true
    // The state starts false: only a screen reader found on changes it.
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (active && on) setScreenReader(true)
    })
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return { introHintVisible, skippedVisible, armIdle, clearIdle, dismissIntro }
}
