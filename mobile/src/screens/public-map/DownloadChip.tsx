import { memo, useEffect, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { brandMotion, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"
import { useLatestCallback } from "../../state/useLatestCallback"
import { MAP_CONTROL_HIT_SLOP, MAP_PILL_HEIGHT } from "./MapChips"
import { CAPSULE_BUTTON_SIZE, CAPSULE_RIGHT, MAP_BUTTON_GAP } from "./styles"

const t = fr.mapLayers.download.chip

/** How long "Zone disponible hors connexion" stays before the chip goes (UI-SPEC section 6). */
export const DONE_CHIP_DURATION_MS = 4000
const GLYPH_SIZE = 16

type ChipKind = "running" | "done" | "partial" | "failed"

function kindOf(status: AreaDownloadStatus): ChipKind {
  if (status.phase === "failed") return "failed"
  if (status.phase === "running") return "running"
  return status.failedLayers.length > 0 ? "partial" : "done"
}

export type DownloadChipProps = {
  /** The download shown, or null (no chip). */
  status: AreaDownloadStatus | null
  /** False while the swipe mode owns the band under the capsule; the download goes on. */
  visible: boolean
  /** The top of the round download button, from the top of the map: the chip is centred on it. */
  buttonTop: number
  /** Failed and partial only: reopens the card on the matching view. */
  onPress: () => void
  /** The finished chip has been shown for its 4 s: clear the status. */
  onExpire: () => void
}

/**
 * The offline download on the map (UI-SPEC section 6): a glass pill left of the round download
 * button, centred on it, carrying the byte-weighted percentage while it runs, then its outcome. It
 * is how the Explorer shows the percentage of an area download (success criterion 5, owner
 * decision 2026-10-11). Running and done are not pressable; failed and partial reopen the card.
 */
export const DownloadChip = memo(function DownloadChip({
  status,
  visible,
  buttonTop,
  onPress,
  onExpire,
}: DownloadChipProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const expire = useLatestCallback(onExpire)
  const kind = status === null ? null : kindOf(status)
  const areaId = status?.areaId

  useEffect(() => {
    if (kind !== "done" || !visible) return undefined
    const timer = setTimeout(expire, DONE_CHIP_DURATION_MS)
    return () => clearTimeout(timer)
  }, [kind, visible, areaId, expire])

  if (status === null || kind === null || !visible) return null

  const percent = status.phase === "running" ? Math.round(status.percentage) : 0
  const label = {
    running: t.running(percent),
    done: t.done,
    partial: t.partial,
    failed: t.failed,
  }[kind]
  const glyph = {
    running: "cloud-download-outline",
    done: "checkmark-circle-outline",
    partial: "alert-circle-outline",
    failed: "alert-circle-outline",
  }[kind] as keyof typeof Ionicons.glyphMap
  const content = (
    <>
      <Ionicons
        name={glyph}
        size={GLYPH_SIZE}
        color={kind === "failed" ? theme.onSurface.danger : theme.visual.mapControl.icon}
        style={styles.glyph}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </>
  )
  const pressable = kind === "failed" || kind === "partial"

  return (
    <Animated.View
      testID="download-chip-position"
      entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
      pointerEvents="box-none"
      style={[styles.position, { top: buttonTop + CAPSULE_BUTTON_SIZE / 2 - MAP_PILL_HEIGHT / 2 }]}
    >
      <GlassSurface
        tone="auto"
        interactive={pressable}
        surface={theme.visual.mapControl.glass}
        style={styles.pill}
      >
        {pressable ? (
          <AppPressable
            disableScale
            disableRipple
            testID="download-chip"
            accessibilityRole="button"
            accessibilityLabel={kind === "failed" ? t.failedA11y : t.partialA11y}
            hitSlop={{ top: MAP_CONTROL_HIT_SLOP, bottom: MAP_CONTROL_HIT_SLOP }}
            onPress={onPress}
            style={styles.content}
          >
            {content}
          </AppPressable>
        ) : kind === "running" ? (
          <View
            testID="download-chip"
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t.runningA11y}
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={styles.content}
          >
            {content}
          </View>
        ) : (
          <View testID="download-chip" accessible accessibilityLabel={label} style={styles.content}>
            {content}
          </View>
        )}
      </GlassSurface>
    </Animated.View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    position: {
      position: "absolute",
      right: CAPSULE_RIGHT + CAPSULE_BUTTON_SIZE + MAP_BUTTON_GAP,
    },
    pill: {
      height: MAP_PILL_HEIGHT,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
      paddingHorizontal: 12,
      justifyContent: "center",
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      height: MAP_PILL_HEIGHT,
    },
    glyph: { marginRight: 6 },
    text: {
      ...brandTypography.meta,
      color: theme.visual.mapControl.text,
    },
  })
}
