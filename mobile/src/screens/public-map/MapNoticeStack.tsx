import { memo, useEffect, useMemo, useRef } from "react"
import { AccessibilityInfo, StyleSheet, View } from "react-native"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import { AppText as Text } from "../../ui/AppText"
import { brandInteraction, brandMotion, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { GlassSurface } from "../../ui/GlassSurface"
import { MapInfoPill } from "./MapChips"
import type { MapNotice } from "./map-notices"

/** Kept clear on both sides: the capsule and the overlay button sit within 72 pt of the right edge. */
export const NOTICE_SIDE_INSET = 72
const GAP = 8

type MapNoticeStackProps = {
  notices: readonly MapNotice[]
  /** Distance from the top of the map: the capsule's top, or below the top mode control. */
  top: number
  /** Drawn and announced nothing (the swipe mode); what was announced is not announced again. */
  hidden?: boolean
  onRetry: () => void
}

/**
 * The centred column of map pills (UI-SPEC section 8): hidden surveys, skipped layers, coverage,
 * offline, error, over-zoom, in the order given. Each notice fades in over 160 ms (none under
 * Reduce Motion) and is announced once to screen readers while it stays; an error also offers
 * "Réessayer". The column lets touches through; only the retry link catches them.
 */
export const MapNoticeStack = memo(function MapNoticeStack({
  notices,
  top,
  hidden = false,
  onRetry,
}: MapNoticeStackProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const announced = useRef(new Set<string>())

  useEffect(() => {
    const present = new Set(notices.map((notice) => notice.id))
    for (const id of announced.current) {
      // A notice that went away may be announced again if it comes back.
      if (!present.has(id)) announced.current.delete(id)
    }
    if (hidden) return
    for (const notice of notices) {
      if (!announced.current.has(notice.id)) {
        announced.current.add(notice.id)
        AccessibilityInfo.announceForAccessibility(notice.text)
      }
    }
  }, [notices, hidden])

  if (hidden || notices.length === 0) {
    return null
  }

  return (
    <View pointerEvents="box-none" style={[styles.column, { top }]}>
      {notices.map((notice) => (
        <Animated.View
          key={notice.id}
          testID={`map-notice-${notice.kind}`}
          entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
          pointerEvents={notice.retry ? "box-none" : "none"}
          style={styles.item}
        >
          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={notice.text}
            style={styles.pillWrap}
          >
            <MapInfoPill label={notice.text} icon={notice.icon} danger={notice.danger} />
          </View>
          {notice.retry ? (
            <GlassSurface
              surface={theme.visual.mapControl.glass}
              interactive
              style={styles.retryPill}
            >
              <AppPressable
                disableScale
                disableRipple
                testID="map-notice-retry"
                accessibilityRole="button"
                accessibilityLabel={fr.mapLayers.notice.retry}
                onPress={onRetry}
                style={styles.retryHit}
              >
                <Text style={styles.retryText}>{fr.mapLayers.notice.retry}</Text>
              </AppPressable>
            </GlassSurface>
          ) : null}
        </Animated.View>
      ))}
    </View>
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    column: {
      position: "absolute",
      left: NOTICE_SIDE_INSET,
      right: NOTICE_SIDE_INSET,
      alignItems: "center",
      gap: GAP,
    },
    item: {
      maxWidth: "100%",
      alignItems: "center",
      gap: GAP,
    },
    pillWrap: {
      maxWidth: "100%",
    },
    retryPill: {
      height: brandInteraction.hitTarget.min,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.visual.mapControl.hairline,
      justifyContent: "center",
    },
    retryHit: {
      minHeight: brandInteraction.hitTarget.min,
      paddingHorizontal: 18,
      justifyContent: "center",
    },
    retryText: {
      ...brandTypography.button,
      fontSize: 13,
      lineHeight: 18,
      color: theme.visual.mapControl.text,
    },
  })
}
