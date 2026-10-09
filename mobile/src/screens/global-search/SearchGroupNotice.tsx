import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandInteraction,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { Skeleton } from "../../ui/Skeleton"
import { RECENT_LAYOUT } from "../home/layout-budget"

const t = fr.search

/** The network groups: "Mes relevés" is filtered on the phone and never shows these lines. */
export type SearchNoticeGroup = "community" | "places" | "parcels"

type SearchGroupNoticeProps = {
  group: SearchNoticeGroup
  variant: "loading" | "offline" | "error"
  /** Why the group failed: a rate limit has its own sentence. */
  error?: "rateLimited" | "failed" | null
  /** The "Réessayer" link of the error line: re-runs this group only. */
  onRetry?: () => void
}

const GLYPH_SIZE = 18
const DISC_SIZE = 32

/**
 * The line that replaces the rows of one network group (25-09, D-02b and D-10, UI-SPEC 3b): the first
 * load (one skeleton row), no connection (glyph and sentence, no button: the group re-queries by
 * itself when the connection returns) or a failed request (glyph, group sentence and "Réessayer").
 * Colour is never the only carrier: each line has a glyph and a sentence, and the offline and error
 * lines are polite live regions. Texts come from the catalogue only, never from the raw error.
 * No entrance: results change on every keystroke.
 */
export function SearchGroupNotice({ group, variant, error, onRetry }: SearchGroupNoticeProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (variant === "loading") {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={t.field.busy}
        testID={`search-loading-${group}`}
      >
        <Skeleton width={DISC_SIZE} height={DISC_SIZE} borderRadius={DISC_SIZE / 2} />
        <View style={styles.lines}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
    )
  }

  if (variant === "offline") {
    return (
      <View style={styles.row} accessibilityLiveRegion="polite" testID={`search-offline-${group}`}>
        <View
          style={styles.glyph}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons
            name="cloud-offline-outline"
            size={GLYPH_SIZE}
            color={theme.colors.textSecondary}
          />
        </View>
        <Text numberOfLines={2} style={styles.text}>
          {t.offline[group]}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.row} accessibilityLiveRegion="polite" testID={`search-error-${group}`}>
      <View
        style={styles.glyph}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name="alert-circle-outline" size={GLYPH_SIZE} color={theme.onSurface.danger} />
      </View>
      <Text numberOfLines={2} style={styles.text}>
        {error === "rateLimited" ? t.error.rateLimited : t.error[group]}
      </Text>
      <AppPressable
        style={styles.retry}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t.error.retryA11y(t.groups[group])}
        testID={`search-retry-${group}`}
      >
        <Text style={styles.retryLabel}>{t.error.retry}</Text>
      </AppPressable>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: RECENT_LAYOUT.rowHeight,
      paddingVertical: RECENT_LAYOUT.rowPaddingY,
      paddingHorizontal: brandSpacing4.md,
    },
    lines: {
      flex: 1,
      gap: brandSpacing4.xs,
    },
    glyph: {
      width: DISC_SIZE - brandSpacing4.md,
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      ...brandTypeScale.footnote,
      flex: 1,
      minWidth: 0,
      color: theme.colors.textSecondary,
    },
    retry: {
      minHeight: brandInteraction.hitTarget.min,
      minWidth: brandInteraction.hitTarget.min,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    retryLabel: {
      ...brandTypography.sectionHeader,
      color: theme.visual.accentText,
    },
  })
}
