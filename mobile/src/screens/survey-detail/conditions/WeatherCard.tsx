import { Ionicons } from "@expo/vector-icons"
import { type SurveyWeather } from "@cortege/ibp-domain"
import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
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
import { AppCard } from "../../../ui/AppCard"
import { AppText as Text } from "../../../ui/AppText"
import { EntranceView } from "../../../ui/EntranceView"
import { RipplePressable } from "../../../ui/RipplePressable"
import {
  areaAccessibilityLabel,
  NEUTRAL_GLYPH,
  OFFLINE_GLYPH,
  SKY_GLYPHS,
  weatherCardModel,
  weatherDetailLine,
} from "./weather-card-model"

export { SKY_GLYPHS } from "./weather-card-model"

const t = fr.conditions
const s = t.summary

const TILE_SIZE = 40
const SKY_GLYPH_SIZE = 24
const CHEVRON_SIZE = 18
const PRESS_MIN_HEIGHT = 44
const NUMERAL_SIZE = 28

type WeatherCardProps = {
  weather: SurveyWeather | null
  /** A weather lookup is running for this survey. */
  loading: boolean
  /** There is no network: an empty card says so calmly. */
  offline: boolean
  /** A submitted survey: with nothing to show the card is not drawn. */
  submitted: boolean
  /** Opens the Contexte page at its weather section. */
  onOpen: () => void
}

/**
 * The weather of the survey summary (D-17, D-41): a compact glass card right under the score card,
 * one row of about 70 points. A small sky glyph, the temperature with its unit and the sky label on
 * the main line, wind and rain as small secondary text under it with the short "Météo-France"
 * mention (D-35), and a chevron. The whole card is one press target opening the weather of the
 * Contexte page, where the big read-out and the sky chips live. With only the observer's sky (D-37)
 * it shows the glyph and the label. A draft with nothing shows a slim invitation (calm when offline,
 * never an error), a submitted survey with nothing draws nothing. At very large text the lines wrap
 * and the card grows. One entrance, no loop.
 */
export function WeatherCard({ weather, loading, offline, submitted, onOpen }: WeatherCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const model = weatherCardModel(weather)
  const { sky, temperature, mention, hasContent } = model
  const detail = weatherDetailLine(weather)

  if (!hasContent && !loading && submitted) return null

  const areaLabel = areaAccessibilityLabel({
    line: model.line,
    mention,
    loading,
    offline,
    hasContent,
  })
  const showSpinner = !hasContent && loading

  return (
    <EntranceView index={0}>
      <View testID="weather-card">
        <AppCard variant="glass" padding={brandSpacing4.smd}>
          <RipplePressable
            testID="weather-card-area"
            style={styles.area}
            rippleRadius={brandRadius.field}
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={areaLabel}
          >
            <View style={styles.tile} testID="weather-card-tile">
              {showSpinner ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textSecondary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              ) : (
                <Ionicons
                  name={
                    sky !== null
                      ? SKY_GLYPHS[sky]
                      : !hasContent && offline
                        ? OFFLINE_GLYPH
                        : NEUTRAL_GLYPH
                  }
                  size={SKY_GLYPH_SIZE}
                  color={theme.visual.glass.iconTint}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              )}
            </View>

            <View style={styles.copy}>
              {temperature !== null || sky !== null ? (
                <View style={styles.mainLine} testID="weather-card-main">
                  {temperature !== null ? (
                    <View style={styles.numeralRow} testID="weather-card-numeral">
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
                  ) : null}
                  {sky !== null ? <Text style={styles.skyLabel}>{t.sky[sky]}</Text> : null}
                </View>
              ) : hasContent ? (
                <Text style={styles.headline}>{s.emptyTitle}</Text>
              ) : (
                <Text style={styles.body} testID="weather-card-slim">
                  {loading ? s.loading : offline ? s.compactOffline : s.compactEmpty}
                </Text>
              )}

              {detail !== null || mention !== null ? (
                <View style={styles.subLine} testID="weather-card-sub">
                  {detail !== null ? (
                    <Text style={styles.sub} testID="weather-card-detail">
                      {detail}
                    </Text>
                  ) : null}
                  {mention !== null ? (
                    <Text style={styles.mention} testID="weather-card-mention">
                      {mention}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={CHEVRON_SIZE}
              color={theme.colors.textSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </RipplePressable>
        </AppCard>
      </View>
    </EntranceView>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    area: {
      minHeight: PRESS_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
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
      gap: brandSpacing4.xxs,
    },
    // Wraps to a second line at very large text sizes instead of squeezing the numeral.
    mainLine: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
      columnGap: brandSpacing4.sm,
    },
    numeralRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: brandSpacing4.xxs,
      flexShrink: 1,
    },
    numeral: {
      ...brandTypography.numeralCard,
      fontSize: NUMERAL_SIZE,
      lineHeight: NUMERAL_SIZE + 4,
      letterSpacing: -1.2,
      color: theme.semanticColors.textStrong,
      flexShrink: 1,
    },
    unit: {
      ...brandTypeScale.subhead,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    skyLabel: {
      ...brandTypeScale.subhead,
      fontFamily: "Jost-SemiBold",
      color: theme.semanticColors.textStrong,
    },
    headline: {
      ...brandTypeScale.subhead,
      fontFamily: "Jost-SemiBold",
      color: theme.semanticColors.textStrong,
    },
    body: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    // The detail and the mention share a line; the mention drops below at large text sizes.
    subLine: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
      justifyContent: "space-between",
      columnGap: brandSpacing4.sm,
    },
    sub: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    mention: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
  })
}
