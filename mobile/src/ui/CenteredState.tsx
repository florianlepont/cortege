import { useMemo } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandComponentTokens, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../app/theme"
import { useTabBarClearance } from "../app/useAppBottomTabBarHeight"
import { AppButton } from "./AppButton"
import { AppText as Text } from "./AppText"
import { useFrameInsetBehavior, useFrameLargeTitle } from "./frame-large-title"

export type CenteredStateProps = {
  message: string
  icon?: "cloud-offline-outline" | "alert-circle-outline"
  /** A spinner instead of the icon, for a page that is still loading. */
  busy?: boolean
  actionLabel?: string
  onAction?: () => void
  testID?: string
}

/**
 * A page-sized message centred in the safe area (decision D-03): an icon or a spinner, the message
 * and, when asked, one retry button directly under it. It is a scroll view so that, under the
 * native iOS large title, the system insets it below the header and above the tab bar instead of
 * drawing it under the status bar (F-1). Used by the pages of another member's survey for their
 * offline, error and loading states.
 */
export function CenteredState({
  message,
  icon,
  busy = false,
  actionLabel,
  onAction,
  testID,
}: CenteredStateProps) {
  const theme = useBrandTheme()
  const insetBehavior = useFrameInsetBehavior()
  const largeTitle = useFrameLargeTitle()
  const clearance = useTabBarClearance()
  const styles = useMemo(() => createStyles(theme), [theme])
  // The bottom rule of `useSubPageContentStyle`, computed here because `ui/` stays below `screens/`.
  const contentStyle = useMemo(
    () => [styles.content, { paddingBottom: (largeTitle ? 0 : clearance) + brandSpacing4.md }],
    [styles.content, largeTitle, clearance],
  )

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
      testID={testID}
    >
      <View accessibilityLiveRegion="polite" style={styles.group}>
        {busy ? (
          <ActivityIndicator size="large" color={theme.colors.forest} />
        ) : icon ? (
          <Ionicons name={icon} size={32} color={theme.colors.textSecondary} />
        ) : null}
        <Text style={styles.message}>{message}</Text>
      </View>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton
            label={actionLabel}
            variant="secondary"
            onPress={onAction}
            style={styles.actionButton}
          />
        </View>
      ) : null}
    </ScrollView>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: brandSpacing4.lg,
      paddingTop: brandSpacing4.xl,
      gap: brandSpacing4.smd,
    },
    group: {
      alignItems: "center",
      gap: brandSpacing4.sm,
      maxWidth: 360,
    },
    message: {
      ...brandTypography.sectionBody,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
    action: { alignSelf: "center" },
    // Device finding (plan 26-10, Android 360 x 640 dp): `AppPressable` wraps its content in a view
    // with `flexGrow: 1`, and inside this flex-grown scroll content that made an auto-height
    // button grow to the whole page (the "tall capsule" of finding F-1). A fixed height, the
    // size the button already has, stops it; Jest cannot see layout, so the test pins the value.
    actionButton: { height: brandComponentTokens.button.minHeight },
  })
}
