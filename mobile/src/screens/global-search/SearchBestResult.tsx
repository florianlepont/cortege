import { ReactNode, useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppText as Text } from "../../ui/AppText"
import { ContourLines } from "../../ui/ContourLines"
import { RipplePressable } from "../../ui/RipplePressable"

const t = fr.search.best

type SearchBestResultProps = {
  kind: "mine" | "community" | "member" | "place" | "parcel"
  title: string
  meta: string
  /** A survey passes its score ring; the default is the chevron. */
  trailing?: ReactNode
  onPress: () => void
}

const GLYPHS = {
  mine: "leaf-outline",
  community: "people-outline",
  member: "person-outline",
  place: "location-outline",
  parcel: "grid-outline",
} as const satisfies Record<SearchBestResultProps["kind"], string>

const TILE_SIZE = 40
const GLYPH_SIZE = 18
const TILE_GLYPH_SIZE = 20
const STRIP_HEIGHT = 48
const CARD_BORDER = 1

/**
 * The "Meilleur résultat" card (25-09, D-02, UI-SPEC 3a and U-06): a glass card (not the forest hero
 * card, which is one per screen and carries scores) that is one pressable with the green wave. An
 * eyebrow, a 40 pt tile with the type glyph, the title (up to two lines), the meta (up to two lines)
 * and a trailing chevron or the score ring the caller passes. A place or a parcel adds a 48 pt static
 * contour strip and the line "Voir sur la carte": a map thumbnail would need tiles, which are not
 * there offline. No blur, no entrance (the result changes on every keystroke), no animated layer.
 */
export function SearchBestResult({ kind, title, meta, trailing, onPress }: SearchBestResultProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const onMap = kind === "place" || kind === "parcel"

  return (
    <AppCard variant="glass" padding={0} style={styles.card}>
      <RipplePressable
        accessibilityRole="button"
        accessibilityLabel={t.a11y({ title, meta })}
        onPress={onPress}
        testID="search-best-result"
        rippleRadius={brandRadius.card - CARD_BORDER}
        style={styles.pressable}
      >
        <Text style={styles.eyebrow}>{t.title}</Text>
        <View style={styles.main}>
          <View
            style={styles.tile}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Ionicons
              name={GLYPHS[kind]}
              size={TILE_GLYPH_SIZE}
              color={theme.visual.glass.iconTint}
            />
          </View>
          <View style={styles.texts}>
            <Text numberOfLines={2} ellipsizeMode="tail" style={styles.title}>
              {title}
            </Text>
            <Text numberOfLines={2} ellipsizeMode="tail" style={styles.meta}>
              {meta}
            </Text>
          </View>
          {trailing ?? (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Ionicons
                name="chevron-forward-outline"
                size={GLYPH_SIZE}
                color={theme.colors.textSecondary}
              />
            </View>
          )}
        </View>
        {onMap ? (
          <>
            <View
              style={styles.strip}
              testID="search-best-strip"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <ContourLines animated={false} />
            </View>
            <View style={styles.mapLine}>
              <Ionicons name="map-outline" size={GLYPH_SIZE} color={theme.visual.accentText} />
              <Text style={styles.mapLabel}>{t.openOnMap}</Text>
            </View>
          </>
        ) : null}
      </RipplePressable>
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // The card clips the wave and the strip to its corners.
    card: {
      overflow: "hidden",
    },
    pressable: {
      padding: brandSpacing4.md,
      gap: brandSpacing4.sm,
    },
    eyebrow: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
    },
    main: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
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
      ...brandTypeScale.title3,
      fontFamily: brandTypography.screenTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    meta: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    strip: {
      height: STRIP_HEIGHT,
      overflow: "hidden",
      borderRadius: brandRadius.badgeSm,
    },
    mapLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
    },
    mapLabel: {
      ...brandTypography.sectionHeader,
      color: theme.visual.accentText,
    },
  })
}
