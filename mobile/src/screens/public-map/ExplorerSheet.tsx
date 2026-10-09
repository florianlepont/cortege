// Why custom: a non-modal map bottom sheet that keeps the map interactive behind it; formSheet and @gorhom/bottom-sheet were tried (iOS 27 sliver, OA-66).
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
import { useReducedMotion } from "react-native-reanimated"
import { brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { GlassSurface, LIQUID_GLASS_AVAILABLE } from "../../ui/GlassSurface"

// MAP-01: the one panel of the Explorer (a selected survey, a cluster's list, a parcel's history,
// the offline areas). It rises from the bottom edge, above the tab bar, to half of the screen and
// scrolls inside; a swipe down on its handle dismisses it, and the content's own close button
// does the same. It is drawn with plain Animated: the bottom-sheet library opened it as a sliver
// on iOS 27 (no snap, no animation reported), and the panel has no need of a second detent.
// Reduce Motion (12.2-21, D-08): the panel is placed open or closed at once, and a short swipe
// puts it back without the spring; the swipe itself still follows the finger and dismisses.
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

// DS-15 (UX audit, Phase 12): the panel's own background, blurred instead of a flat fill, tinted
// to the theme's light or dark. 12.2-19 fix round: a fill lies over the blur
// (`theme.visual.sheet.fill`), because the dark blur over the light basemap gave a mid grey on
// which the secondary text and the close glyph nearly vanished. 12.2-23 correction (owner: "les
// panneaux du verre devraient être du verre natif et pas du flou"): on iOS 26 the panel is the
// system Liquid Glass instead, in dark then in light too (`theme.visual.sheet.glass`, a
// translucent tint, its content in the glass ink); this blur and fill stay for older iOS and
// Android.
function SheetBackground() {
  const { scheme, visual } = useBrandTheme()
  return (
    <>
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={50}
        tint={scheme === "dark" ? "dark" : "light"}
      />
      <View
        testID="explorer-sheet-fill"
        style={[StyleSheet.absoluteFill, { backgroundColor: visual.sheet.fill }]}
      />
    </>
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
  const reducedMotion = useReducedMotion()
  const { height: windowHeight } = useWindowDimensions()
  const sheetHeight = Math.round(windowHeight * HEIGHT_RATIO)
  const translateY = useRef(new Animated.Value(sheetHeight + bottomInset)).current
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
      if (reducedMotion) {
        translateY.setValue(0)
        return
      }
      Animated.timing(translateY, {
        toValue: 0,
        duration: OPEN_MS,
        useNativeDriver: true,
      }).start()
      return
    }
    if (reducedMotion) {
      translateY.setValue(sheetHeight + bottomInset)
      setMounted(false)
      return
    }
    Animated.timing(translateY, {
      toValue: sheetHeight + bottomInset,
      duration: CLOSE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false)
    })
  }, [visible, sheetHeight, bottomInset, translateY, reducedMotion])

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
          if (reducedMotion) translateY.setValue(0)
          else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
        },
      }),
    [translateY, reducedMotion],
  )

  if (!mounted) return null

  const glass = LIQUID_GLASS_AVAILABLE ? theme.visual.sheet.glass : undefined
  const body = (
    <>
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <View style={styles.handleIndicator} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: brandSpacing4.lg + bottomInset }]}
        keyboardShouldPersistTaps="handled"
        // 12.2-19 (owner: "on peut scroller dans la fenêtre donc c'est bizarre"): a panel that
        // fits does not move under the finger; only one taller than the sheet (a long cluster
        // list, or the panel squeezed by the keyboard) scrolls and bounces.
        alwaysBounceVertical={false}
      >
        {shownRef.current}
      </ScrollView>
    </>
  )

  return (
    // The panel runs down to the screen edge, behind the floating tab bar, like a system sheet; its
    // content stops above the bar (the bottom padding of the scroll content).
    <View pointerEvents="box-none" style={styles.host}>
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <Animated.View
          testID="explorer-sheet"
          style={[
            styles.sheet,
            { maxHeight: sheetHeight + bottomInset, transform: [{ translateY }] },
          ]}
        >
          {glass ? (
            <GlassSurface surface={glass} style={styles.glass}>
              {body}
            </GlassSurface>
          ) : (
            <>
              <SheetBackground />
              {body}
            </>
          )}
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
      bottom: 0,
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
    // The Liquid Glass panel follows the sheet's shape and shrinks with it, so the list scrolls.
    glass: {
      flexShrink: 1,
      borderTopLeftRadius: brandRadius.panel,
      borderTopRightRadius: brandRadius.panel,
    },
    handleArea: {
      alignItems: "center",
      paddingTop: brandSpacing4.sm,
      paddingBottom: brandSpacing4.smd,
    },
    handleIndicator: {
      width: 44,
      height: 5,
      borderRadius: brandRadius.pill,
      backgroundColor: theme.visual.sheet.handle,
    },
    scroll: {
      flexGrow: 0,
    },
    // 12.2-18: the panels sit on the 4 grid, at the page margin of the other screens.
    content: {
      paddingHorizontal: brandSpacing4.md,
      paddingBottom: brandSpacing4.lg,
      gap: brandSpacing4.smd,
    },
  })
}
