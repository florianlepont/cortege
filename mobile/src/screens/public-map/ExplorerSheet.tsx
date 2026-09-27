import { useCallback, useEffect, useRef } from "react"
import type { ReactNode } from "react"
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { sheetStyles as styles } from "./styles"

// MAP-01: the tiered sheet (2 detents — half and nearly full) replacing the absolutely-positioned
// AppCards for the selected survey, a cluster's list and a parcel's history. Closed (index -1, no
// screen space) when nothing is selected; opens to the first detent once content appears, and
// dragging it back past that detent reports the dismissal so the screen can clear the selection.
const SNAP_POINTS = ["50%", "92%"]

export type ExplorerSheetProps = {
  visible: boolean
  onDismiss: () => void
  children: ReactNode
}

export function ExplorerSheet({ visible, onDismiss, children }: ExplorerSheetProps) {
  const sheetRef = useRef<BottomSheet>(null)

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0)
    } else {
      sheetRef.current?.close()
    }
  }, [visible])

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onDismiss()
      }
    },
    [onDismiss],
  )

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      onChange={handleChange}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {children}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}
