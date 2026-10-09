import { Fragment, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { EntranceView } from "../../ui/EntranceView"
import { RipplePressable } from "../../ui/RipplePressable"
import { RECENT_LAYOUT } from "../home/layout-budget"

const t = fr.search.start

const TILE_SIZE = 32
const GLYPH_SIZE = 18
const INTRO_TILE_SIZE = 96
const INTRO_GLYPH_SIZE = 48
const INTRO_BODY_MAX_WIDTH = 280

type SearchStartPageProps = {
  /** The recent searches, newest first (at most 8). */
  recents: readonly string[]
  /** A tapped recent search: the page fills the field and searches at once. */
  onOpenRecent: (query: string) => void
  onRemoveRecent: (query: string) => void
  /** "Effacer": clears the whole list, no confirmation (a convenience list, UI-SPEC). */
  onClearRecents: () => void
}

/**
 * What the search page shows under the field while the query is shorter than two characters (25-11,
 * D-02b, UI-SPEC section 2): the recent searches in one glass card, or, with none, the intro
 * "Que cherchez-vous ?". The sections slide in when the tab becomes visible (`EntranceView`), never
 * on a keystroke: this page is replaced by the results as soon as the query is long enough.
 */
export function SearchStartPage({
  recents,
  onOpenRecent,
  onRemoveRecent,
  onClearRecents,
}: SearchStartPageProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (recents.length === 0) {
    return (
      <EntranceView index={0} style={styles.intro}>
        <View
          style={styles.introTile}
          testID="search-intro-tile"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons
            name="search-outline"
            size={INTRO_GLYPH_SIZE}
            color={theme.visual.glass.iconTint}
          />
        </View>
        <Text style={styles.introTitle}>{t.introTitle}</Text>
        <Text style={styles.introBody}>{t.introBody}</Text>
      </EntranceView>
    )
  }

  return (
    <View testID="search-recents">
      <EntranceView index={0}>
        <AppSectionHeader
          title={t.recentTitle}
          titleAccessibilityRole="header"
          style={styles.header}
          trailing={
            <AppPressable
              style={styles.clearAll}
              onPress={onClearRecents}
              accessibilityRole="button"
              accessibilityLabel={t.recentClearA11y}
              testID="search-recents-clear"
            >
              <Text style={styles.clearAllLabel}>{t.recentClear}</Text>
            </AppPressable>
          }
        />
      </EntranceView>
      {/* The shell carries the glass and the shadow; the clip keeps the wave inside the corners. */}
      <EntranceView index={1}>
        <View style={styles.card}>
          <View style={styles.clip}>
            {recents.map((query, index) => (
              <Fragment key={query}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <View style={styles.row}>
                  <RipplePressable
                    accessibilityRole="button"
                    accessibilityLabel={t.recentOpenA11y(query)}
                    onPress={() => onOpenRecent(query)}
                    testID={`search-recent-${index}`}
                    rippleRadius={0}
                    style={styles.open}
                  >
                    <View
                      style={styles.tile}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      <Ionicons
                        name="time-outline"
                        size={GLYPH_SIZE}
                        color={theme.visual.glass.iconTint}
                      />
                    </View>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.query}>
                      {query}
                    </Text>
                  </RipplePressable>
                  <AppPressable
                    style={styles.remove}
                    onPress={() => onRemoveRecent(query)}
                    accessibilityRole="button"
                    accessibilityLabel={t.recentRemoveA11y(query)}
                    testID={`search-recent-remove-${index}`}
                  >
                    <Ionicons
                      name="close-outline"
                      size={GLYPH_SIZE}
                      color={theme.colors.textSecondary}
                    />
                  </AppPressable>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      </EntranceView>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // The link is a 44 pt target, so the header centres its title on it, like "Tout voir" on Accueil.
    header: {
      alignItems: "center",
      minHeight: RECENT_LAYOUT.headerHeight,
    },
    clearAll: {
      minHeight: brandInteraction.hitTarget.min,
      minWidth: brandInteraction.hitTarget.min,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    clearAllLabel: {
      ...brandTypography.sectionHeader,
      color: theme.visual.accentText,
    },
    card: {
      borderRadius: brandRadius.card,
      borderWidth: RECENT_LAYOUT.cardBorder,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
    },
    clip: {
      overflow: "hidden",
      borderRadius: brandRadius.card - RECENT_LAYOUT.cardBorder,
    },
    separator: {
      height: RECENT_LAYOUT.separator,
      backgroundColor: theme.colors.divider,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: RECENT_LAYOUT.rowHeight,
    },
    open: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: RECENT_LAYOUT.rowHeight,
      paddingVertical: RECENT_LAYOUT.rowPaddingY,
      paddingLeft: brandSpacing4.md,
    },
    tile: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: brandRadius.badgeSm,
      backgroundColor: theme.visual.glass.iconTile,
    },
    query: {
      ...brandTypography.input,
      flex: 1,
      minWidth: 0,
      color: theme.colors.textPrimary,
    },
    remove: {
      width: brandInteraction.hitTarget.min,
      height: brandInteraction.hitTarget.min,
      alignItems: "center",
      justifyContent: "center",
    },
    intro: {
      alignItems: "center",
      paddingTop: brandSpacing4.xl,
      paddingHorizontal: brandSpacing4.md,
      gap: brandSpacing4.smd,
    },
    introTile: {
      width: INTRO_TILE_SIZE,
      height: INTRO_TILE_SIZE,
      borderRadius: INTRO_TILE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.glass.iconTile,
    },
    introTitle: {
      ...brandTypography.input,
      textAlign: "center",
      color: theme.colors.textPrimary,
    },
    introBody: {
      ...brandTypeScale.footnote,
      maxWidth: INTRO_BODY_MAX_WIDTH,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
  })
}
