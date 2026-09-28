import { memo, useMemo } from "react"
import { Pressable, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { BASEMAP_KEYS, type BasemapKey } from "../../map/basemaps"
import { fr } from "../../i18n"
import { GlassSurface } from "../../ui/GlassSurface"
import { createOfflineIndicatorStyles } from "./styles"

const t = fr.offlineMap

/** REQ-D-offline-map: a plain, always-visible indicator when the device has no connectivity. */
export const OfflineIndicatorBadge = memo(function OfflineIndicatorBadge() {
  const theme = useBrandTheme()
  const styles = useMemo(() => createOfflineIndicatorStyles(theme), [theme])
  return (
    <View style={styles.badge}>
      <Ionicons name="cloud-offline-outline" size={15} color={brandColors.terracotta} />
      <Text style={styles.badgeText}>{t.indicator.offline}</Text>
    </View>
  )
})

const BASEMAP_LABELS: Record<BasemapKey, string> = {
  map: t.basemap.map,
  satellite: t.basemap.satellite,
}

export type BasemapToggleProps = {
  basemap: BasemapKey
  onChange: (basemap: BasemapKey) => void
}

/** REQ-D-basemap-switch: a Plan/Satellite segmented pill; the selection is persisted by the caller. */
export const BasemapToggle = memo(function BasemapToggle({
  basemap,
  onChange,
}: BasemapToggleProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createOfflineIndicatorStyles(theme), [theme])
  return (
    <GlassSurface tone="auto" style={styles.basemapToggle}>
      {BASEMAP_KEYS.map((key) => {
        const active = key === basemap
        const handlePress = (): void => onChange(key)
        return (
          <Pressable
            key={key}
            style={[styles.basemapOption, active ? styles.basemapOptionActive : null]}
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={t.basemap.a11y.switchTo(BASEMAP_LABELS[key])}
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[styles.basemapOptionText, active ? styles.basemapOptionTextActive : null]}
            >
              {BASEMAP_LABELS[key]}
            </Text>
          </Pressable>
        )
      })}
    </GlassSurface>
  )
})
