import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AccessibilityInfo, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from "react-native-reanimated"
import { brandMotion, brandRadius, brandSpacing4, brandTypeScale } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { feedback } from "../../ui/feedback"

const t = fr.factorPager

/** How long the toast stays before it goes by itself. */
export const MAX_SCORE_TOAST_MS = 4000
const GLYPH_SIZE = 20

/**
 * Follow-up 32-26: the toast of the top score. It shows each time the factor's score goes from
 * below the top to the top while the factor is on screen: not on mount when it is already at the
 * top, not again while the observer keeps counting above it, and again after a drop and a new
 * crossing. It goes after `MAX_SCORE_TOAST_MS`, on a tap, or when the score falls back below the
 * top. Showing it gives a soft success haptic and a spoken announcement.
 */
export function useMaxScoreToast({ active, atTop }: { active: boolean; atTop: boolean }): {
  visible: boolean
  dismiss: () => void
} {
  const [visible, setVisible] = useState(false)
  const previous = useRef({ active, atTop })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    setVisible(false)
  }, [])

  useEffect(() => {
    const before = previous.current
    previous.current = { active, atTop }
    if (!active || !atTop) {
      dismiss()
      return
    }
    // A crossing: it was on screen below the top a moment ago.
    if (!before.active || before.atTop) return
    if (timer.current !== null) clearTimeout(timer.current)
    setVisible(true)
    feedback.notify.success()
    AccessibilityInfo.announceForAccessibility(t.maxScoreToast)
    timer.current = setTimeout(dismiss, MAX_SCORE_TOAST_MS)
  }, [active, atTop, dismiss])

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  return { visible, dismiss }
}

type MaxScoreToastProps = {
  visible: boolean
  onDismiss: () => void
  /** Distance from the bottom of the pager: the toast floats just above its bar. */
  bottom: number
}

/**
 * The floating pill over the pager's content, above the bottom bar (not in the scroll content, so
 * it is seen from the last groups of the list). A forest pill like the running total, a fade and a
 * short slide in and out that follow Reduce Motion; a tap closes it.
 */
export function MaxScoreToast({ visible, onDismiss, bottom }: MaxScoreToastProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  if (!visible) return null
  return (
    <Animated.View
      pointerEvents="box-none"
      entering={FadeInDown.duration(brandMotion.durations.base).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutDown.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
      style={[styles.host, { bottom }]}
    >
      <AppPressable
        disableScale
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={t.maxScoreToast}
        accessibilityHint={t.maxScoreToastHint}
        accessibilityLiveRegion="polite"
        style={styles.pill}
        testID="dmh-max-toast"
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={GLYPH_SIZE}
          color={theme.visual.forest.title}
        />
        <Text style={styles.text}>{t.maxScoreToast}</Text>
      </AppPressable>
    </Animated.View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    host: {
      position: "absolute",
      left: brandSpacing4.md,
      right: brandSpacing4.md,
      alignItems: "center",
    },
    // The running total's forest look: gradient over its flat fallback, white text, a ring.
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      maxWidth: "100%",
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
      borderRadius: brandRadius.pill,
      backgroundColor: theme.visual.forest.fallback,
      experimental_backgroundImage: theme.visual.forest.image,
      boxShadow: theme.visual.forest.ring,
    },
    text: {
      flexShrink: 1,
      fontSize: brandTypeScale.subhead.fontSize,
      lineHeight: brandTypeScale.subhead.lineHeight,
      color: theme.visual.forest.title,
    },
  })
}
