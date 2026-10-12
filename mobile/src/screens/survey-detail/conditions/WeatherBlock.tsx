import type { SurveyWeather, WeatherSkyCode } from "@cortege/ibp-domain"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useRef } from "react"
import { AccessibilityInfo, ActivityIndicator, Platform, StyleSheet, View } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import {
  editWeatherSky,
  observationStamp,
  showsProviderAttribution,
  weatherSourceLine,
  type WeatherViewState,
} from "../../../app/weather"
import {
  brandDefaultFontFamily,
  brandMotion,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
import { AppPressable } from "../../../ui/AppPressable"
import { AppText as Text } from "../../../ui/AppText"
import { useScreenVisible } from "../../../ui/useScreenVisible"
import { SkyChips } from "./SkyChips"
import { weatherRowEntries } from "./weather-rows"

const t = fr.conditions.weather

type WeatherBlockProps = {
  weather: SurveyWeather | null
  viewState: WeatherViewState
  onEditWeather: (update: (current: SurveyWeather | null) => SurveyWeather | null) => void
  onRetry: () => void
}

type StatusGlyph = keyof typeof Ionicons.glyphMap | "spinner"

// One calm line for each of the five states (UI-SPEC 1.3, D-37): a glyph and a sentence, never the
// word "erreur", never a danger colour.
const STATUS: Record<WeatherViewState, { glyph: StatusGlyph; text: string }> = {
  noParcel: { glyph: "partly-sunny-outline", text: t.status.noParcel },
  loading: { glyph: "spinner", text: t.status.loading },
  prefilled: { glyph: "cloud-done-outline", text: t.status.prefilled },
  offline: { glyph: "cloud-offline-outline", text: t.status.offline },
  unavailable: { glyph: "cloud-offline-outline", text: t.status.unavailable },
}

/** The provider's values show with a short fade when they arrive (D-11), none under Reduce Motion. */
function useProviderFade(weather: SurveyWeather | null) {
  const arrived = showsProviderAttribution(weather)
  const wasArrived = useRef(arrived)
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (arrived && !wasArrived.current) {
      opacity.value = 0
      opacity.value = withTiming(1, {
        duration: brandMotion.durations.fast,
        reduceMotion: ReduceMotion.System,
      })
    }
    wasArrived.current = arrived
  }, [arrived, opacity])

  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}

/** Tells a screen reader on iOS that the line changed, once, while the page is the one in view. */
function useAnnounceOnChange(text: string) {
  const visible = useScreenVisible()
  const previous = useRef(text)

  useEffect(() => {
    if (previous.current === text) return
    previous.current = text
    if (Platform.OS === "ios" && visible) AccessibilityInfo.announceForAccessibility(text)
  }, [text, visible])
}

/** The status of a state; the provider states carry the date of the data when it is known (D-31). */
function statusFor(viewState: WeatherViewState, weather: SurveyWeather | null | undefined) {
  const stamp = observationStamp(weather)
  if (stamp && viewState === "prefilled") {
    return { ...STATUS.prefilled, text: t.status.prefilledDated(stamp) }
  }
  return STATUS[viewState]
}

/**
 * The weather card of the Contexte page (D-15, D-09, D-10, D-11, D-26, D-37): a status line, the
 * eight sky chips (the observer's own judgement, the only editable value), the provider's
 * temperature, wind, rain and observation time as read-only rows, and the attribution line. A sky
 * edit goes through `editWeatherSky`, which protects it from a later provider answer. Nothing here
 * blocks leaving the page, finishing or submitting.
 */
export function WeatherBlock({ weather, viewState, onEditWeather, onRetry }: WeatherBlockProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const fade = useProviderFade(weather)
  const status = statusFor(viewState, weather)
  const sourceLine = weatherSourceLine(weather)
  const rows = weatherRowEntries(weather, { sky: false })
  useAnnounceOnChange(status.text)

  const editSky = (code: WeatherSkyCode | null) =>
    onEditWeather((current) => editWeatherSky(current, code))

  const glyphColor =
    viewState === "prefilled" ? theme.visual.glass.iconTint : theme.colors.textSecondary

  return (
    <AppCard variant="glass" padding={brandSpacing4.md} style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        {t.title}
      </Text>

      <View style={styles.statusRow}>
        <View
          style={styles.statusMain}
          testID="conditions-weather-status"
          accessibilityLiveRegion="polite"
        >
          {status.glyph === "spinner" ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.textSecondary}
              style={styles.spinner}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : (
            <Ionicons
              name={status.glyph}
              size={18}
              color={glyphColor}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
        {viewState === "unavailable" ? (
          <AppPressable
            testID="conditions-retry"
            accessibilityRole="button"
            accessibilityLabel={t.status.retry}
            onPress={onRetry}
            style={styles.link}
          >
            <Text style={styles.linkText}>{t.status.retry}</Text>
          </AppPressable>
        ) : null}
      </View>

      <View style={styles.skyBlock}>
        <Text style={styles.groupLabel}>{fr.conditions.sky.groupLabel}</Text>
        <SkyChips
          value={(weather?.sky as WeatherSkyCode | null | undefined) ?? null}
          onChange={editSky}
        />
      </View>

      {rows.length > 0 ? (
        <Animated.View style={[styles.rows, fade]} testID="conditions-weather-rows">
          {rows.map((row) => (
            <View
              key={row.key}
              style={styles.row}
              accessible
              accessibilityLabel={row.accessibilityLabel}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </Animated.View>
      ) : null}

      {sourceLine !== null ? <Text style={styles.source}>{sourceLine}</Text> : null}
    </AppCard>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    card: {
      gap: brandSpacing4.smd,
    },
    title: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textPrimary,
    },
    statusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: brandSpacing4.smd,
      rowGap: brandSpacing4.xs,
    },
    statusMain: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.sm,
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 200,
    },
    spinner: {
      width: 18,
      height: 18,
      transform: [{ scale: 0.8 }],
    },
    statusText: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    link: {
      minHeight: 44,
      justifyContent: "center",
    },
    linkText: {
      ...brandTypography.sectionHeader,
      color: theme.visual.accentText,
    },
    rows: {
      gap: brandSpacing4.sm,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
      justifyContent: "space-between",
      columnGap: brandSpacing4.smd,
    },
    rowLabel: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    rowValue: {
      ...brandTypeScale.subhead,
      fontFamily: "Jost-SemiBold",
      color: theme.semanticColors.textStrong,
    },
    skyBlock: {
      gap: brandSpacing4.sm,
    },
    groupLabel: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textPrimary,
    },
    source: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
  })
}
