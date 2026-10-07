import { memo, useMemo } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppText as Text } from "../../ui/AppText"
import { brandInteraction, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { GlassSurface } from "../../ui/GlassSurface"

/**
 * The map overlays shared by every map of the app (the Explorer is the reference): the same edge
 * inset, the same glass pill height, the information at the bottom left and the actions on the
 * right. Explorer, the parcel picker and the still maps of the survey pages all draw from here.
 */
export const MAP_EDGE = 14
export const MAP_PILL_HEIGHT = 40
/**
 * Extra touch area around a 40 pt map control, so its target reaches the 44 pt minimum without
 * changing the drawn size (D-05).
 */
export const MAP_CONTROL_HIT_SLOP = (brandInteraction.hitTarget.min - MAP_PILL_HEIGHT) / 2

type MapInfoPillProps = {
  label: string
  style?: StyleProp<ViewStyle>
}

/** A short fact about the map (a count), bottom left. */
export const MapInfoPill = memo(function MapInfoPill({ label, style }: MapInfoPillProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <GlassSurface
      tone="auto"
      pointerEvents="none"
      surface={theme.visual.mapControl.glass}
      style={[styles.pill, style]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </GlassSurface>
  )
})

type MapActionPillProps = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  accessibilityLabel: string
  onPress: () => void
}

/** An action offered on a map (see it on the map, edit the parcels), bottom right. */
export const MapActionPill = memo(function MapActionPill({
  icon,
  label,
  accessibilityLabel,
  onPress,
}: MapActionPillProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <GlassSurface
      tone="auto"
      interactive
      surface={theme.visual.mapControl.glass}
      style={styles.pill}
    >
      <Pressable
        style={styles.actionHit}
        hitSlop={{ top: MAP_CONTROL_HIT_SLOP, bottom: MAP_CONTROL_HIT_SLOP }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {/* The map control glyph colour: light moss on the dark map glass (12.2-18, 12.2-19). */}
        <Ionicons name={icon} size={18} color={theme.visual.mapControl.icon} />
        <Text style={styles.pillText}>{label}</Text>
      </Pressable>
    </GlassSurface>
  )
})

type MapOverlayRowsProps = {
  /** Bottom left. */
  info?: React.ReactNode
  /** Bottom right, stacked from the bottom. */
  actions?: React.ReactNode
}

/** The two bottom corners of a still map: the information on the left, the actions on the right. */
export const MapOverlayCorners = memo(function MapOverlayCorners({
  info,
  actions,
}: MapOverlayRowsProps) {
  return (
    <View pointerEvents="box-none" style={cornerStyles.layer}>
      <View pointerEvents="box-none" style={cornerStyles.left}>
        {info}
      </View>
      <View pointerEvents="box-none" style={cornerStyles.right}>
        {actions}
      </View>
    </View>
  )
})

const cornerStyles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: MAP_EDGE,
  },
  left: { alignItems: "flex-start" },
  right: { alignItems: "flex-end", gap: 8 },
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    pill: {
      height: MAP_PILL_HEIGHT,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    pillText: {
      ...brandTypography.meta,
      color: theme.visual.mapControl.text,
    },
    actionHit: {
      height: MAP_PILL_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
  })
}
