import type { SurveyWeather, WeatherEditableKey } from "@cortege/ibp-domain"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  KeyboardTypeOptions,
  LayoutChangeEvent,
  Platform,
  ReturnKeyTypeOptions,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import {
  formatObservationTime,
  formatWeatherNumber,
  parseObservationTimeInput,
  parseWeatherValueInput,
  withObservationTime,
  type WeatherNumberKey,
} from "../../../app/weather"
import {
  brandComponentTokens,
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { fr } from "../../../i18n"
import { AppField } from "../../../ui/AppField"
import { AppText as Text } from "../../../ui/AppText"

const t = fr.conditions.weather.fields

type FieldKey = WeatherNumberKey | "observed_at"

type WeatherFieldsProps = {
  weather: SurveyWeather | null
  onEdit: (key: WeatherEditableKey, value: number | string | null) => void
  /** Called when a field takes focus, with its top (label included) inside this block. */
  onFieldFocus?: (y: number) => void
}

type FieldSpec = {
  key: FieldKey
  testID: string
  label: string
  placeholder: string
  a11y: string
  unit: string | null
  errorText: string
  keyboard: "punctuation" | "decimal"
}

// iOS has a number pad with punctuation for the signed temperature and the time, and a decimal pad
// for the two positive numbers; Android has only the numeric keyboard (UI-SPEC 1.2).
const keyboardFor = (kind: FieldSpec["keyboard"]): KeyboardTypeOptions =>
  Platform.select<KeyboardTypeOptions>({
    ios: kind === "decimal" ? "decimal-pad" : "numbers-and-punctuation",
    default: "numeric",
  })

const FIELDS: FieldSpec[] = [
  {
    key: "temperature_c",
    testID: "conditions-field-temperature",
    label: t.temperature.label,
    placeholder: t.temperature.placeholder,
    a11y: t.temperature.a11y,
    unit: t.temperature.unit,
    errorText: t.temperature.range,
    keyboard: "punctuation",
  },
  {
    key: "wind_kmh",
    testID: "conditions-field-wind",
    label: t.wind.label,
    placeholder: t.wind.placeholder,
    a11y: t.wind.a11y,
    unit: t.wind.unit,
    errorText: t.wind.range,
    keyboard: "decimal",
  },
  {
    key: "rain_24h_mm",
    testID: "conditions-field-rain",
    label: t.rain.label,
    placeholder: t.rain.placeholder,
    a11y: t.rain.a11y,
    unit: t.rain.unit,
    errorText: t.rain.range,
    keyboard: "decimal",
  },
  {
    key: "observed_at",
    testID: "conditions-field-time",
    label: t.time.label,
    placeholder: t.time.placeholder,
    a11y: t.time.a11y,
    unit: null,
    errorText: t.time.invalid,
    keyboard: "punctuation",
  },
]

function storedText(weather: SurveyWeather | null, key: FieldKey): string {
  if (key === "observed_at") return formatObservationTime(weather?.observed_at) ?? ""
  const value = weather?.[key]
  return typeof value === "number" ? formatWeatherNumber(value) : ""
}

/**
 * The four typed weather values (temperature, wind, rain over 24 h, observation time). Each field
 * keeps its own text and reads it on blur: a valid text is passed to `onEdit` (an empty one clears
 * the value), an out-of-range or unreadable one shows its message and is never passed on. A text
 * that equals the stored value is not an edit, so merely visiting a prefilled field never marks it
 * as edited by hand (D-10).
 */
export function WeatherFields({ weather, onEdit, onFieldFocus }: WeatherFieldsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [texts, setTexts] = useState<Record<FieldKey, string>>(() => ({
    temperature_c: storedText(weather, "temperature_c"),
    wind_kmh: storedText(weather, "wind_kmh"),
    rain_24h_mm: storedText(weather, "rain_24h_mm"),
    observed_at: storedText(weather, "observed_at"),
  }))
  const [errors, setErrors] = useState<Partial<Record<FieldKey, boolean>>>({})
  const focused = useRef<FieldKey | null>(null)
  const tops = useRef<Partial<Record<FieldKey, number>>>({})
  const inputs = useRef<Record<FieldKey, TextInput | null>>({
    temperature_c: null,
    wind_kmh: null,
    rain_24h_mm: null,
    observed_at: null,
  })

  // A late provider answer or a refill changes the stored values: the fields follow, except the one
  // being typed in (its text wins and is read on blur).
  const stored = FIELDS.map((field) => storedText(weather, field.key)).join("|")
  useEffect(() => {
    setTexts((current) => {
      const next = { ...current }
      for (const field of FIELDS) {
        if (focused.current !== field.key) next[field.key] = storedText(weather, field.key)
      }
      return next
    })
    setErrors((current) => {
      const next = { ...current }
      for (const field of FIELDS) {
        if (focused.current !== field.key) delete next[field.key]
      }
      return next
    })
    // `stored` already holds every value the effect reads from `weather`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored])

  const setText = (key: FieldKey, text: string) => {
    setTexts((current) => ({ ...current, [key]: text }))
    setErrors((current) => (current[key] ? { ...current, [key]: false } : current))
  }

  const commit = (key: FieldKey) => {
    focused.current = null
    const text = texts[key]
    if (key === "observed_at") {
      commitTime(text)
      return
    }
    const parsed = parseWeatherValueInput(key, text)
    if ("error" in parsed) {
      setErrors((current) => ({ ...current, [key]: true }))
      return
    }
    setText(key, parsed.value === null ? "" : formatWeatherNumber(parsed.value))
    if (parsed.value !== (weather?.[key] ?? null)) onEdit(key, parsed.value)
  }

  const commitTime = (text: string) => {
    if (text.trim().length === 0) {
      setText("observed_at", "")
      if (weather?.observed_at) onEdit("observed_at", null)
      return
    }
    const time = parseObservationTimeInput(text)
    if (time === null) {
      setErrors((current) => ({ ...current, observed_at: true }))
      return
    }
    setText("observed_at", time)
    if (time === formatObservationTime(weather?.observed_at)) return
    // The survey's own date is kept: only the time of day changes.
    onEdit(
      "observed_at",
      withObservationTime(weather?.requested_at ?? weather?.observed_at ?? null, time),
    )
  }

  return (
    <View style={styles.row}>
      {FIELDS.map((field, index) => {
        const last = index === FIELDS.length - 1
        const next = FIELDS[index + 1]
        return (
          <View
            key={field.key}
            style={styles.cell}
            onLayout={(event: LayoutChangeEvent) => {
              tops.current[field.key] = event.nativeEvent.layout.y
            }}
          >
            <View>
              <AppField
                label={field.label}
                labelStyle={styles.label}
                inputStyle={[
                  field.unit ? styles.inputWithUnit : null,
                  errors[field.key] ? styles.inputError : null,
                ]}
                inputRef={(node) => {
                  inputs.current[field.key] = node
                }}
                testID={field.testID}
                value={texts[field.key]}
                onChangeText={(text) => setText(field.key, text)}
                onFocus={() => {
                  focused.current = field.key
                  onFieldFocus?.(tops.current[field.key] ?? 0)
                }}
                onBlur={() => commit(field.key)}
                placeholder={field.placeholder}
                keyboardType={keyboardFor(field.keyboard)}
                returnKeyType={Platform.OS === "android" ? returnKey(last) : undefined}
                onSubmitEditing={() => {
                  if (!last) inputs.current[next.key]?.focus()
                }}
                accessibilityLabel={field.a11y}
              />
              {field.unit ? (
                <View
                  style={styles.unit}
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  <Text style={styles.unitText}>{field.unit}</Text>
                </View>
              ) : null}
            </View>
            {errors[field.key] ? (
              <Text style={styles.error} testID={`${field.testID}-error`}>
                {field.errorText}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const returnKey = (last: boolean): ReturnKeyTypeOptions => (last ? "done" : "next")

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.smd,
    },
    cell: {
      flexBasis: 128,
      flexGrow: 1,
      minWidth: 128,
      gap: brandSpacing4.xs,
    },
    // AppField's own label role is ExtraBold: the section header role keeps two weights (U-15).
    label: {
      ...brandTypography.sectionHeader,
      letterSpacing: 0,
      color: theme.colors.textPrimary,
    },
    inputWithUnit: {
      paddingRight: 56,
    },
    inputError: {
      borderColor: theme.componentColors.field.borderError,
    },
    // The unit sits inside the input, on its bottom edge (the label is above the input).
    unit: {
      position: "absolute",
      right: brandSpacing4.md,
      bottom: 0,
      minHeight: brandComponentTokens.field.minHeight,
      justifyContent: "center",
    },
    unitText: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    error: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.onSurface.danger,
    },
  })
}
