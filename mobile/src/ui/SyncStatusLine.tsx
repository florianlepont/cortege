import { useEffect, useMemo, useRef } from "react"
import { ActivityIndicator, StyleProp, StyleSheet, ViewStyle } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { AppText as Text } from "./AppText"
import { brandColors, brandMotion, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppPressable } from "./AppPressable"
import { feedback } from "./feedback"

export type SyncStatusLineState = "offline" | "toSend" | "syncing" | "upToDate"

export type SyncStatusLineProps = {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

const t = fr.components.syncStatusLine

/**
 * SYNC-02: offline · N à envoyer · en cours · à jour, a quiet line under the Home greeting (OA-88,
 * not only in Settings): a green dot when all is well, amber text when something needs attention.
 * Offline always wins, then an in-progress sync, then unsent work.
 */
export function resolveSyncStatusLineState({
  isOnline,
  isSyncing,
  pendingCount,
}: Pick<SyncStatusLineProps, "isOnline" | "isSyncing" | "pendingCount">): SyncStatusLineState {
  if (!isOnline) return "offline"
  if (isSyncing) return "syncing"
  if (pendingCount > 0) return "toSend"
  return "upToDate"
}

const LABEL_BY_STATE: Record<SyncStatusLineState, (pendingCount: number) => string> = {
  offline: () => t.offline,
  toSend: (pendingCount) => t.toSend({ count: pendingCount }),
  syncing: () => t.syncing,
  upToDate: () => t.upToDate,
}

export function SyncStatusLine({
  isOnline,
  isSyncing,
  pendingCount,
  onPress,
  style,
}: SyncStatusLineProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const state = resolveSyncStatusLineState({ isOnline, isSyncing, pendingCount })
  const previousStateRef = useRef(state)
  const reduced = useReducedMotion()
  const dotScale = useSharedValue(1)

  useEffect(() => {
    // A sync that just finished successfully gets a light haptic nudge (audit §3.2 SYNC-02): the
    // dot goes from the spinner to the green one, and springs in (D-08 status icons).
    if (previousStateRef.current === "syncing" && state === "upToDate") {
      feedback.notify.success()
      if (!reduced) {
        dotScale.value = withSequence(
          withTiming(0.6, { duration: 0 }),
          withSpring(1, { ...brandMotion.springs.snappy, reduceMotion: ReduceMotion.System }),
        )
      }
    }
    previousStateRef.current = state
  }, [state, reduced, dotScale])

  const dotAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: dotScale.value }] }))

  const label = LABEL_BY_STATE[state](pendingCount)
  const needsAttention = state === "offline" || state === "toSend"

  return (
    <AppPressable
      accessibilityLabel={label}
      accessibilityHint={t.a11yHint}
      onPress={onPress}
      disableScale
      hitSlop={8}
      style={[styles.base, style]}
    >
      {state === "syncing" ? (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      ) : (
        <Animated.View
          style={[styles.dot, needsAttention ? styles.dotWarning : styles.dotOk, dotAnimatedStyle]}
        />
      )}
      <Text style={[styles.label, needsAttention ? styles.labelWarning : null]}>{label}</Text>
    </AppPressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minHeight: 24,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotOk: { backgroundColor: brandColors.moss },
    dotWarning: { backgroundColor: theme.onSurface.warning },
    label: {
      ...brandTypography.meta,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    labelWarning: {
      color: theme.onSurface.warning,
      fontWeight: "600",
    },
  })
}
