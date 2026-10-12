import { Ionicons } from "@expo/vector-icons"
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import {
  brandDefaultFontFamily,
  brandFontScaleCaps,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { formatWeatherNumber } from "../../../app/weather"
import { fr } from "../../../i18n"
import { AppText as Text } from "../../../ui/AppText"
import { NEUTRAL_GLYPH, SKY_GLYPHS, type WeatherCardModel } from "./weather-card-model"

const t = fr.conditions
const s = t.summary

const TILE_SIZE = 64
const SKY_GLYPH_SIZE = 40
const NUMERAL_SIZE = 44

type WeatherHeroProps = {
  model: WeatherCardModel
}

/**
 * The big weather read-out of the Contexte page (D-41, the look D-40 gave the summary card): an
 * outline sky glyph in a tile beside the temperature numeral, its unit and the sky label, then wind,
 * rain over 24 h and the time of the measurement as columns that wrap at large text sizes. Read
 * only: the measurements are Météo-France's (D-37). With only the observer's sky it shows the glyph
 * and the label. The caller draws it only when the model has content.
 */
export function WeatherHero({ model }: WeatherHeroProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { sky, temperature, stats } = model

  return (
    <View style={styles.hero} testID="weather-hero">
      <View style={styles.head}>
        <View style={styles.tile} testID="weather-hero-tile">
          <Ionicons
            name={sky !== null ? SKY_GLYPHS[sky] : NEUTRAL_GLYPH}
            size={SKY_GLYPH_SIZE}
            color={theme.visual.glass.iconTint}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>

        <View style={styles.copy}>
          {temperature !== null ? (
            <>
              <View style={styles.numeralRow} testID="weather-hero-numeral">
                <Text
                  style={styles.numeral}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  maxFontSizeMultiplier={brandFontScaleCaps.display}
                >
                  {formatWeatherNumber(temperature)}
                </Text>
                <Text style={styles.unit} maxFontSizeMultiplier={brandFontScaleCaps.display}>
                  {s.temperatureUnit}
                </Text>
              </View>
              {sky !== null ? <Text style={styles.skyLabel}>{t.sky[sky]}</Text> : null}
            </>
          ) : (
            <Text style={styles.headline}>{sky !== null ? t.sky[sky] : s.emptyTitle}</Text>
          )}
        </View>
      </View>

      {stats.length > 0 ? (
        <View style={styles.stats} testID="weather-hero-stats">
          {stats.map((entry) => (
            <View
              key={entry.key}
              style={styles.stat}
              testID={`weather-hero-stat-${entry.key}`}
              accessible
              accessibilityLabel={entry.accessibilityLabel}
            >
              <Text style={styles.statLabel}>{s.stat[entry.key]}</Text>
              <Text style={styles.statValue}>{entry.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    hero: {
      gap: brandSpacing4.smd,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.md,
    },
    tile: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      borderRadius: brandRadius.badgeSm * 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.glass.iconTile,
    },
    copy: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    numeralRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: brandSpacing4.xs,
    },
    numeral: {
      ...brandTypography.numeralCard,
      fontSize: NUMERAL_SIZE,
      lineHeight: NUMERAL_SIZE + 4,
      letterSpacing: -2,
      color: theme.semanticColors.textStrong,
      flexShrink: 1,
    },
    unit: {
      ...brandTypography.numeralUnit,
      color: theme.colors.textSecondary,
    },
    skyLabel: {
      ...brandTypeScale.subhead,
      fontFamily: "Jost-SemiBold",
      color: theme.semanticColors.textStrong,
    },
    headline: {
      ...brandTypeScale.headline,
      fontFamily: "Jost-SemiBold",
      color: theme.semanticColors.textStrong,
    },
    // Columns that grow to share the row and drop to the next line when the text is large.
    stats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
    stat: {
      flexGrow: 1,
      flexBasis: 88,
      borderRadius: brandRadius.field,
      paddingHorizontal: brandSpacing4.smd,
      paddingVertical: brandSpacing4.sm,
      backgroundColor: theme.visual.glass.iconTile,
    },
    statLabel: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    statValue: {
      ...brandTypeScale.subhead,
      fontFamily: "Jost-SemiBold",
      color: theme.semanticColors.textStrong,
    },
  })
}
