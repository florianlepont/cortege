import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import type { OfflineMapPrompt as OfflineMapPromptModel } from "../hooks/useOfflineMapPrompt"
import { fr } from "../i18n"
import { AppButton } from "./AppButton"
import { AppPressable } from "./AppPressable"
import { AppText as Text } from "./AppText"
import { GlassSurface } from "./GlassSurface"
import { ProgressBar } from "./ProgressBar"

const t = fr.offlineMap.prompt

type OfflineMapPromptProps = {
  prompt: OfflineMapPromptModel
  siteName: string
  /** "banner": one slim line with a close button (new-survey flow). "row": one compact line (survey page). */
  variant: "banner" | "row"
  /** Banner only: closes the slim line for this visit. */
  onDismiss?: () => void
}

/**
 * Offers the map around a survey for offline use, shows the download progress, then the result.
 * 12.2-21 dark pass: the icons and the progress fill take the accent (forest in light, light green in
 * dark, where the forest was about 2:1), and the banner, which floats over the parcel picker's map,
 * takes the map panel glass so its text reads over any basemap.
 */
export const OfflineMapPrompt = memo(function OfflineMapPrompt({
  prompt,
  siteName,
  variant,
  onDismiss,
}: OfflineMapPromptProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const handleDownload = (): void => prompt.download(t.areaName(siteName))

  if (prompt.state === "hidden") return null

  if (variant === "row") {
    if (prompt.state === "downloading") {
      return (
        <View style={styles.row}>
          <Ionicons name="cloud-download-outline" size={18} color={theme.visual.accentText} />
          <Text style={styles.rowText}>{t.downloading(prompt.percent)}</Text>
        </View>
      )
    }
    if (prompt.state === "covered") {
      return (
        <View style={styles.row}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.visual.accentText} />
          <Text style={styles.rowText}>{t.row.downloaded}</Text>
        </View>
      )
    }
    return (
      <View style={styles.row}>
        <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.textSecondary} />
        <Text style={styles.rowText}>{t.row.missing(prompt.megabytes)}</Text>
        <AppButton
          label={t.download}
          size="sm"
          variant="secondary"
          accessibilityLabel={t.a11y.download}
          onPress={handleDownload}
        />
      </View>
    )
  }

  // banner: nothing to show once the area is on the phone
  if (prompt.state === "covered") return null
  const downloading = prompt.state === "downloading"
  return (
    <GlassSurface tone="auto" surface={theme.visual.mapPanel} style={styles.slim}>
      <View style={styles.slimLine}>
        {downloading ? (
          <Ionicons name="cloud-download-outline" size={18} color={theme.visual.accentText} />
        ) : null}
        <Text
          style={styles.slimText}
          numberOfLines={2}
          accessibilityHint={downloading ? undefined : t.slim.hint(prompt.megabytes)}
        >
          {downloading ? t.downloading(prompt.percent) : t.slim.missing}
        </Text>
        {downloading ? null : (
          <>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t.a11y.download}
              hitSlop={SLIM_HIT_SLOP}
              onPress={handleDownload}
              style={styles.slimAction}
            >
              <Text style={styles.slimActionLabel}>{t.download}</Text>
            </AppPressable>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t.slim.close}
              hitSlop={SLIM_HIT_SLOP}
              onPress={onDismiss ?? noop}
              style={styles.slimClose}
            >
              <Ionicons name="close-outline" size={20} color={theme.colors.textSecondary} />
            </AppPressable>
          </>
        )}
      </View>
      {downloading ? (
        <ProgressBar
          variant="plain"
          percent={prompt.percent}
          height={4}
          radius={2}
          trackColor={theme.colors.divider}
          fillColor={theme.visual.accentText}
          style={styles.track}
        />
      ) : null}
    </GlassSurface>
  )
})

/** The visible controls are 32 pt; the touch area reaches the 44 pt minimum. */
const SLIM_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 }

const noop = (): void => undefined

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    slim: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      paddingVertical: brandSpacing4.xs,
      paddingLeft: brandSpacing4.smd,
      paddingRight: brandSpacing4.xs,
    },
    slimLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      minHeight: 32,
    },
    slimText: { ...brandTypography.meta, color: theme.semanticColors.textStrong, flex: 1 },
    slimAction: { justifyContent: "center", minHeight: 32, paddingHorizontal: brandSpacing4.xs },
    slimActionLabel: { ...brandTypography.label, color: theme.visual.accentText },
    slimClose: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    track: { marginVertical: brandSpacing4.xs },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      paddingVertical: brandSpacing4.xs,
    },
    rowText: { ...brandTypography.meta, color: theme.colors.textSecondary, flex: 1 },
  })
}
