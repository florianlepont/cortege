import { Children, Fragment, ReactNode, isValidElement, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { brandInteraction, brandRadius, brandTypography } from "../../app/brand-tokens"
import type { SearchGroupKey } from "../../app/global-search"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { RECENT_LAYOUT } from "../home/layout-budget"

const t = fr.search

type SearchGroupCardProps = {
  group: SearchGroupKey
  /** "Voir les N": absent when the group has no row beyond those drawn. */
  seeAll?: { count: number; capped: boolean; onPress: () => void } | null
  /** Rows, or one notice line; null children are skipped and get no separator. */
  children: ReactNode
}

/**
 * One group of the search summary (25-09, D-02, UI-SPEC 3b): a header with the group name and the
 * optional "Voir les N" link (a 44 pt target naming its group), above ONE glass card that clips its
 * rows and divides them with hairlines. The construction is the one of "Mes relevés récents" on
 * Accueil. No entrance animation: the rows change on every keystroke.
 */
export function SearchGroupCard({ group, seeAll, children }: SearchGroupCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const title = t.groups[group]
  const rows = Children.toArray(children)

  return (
    <View testID={`search-group-${group}`}>
      <AppSectionHeader
        title={title}
        titleAccessibilityRole="header"
        style={styles.header}
        trailing={
          seeAll ? (
            <AppPressable
              style={styles.seeAll}
              onPress={seeAll.onPress}
              accessibilityRole="button"
              accessibilityLabel={t.seeAllA11y({ group: title, count: seeAll.count })}
              testID={`search-see-all-${group}`}
            >
              <Text style={styles.seeAllLabel}>
                {t.seeAll({ count: seeAll.count, capped: seeAll.capped })}
              </Text>
            </AppPressable>
          ) : null
        }
      />
      {/* The shell carries the glass and the shadow; the clip keeps the wave inside the corners. */}
      <View style={styles.card}>
        <View style={styles.clip}>
          {rows.map((row, position) => (
            <Fragment key={isValidElement(row) && row.key !== null ? row.key : position}>
              {position > 0 ? <View style={styles.separator} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
      </View>
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
    seeAll: {
      minHeight: brandInteraction.hitTarget.min,
      minWidth: brandInteraction.hitTarget.min,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    seeAllLabel: {
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
  })
}
