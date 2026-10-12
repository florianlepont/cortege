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
const overlayT = fr.mapLayers.overlays

// The dot at the top-right corner of the globe and of the overlay button (UI-SPEC section 1).
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
  /**
   * The parcel picker's download button, the capsule's second button. Omitted until the offline
   * areas are wired: the button does not render. Not drawn when `overlay` is given.
   */
  onOpenOfflineAreas?: () => void
  /**
   * The Explorer's overlay (layers) button, the capsule's second button (UI-SPEC section 1, owner
   * item 13 a). It takes the place of the picker's download button.
   */
  overlay?: MapOverlaySlot
}

export type MapOverlaySlot = {
  /** Types de forêt is on or Parcelles is not Toutes: the moss dot and the value. */
  active: boolean
  /** Whether the overlay bubble is open. */
  expanded: boolean
  onPress: () => void
}

/**
 * The top-right capsule (Liquid Glass on iOS 26): the basemap globe and a second button, the
 * Explorer's overlay button or, in the parcel picker, the offline areas. The icon shows the basemap a tap leads to. Its glass is the map control glass
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
  overlay,
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
      {overlay ? (
        <>
          <View style={styles.capsuleSeparator} />
          <AppPressable
            testID="map-overlay-button"
            disableScale
            disableRipple
            style={styles.capsuleButton}
            onPress={overlay.onPress}
            accessibilityRole="button"
            accessibilityLabel={overlayT.buttonA11y}
            accessibilityHint={overlayT.buttonHint}
            accessibilityState={{ expanded: overlay.expanded }}
            accessibilityValue={overlay.active ? { text: overlayT.buttonActiveValue } : undefined}
          >
            <Ionicons
              name="layers-outline"
              size={mapControlIconSize}
              color={theme.visual.mapControl.icon}
            />
            {overlay.active ? (
              <View
                testID="map-overlay-dot"
                style={[dotStyles.position, { backgroundColor: theme.visual.tab.dot }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            ) : null}
          </AppPressable>
        </>
      ) : onOpenOfflineAreas ? (
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

export type MapDownloadButtonProps = {
  /** The button's top: `downloadButtonTopOf(capsuleTop)`. */
  top: number
  onPress: () => void
}

/**
 * The Explorer's download button (UI-SPEC section 1, owner item 13 a): a round 50 pt glass button
 * of its own, 8 pt under the capsule at the same right edge. It opens the download card.
 */
export const MapDownloadButton = memo(function MapDownloadButton({
  top,
  onPress,
}: MapDownloadButtonProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createControlStyles(theme), [theme])
  return (
    <AppPressable
      testID="map-download-button"
      disableScale
      disableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={offlineT.areas.openSheet}
      style={[styles.downloadButton, { top }]}
    >
      <GlassSurface
        tone="auto"
        interactive
        surface={theme.visual.mapControl.glass}
        style={styles.downloadCircle}
      >
        <View style={styles.capsuleButton}>
          <Ionicons
            name="download-outline"
            size={mapControlIconSize}
            color={theme.visual.mapControl.icon}
          />
        </View>
      </GlassSurface>
    </AppPressable>
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
