import { Ionicons } from "@expo/vector-icons"
import { isWeatherSkyCode, type SurveyWeather, type WeatherSkyCode } from "@cortege/ibp-domain"
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
import { formatWeatherLine, formatWeatherNumber, weatherCardMention } from "../../../app/weather"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
import { AppText as Text } from "../../../ui/AppText"
import { EntranceView } from "../../../ui/EntranceView"
import { RipplePressable } from "../../../ui/RipplePressable"
import { weatherRowEntries } from "./weather-rows"

const t = fr.conditions
const s = t.summary

/** The glyph of each sky, one outline glyph per code (UI-SPEC 3.1). */
export const SKY_GLYPHS: Record<WeatherSkyCode, keyof typeof Ionicons.glyphMap> = {
  clear: "sunny-outline",
  partly_cloudy: "partly-sunny-outline",
  cloudy: "cloudy-outline",
  overcast: "cloud-outline",
  fog: "reorder-two-outline",
  rain: "rainy-outline",
  thunderstorm: "thunderstorm-outline",
  snow: "snow-outline",
}

/** Without a sky the card still has a glyph: the neutral one of the invitation. */
const NEUTRAL_GLYPH: keyof typeof Ionicons.glyphMap = "cloud-outline"
const OFFLINE_GLYPH: keyof typeof Ionicons.glyphMap = "cloud-offline-outline"

const TILE_SIZE = 64
const SKY_GLYPH_SIZE = 40
const CHEVRON_SIZE = 18
const PRESS_MIN_HEIGHT = 44
const NUMERAL_SIZE = 44
const STAT_KEYS = ["wind", "rain", "time"] as const

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

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

/**
 * The weather at the top of the survey summary (D-17, D-40, UI-SPEC 3.1): a glass card with a big
 * sky glyph beside the temperature, then wind, rain over 24 h and the time of the measurement as
 * compact columns that wrap at large text sizes, and the short "Météo-France" mention (D-35). The
 * whole card is one press target opening the weather of the Contexte page, chevron included. With
 * only the observer's sky (D-37) it shows the glyph and the sky, no figure and no mention. A draft
 * with nothing shows a friendly invitation (calm when offline, never an error), a submitted survey
 * with nothing draws nothing. One entrance, no loop.
 */
export function WeatherCard({ weather, loading, offline, submitted, onOpen }: WeatherCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const line = formatWeatherLine(weather)
  const mention = weatherCardMention(weather)
  const sky = weather && isWeatherSkyCode(weather.sky) ? weather.sky : null
  const temperature = finite(weather?.temperature_c) ? weather.temperature_c : null
  const stats = weatherRowEntries(weather, { sky: false }).filter((entry) =>
    (STAT_KEYS as readonly string[]).includes(entry.key),
  )
  const hasContent = temperature !== null || sky !== null || stats.length > 0

  if (!hasContent && !loading && submitted) return null

  const showsValues = hasContent
  const areaLabel = areaAccessibilityLabel({ line, mention, loading, offline, hasContent })

  return (
    <EntranceView index={0}>
      <View testID="weather-card">
        <AppCard variant="glass" padding={brandSpacing4.md}>
          <RipplePressable
            testID="weather-card-area"
            style={styles.area}
            rippleRadius={brandRadius.field}
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={areaLabel}
          >
            <View style={styles.head}>
              <View style={styles.tile} testID="weather-card-tile">
                {!showsValues && loading ? (
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
                        : !showsValues && offline
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
                {temperature !== null ? (
                  <>
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
                    {sky !== null ? <Text style={styles.skyLabel}>{t.sky[sky]}</Text> : null}
                  </>
                ) : sky !== null ? (
                  <Text style={styles.headline}>{t.sky[sky]}</Text>
                ) : showsValues ? (
                  <Text style={styles.headline}>{s.emptyTitle}</Text>
                ) : loading ? (
                  <Text style={styles.body}>{s.loading}</Text>
                ) : (
                  <>
                    <Text style={styles.headline}>{s.emptyTitle}</Text>
                    <Text style={styles.body}>{offline ? s.offlineBody : s.emptyBody}</Text>
                  </>
                )}
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={CHEVRON_SIZE}
                color={theme.colors.textSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>

            {stats.length > 0 ? (
              <View style={styles.stats} testID="weather-card-stats">
                {stats.map((entry) => (
                  <View
                    key={entry.key}
                    style={styles.stat}
                    testID={`weather-card-stat-${entry.key}`}
                  >
                    <Text style={styles.statLabel}>
                      {s.stat[entry.key as (typeof STAT_KEYS)[number]]}
                    </Text>
                    <Text style={styles.statValue}>{entry.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {mention !== null ? (
              <Text style={styles.mention} testID="weather-card-mention">
                {mention}
              </Text>
            ) : null}
          </RipplePressable>
        </AppCard>
      </View>
    </EntranceView>
  )
}

/** "Ouvrir la météo du relevé. {what the card says}" (UI-SPEC 3.1, accessibility). */
function areaAccessibilityLabel(input: {
  line: string | null
  mention: string | null
  loading: boolean
  offline: boolean
  hasContent: boolean
}): string {
  if (input.line !== null) {
    return input.mention !== null
      ? s.openWithLineSource(input.line, input.mention)
      : s.openWithLine(input.line)
  }
  if (input.hasContent) return s.open
  if (input.loading) return s.openWithLine(s.loading)
  return s.openWithLine(input.offline ? s.offlineBody : s.emptyBody)
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    area: {
      minHeight: PRESS_MIN_HEIGHT,
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
    body: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
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
    mention: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
  })
}
