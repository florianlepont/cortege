import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import {
  Keyboard,
  Platform,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type View,
} from "react-native"
import { useReducedMotion } from "react-native-reanimated"
import { brandSpacing4 } from "../app/brand-tokens"

/** The room kept between the bottom of the field's card and the top of the keyboard. */
export const KEYBOARD_CLEARANCE = brandSpacing4.md

export type ScrollIntoViewOnKeyboard = {
  /** Put on the card (a plain `View` with `collapsable={false}`) that must end above the keyboard. */
  targetRef: RefObject<View | null>
  /** Call when the field takes focus. */
  onFieldFocus: () => void
  /** Pass to the scroll view's `onScroll`: the hook needs the current offset. */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  /** Bottom room to give the scroll content while the keyboard is up (0 otherwise). */
  keyboardInset: number
}

/**
 * Brings a field of a scroll view above the keyboard (27 D-46). `automaticallyAdjustKeyboardInsets`
 * alone does not do it on the summary of a survey in a Release build: the page sits under the
 * native large title, and the last card stays under the keyboard. This hook does it by hand and
 * is reusable for any page whose field sits low in a `ScrollView`:
 *
 * - it listens to the keyboard (iOS `keyboardWillShow` / `keyboardWillHide`, Android
 *   `keyboardDidShow` / `keyboardDidHide`) and keeps its height as `keyboardInset`, the room the
 *   content needs at the bottom so that the last card can reach the top of the keyboard (the page
 *   adds it to its bottom padding, and it goes away when the keyboard hides);
 * - when the field takes focus it waits for the keyboard to be shown (the focus comes first), then,
 *   on the next frame, measures the card on screen and scrolls the page by what hides its bottom
 *   edge (plus `KEYBOARD_CLEARANCE`). It never scrolls up, and not at all when the card is already
 *   clear of the keyboard. The scroll is by a delta from the offset tracked through `onScroll`,
 *   so the insets a native large title adds do not matter.
 */
export function useScrollIntoViewOnKeyboard(
  scrollRef: RefObject<ScrollView | null>,
): ScrollIntoViewOnKeyboard {
  const reduceMotion = useReducedMotion()
  const targetRef = useRef<View>(null)
  const [keyboardInset, setKeyboardInset] = useState(0)
  const [request, setRequest] = useState(0)
  // The keyboard's top edge on screen, null while it is hidden.
  const keyboardTop = useRef<number | null>(null)
  const focusPending = useRef(false)
  const offset = useRef(0)
  const reduceMotionRef = useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion

  useEffect(() => {
    const ios = Platform.OS === "ios"
    const shown = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      (event: KeyboardEvent) => {
        keyboardTop.current = event.endCoordinates.screenY
        setKeyboardInset(event.endCoordinates.height)
        if (focusPending.current) {
          focusPending.current = false
          setRequest((count) => count + 1)
        }
      },
    )
    const hidden = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => {
      keyboardTop.current = null
      focusPending.current = false
      setKeyboardInset(0)
    })
    return () => {
      shown.remove()
      hidden.remove()
    }
  }, [])

  // One scroll per request, on the frame after the content got its bottom room.
  useEffect(() => {
    if (request === 0) return
    const frame = requestAnimationFrame(() => {
      const target = targetRef.current
      const top = keyboardTop.current
      if (target === null || top === null) return
      target.measureInWindow((_x, y, _width, height) => {
        const hidden = y + height + KEYBOARD_CLEARANCE - top
        if (hidden <= 0) return
        scrollRef.current?.scrollTo({
          y: offset.current + hidden,
          animated: !reduceMotionRef.current,
        })
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [request, scrollRef])

  const onFieldFocus = useCallback(() => {
    if (keyboardTop.current !== null) {
      // The keyboard is already up (switching from another field): nothing to wait for.
      setRequest((count) => count + 1)
      return
    }
    focusPending.current = true
  }, [])

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y
  }, [])

  return { targetRef, onFieldFocus, onScroll, keyboardInset }
}
