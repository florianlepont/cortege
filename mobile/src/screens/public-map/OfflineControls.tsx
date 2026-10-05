import { memo, useMemo } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
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
