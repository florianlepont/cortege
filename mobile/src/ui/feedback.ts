import * as Haptics from "expo-haptics"

/**
 * Semantic haptic feedback (DS-09) — the single place the app calls `expo-haptics`. Unlike the
 * `triggerHaptic()` helper this replaces, none of these gate on `Platform.OS === "ios"`:
 * `expo-haptics` already no-ops safely where the platform has no haptic engine, so the old iOS-only
 * gate was needlessly withholding feedback from Android instead of relying on that.
 */
export const feedback = {
  selection: () => void Haptics.selectionAsync(),
  impact: {
    light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  },
  notify: {
    success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  },
} as const
