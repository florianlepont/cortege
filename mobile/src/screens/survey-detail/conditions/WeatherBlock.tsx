import type { SurveyWeather, WeatherEditableKey, WeatherSkyCode } from "@cortege/ibp-domain"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useRef } from "react"
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import {
  editWeatherValue,
  hasWeatherValues,
  observationStamp,
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
import { WeatherFields } from "./WeatherFields"

const t = fr.conditions.weather

type WeatherBlockProps = {
  weather: SurveyWeather | null
  viewState: WeatherViewState
  onEditWeather: (update: (current: SurveyWeather | null) => SurveyWeather | null) => void
  onRetry: () => void
  onRefill: () => void
  /** Called when a field takes focus, with its top inside this block (label included). */
  onFieldFocus?: (y: number) => void
}

type StatusGlyph = keyof typeof Ionicons.glyphMap | "spinner"

// One calm line for each of the seven states (UI-SPEC 1.3): a glyph and a sentence, never the word
// "erreur", never a danger colour.
const STATUS: Record<WeatherViewState, { glyph: StatusGlyph; text: string }> = {
  noParcel: { glyph: "partly-sunny-outline", text: t.status.noParcel },
  loading: { glyph: "spinner", text: t.status.loading },
  prefilled: { glyph: "cloud-done-outline", text: t.status.prefilled },
  edited: { glyph: "cloud-done-outline", text: t.status.edited },
  manual: { glyph: "create-outline", text: t.status.manual },
  offline: { glyph: "cloud-offline-outline", text: t.status.offline },
  unavailable: { glyph: "cloud-offline-outline", text: t.status.unavailable },
}

/** The provider's values show with a short fade when they arrive (D-11), none under Reduce Motion. */
function useProviderFade(weather: SurveyWeather | null) {
  const arrived = weather?.source === "meteo_france" && hasWeatherValues(weather)
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
  if (stamp && viewState === "edited") {
    return { ...STATUS.edited, text: t.status.editedDated(stamp) }
  }
  return STATUS[viewState]
}

/**
 * The weather card of the Conditions section (D-15, D-09, D-10, D-11, D-26): a status line, the
 * eight sky chips, the four typed values and the attribution line. Every value is editable; an edit
 * goes through `editWeatherValue`, which protects it from a later provider answer. Nothing here
 * blocks leaving the page, finishing or submitting.
 */
export function WeatherBlock({
  weather,
  viewState,
  onEditWeather,
  onRetry,
  onRefill,
  onFieldFocus,
}: WeatherBlockProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const fade = useProviderFade(weather)
  const status = statusFor(viewState, weather)
  const sourceLine = weatherSourceLine(weather)
  const valuesTop = useRef(0)
  const fieldsTop = useRef(0)
  useAnnounceOnChange(status.text)

  const edit = (key: WeatherEditableKey, value: number | string | null) =>
    onEditWeather((current) => editWeatherValue(current, key, value))

  const confirmRefill = () =>
    Alert.alert(t.refillConfirm.title, t.refillConfirm.message, [
      { text: t.refillConfirm.cancel, style: "cancel" },
      { text: t.refillConfirm.confirm, style: "destructive", onPress: onRefill },
    ])

  const glyphColor =
    viewState === "prefilled" || viewState === "edited"
      ? theme.visual.glass.iconTint
      : theme.colors.textSecondary

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
        {viewState === "edited" ? (
          <AppPressable
            testID="conditions-refill"
            accessibilityRole="button"
            accessibilityLabel={t.status.refillA11y}
            onPress={confirmRefill}
            style={styles.link}
          >
            <Text style={styles.linkText}>{t.status.refill}</Text>
          </AppPressable>
        ) : null}
      </View>

      <Animated.View
        style={[styles.values, fade]}
        onLayout={(event: LayoutChangeEvent) => {
          valuesTop.current = event.nativeEvent.layout.y
        }}
      >
        <View style={styles.skyBlock}>
          <Text style={styles.groupLabel}>{fr.conditions.sky.groupLabel}</Text>
          <SkyChips
            value={(weather?.sky as WeatherSkyCode | null | undefined) ?? null}
            onChange={(code) => edit("sky", code)}
          />
        </View>
        <View
          onLayout={(event: LayoutChangeEvent) => {
            fieldsTop.current = event.nativeEvent.layout.y
          }}
        >
          <WeatherFields
            weather={weather}
            onEdit={edit}
            onFieldFocus={
              onFieldFocus
                ? (y) => onFieldFocus(valuesTop.current + fieldsTop.current + y)
                : undefined
            }
          />
        </View>
      </Animated.View>

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
    values: {
      gap: brandSpacing4.smd,
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
