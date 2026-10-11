import { memo, useMemo } from "react"
import { StyleSheet } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { brandMotion, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { TAG_GAP, tagMaxWidth, tagVisible } from "../../map/wipe-geometry"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"

export const TAG_HEIGHT = 32
const TAG_GLYPH_SIZE = 14
const CHEVRON_OPACITY = 0.5

export type CurtainSideTagsProps = {
  /** The line's x, in points from the left edge (UI-thread value, shared with the handle). */
  lineX: SharedValue<number>
  /** The width of the map area. */
  width: number
  /** The y of the knob's centre (`knobCenterY(height)`): the tags are centred on it. */
  knobTop: number
  /** Short names of the layers on each side ("Plan", "Photos 1950"). */
  leftName: string
  rightName: string
  /** The swipe mode is on: chevrons round the name say a swipe on that side changes it. */
  swipeMode: boolean
  /** The layer of that side is not downloaded for this area while offline. */
  leftUnavailable: boolean
  rightUnavailable: boolean
}

type SideTagProps = {
  side: "left" | "right"
  name: string
  lineX: SharedValue<number>
  width: number
  knobTop: number
  swipeMode: boolean
  unavailable: boolean
}

const SideTag = memo(function SideTag({
  side,
  name,
  lineX,
  width,
  knobTop,
  swipeMode,
  unavailable,
}: SideTagProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const animated = useAnimatedStyle(() => {
    const maxWidth = tagMaxWidth(side, lineX.value, width)
    // A tag with under 72 pt of room fades out (160 ms, instant under Reduce Motion).
    const opacity = withTiming(tagVisible(maxWidth) ? 1 : 0, {
      duration: brandMotion.durations.fast,
      reduceMotion: ReduceMotion.System,
    })
    return side === "left"
      ? { right: width - lineX.value + TAG_GAP, maxWidth, opacity }
      : { left: lineX.value + TAG_GAP, maxWidth, opacity }
  })
  const glyph = theme.visual.mapControl.icon
  return (
    <Animated.View
      testID={`curtain-tag-${side}`}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tag, { top: knobTop - TAG_HEIGHT / 2 }, animated]}
    >
      <GlassSurface
        tone="auto"
        pointerEvents="none"
        surface={theme.visual.mapControl.glass}
        style={styles.pill}
      >
        {unavailable ? (
          <Ionicons name="cloud-offline-outline" size={TAG_GLYPH_SIZE} color={glyph} />
        ) : null}
        {swipeMode ? (
          <Ionicons
            name="chevron-back-outline"
            size={TAG_GLYPH_SIZE}
            color={glyph}
            style={styles.chevron}
          />
        ) : null}
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {name}
        </Text>
        {swipeMode ? (
          <Ionicons
            name="chevron-forward-outline"
            size={TAG_GLYPH_SIZE}
            color={glyph}
            style={styles.chevron}
          />
        ) : null}
      </GlassSurface>
    </Animated.View>
  )
})

/**
 * The two side tags of the curtain (UI-SPEC section 5): non-interactive glass pills, 32 pt high,
 * at the knob's height and 30 pt from the line on each side, named with the short layer names.
 * While the swipe mode is on, chevrons round the name say that a swipe on that side changes its
 * layer; a side whose layer is unavailable offline wears a cloud-offline glyph before its name.
 * They follow the line on the UI thread, and are hidden from the screen reader (the handle's
 * value names both sides).
 */
export const CurtainSideTags = memo(function CurtainSideTags({
  lineX,
  width,
  knobTop,
  leftName,
  rightName,
  swipeMode,
  leftUnavailable,
  rightUnavailable,
}: CurtainSideTagsProps) {
  return (
    <>
      <SideTag
        side="left"
        name={leftName}
        lineX={lineX}
        width={width}
        knobTop={knobTop}
        swipeMode={swipeMode}
        unavailable={leftUnavailable}
      />
      <SideTag
        side="right"
        name={rightName}
        lineX={lineX}
        width={width}
        knobTop={knobTop}
        swipeMode={swipeMode}
        unavailable={rightUnavailable}
      />
    </>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    tag: {
      position: "absolute",
      height: TAG_HEIGHT,
      flexDirection: "row",
    },
    pill: {
      height: TAG_HEIGHT,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
      paddingHorizontal: 12,
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    name: {
      ...brandTypography.meta,
      color: theme.visual.mapControl.text,
      flexShrink: 1,
    },
    chevron: { opacity: CHEVRON_OPACITY },
  })
}
