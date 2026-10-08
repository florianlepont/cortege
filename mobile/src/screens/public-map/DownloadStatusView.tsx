import { memo, useEffect, useMemo, useRef, useState } from "react"
import { AccessibilityInfo, StyleSheet, View } from "react-native"
import type { LayoutChangeEvent } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { brandComponentTokens, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { downloadBarGeometry } from "../../app/visual-tokens"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { GlassButton } from "../../ui/GlassButton"

const t = fr.offlineMap.areas

/** Steps at which VoiceOver and TalkBack hear how far the download has gone. */
export const ANNOUNCE_STEP = 25

/** The last whole step of `ANNOUNCE_STEP` reached by a percentage (0, 25, 50, 75 or 100). */
export function announceStep(percent: number): number {
  return Math.floor(Math.max(0, Math.min(100, percent)) / ANNOUNCE_STEP) * ANNOUNCE_STEP
}

type BarProps = { percent: number; name: string }

/**
 * A 10 pt rounded bar filling with the pack progress. The fill is a full-width bar slid in from the
 * left (`translateX`, UI thread) inside the clipped track, so its rounded end stays round, and it
 * eases to each new report so a coarse native step still reads as a flow; Reduce Motion shows each
 * value at once. It is a progressbar for screen readers, with its value 0 to 100.
 */
export const DownloadProgressBar = memo(function DownloadProgressBar({ percent, name }: BarProps) {
  const theme = useBrandTheme()
  // The track's width, measured once: a state, so the fill is drawn again with it.
  const [width, setWidth] = useState(0)
  const shown = useSharedValue(percent)

  useEffect(() => {
    shown.value = withTiming(percent, {
      duration: downloadBarGeometry.smoothMs,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    })
  }, [percent, shown])

  const fillStyle = useAnimatedStyle(() => ({
    // Hidden until the track is measured, so the fill never flashes full before its first layout.
    opacity: width > 0 ? 1 : 0,
    transform: [{ translateX: ((shown.value - 100) / 100) * width }],
  }))
  const onLayout = (event: LayoutChangeEvent): void => setWidth(event.nativeEvent.layout.width)

  return (
    <View
      testID="offline-download-bar"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t.running.a11y.bar(name)}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: t.running.a11y.value(percent) }}
      onLayout={onLayout}
      style={[styles.track, { backgroundColor: theme.visual.downloadBar.track }]}
    >
      <Animated.View
        testID="offline-download-bar-fill"
        style={[styles.fill, { backgroundColor: theme.visual.downloadBar.fill }, fillStyle]}
      />
    </View>
  )
})

export type DownloadStatusViewProps = {
  status: AreaDownloadStatus
  onDone: () => void
  onRetry: () => void
  /** False for the panel's hidden copies that only measure each state: they never speak. */
  announce?: boolean
}

/**
 * One status of each kind for an area `name`, at their widest (a full bar, five-digit tile counts):
 * the panel lays them out unseen to reserve the tallest state's height (12.2-19).
 */
export function measureStatuses(name: string, totalTiles: number): AreaDownloadStatus[] {
  const progress = {
    name,
    percentage: 100,
    downloadedTiles: Math.max(totalTiles, 10000),
    totalTiles: Math.max(totalTiles, 10000),
  }
  return [
    { phase: "running", areaId: "measure-running", ...progress },
    { phase: "done", areaId: "measure-done", ...progress },
    { phase: "failed", areaId: "measure-failed", name },
  ]
}

/**
 * The offline panel once a download has started (12.2-19 third round, owner: "pas de barre de
 * progression du téléchargement"): the area's name, the bar, the percentage and the tiles done; then
 * a short confirmation with "Terminé", or the failure with "Réessayer". The panel lays it over its
 * form, kept in place but hidden, so the panel never changes height between states. Each step of
 * 25 % is announced, and so are the outcomes.
 */
export const DownloadStatusView = memo(function DownloadStatusView({
  status,
  onDone,
  onRetry,
  announce = true,
}: DownloadStatusViewProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const percent = status.phase === "failed" ? 0 : Math.round(status.percentage)
  const step = status.phase === "running" ? announceStep(percent) : null
  const announced = useRef(0)

  useEffect(() => {
    if (!announce || step === null || step <= announced.current) return
    announced.current = step
    AccessibilityInfo.announceForAccessibility(t.running.percent(step))
  }, [announce, step])
  useEffect(() => {
    if (!announce) return
    if (status.phase === "done") AccessibilityInfo.announceForAccessibility(t.done.title)
    if (status.phase === "failed") AccessibilityInfo.announceForAccessibility(t.failed.title)
  }, [announce, status.phase])

  if (status.phase === "failed") {
    return (
      <View testID="offline-download-failed" style={styles.body}>
        <View style={styles.titleRow}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.onSurface.danger} />
          <Text accessibilityRole="header" style={[styles.title, styles.danger]}>
            {t.failed.title}
          </Text>
        </View>
        <Text style={styles.meta}>{t.failed.message}</Text>
        <GlassButton
          label={t.failed.retry}
          size="md"
          minHeight={brandComponentTokens.button.minHeightPanel}
          onPress={onRetry}
          style={styles.button}
          testID="offline-download-retry"
        />
      </View>
    )
  }

  if (status.phase === "done") {
    return (
      <View testID="offline-download-done" style={styles.body}>
        <View style={styles.titleRow}>
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={theme.visual.downloadBar.fill}
          />
          <Text accessibilityRole="header" style={styles.title}>
            {t.done.title}
          </Text>
        </View>
        <Text style={styles.meta}>{t.done.message(status.name)}</Text>
        <GlassButton
          label={t.done.close}
          size="md"
          minHeight={brandComponentTokens.button.minHeightPanel}
          onPress={onDone}
          style={styles.button}
          testID="offline-download-done-button"
        />
      </View>
    )
  }

  return (
    <View testID="offline-download-running" style={styles.body}>
      <Text numberOfLines={1} style={styles.title}>
        {status.name}
      </Text>
      <DownloadProgressBar percent={percent} name={status.name} />
      <View style={styles.figures}>
        <Text style={styles.percent}>{t.running.percent(percent)}</Text>
        <Text style={styles.meta}>
          {t.running.tiles({ downloaded: status.downloadedTiles, total: status.totalTiles })}
        </Text>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  track: {
    height: downloadBarGeometry.height,
    borderRadius: downloadBarGeometry.height / 2,
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: downloadBarGeometry.height / 2,
  },
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    body: { gap: brandSpacing4.smd },
    titleRow: { flexDirection: "row", alignItems: "center", gap: brandSpacing4.sm },
    title: {
      ...brandTypography.input,
      flexShrink: 1,
      color: theme.semanticColors.textStrong,
    },
    danger: { color: theme.onSurface.danger },
    percent: {
      ...brandTypography.sectionBody,
      color: theme.semanticColors.textStrong,
    },
    meta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    figures: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
    button: { alignSelf: "stretch" },
  })
}
