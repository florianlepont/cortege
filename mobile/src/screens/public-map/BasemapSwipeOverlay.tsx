import { memo, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import type { AccessibilityActionEvent } from "react-native"
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { brandMotion, brandRadius, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { BASEMAP_CYCLE } from "../../map/layer-cycle"
import type { BaseLayerKey } from "../../map/layers"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlassSurface } from "../../ui/GlassSurface"
import { MAP_CONTROL_HIT_SLOP, MAP_PILL_HEIGHT } from "./MapChips"
import { indicatorValue, swipeLabel } from "./swipe-labels"

const t = fr.mapLayers.basemap

/** Kept clear on both sides: the capsule and the overlay button sit within 72 pt of the right edge. */
const SIDE_INSET = 72
const MAX_WIDTH = 232
const INDICATOR_HEIGHT = 36
const CHEVRON_SIZE = 14
const DOT = 6
const DOT_CURRENT = 8
// Spec: the hint stays 3 s, then fades for about 1 s (none under Reduce Motion).
const HINT_FADE_MS = brandMotion.durations.emphasis * 2
const DOT_OPACITY = 0.7
const DOT_OPACITY_UNAVAILABLE = 0.4

const enter = () => FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)

export type BasemapSwipeOverlayProps = {
  /** Distance from the top of the map: the capsule's top. */
  top: number
  /** The layer the indicator names: the incoming one while a wipe is under way. */
  layer: BaseLayerKey
  isAvailable: (key: BaseLayerKey) => boolean
  /** The live hint of the zone the finger is in. */
  hintText: string | null
  fingerDown: boolean
  introHintVisible: boolean
  /** The "Comparer avec le fond suivant" action exists. */
  compareAvailable: boolean
  onDone: () => void
  onNext: () => void
  onPrevious: () => void
  onCompareNext: () => void
  /** The drawn height of the whole stack, so the notices column can start below it. */
  onHeight?: (height: number) => void
}

/**
 * The centred top stack of the swipe mode (UI-SPEC section 3 and 4, U-21): the indicator pill, the
 * five dots, the single labelled "Terminé" pill and the transient hint. It exists only in the swipe
 * mode, which never coexists with a comparison. The indicator is the non-gesture path: adjustable,
 * with the actions next, previous and compare with the next layer.
 */
export const BasemapSwipeOverlay = memo(function BasemapSwipeOverlay({
  top,
  layer,
  isAvailable,
  hintText,
  fingerDown,
  introHintVisible,
  compareAvailable,
  onDone,
  onNext,
  onPrevious,
  onCompareNext,
  onHeight,
}: BasemapSwipeOverlayProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const label = swipeLabel(layer)
  const actions = useMemo(
    () => [
      { name: "increment", label: t.actionNext },
      { name: "decrement", label: t.actionPrevious },
      ...(compareAvailable ? [{ name: "compareNext", label: t.actionCompareNext }] : []),
    ],
    [compareAvailable],
  )
  const onAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName
    if (name === "increment") onNext()
    else if (name === "decrement") onPrevious()
    else if (name === "compareNext") onCompareNext()
  }
  const hint = fingerDown ? hintText : introHintVisible ? t.hintSwipe : null

  return (
    <View
      pointerEvents="box-none"
      style={[styles.column, { top }]}
      onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)}
    >
      <Animated.View entering={enter()}>
        <View
          testID="swipe-indicator"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t.buttonA11y}
          accessibilityHint={t.indicatorHint}
          accessibilityValue={{ text: indicatorValue(layer) }}
          accessibilityActions={actions}
          onAccessibilityAction={onAction}
        >
          <GlassSurface
            tone="auto"
            surface={theme.visual.mapControl.glass}
            style={styles.indicator}
          >
            <Ionicons
              name="chevron-back-outline"
              size={CHEVRON_SIZE}
              color={theme.visual.mapControl.icon}
            />
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {label.name}
            </Text>
            <Text style={styles.era} numberOfLines={1} ellipsizeMode="tail">
              {label.era}
            </Text>
            <Ionicons
              name="chevron-forward-outline"
              size={CHEVRON_SIZE}
              color={theme.visual.mapControl.icon}
            />
          </GlassSurface>
        </View>
      </Animated.View>
      <Animated.View entering={enter()}>
        <View
          testID="swipe-dots"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.dots}
        >
          {BASEMAP_CYCLE.map((key) => (
            <View
              key={key}
              testID={`swipe-dot-${key}`}
              style={[
                styles.dot,
                key === layer && styles.dotCurrent,
                key !== layer && {
                  opacity: isAvailable(key) ? DOT_OPACITY : DOT_OPACITY_UNAVAILABLE,
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
      <Animated.View entering={enter()}>
        <GlassSurface
          tone="auto"
          interactive
          surface={theme.visual.mapControl.glass}
          style={styles.done}
        >
          <AppPressable
            testID="swipe-done"
            disableScale
            disableRipple
            hitSlop={MAP_CONTROL_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t.doneA11y}
            onPress={onDone}
            style={styles.doneHit}
          >
            <Text style={styles.doneText} numberOfLines={1}>
              {t.done}
            </Text>
          </AppPressable>
        </GlassSurface>
      </Animated.View>
      {hint === null ? null : (
        <Animated.View
          entering={enter()}
          exiting={FadeOut.duration(HINT_FADE_MS).reduceMotion(ReduceMotion.System)}
        >
          <View testID="swipe-hint" pointerEvents="none" style={styles.hint}>
            <Text style={styles.hintText}>{hint}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    column: {
      position: "absolute",
      left: SIDE_INSET,
      right: SIDE_INSET,
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    indicator: {
      height: INDICATOR_HEIGHT,
      maxWidth: MAX_WIDTH,
      borderRadius: INDICATOR_HEIGHT / 2,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
    },
    name: {
      ...brandTypography.sectionHeader,
      color: theme.visual.mapControl.text,
      flexShrink: 1,
    },
    era: {
      ...brandTypography.meta,
      fontFamily: "Jost-Regular",
      color: theme.visual.mapControl.textMuted,
      flexShrink: 1,
    },
    dots: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    dot: {
      width: DOT,
      height: DOT,
      borderRadius: DOT / 2,
      backgroundColor: theme.visual.curtain.line,
      borderWidth: 1,
      borderColor: theme.visual.curtain.edge,
    },
    dotCurrent: {
      width: DOT_CURRENT,
      height: DOT_CURRENT,
      borderRadius: DOT_CURRENT / 2,
    },
    done: {
      height: MAP_PILL_HEIGHT,
      maxWidth: MAX_WIDTH,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
      justifyContent: "center",
    },
    doneHit: {
      minHeight: MAP_PILL_HEIGHT,
      paddingHorizontal: 18,
      justifyContent: "center",
    },
    doneText: {
      ...brandTypography.meta,
      color: theme.visual.mapControl.text,
    },
    hint: {
      minHeight: 24,
      maxWidth: MAX_WIDTH,
      paddingVertical: brandSpacing4.xs,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: theme.visual.mapHint.fill,
      justifyContent: "center",
    },
    hintText: {
      ...brandTypography.meta,
      color: theme.visual.mapHint.ink,
      textAlign: "center",
    },
  })
}
