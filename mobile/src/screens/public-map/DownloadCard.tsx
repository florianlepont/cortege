import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import {
  brandComponentTokens,
  brandMotion,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import type { MapLayerKey } from "../../map/layers"
import type { AreaLayersEstimate } from "../../map/offline-estimate"
import { AppButton } from "../../ui/AppButton"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"
import { defaultAreaName } from "./area-name"
import { DownloadStatusView } from "./DownloadStatusView"
import { createPanelStyles } from "./styles"

const t = fr.mapLayers.download
const areas = fr.offlineMap.areas

const MARGIN = 14
const PADDING = 12
const CLOSE_TARGET = 44
const CLOSE_DRAWN = 30

export type DownloadCardView = "form" | "failed" | "partial"

export type DownloadCardProps = {
  estimate: AreaLayersEstimate
  /** "form": the estimate and the button; "failed" and "partial": reopened from the chip. */
  view: DownloadCardView
  /** The extra layers that could not be downloaded (the partial view names them). */
  failedLayers: readonly MapLayerKey[]
  /** A download is running: the button is disabled, the card shows no progress (the chip does). */
  runningElsewhere: boolean
  /** Distance from the bottom of the screen: the tab bar height plus 14. */
  bottom: number
  /** Starts the download of the framed area, named automatically. */
  onDownload: (name: string) => void
  onRetry: () => void
  onDone: () => void
  onClose: () => void
}

/**
 * The compact download card of the Explorer (UI-SPEC section 6, decision U-12): opened by the
 * capsule's download button, it shows the honest weight of the framed area and one "Télécharger"
 * button. It never shows progress: once the download starts the card closes and the chip on the
 * map carries the percentage. Reopened from the chip, it shows the failed or the partial result.
 */
export const DownloadCard = memo(function DownloadCard({
  estimate,
  view,
  failedLayers,
  runningElsewhere,
  bottom,
  onDownload,
  onRetry,
  onDone,
  onClose,
}: DownloadCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const panel = useMemo(() => createPanelStyles(theme), [theme])

  const close = (
    <AppPressable
      disableScale
      disableRipple
      testID="download-close"
      accessibilityRole="button"
      accessibilityLabel={t.closeA11y}
      onPress={onClose}
      style={styles.closeHit}
    >
      <View style={styles.closeDrawn}>
        <Ionicons
          name="close-outline"
          size={18}
          color={theme.semanticColors.textStrong}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
    </AppPressable>
  )

  return (
    <Animated.View
      testID="download-card"
      entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
      style={[styles.position, { bottom }]}
    >
      <GlassSurface surface={theme.visual.mapPanel} style={styles.card}>
        {view === "form" ? (
          <>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[panel.title, styles.headerTitle]}>
                {t.cardTitle}
              </Text>
              {close}
            </View>
            <View style={styles.body}>
              <View style={styles.lines}>
                <Text style={[styles.line, styles.lineStrong]}>
                  {estimate.exceedsCap
                    ? areas.tooLarge
                    : t.estimate(t.megabytes(estimate.estimatedBytes))}
                </Text>
                {runningElsewhere ? null : estimate.policy === "all" ? (
                  <>
                    <Text style={styles.line}>
                      {t.estimateSplit({
                        base: t.megabytes(estimate.baseBytes),
                        extra: t.megabytes(estimate.extraBytes),
                      })}
                    </Text>
                    <Text style={styles.line}>{t.policyHint}</Text>
                  </>
                ) : (
                  <Text style={styles.line}>{t.estimateBaseOnly}</Text>
                )}
              </View>
              <AppButton
                testID="download-start"
                label={runningElsewhere ? areas.downloading : t.start}
                accessibilityLabel={runningElsewhere ? areas.downloading : t.startA11y}
                disabled={runningElsewhere || estimate.exceedsCap}
                onPress={() => onDownload(defaultAreaName())}
                style={styles.start}
                labelStyle={styles.startLabel}
              />
            </View>
          </>
        ) : (
          <View style={styles.statusWrap}>
            <DownloadStatusView
              status={statusFor(view, estimate, failedLayers)}
              announce={false}
              onDone={onDone}
              onRetry={onRetry}
            />
            <View style={styles.closeCorner}>{close}</View>
          </View>
        )}
      </GlassSurface>
    </Animated.View>
  )
})

/** The status the card shows for the reopened views: the result is already saved or failed. */
function statusFor(
  view: Exclude<DownloadCardView, "form">,
  estimate: AreaLayersEstimate,
  failedLayers: readonly MapLayerKey[],
): AreaDownloadStatus {
  if (view === "failed") return { phase: "failed", areaId: "download-card", name: "" }
  return {
    phase: "done",
    areaId: "download-card",
    name: "",
    percentage: 100,
    downloadedTiles: estimate.totalTileCount,
    totalTiles: estimate.totalTileCount,
    failedLayers: [...failedLayers],
  }
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    position: {
      position: "absolute",
      left: MARGIN,
      right: MARGIN,
    },
    card: {
      borderRadius: brandRadius.card,
      padding: PADDING,
      gap: brandSpacing4.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: CLOSE_TARGET,
    },
    headerTitle: { flexShrink: 1 },
    closeHit: {
      width: CLOSE_TARGET,
      height: CLOSE_TARGET,
      alignItems: "center",
      justifyContent: "center",
    },
    closeDrawn: {
      width: CLOSE_DRAWN,
      height: CLOSE_DRAWN,
      borderRadius: CLOSE_DRAWN / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.divider,
    },
    body: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    lines: { flex: 1, gap: 2 },
    line: {
      ...brandTypography.sectionBody,
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: brandTypeScale.footnote.lineHeight,
      color: theme.colors.textSecondary,
    },
    lineStrong: {
      fontFamily: brandTypography.input.fontFamily,
      color: theme.semanticColors.textStrong,
    },
    start: {
      minHeight: brandComponentTokens.button.minHeightPanel,
    },
    startLabel: {
      ...brandTypography.input,
    },
    statusWrap: {
      paddingRight: CLOSE_TARGET - PADDING,
    },
    closeCorner: {
      position: "absolute",
      top: -PADDING / 2,
      right: -PADDING,
    },
  })
}
