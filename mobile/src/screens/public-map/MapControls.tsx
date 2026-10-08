import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../../app/theme"
import type { BasemapKey } from "../../map/basemaps"
import { fr } from "../../i18n"
import { mapControlIconSize } from "../../app/visual-tokens"
import { GlassSurface } from "../../ui/GlassSurface"
import { createControlStyles } from "./styles"
import { AppPressable } from "../../ui/AppPressable"
import { GlassIconButton } from "./GlassIconButton"

const t = fr.publicMap
const offlineT = fr.offlineMap

export type MapTopControlsProps = {
  top: number
  basemap: BasemapKey
  /** One tap switches Plan <-> Satellite (the owner's call: no menu, no thumbnails). */
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
  onToggleBasemap,
  onOpenOfflineAreas,
}: MapTopControlsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createControlStyles(theme), [theme])
  const target = basemap === "map" ? "satellite" : "map"
  return (
    <GlassSurface
      tone="auto"
      interactive
      surface={theme.visual.mapControl.glass}
      style={[styles.capsule, { top }]}
    >
      <AppPressable
        disableScale
        disableRipple
        style={styles.capsuleButton}
        onPress={onToggleBasemap}
        accessibilityRole="button"
        accessibilityLabel={offlineT.basemap.a11y.switchTo(offlineT.basemap[target])}
      >
        <Ionicons
          name={target === "satellite" ? "earth-outline" : "map-outline"}
          size={mapControlIconSize}
          color={theme.visual.mapControl.icon}
        />
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

const dockStyles = StyleSheet.create({
  position: { position: "absolute", right: 14 },
})
