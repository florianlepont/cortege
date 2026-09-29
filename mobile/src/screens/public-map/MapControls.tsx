import { memo, useMemo } from "react"
import { ActivityIndicator, Pressable, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandColors } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import type { BasemapKey } from "../../map/basemaps"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { GlassSurface } from "../../ui/GlassSurface"
import { ExplorerFilterBar, type ExplorerFilterBarProps } from "./ExplorerFilterBar"
import { BasemapToggle, OfflineIndicatorBadge } from "./OfflineControls"
import { createControlStyles } from "./styles"

const t = fr.publicMap
const offlineT = fr.offlineMap.areas

export type MapTopControlsProps = {
  top: number
  count: number
  loading: boolean
  showFilters: boolean
  showParcelLayer: boolean
  layerStatusLabel: string
  filters: ExplorerFilterBarProps
  onToggleFilters: () => void
  onToggleParcelLayer: () => void
  onRefresh: () => void
  /** REQ-D-basemap-switch / REQ-D-offline-map (08-CONTEXT): omitted, the controls do not render. */
  isOffline?: boolean
  basemap?: BasemapKey
  onChangeBasemap?: (basemap: BasemapKey) => void
  onOpenOfflineAreas?: () => void
}

/** Explorer badge, survey count, filters toggle, refresh and the filters panel. */
export const MapTopControls = memo(function MapTopControls({
  top,
  count,
  loading,
  showFilters,
  showParcelLayer,
  layerStatusLabel,
  filters,
  onToggleFilters,
  onToggleParcelLayer,
  onRefresh,
  isOffline = false,
  basemap,
  onChangeBasemap,
  onOpenOfflineAreas,
}: MapTopControlsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createControlStyles(theme), [theme])
  return (
    <View pointerEvents="box-none" style={[styles.overlayShell, { top }]}>
      <View style={styles.topDock}>
        <View style={styles.topDockLeft}>
          <GlassSurface tone="auto" style={styles.exploreBadge}>
            <Ionicons name="globe-outline" size={15} color={brandColors.forest} />
            <Text style={styles.exploreBadgeText}>{t.badge}</Text>
          </GlassSurface>
          <GlassSurface tone="auto" style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{t.count(count)}</Text>
          </GlassSurface>
          {isOffline ? <OfflineIndicatorBadge /> : null}
        </View>

        <View style={styles.topDockActions}>
          {basemap && onChangeBasemap ? (
            <BasemapToggle basemap={basemap} onChange={onChangeBasemap} />
          ) : null}
          {onOpenOfflineAreas ? (
            <Pressable
              onPress={onOpenOfflineAreas}
              accessibilityRole="button"
              accessibilityLabel={offlineT.a11y.openSheet}
            >
              <GlassSurface tone="auto" style={styles.iconButton}>
                <Ionicons name="cloud-download-outline" size={18} color={brandColors.forest} />
              </GlassSurface>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onToggleFilters}
            accessibilityRole="button"
            accessibilityLabel={showFilters ? t.a11y.hideFilters : t.a11y.showFilters}
            accessibilityState={{ expanded: showFilters }}
            accessibilityHint={
              filters.activeCount > 0 ? t.a11y.activeFilterCount(filters.activeCount) : undefined
            }
          >
            <GlassSurface tone="auto" style={styles.iconButton}>
              <Ionicons
                name={showFilters ? "close-outline" : "options-outline"}
                size={18}
                color={brandColors.forest}
              />
              {filters.activeCount > 0 ? (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountBadgeText}>{filters.activeCount}</Text>
                </View>
              ) : null}
            </GlassSurface>
          </Pressable>
          <Pressable
            style={loading ? styles.iconButtonDisabled : styles.iconButtonPrimary}
            onPress={onRefresh}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t.a11y.refresh}
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.semanticColors.onCtaPrimary} />
            ) : (
              <Ionicons name="refresh" size={18} color={theme.semanticColors.onCtaPrimary} />
            )}
          </Pressable>
        </View>
      </View>

      {showFilters ? (
        <AppCard glass padding={14} style={styles.filtersPanel}>
          <AppSectionHeader
            title={t.filters.title}
            subtitle={t.filters.subtitle}
            titleStyle={styles.filtersTitle}
            subtitleStyle={styles.filtersMeta}
            trailing={
              <Pressable
                style={[
                  styles.layerTogglePill,
                  showParcelLayer ? styles.layerTogglePillOn : styles.layerTogglePillOff,
                ]}
                onPress={onToggleParcelLayer}
                accessibilityRole="button"
                accessibilityLabel={showParcelLayer ? t.a11y.hideParcels : t.a11y.showParcels}
                accessibilityState={{ selected: showParcelLayer }}
              >
                <Ionicons
                  name={showParcelLayer ? "layers" : "layers-outline"}
                  size={14}
                  color={showParcelLayer ? brandColors.white : brandColors.forest}
                />
                <Text
                  style={[
                    styles.layerTogglePillText,
                    showParcelLayer ? styles.layerTogglePillTextOn : null,
                  ]}
                >
                  {layerStatusLabel}
                </Text>
              </Pressable>
            }
          />

          <ExplorerFilterBar {...filters} />
        </AppCard>
      ) : null}
    </View>
  )
})

export type MapBottomDockProps = {
  bottom: number
  showEmpty: boolean
  locating: boolean
  onLocate: () => void
}

/** The "no survey here" bubble and the locate button. */
export const MapBottomDock = memo(function MapBottomDock({
  bottom,
  showEmpty,
  locating,
  onLocate,
}: MapBottomDockProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createControlStyles(theme), [theme])
  return (
    <View style={[styles.bottomDock, { bottom }]}>
      {showEmpty ? (
        <AppCard glass padding={14} style={styles.emptyDockBubble}>
          <Text style={styles.emptyDockText}>{t.empty}</Text>
        </AppCard>
      ) : (
        <View />
      )}

      <Pressable
        style={styles.locateButton}
        onPress={onLocate}
        disabled={locating}
        accessibilityRole="button"
        accessibilityLabel={t.a11y.locate}
        accessibilityState={{ disabled: locating, busy: locating }}
      >
        {locating ? (
          <ActivityIndicator size="small" color={theme.semanticColors.onCtaPrimary} />
        ) : (
          <Ionicons name="locate" size={20} color={theme.semanticColors.onCtaPrimary} />
        )}
      </Pressable>
    </View>
  )
})
