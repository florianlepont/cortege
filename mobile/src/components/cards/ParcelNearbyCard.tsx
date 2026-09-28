import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandShadow, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { IbpScoreBadge } from "../../ui/IbpScoreBadge"
import type { PublicParcelStatusItem } from "../../app/types"

type ParcelNearbyCardProps = {
  parcel: PublicParcelStatusItem
  distanceKm: number
  surveyCount: number
  onPress: () => void
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function formatParcelId(parcelId: string): string {
  const parts = parcelId.split("-")
  const name = parts.length >= 3 ? parts.slice(-2).join("-") : parcelId
  return fr.components.parcelNearbyCard.title({ name })
}

export function ParcelNearbyCard({
  parcel,
  distanceKm,
  surveyCount,
  onPress,
}: ParcelNearbyCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <AppPressable
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={fr.components.parcelNearbyCard.a11y({
        title: formatParcelId(parcel.parcel_id),
        distance: formatDistance(distanceKm),
      })}
    >
      <IbpScoreBadge score={parcel.latest_ibp_total} size="md" />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {formatParcelId(parcel.parcel_id)}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>{formatDistance(distanceKm)}</Text>
          {surveyCount > 0 ? (
            <>
              <Text style={styles.metaSeparator}>{fr.components.separator}</Text>
              <Text style={styles.metaText}>
                {fr.components.parcelNearbyCard.surveyCount({ count: surveyCount })}
              </Text>
            </>
          ) : null}
          {parcel.latest_observation_year ? (
            <>
              <Text style={styles.metaSeparator}>{fr.components.separator}</Text>
              <Text style={styles.metaText}>{parcel.latest_observation_year}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </AppPressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: theme.colors.panel,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.componentColors.card.panelBorder,
      padding: 14,
      ...brandShadow.card,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    title: {
      ...brandTypography.input,
      color: theme.colors.textPrimary,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    metaSeparator: {
      ...brandTypography.meta,
      color: theme.colors.divider,
    },
  })
}
