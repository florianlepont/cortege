import { memo, useEffect, useMemo, useRef } from "react"
import { AccessibilityInfo, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandComponentTokens, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import { LAYER_CATALOGUE, PACK_ORDER } from "../../map/layers"
import type { MapLayerKey } from "../../map/layers"
import { AppText as Text } from "../../ui/AppText"
import { GlassButton } from "../../ui/GlassButton"
import { ProgressBar } from "../../ui/ProgressBar"

const t = fr.offlineMap.areas

/** Every layer a "tous" policy adds on top of the base packs, the longest partial notice. */
const EXTRA_LAYER_KEYS: readonly MapLayerKey[] = PACK_ORDER.filter(
  (key) => LAYER_CATALOGUE[key].tier === "extra",
)

/** The plain French names of layers, joined for the partial notice. */
function layerNames(keys: readonly MapLayerKey[]): string {
  return keys.map((key) => fr.mapLayers.layers[LAYER_CATALOGUE[key].i18nKey].name).join(", ")
}

/** Steps at which VoiceOver and TalkBack hear how far the download has gone. */
export const ANNOUNCE_STEP = 25

/** The last whole step of `ANNOUNCE_STEP` reached by a percentage (0, 25, 50, 75 or 100). */
export function announceStep(percent: number): number {
  return Math.floor(Math.max(0, Math.min(100, percent)) / ANNOUNCE_STEP) * ANNOUNCE_STEP
}

type BarProps = { percent: number; name: string }

/**
 * The offline-download bar: the "slide" variant of `ProgressBar` (a 10 pt rounded bar easing to
 * each new report), a progressbar for screen readers with its value 0 to 100.
 */
export const DownloadProgressBar = memo(function DownloadProgressBar({ percent, name }: BarProps) {
  return (
    <ProgressBar
      variant="slide"
      testID="offline-download-bar"
      fillTestID="offline-download-bar-fill"
      ratio={percent / 100}
      accessibilityLabel={t.running.a11y.bar(name)}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: t.running.a11y.value(percent) }}
    />
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
 * One status of each kind for an area `name`, at their widest (a full bar, five-digit tile counts,
 * and the partial result naming every extra layer): the panel lays them out unseen to reserve the
 * tallest state's height (12.2-19).
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
    { phase: "done", areaId: "measure-done", ...progress, failedLayers: [] },
    { phase: "failed", areaId: "measure-failed", name },
    {
      phase: "done",
      areaId: "measure-partial",
      ...progress,
      failedLayers: [...EXTRA_LAYER_KEYS],
    },
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
    // A status built without the list (an older fixture, a hand-made one) is a plain success.
    const failedLayers = status.failedLayers ?? []
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
        {failedLayers.length > 0 ? (
          <View style={styles.noticeRow}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={theme.onSurface.danger}
              style={styles.noticeIcon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={[styles.meta, styles.noticeText]}>
              {fr.mapLayers.download.partial(layerNames(failedLayers))}
            </Text>
          </View>
        ) : (
          <Text style={styles.meta}>{t.done.message(status.name)}</Text>
        )}
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

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    body: { gap: brandSpacing4.smd },
    titleRow: { flexDirection: "row", alignItems: "center", gap: brandSpacing4.sm },
    title: {
      ...brandTypography.input,
      flexShrink: 1,
      color: theme.semanticColors.textStrong,
    },
    noticeRow: { flexDirection: "row", alignItems: "flex-start", gap: brandSpacing4.sm },
    noticeIcon: { marginTop: 1 },
    noticeText: { flex: 1 },
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
