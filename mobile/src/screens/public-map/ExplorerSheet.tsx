import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import {
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import { BlurView } from "expo-blur"
import { brandRadius } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"

// MAP-01: the one panel of the Explorer (a selected survey, a cluster's list, a parcel's history,
// the offline areas). It rises from the bottom edge, above the tab bar, to half of the screen and
// scrolls inside; a swipe down on its handle dismisses it, and the content's own close button
// does the same. It is drawn with plain Animated: the bottom-sheet library opened it as a sliver
// on iOS 27 (no snap, no animation reported), and the panel has no need of a second detent.
const HEIGHT_RATIO = 0.55
const DISMISS_DISTANCE = 80
const DISMISS_VELOCITY = 0.8
const OPEN_MS = 240
const CLOSE_MS = 180

export type ExplorerSheetProps = {
  visible: boolean
  onDismiss: () => void
  /** Space kept free under the panel (the tab bar). */
  bottomInset?: number
  children: ReactNode
}

// DS-15 (UX audit, Phase 12): the panel's own background, blurred instead of a flat fill,
// tinted to the app's own light/dark theme rather than the OS scheme.
function SheetBackground() {
  const { scheme } = useBrandTheme()
  return (
    <BlurView
      style={StyleSheet.absoluteFill}
      intensity={50}
      tint={scheme === "dark" ? "dark" : "light"}
    />
  )
}

export function ExplorerSheet({
  visible,
  onDismiss,
  bottomInset = 0,
  children,
}: ExplorerSheetProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { height: windowHeight } = useWindowDimensions()
  const sheetHeight = Math.round(windowHeight * HEIGHT_RATIO)
  const translateY = useRef(new Animated.Value(sheetHeight)).current
  // Kept mounted while it slides out, so the close is seen.
  const [mounted, setMounted] = useState(visible)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss
  // The content stays while the panel slides out, even though the screen has already cleared it.
  const shownRef = useRef(children)
  if (visible) shownRef.current = children

  useEffect(() => {
    if (visible) {
      setMounted(true)
      Animated.timing(translateY, {
        toValue: 0,
        duration: OPEN_MS,
        useNativeDriver: true,
      }).start()
      return
    }
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: CLOSE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false)
    })
  }, [visible, sheetHeight, translateY])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_event, gesture) => {
          if (gesture.dy > 0) translateY.setValue(gesture.dy)
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
            onDismissRef.current()
            return
          }
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
        },
      }),
    [translateY],
  )

  if (!mounted) return null

  return (
    // The area ends above the tab bar (`bottom`), not by padding: the keyboard view replaces its own.
    <View pointerEvents="box-none" style={[styles.host, { bottom: bottomInset }]}>
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <Animated.View
          testID="explorer-sheet"
          style={[styles.sheet, { maxHeight: sheetHeight, transform: [{ translateY }] }]}
        >
          <SheetBackground />
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handleIndicator} />
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {shownRef.current}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    host: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      justifyContent: "flex-end",
    },
    keyboard: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      overflow: "hidden",
      borderTopLeftRadius: brandRadius.panel,
      borderTopRightRadius: brandRadius.panel,
    },
    handleArea: {
      alignItems: "center",
      paddingTop: 8,
      paddingBottom: 12,
    },
    handleIndicator: {
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.divider,
    },
    scroll: {
      flexGrow: 0,
    },
    content: {
      paddingHorizontal: 18,
      paddingBottom: 24,
      gap: 12,
    },
  })
}
