import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import type { OfflineMapPrompt as OfflineMapPromptModel } from "../hooks/useOfflineMapPrompt"
import { fr } from "../i18n"
import { AppButton } from "./AppButton"
import { AppText as Text } from "./AppText"
import { GlassSurface } from "./GlassSurface"

const t = fr.offlineMap.prompt

type OfflineMapPromptProps = {
  prompt: OfflineMapPromptModel
  siteName: string
  /** "banner": card with a "later" button (new-survey flow). "row": one compact line (survey page). */
  variant: "banner" | "row"
  /** Banner only: hides the card for this visit. */
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
  return (
    <GlassSurface tone="auto" surface={theme.visual.mapPanel} style={styles.banner}>
      <View style={styles.bannerHead}>
        <View style={styles.bannerIcon}>
          <Ionicons name="cloud-download-outline" size={20} color={theme.visual.accentText} />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerTitle}>{t.title}</Text>
          {prompt.state === "downloading" ? (
            <>
              <Text style={styles.bannerText}>{t.downloading(prompt.percent)}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${prompt.percent}%` }]} />
              </View>
              <Text style={styles.bannerText}>{t.keepGoing}</Text>
            </>
          ) : (
            <Text style={styles.bannerText}>{t.message(prompt.megabytes)}</Text>
          )}
        </View>
      </View>
      {prompt.state === "missing" ? (
        <View style={styles.bannerActions}>
          <AppButton
            label={t.download}
            size="sm"
            style={styles.primary}
            accessibilityLabel={t.a11y.download}
            onPress={handleDownload}
          />
          <AppButton
            label={t.later}
            size="sm"
            variant="secondary"
            accessibilityLabel={t.a11y.later}
            onPress={onDismiss ?? noop}
          />
        </View>
      ) : null}
    </GlassSurface>
  )
})

const noop = (): void => undefined

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    banner: {
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: 14,
      gap: brandSpacing4.smd,
    },
    bannerHead: { flexDirection: "row", gap: brandSpacing4.smd },
    bannerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    bannerBody: { flex: 1, gap: brandSpacing4.xs },
    bannerTitle: { ...brandTypography.label, color: theme.semanticColors.textStrong },
    bannerText: { ...brandTypography.meta, color: theme.colors.textSecondary },
    bannerActions: { flexDirection: "row", gap: brandSpacing.sm },
    primary: { flex: 1 },
    track: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      backgroundColor: theme.colors.divider,
      marginVertical: brandSpacing4.xs,
    },
    fill: { height: 6, backgroundColor: theme.visual.accentText },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      paddingVertical: brandSpacing4.xs,
    },
    rowText: { ...brandTypography.meta, color: theme.colors.textSecondary, flex: 1 },
  })
}
