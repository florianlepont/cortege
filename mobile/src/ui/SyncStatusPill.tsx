import { useEffect, useRef } from "react"
import { ActivityIndicator, StyleProp, StyleSheet, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandComponentTokens, brandRadius, brandTypography } from "../app/brand-tokens"
import { fr } from "../i18n"
import { AppPressable } from "./AppPressable"
import { feedback } from "./feedback"

export type SyncStatusPillState = "offline" | "toSend" | "syncing" | "upToDate"

export type SyncStatusPillProps = {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

const t = fr.components.syncStatusPill
// Same text colour for every tone (AppStatusChip's convention): only the surface changes.
const ICON_COLOR = brandComponentTokens.statusChip.textColor

/**
 * SYNC-02: offline · N à envoyer · en cours · à jour, visible in the Home and Mes Relevés headers
 * (not only in Settings). Offline always wins, then an in-progress sync, then unsent work.
 */
export function resolveSyncStatusPillState({
  isOnline,
  isSyncing,
  pendingCount,
}: Pick<SyncStatusPillProps, "isOnline" | "isSyncing" | "pendingCount">): SyncStatusPillState {
  if (!isOnline) return "offline"
  if (isSyncing) return "syncing"
  if (pendingCount > 0) return "toSend"
  return "upToDate"
}

const ICON_BY_STATE = {
  offline: "cloud-offline-outline",
  toSend: "cloud-upload-outline",
  syncing: "sync-outline",
  upToDate: "checkmark-circle-outline",
} as const satisfies Record<SyncStatusPillState, keyof typeof Ionicons.glyphMap>

const SURFACE_STYLE_BY_STATE = {
  offline: "offlineSurface",
  toSend: "toSendSurface",
  syncing: "syncingSurface",
  upToDate: "upToDateSurface",
} as const satisfies Record<SyncStatusPillState, string>

const LABEL_BY_STATE: Record<SyncStatusPillState, (pendingCount: number) => string> = {
  offline: () => t.offline,
  toSend: (pendingCount) => t.toSend({ count: pendingCount }),
  syncing: () => t.syncing,
  upToDate: () => t.upToDate,
}

export function SyncStatusPill({
  isOnline,
  isSyncing,
  pendingCount,
  onPress,
  style,
}: SyncStatusPillProps) {
  const state = resolveSyncStatusPillState({ isOnline, isSyncing, pendingCount })
  const previousStateRef = useRef(state)

  useEffect(() => {
    // A sync that just finished successfully gets a light haptic nudge (audit §3.2 SYNC-02): the
    // icon moves from the spinner to the checkmark.
    if (previousStateRef.current === "syncing" && state === "upToDate") {
      feedback.notify.success()
    }
    previousStateRef.current = state
  }, [state])

  const label = LABEL_BY_STATE[state](pendingCount)

  return (
    <AppPressable
      accessibilityLabel={label}
      accessibilityHint={t.a11yHint}
      onPress={onPress}
      disableScale
      style={[styles.base, styles[SURFACE_STYLE_BY_STATE[state]], style]}
    >
      {state === "syncing" ? (
        <ActivityIndicator size="small" color={ICON_COLOR} />
      ) : (
        <Ionicons name={ICON_BY_STATE[state]} size={14} color={ICON_COLOR} />
      )}
      <Text style={styles.label}>{label}</Text>
    </AppPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: brandRadius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 30,
  },
  label: {
    ...brandTypography.meta,
    fontSize: 12,
    color: ICON_COLOR,
  },
  offlineSurface: {
    borderColor: brandComponentTokens.statusChip.warningBorder,
    backgroundColor: brandComponentTokens.statusChip.warningBackground,
  },
  toSendSurface: {
    borderColor: brandComponentTokens.statusChip.warningBorder,
    backgroundColor: brandComponentTokens.statusChip.warningBackground,
  },
  syncingSurface: {
    borderColor: brandComponentTokens.statusChip.neutralBorder,
    backgroundColor: brandComponentTokens.statusChip.neutralBackground,
  },
  upToDateSurface: {
    borderColor: brandComponentTokens.statusChip.successBorder,
    backgroundColor: brandComponentTokens.statusChip.successBackground,
  },
})
