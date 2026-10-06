import { useCallback, useEffect, useMemo, useRef } from "react"
import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import BottomSheet, {
  BottomSheetScrollView,
  type BottomSheetBackgroundProps,
} from "@gorhom/bottom-sheet"
import { BlurView } from "expo-blur"
import { brandRadius } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"

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

// DS-15 (UX audit, Phase 12): the sheet's own background, blurred instead of a flat panel fill —
// `expo-blur` (already installed), tinted to the app's own light/dark theme rather than the OS
// scheme, so it always matches a manual theme override too.
function SheetBackground({ style, pointerEvents }: BottomSheetBackgroundProps) {
  const { scheme } = useBrandTheme()
  return (
    <View pointerEvents={pointerEvents} style={[style, backgroundShape]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={50}
        tint={scheme === "dark" ? "dark" : "light"}
      />
    </View>
  )
}

export function ExplorerSheet({ visible, onDismiss, children }: ExplorerSheetProps) {
  const sheetRef = useRef<BottomSheet>(null)
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

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
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onChange={handleChange}
      backgroundComponent={SheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {children}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

// The background's shape (radius, clipping) is static and shared with `SheetBackground`, which
// renders outside any per-render `createStyles(theme)` call — its fill is the blur, not a color.
const backgroundShape = StyleSheet.create({
  shape: {
    overflow: "hidden" as const,
    borderTopLeftRadius: brandRadius.panel,
    borderTopRightRadius: brandRadius.panel,
  },
}).shape

// MAP-01: the tiered sheet's own chrome (drag handle, content padding) — the content components it
// hosts (SelectedSurveyCard, ClusterListSheet, ParcelHistoryCard) no longer draw their own
// card/position.
function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    handleIndicator: {
      backgroundColor: theme.colors.divider,
      width: 44,
    },
    content: {
      paddingHorizontal: 18,
      paddingBottom: 24,
      gap: 12,
    },
  })
}
