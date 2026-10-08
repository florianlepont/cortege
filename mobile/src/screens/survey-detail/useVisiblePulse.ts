import { useEffect, useState } from "react"

/** What the summary needs of its navigation to know when it is on screen (all optional: tests). */
export type PulseNavigation = {
  isFocused?: () => boolean
  addListener?: (
    type: "transitionEnd" | "focus",
    callback: (event: { data?: { closing?: boolean } }) => void,
  ) => () => void
}

/** If the native "appeared" event does not come, the halo plays this long after the focus. */
export const APPEAR_FALLBACK_MS = 600

/**
 * D-26: the finish can start on the factor pager, pushed over the summary. The success haptic
 * plays at once (`useSubmitSuccessPulse`, felt where the surveyor tapped), but the score card's
 * halo and pop are things to see: while the summary is covered, they wait until it is back on
 * screen (the end of the pop transition, or 600 ms after it regains focus), so they are not spent
 * under the pager. Returns the trigger to give the score card; on screen it follows at once.
 */
export function useVisiblePulse(trigger: number, navigation: PulseNavigation): number {
  const [shown, setShown] = useState(trigger)

  useEffect(() => {
    if (trigger === shown) return
    const show = (): void => setShown(trigger)
    if (navigation.isFocused?.() !== false) {
      show()
      return
    }
    let timer: ReturnType<typeof setTimeout> | null = null
    const offAppear = navigation.addListener?.("transitionEnd", (event) => {
      if (event.data?.closing !== true) show()
    })
    const offFocus = navigation.addListener?.("focus", () => {
      timer = setTimeout(show, APPEAR_FALLBACK_MS)
    })
    return () => {
      offAppear?.()
      offFocus?.()
      if (timer) clearTimeout(timer)
    }
  }, [trigger, shown, navigation])

  return shown
}
