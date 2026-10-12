import { Ionicons } from "@expo/vector-icons"
import { isWeatherSkyCode, type SurveyWeather, type WeatherSkyCode } from "@cortege/ibp-domain"
import { useMemo } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import Animated, { LinearTransition, ReduceMotion } from "react-native-reanimated"
import {
  brandDefaultFontFamily,
  brandMotion,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
} from "../../../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { formatWeatherLine, weatherCardMention } from "../../../app/weather"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
import { AppText as Text } from "../../../ui/AppText"
import { RipplePressable } from "../../../ui/RipplePressable"

const t = fr.conditions
const s = t.summary

/** The glyph leading the weather line, one outline glyph per sky (UI-SPEC 3.1). */
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

/** Without a sky the line still has a glyph: the neutral one of the invitation. */
const NEUTRAL_GLYPH: keyof typeof Ionicons.glyphMap = "partly-sunny-outline"

const WEATHER_AREA_MIN_HEIGHT = 52
const GLYPH_SIZE = 24
const CHEVRON_SIZE = 18
const INVITATION_TILE = 32
const TILE_GLYPH_SIZE = 20

type ConditionsCardProps = {
  weather: SurveyWeather | null
  /** A weather lookup is running for this survey. */
  loading: boolean
  /** A submitted survey: with nothing to show the card is not drawn. */
  submitted: boolean
  /** Opens the Contexte page at its weather section. */
  onOpen: () => void
}

/**
 * The weather on the survey summary (D-17, UI-SPEC 3.1, D-33, D-35): one weather line (sky,
 * temperature, wind, rain, the values that exist) and, in small secondary text on the same card,
 * the very short mention "Météo-France" while a shown value is still the provider's (D-26; the
 * dated source sentence is in the Contexte page). The weather area is the one press target: it opens
 * the weather section of the Contexte page. A draft with nothing shows a calm invitation, a
 * submitted survey with nothing shows no card. The survey note is a card of its own below.
 */
export function ConditionsCard({ weather, loading, submitted, onOpen }: ConditionsCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const line = formatWeatherLine(weather)
  const mention = weatherCardMention(weather)

  if (line === null && !loading && submitted) return null

  const areaLabel = areaAccessibilityLabel(line, loading)
  const glyph = weather && isWeatherSkyCode(weather.sky) ? SKY_GLYPHS[weather.sky] : NEUTRAL_GLYPH
  const invitation = line === null && !loading

  return (
    <View testID="conditions-card">
      <AppCard variant="glass" padding={brandSpacing4.md}>
        <Animated.View
          layout={LinearTransition.duration(brandMotion.durations.base).reduceMotion(
            ReduceMotion.System,
          )}
        >
          <RipplePressable
            testID="conditions-card-weather"
            style={styles.area}
            rippleRadius={brandRadius.field}
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={areaLabel}
          >
            {invitation ? (
              <View style={styles.tile}>
                <Ionicons
                  name={NEUTRAL_GLYPH}
                  size={TILE_GLYPH_SIZE}
                  color={theme.visual.glass.iconTint}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </View>
            ) : line === null && loading ? (
              <View style={styles.glyphBox}>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textSecondary}
                  style={styles.spinner}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </View>
            ) : (
              <View style={styles.glyphBox}>
                <Ionicons
                  name={line === null ? NEUTRAL_GLYPH : glyph}
                  size={GLYPH_SIZE}
                  color={theme.visual.glass.iconTint}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </View>
            )}
            <View style={styles.copy}>
              {invitation ? (
                <>
                  <Text style={styles.title}>{s.emptyTitle}</Text>
                  <Text style={styles.meta}>{s.emptyBody}</Text>
                </>
              ) : line !== null ? (
                <Text style={styles.title} numberOfLines={2}>
                  {line}
                </Text>
              ) : (
                <Text style={styles.meta}>{s.loading}</Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward-outline"
              size={CHEVRON_SIZE}
              color={theme.colors.textSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </RipplePressable>

          {line !== null && mention !== null ? (
            <Text style={styles.attribution} testID="conditions-card-mention">
              {mention}
            </Text>
          ) : null}
        </Animated.View>
      </AppCard>
    </View>
  )
}

/** "Ouvrir la météo du relevé. {what the area says}" (UI-SPEC 3.1, accessibility). */
function areaAccessibilityLabel(line: string | null, loading: boolean): string {
  if (line !== null) return s.openWithLine(line)
  return s.openWithLine(loading ? s.loading : s.emptyBody)
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    area: {
      minHeight: WEATHER_AREA_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
    },
    glyphBox: {
      width: GLYPH_SIZE,
      height: GLYPH_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    tile: {
      width: INVITATION_TILE,
      height: INVITATION_TILE,
      borderRadius: brandRadius.badgeSm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.glass.iconTile,
    },
    spinner: {
      width: 16,
      height: 16,
      transform: [{ scale: 0.8 }],
    },
    copy: {
      flex: 1,
    },
    title: {
      ...brandTypeScale.subhead,
      fontFamily: "Jost-SemiBold",
      color: theme.semanticColors.textStrong,
    },
    meta: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    // Aligned with the text of the weather line: glyph width plus the row gap.
    attribution: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      paddingLeft: GLYPH_SIZE + brandSpacing4.smd,
    },
  })
}
