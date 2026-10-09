import { memo, useMemo } from "react"
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
import { AppText as Text } from "../../ui/AppText"
import { RipplePressable } from "../../ui/RipplePressable"
import { RECENT_LAYOUT } from "../home/layout-budget"

export type SearchResultKind = "member" | "place" | "parcel"

type SearchResultRowProps = {
  kind: SearchResultKind
  title: string
  meta: string
  accessibilityLabel: string
  onPress: () => void
  /** "compact" (default): the slim 52 pt row of a summary card. "regular": its own 56 pt glass card. */
  density?: "compact" | "regular"
  testID?: string
}

const GLYPHS = {
  member: "person-outline",
  place: "location-outline",
  parcel: "grid-outline",
} as const satisfies Record<SearchResultKind, string>

const TILE_SIZE = 32
const GLYPH_SIZE = 18
const REGULAR_MIN_HEIGHT = 56
const CARD_BORDER = 1

/**
 * A member, place or parcel result (25-04, UI-SPEC section 3b and 4): a 32 pt glass tile with the
 * type glyph, a one-line title, a one-line meta and a trailing chevron. "compact" is the flat slim row
 * of a shared summary card (the card clips the wave, so it is drawn square); "regular" is a glass card
 * of its own for the full list. The row is one accessible button and the press is the green wave.
 * Every text arrives as a prop, built by the caller from the catalogue.
 */
function SearchResultRowComponent({
  kind,
  title,
  meta,
  accessibilityLabel,
  onPress,
  density = "compact",
  testID,
}: SearchResultRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const regular = density === "regular"

  return (
    <RipplePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      rippleRadius={regular ? brandRadius.card - CARD_BORDER : 0}
      style={regular ? styles.rowRegular : styles.rowCompact}
    >
      <View
        style={styles.tile}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name={GLYPHS[kind]} size={GLYPH_SIZE} color={theme.visual.glass.iconTint} />
      </View>
      <View style={styles.texts}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.meta}>
          {meta}
        </Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ionicons
          name="chevron-forward-outline"
          size={GLYPH_SIZE}
          color={theme.colors.textSecondary}
        />
      </View>
    </RipplePressable>
  )
}

export const SearchResultRow = memo(SearchResultRowComponent)

function createStyles(theme: BrandTheme) {
  const row = {
    flexDirection: "row",
    alignItems: "center",
    gap: brandSpacing4.smd,
    paddingVertical: RECENT_LAYOUT.rowPaddingY,
    paddingHorizontal: brandSpacing4.md,
  } as const
  return StyleSheet.create({
    rowCompact: {
      ...row,
      minHeight: RECENT_LAYOUT.rowHeight,
    },
    // The glass of a Mes Relevés card, for one row on its own.
    rowRegular: {
      ...row,
      minHeight: Math.max(REGULAR_MIN_HEIGHT, brandInteraction.hitTarget.min),
      borderRadius: brandRadius.card,
      borderWidth: CARD_BORDER,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
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
    texts: {
      flex: 1,
      minWidth: 0,
      gap: brandSpacing4.xs,
    },
    title: {
      ...brandTypography.input,
      color: theme.colors.textPrimary,
    },
    // 13 pt with a 16 pt line: 20 + 4 + 16 plus the two 6 pt paddings is exactly the 52 pt of a
    // survey row, so the three row kinds of one card are the same height.
    meta: {
      ...brandTypeScale.footnote,
      lineHeight: brandTypography.meta.lineHeight,
      color: theme.colors.textSecondary,
    },
  })
}
