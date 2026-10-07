import { useCallback, useState } from "react"
import type { LayoutChangeEvent } from "react-native"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { estimateFinishBarHeight } from "./finish-bar-layout"

/**
 * What the bar occupies from the bottom edge of the page, for the scroll content's bottom padding,
 * or null when there is no bar. The bar floats over the scroll area now, so at maximum scroll the
 * last row must end above it: the measured height once known, the estimate before.
 */
export function useFinishBarHeight(visible: boolean): {
  barHeight: number | null
  onBarLayout: (event: LayoutChangeEvent) => void
} {
  const clearance = useTabBarClearance()
  const [measured, setMeasured] = useState(0)
  const onBarLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.ceil(event.nativeEvent.layout.height)
    setMeasured((previous) => (previous === height ? previous : height))
  }, [])
  return {
    barHeight: visible ? Math.max(measured, estimateFinishBarHeight(clearance)) : null,
    onBarLayout,
  }
}
