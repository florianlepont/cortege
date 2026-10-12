import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandInteraction } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import type { BaseLayerKey } from "../../map/layers"
import { fr } from "../../i18n"
import { mapControlIconSize } from "../../app/visual-tokens"
import { GlassSurface } from "../../ui/GlassSurface"
import { createControlStyles } from "./styles"
import { AppPressable } from "../../ui/AppPressable"
import { GlassIconButton } from "./GlassIconButton"

const t = fr.publicMap
const offlineT = fr.offlineMap
const swipeT = fr.mapLayers.basemap

// The dot at the globe's top-right corner, as the overlay button's (UI-SPEC section 1).
const DOT_SIZE = 8
const DOT_OFFSET = 11

export type MapTopControlsProps = {
  top: number
  /** The base displayed; its kind picks the globe's glyph (Plan shows the earth). */
  basemap: BaseLayerKey
  /**
   * "toggle" (the default, the parcel picker): one tap switches Plan <-> Satellite. "swipe" (the
   * Explorer, Phase 28): the same tap enters or leaves the basemap swipe mode.
   */
  basemapMode?: "toggle" | "swipe"
  /** Swipe mode only: the swipe mode is on (`expanded` for a screen reader). */
  swipeModeOn?: boolean
  /** Swipe mode only: the base differs from the saved one, or a comparison is on. */
  basemapDot?: boolean
  /**
   * Swipe mode only: a comparison exists, so the globe cannot start the swipe mode. It ignores
   * presses, says `disabled` to a screen reader and its glyph is dimmed (UI-SPEC section 1); the dot
   * stays.
   */
  basemapDisabled?: boolean
  onToggleBasemap: () => void
  /** Omitted until the offline areas are wired: the button does not render. */
  onOpenOfflineAreas?: () => void
}

/**
 * The top-right capsule (Liquid Glass on iOS 26): basemap switch and, when wired, the offline
 * areas. The icon shows the basemap a tap leads to. Its glass is the map control glass
 * (`theme.visual.mapControl`): the map stays light in dark mode, so the control is a near opaque
 * forest graphite there with light moss glyphs (12.2-19 fix round).
 */
export const MapTopControls = memo(function MapTopControls({
  top,
  basemap,
  basemapMode = "toggle",
  swipeModeOn = false,
  basemapDot = false,
  basemapDisabled = false,
  onToggleBasemap,
  onOpenOfflineAreas,
}: MapTopControlsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createControlStyles(theme), [theme])
  const target = basemap === "map" ? "satellite" : "map"
  const swipe = basemapMode === "swipe"
  const globeDisabled = swipe && basemapDisabled
  return (
    <GlassSurface
      tone="auto"
      interactive
      surface={theme.visual.mapControl.glass}
      style={[styles.capsule, { top }]}
    >
      <AppPressable
        testID="map-globe-button"
        disableScale
        disableRipple
        style={styles.capsuleButton}
        onPress={onToggleBasemap}
        disabled={globeDisabled}
        accessibilityRole="button"
        accessibilityLabel={
          swipe ? swipeT.buttonA11y : offlineT.basemap.a11y.switchTo(offlineT.basemap[target])
        }
        accessibilityHint={swipe ? swipeT.buttonHint : undefined}
        accessibilityState={swipe ? { expanded: swipeModeOn, disabled: globeDisabled } : undefined}
        accessibilityValue={swipe && basemapDot ? { text: swipeT.buttonActiveValue } : undefined}
      >
        <Ionicons
          name={target === "satellite" ? "earth-outline" : "map-outline"}
          size={mapControlIconSize}
          color={theme.visual.mapControl.icon}
          style={globeDisabled ? { opacity: brandInteraction.disabledOpacity } : undefined}
        />
        {swipe && basemapDot ? (
          <View
            testID="map-basemap-dot"
            style={[dotStyles.position, { backgroundColor: theme.visual.tab.dot }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ) : null}
      </AppPressable>
      {onOpenOfflineAreas ? (
        <>
          <View style={styles.capsuleSeparator} />
          <AppPressable
            disableScale
            disableRipple
            style={styles.capsuleButton}
            onPress={onOpenOfflineAreas}
            accessibilityRole="button"
            accessibilityLabel={offlineT.areas.openSheet}
          >
            <Ionicons
              name="download-outline"
              size={mapControlIconSize}
              color={theme.visual.mapControl.icon}
            />
          </AppPressable>
        </>
      ) : null}
    </GlassSurface>
  )
})

export type MapBottomDockProps = {
  /** Distance from the bottom edge; give `top` instead to anchor the button under a top capsule. */
  bottom?: number
  top?: number
  locating: boolean
  onLocate: () => void
}

/** The locate button, bottom right (or under the top capsule). */
export const MapBottomDock = memo(function MapBottomDock({
  bottom,
  top,
  locating,
  onLocate,
}: MapBottomDockProps) {
  return (
    <GlassIconButton
      variant="map-circle"
      icon="navigate-outline"
      busy={locating}
      onPress={onLocate}
      accessibilityLabel={t.a11y.locate}
      style={[dockStyles.position, top !== undefined ? { top } : { bottom }]}
    />
  )
})

const dotStyles = StyleSheet.create({
  position: {
    position: "absolute",
    top: DOT_OFFSET,
    right: DOT_OFFSET,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
})

const dockStyles = StyleSheet.create({
  position: { position: "absolute", right: 14 },
})
