import { memo, useMemo } from "react"
import { StyleSheet, Switch, View, useWindowDimensions } from "react-native"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import {
  brandMotion,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { forestTypesLegend } from "../../app/visual-tokens"
import { fr } from "../../i18n"
import type { ParcelsMode } from "../../map/parcels-visibility"
import { AppText as Text } from "../../ui/AppText"
import { feedback } from "../../ui/feedback"
import { GlassSurface } from "../../ui/GlassSurface"
import { ParcelsControl } from "./ParcelsControl"

const t = fr.mapLayers.overlays

// The bubble sits beside the capsule: right edge 72 pt from the screen's right (capsule 14 + 50 +
// 8), 248 pt wide or the room left; padding 12, so the content is 224 pt wide.
const RIGHT = 72
const WIDTH = 248
const LEFT_MARGIN = 14
const PADDING = 12
const TILE = 40
const DISABLED_TILE_OPACITY = 0.55

const PARCELS_HELP: Record<ParcelsMode, string> = {
  all: t.allHelp,
  withIbp: t.withIbpHelp,
  none: t.noneHelp,
}

export type OverlayBubbleProps = {
  top: number
  /** Types de forêt is on. */
  forest: boolean
  /** False offline when the layer is not downloaded for the view: the row is disabled. */
  forestAvailable: boolean
  parcels: ParcelsMode
  /** A comparison is on: the overlays apply to both sides. */
  comparing: boolean
  onToggleForest: () => void
  onChangeParcels: (mode: ParcelsMode) => void
}

/**
 * The overlay bubble (UI-SPEC section 2): the Types de forêt switch with its simplified legend and
 * the Parcelles three-state control with the helper line of the chosen state. Changes apply to the
 * map at once; opening and dismissal belong to the Explorer screen.
 */
export const OverlayBubble = memo(function OverlayBubble({
  top,
  forest,
  forestAvailable,
  parcels,
  comparing,
  onToggleForest,
  onChangeParcels,
}: OverlayBubbleProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { width: screenWidth } = useWindowDimensions()
  const width = Math.min(WIDTH, screenWidth - RIGHT - LEFT_MARGIN)

  const toggleForest = () => {
    feedback.selection()
    onToggleForest()
  }

  return (
    <Animated.View
      testID="map-overlay-bubble"
      entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
      style={[styles.position, { top, width }]}
    >
      <GlassSurface surface={theme.visual.mapPanel} style={styles.panel}>
        <Text style={styles.header}>{t.title}</Text>

        <View style={styles.row}>
          <View style={[styles.tile, !forestAvailable && styles.tileDisabled]}>
            <Ionicons name="leaf-outline" size={22} color={theme.visual.glass.iconTint} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{fr.mapLayers.layers.forestTypes.name}</Text>
            <Text style={styles.meta}>{forestAvailable ? t.forestMeta : t.forestOffline}</Text>
          </View>
          <View style={styles.switchZone}>
            <Switch
              testID="overlay-forest-switch"
              accessibilityLabel={t.forestSwitchA11y}
              value={forest && forestAvailable}
              disabled={!forestAvailable}
              onValueChange={toggleForest}
              trackColor={{ false: theme.colors.divider, true: theme.visual.tab.dot }}
            />
          </View>
        </View>

        {comparing ? <Text style={styles.meta}>{t.appliesBoth}</Text> : null}

        {forest && forestAvailable ? (
          <View
            testID="overlay-forest-legend"
            accessible
            accessibilityLabel={t.legendA11y}
            style={styles.legend}
          >
            {forestTypesLegend.map((item) => (
              <View key={item.key} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{t.legend[item.key]}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.header}>{t.parcelsTitle}</Text>
        <ParcelsControl value={parcels} onChange={onChangeParcels} />
        <Text style={styles.meta}>{PARCELS_HELP[parcels]}</Text>
      </GlassSurface>
    </Animated.View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    position: {
      position: "absolute",
      right: RIGHT,
    },
    panel: {
      borderRadius: brandRadius.card,
      padding: PADDING,
      gap: brandSpacing4.smd,
    },
    header: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: 56,
    },
    tile: {
      width: TILE,
      height: TILE,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.glass.iconTile,
    },
    tileDisabled: {
      opacity: DISABLED_TILE_OPACITY,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...brandTypography.input,
      color: theme.colors.textPrimary,
    },
    meta: {
      ...brandTypography.sectionBody,
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: brandTypeScale.footnote.lineHeight,
      color: theme.colors.textSecondary,
    },
    switchZone: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    // The simplified legend sits on a paper tile of the theme, over the dense panel.
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: brandSpacing4.smd,
      rowGap: brandSpacing4.xs,
      padding: brandSpacing4.sm,
      borderRadius: 12,
      backgroundColor: theme.colors.panel,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.divider,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
    },
    swatch: {
      width: 12,
      height: 12,
      borderRadius: 3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.divider,
    },
    legendLabel: {
      ...brandTypography.sectionBody,
      fontSize: brandTypeScale.footnote.fontSize,
      lineHeight: brandTypeScale.footnote.lineHeight,
      color: theme.colors.textPrimary,
    },
  })
}
