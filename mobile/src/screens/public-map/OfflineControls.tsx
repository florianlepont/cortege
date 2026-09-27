import { memo } from "react"
import { Pressable, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors } from "../../app/brand-tokens"
import { BASEMAP_KEYS, type BasemapKey } from "../../map/basemaps"
import { fr } from "../../i18n"
import { offlineIndicatorStyles as styles } from "./styles"

const t = fr.offlineMap

/** REQ-D-offline-map: a plain, always-visible indicator when the device has no connectivity. */
export const OfflineIndicatorBadge = memo(function OfflineIndicatorBadge() {
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
  return (
    <View style={styles.basemapToggle}>
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
    </View>
  )
})
