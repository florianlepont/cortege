import { memo, useCallback, useMemo } from "react"
import { StyleSheet, View, type AccessibilityActionEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  FadeIn,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { brandInteraction, brandMotion, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SWIPE_SLOP, tagSwipeStep } from "../../map/swipe-machine"
import { TAG_GAP, tagMaxWidth, tagVisible } from "../../map/wipe-geometry"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"

/** A side tag is a control: 44 pt high, with a 44 x 44 target for each chevron. */
export const TAG_HEIGHT = 44
const CHEVRON_ZONE = 44
const TAG_GLYPH_SIZE = 14

const t = fr.mapLayers.compare
const ACTIONS = [
  { name: "increment", label: fr.mapLayers.basemap.actionNext },
  { name: "decrement", label: fr.mapLayers.basemap.actionPrevious },
]

export type CompareSideTagProps = {
  side: "left" | "right"
  /** The short layer name drawn on the tag ("Plan", "Photos 1950"). */
  name: string
  /** The long name and the era said to a screen reader ("Photos aériennes", "1950-1965"). */
  label: string
  era: string
  /** The line's x, in points from the left edge (UI-thread value, shared with the grabber). */
  lineX: SharedValue<number>
  /** The width of the map area. */
  width: number
  /** The y of the grabber's centre (`grabberCenterY(height)`): the tag is centred on it. */
  centerY: number
  /** The layer of this side is not downloaded for this area while offline. */
  unavailable: boolean
  /** Offline and the layer is downloaded for the view: a small marker says so (cloud, outline). */
  downloaded?: boolean
  /** Another layer exists for this side; false dims and disables the chevrons and the swipe. */
  canStep: boolean
  /** The line is being dragged: the tag takes no touch. */
  disabled: boolean
  /** The user asked for the next (1) or the previous (-1) layer of this side. */
  onStep: (direction: 1 | -1) => void
}

/**
 * One side tag of the comparison (UI-SPEC sections 4 and 5, owner item 13 d): a 44 pt glass pill
 * 24 pt from the line, at the grabber's height, laid out `[chevron zone][name][chevron zone]`. A
 * tap on the back chevron asks for the previous layer of this side, on the forward chevron the next
 * one; a horizontal swipe on the name does the same (`tagSwipeStep`: left is next). It follows the
 * line on the UI thread and fades out while its side is under 72 pt wide. For a screen reader it is
 * one adjustable element ("Côté gauche : Plan") whose two actions step the layer; the chevrons are
 * hidden from it.
 */
export const CompareSideTag = memo(function CompareSideTag({
  side,
  name,
  label,
  era,
  lineX,
  width,
  centerY,
  unavailable,
  downloaded = false,
  canStep,
  disabled,
  onStep,
}: CompareSideTagProps) {
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

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-SWIPE_SLOP, SWIPE_SLOP])
        .failOffsetY([-SWIPE_SLOP, SWIPE_SLOP])
        .onEnd((event) => {
          const step = tagSwipeStep({ dx: event.translationX, velocityX: event.velocityX })
          if (step !== null && canStep) runOnJS(onStep)(step)
        }),
    [canStep, onStep],
  )

  const previous = useCallback(() => onStep(-1), [onStep])
  const next = useCallback(() => onStep(1), [onStep])
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (!canStep) return
      if (event.nativeEvent.actionName === "increment") onStep(1)
      else if (event.nativeEvent.actionName === "decrement") onStep(-1)
    },
    [canStep, onStep],
  )

  const glyph = theme.visual.mapControl.icon
  const basemapT = fr.mapLayers.basemap
  const stateSuffix = unavailable
    ? `, ${basemapT.notDownloaded}`
    : downloaded
      ? `, ${basemapT.downloaded}`
      : ""
  const chevronStyle = canStep ? styles.chevron : styles.chevronDimmed
  return (
    <Animated.View
      testID={`compare-tag-${side}`}
      pointerEvents={disabled ? "none" : "auto"}
      entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t.sideA11yLabel({ side, name: label })}
      accessibilityHint={t.sideA11yHint}
      accessibilityValue={{ text: `${t.sideA11yValue({ name: label, era })}${stateSuffix}` }}
      accessibilityActions={ACTIONS}
      onAccessibilityAction={onAccessibilityAction}
      style={[styles.tag, { top: centerY - TAG_HEIGHT / 2 }, animated]}
    >
      <GlassSurface tone="auto" surface={theme.visual.mapControl.glass} style={styles.pill}>
        <AppPressable
          testID={`compare-tag-${side}-previous`}
          disableScale
          disableRipple
          disabled={!canStep}
          accessibilityRole="button"
          accessibilityLabel={fr.mapLayers.basemap.actionPrevious}
          accessibilityElementsHidden
          importantForAccessibility="no"
          onPress={previous}
          style={chevronStyle}
        >
          <Ionicons name="chevron-back-outline" size={TAG_GLYPH_SIZE} color={glyph} />
        </AppPressable>
        <GestureDetector gesture={pan}>
          <View style={styles.middle}>
            {unavailable || downloaded ? (
              <Ionicons
                name={unavailable ? "cloud-offline-outline" : "cloud-done-outline"}
                size={TAG_GLYPH_SIZE}
                color={glyph}
              />
            ) : null}
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Text>
          </View>
        </GestureDetector>
        <AppPressable
          testID={`compare-tag-${side}-next`}
          disableScale
          disableRipple
          disabled={!canStep}
          accessibilityRole="button"
          accessibilityLabel={fr.mapLayers.basemap.actionNext}
          accessibilityElementsHidden
          importantForAccessibility="no"
          onPress={next}
          style={chevronStyle}
        >
          <Ionicons name="chevron-forward-outline" size={TAG_GLYPH_SIZE} color={glyph} />
        </AppPressable>
      </GlassSurface>
    </Animated.View>
  )
})

function createStyles(theme: BrandTheme) {
  const zone = {
    width: CHEVRON_ZONE,
    height: CHEVRON_ZONE,
    alignItems: "center",
    justifyContent: "center",
  } as const
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
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    chevron: zone,
    chevronDimmed: { ...zone, opacity: brandInteraction.disabledOpacity },
    middle: {
      height: TAG_HEIGHT,
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    name: {
      ...brandTypography.meta,
      color: theme.visual.mapControl.text,
      flexShrink: 1,
    },
  })
}
