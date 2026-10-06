import { useMemo } from "react"
import { Pressable, StyleSheet } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { brandColors, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { hasMixedMethodVersions, type NearbyParcelsState } from "../../hooks/useNearbyParcels"
import { fr } from "../../i18n"
import { ParcelMap } from "../../map/maplibre/ParcelMap"
import { GlassSurface } from "../../ui/GlassSurface"

const t = fr.home.nearby
const sectorT = fr.home.sector

/** About 2.5 km around the phone: the radius the nearby parcels are loaded with. */
const MAP_SPAN = 0.05

type NearbyMapCardProps = {
  /** Only the loaded state (a position is known): the caller handles loading and errors. */
  nearby: NearbyParcelsState & { position: NonNullable<NearbyParcelsState["position"]> }
  height: number
  onPress: () => void
}

/**
 * OA-19, Home redesign: the parcels around the phone as one still map card (the Explorer opens on
 * tap), with the sector's mean IBP score on top and a one-line summary in Liquid Glass below.
 */
export function NearbyMapCard({ nearby, height, onPress }: NearbyMapCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { position, parcels, sectorAvgScore } = nearby
  const initialRegion = useMemo(
    () => ({
      latitude: position.lat,
      longitude: position.lng,
      latitudeDelta: MAP_SPAN,
      longitudeDelta: MAP_SPAN,
    }),
    [position.lat, position.lng],
  )
  const marker = useMemo(
    () => ({ latitude: position.lat, longitude: position.lng }),
    [position.lat, position.lng],
  )

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.seeMapLabel}
      style={[styles.card, { height }]}
    >
      <ParcelMap
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        cadastreEnabled={false}
        parcels={parcels}
        marker={marker}
        interactive={false}
      />
      {sectorAvgScore != null ? (
        <GlassSurface style={styles.scoreBadge} pointerEvents="none">
          <Text style={styles.scoreLabel}>{sectorT.label}</Text>
          <Text style={styles.scoreValue}>{sectorT.score({ score: sectorAvgScore })}</Text>
          {hasMixedMethodVersions(parcels) ? (
            <Text style={styles.scoreMeta}>{sectorT.mixedMethods}</Text>
          ) : null}
        </GlassSurface>
      ) : null}
      <GlassSurface style={styles.summary} pointerEvents="none">
        {parcels.length === 0 ? (
          <Text style={styles.summaryTitle}>{t.empty}</Text>
        ) : (
          <>
            <Text style={styles.summaryTitle}>{t.summary({ count: parcels.length })}</Text>
            <Text style={styles.summaryMeta}>{t.radius}</Text>
          </>
        )}
      </GlassSurface>
    </Pressable>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      overflow: "hidden",
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panelMuted,
    },
    scoreBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    scoreLabel: {
      ...brandTypography.meta,
      fontSize: 11,
      letterSpacing: 0.8,
      color: brandColors.forest,
    },
    scoreValue: {
      fontSize: 24,
      fontWeight: "800",
      color: brandColors.forest,
    },
    scoreMeta: {
      ...brandTypography.meta,
      color: brandColors.forest,
    },
    summary: {
      position: "absolute",
      left: 10,
      right: 10,
      bottom: 10,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    summaryTitle: {
      ...brandTypography.button,
      color: brandColors.forest,
    },
    summaryMeta: {
      ...brandTypography.meta,
      color: brandColors.forest,
    },
  })
}
