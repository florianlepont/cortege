import { useCallback, useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import type { LayoutChangeEvent } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated"
import { brandRadius, brandSpacing, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { SyncStatusPill } from "../../ui/SyncStatusPill"

const t = fr.surveyList

// HOME-01: a plain large title that collapses on scroll, not a themed dashboard hero — the
// forest-coloured card, stat tiles and dynamic "attention" copy moved to (or stayed on) Home.
const HERO_EXPANDED_PADDING_TOP = 6
const HERO_EXPANDED_PADDING_BOTTOM = 10
const COLLAPSED_HERO_HEIGHT = 52

export type HeroGeometry = {
  expandedHeroHeight: number
  collapsedHeroHeight: number
  heroTopInset: number
  onHeaderLayout: (event: LayoutChangeEvent) => void
}

export function useHeroGeometry(safeTop: number): HeroGeometry {
  const [headerHeight, setHeaderHeight] = useState(0)

  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(Math.ceil(event.nativeEvent.layout.height))
  }, [])

  const baseExpandedHeroHeight = 76
  const measuredExpandedHeroHeight =
    headerHeight > 0 ? HERO_EXPANDED_PADDING_TOP + headerHeight + HERO_EXPANDED_PADDING_BOTTOM : 0

  return {
    expandedHeroHeight: Math.max(baseExpandedHeroHeight, measuredExpandedHeroHeight),
    collapsedHeroHeight: COLLAPSED_HERO_HEIGHT,
    heroTopInset: safeTop + brandSpacing.xs,
    onHeaderLayout,
  }
}

type ListHeroProps = {
  scrollY: SharedValue<number>
  geometry: HeroGeometry
  itemCountLabel: string
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  onOpenSyncStatus: () => void
  onOpenCreateSurvey: () => void
}

// SYNC-02 + LIST: the sync pill and the "+" create action live in this header (not only in
// Settings, not as an in-list create card) — Mes Relevés is otherwise a pure list.
export function ListHero({
  scrollY,
  geometry,
  itemCountLabel,
  isOnline,
  isSyncing,
  pendingCount,
  onOpenSyncStatus,
  onOpenCreateSurvey,
}: ListHeroProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { expandedHeroHeight, collapsedHeroHeight, heroTopInset } = geometry
  const collapseDistance = expandedHeroHeight - collapsedHeroHeight

  const heroShellStyle = useAnimatedStyle(() => ({
    height:
      interpolate(
        scrollY.value,
        [0, collapseDistance],
        [expandedHeroHeight, collapsedHeroHeight],
        Extrapolation.CLAMP,
      ) + heroTopInset,
    paddingTop: heroTopInset,
  }))
  const expandedLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, collapseDistance * 0.6], [1, 0], Extrapolation.CLAMP),
  }))
  const compactLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [collapseDistance * 0.4, collapseDistance],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }))

  return (
    <Animated.View pointerEvents="box-none" style={[styles.heroShell, heroShellStyle]}>
      <View pointerEvents="box-none" style={styles.heroRow}>
        <View style={styles.titleBlock} onLayout={geometry.onHeaderLayout}>
          <Animated.View style={expandedLayerStyle}>
            <Text style={styles.titleExpanded}>{t.hero.title}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {itemCountLabel}
            </Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.compactLayer, compactLayerStyle]}>
            <Text numberOfLines={1} style={styles.titleCompact}>
              {t.hero.title}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.trailing}>
          <SyncStatusPill
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingCount}
            onPress={onOpenSyncStatus}
          />
          <AppPressable
            accessibilityLabel={t.a11y.createSurvey}
            onPress={onOpenCreateSurvey}
            style={styles.createButton}
          >
            <Ionicons name="add" size={22} color={theme.colors.white} />
          </AppPressable>
        </View>
      </View>
    </Animated.View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    heroShell: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.canvas,
    },
    heroRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing.sm,
    },
    titleBlock: {
      flex: 1,
      justifyContent: "center",
    },
    titleExpanded: {
      ...brandTypography.sectionTitle,
      fontSize: 30,
      lineHeight: 34,
      color: theme.colors.forest,
    },
    subtitle: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    compactLayer: {
      ...StyleSheet.absoluteFill,
      justifyContent: "center",
    },
    titleCompact: {
      ...brandTypography.sectionTitle,
      fontSize: 20,
      lineHeight: 24,
      color: theme.colors.forest,
    },
    trailing: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing.sm,
      flexShrink: 0,
    },
    createButton: {
      width: 36,
      height: 36,
      borderRadius: brandRadius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.forest,
    },
  })
}
