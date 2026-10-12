import { useEffect, useState } from "react"
import { Keyboard, Platform } from "react-native"
import { ReduceMotion, useAnimatedStyle, withTiming } from "react-native-reanimated"
import { brandMotion } from "../../app/brand-tokens"

/**
 * Whether the keyboard is up (phase 27, UI-SPEC 2.4, U-07). iOS answers when the keyboard starts to
 * move (`keyboardWillShow`), so the chrome fades with it; Android has no "will" events and answers
 * when it has appeared (`keyboardDidShow`). The pager hides its floating chrome while this is true,
 * the pattern of `ProfileSetupScreen`'s keyboard listener.
 */
export function usePagerKeyboard(): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const ios = Platform.OS === "ios"
    const shown = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () =>
      setVisible(true),
    )
    const hidden = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () =>
      setVisible(false),
    )
    return () => {
      shown.remove()
      hidden.remove()
    }
  }, [])

  return visible
}

/**
 * The opacity of the pager's floating chrome (the bottom bar and the finish row): 1, or 0 over
 * 160 ms while the keyboard is up (none under Reduce Motion). Only the opacity changes, so the
 * frame stays put and nothing re-lays out. The target is read from the JS value inside the
 * style worklet, so a change of `hidden` re-runs it.
 */
export function usePagerChromeStyle(hidden: boolean) {
  return useAnimatedStyle(() => ({
    opacity: withTiming(hidden ? 0 : 1, {
      duration: brandMotion.durations.fast,
      reduceMotion: ReduceMotion.System,
    }),
  }))
}
