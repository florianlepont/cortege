import { isWeatherSkyCode, type SurveyWeather } from "@cortege/ibp-domain"
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import {
  formatObservationTime,
  formatWeatherNumber,
  observationStamp,
  weatherProvenance,
  weatherSourceLine,
  type WeatherProvenance,
} from "../../../app/weather"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { fr } from "../../../i18n"
import { AppCard } from "../../../ui/AppCard"
import { AppGroupedList, type AppGroupedListRow } from "../../../ui/AppGroupedList"
import { AppText as Text } from "../../../ui/AppText"

const t = fr.conditions
const fields = t.weather.fields

type ConditionsReadOnlyProps = {
  note: string | null
  weather: SurveyWeather | null
  /** "line": a single "nothing entered" line when both are empty; "hidden": draw nothing. */
  emptyMode: "line" | "hidden"
}

/** The source line, with the date of the data for provider values when it is known (D-31). */
function sourceLine(weather: SurveyWeather | null, provenance: WeatherProvenance): string {
  // Provider values still shown beside edited ones: the one line of the card, mixed wording included.
  const attribution = weatherSourceLine(weather)
  if (attribution !== null && provenance === "edited") return attribution
  const stamp = observationStamp(weather)
  if (stamp && provenance === "prefilled") return t.readOnly.sourcePrefilledDated(stamp)
  if (stamp && provenance === "edited") return t.readOnly.sourceEditedDated(stamp)
  if (provenance === "prefilled") return t.readOnly.sourcePrefilled
  return provenance === "edited" ? t.readOnly.sourceEdited : t.readOnly.sourceManual
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

/** The label and value rows of the values that exist, in the order of the editable card. */
function weatherRows(weather: SurveyWeather | null): AppGroupedListRow[] {
  if (!weather) return []
  const entries: { key: string; label: string; value: string | null }[] = [
    {
      key: "sky",
      label: t.sky.groupLabel,
      value: isWeatherSkyCode(weather.sky) ? t.sky[weather.sky] : null,
    },
    {
      key: "temperature",
      label: fields.temperature.label,
      value: finite(weather.temperature_c)
        ? t.weather.values.temperature(formatWeatherNumber(weather.temperature_c))
        : null,
    },
    {
      key: "wind",
      label: fields.wind.label,
      value: finite(weather.wind_kmh)
        ? t.weather.values.wind(formatWeatherNumber(weather.wind_kmh))
        : null,
    },
    {
      key: "rain",
      label: fields.rain.label,
      value: finite(weather.rain_24h_mm)
        ? t.weather.values.rain(formatWeatherNumber(weather.rain_24h_mm))
        : null,
    },
    {
      key: "time",
      label: fields.time.label,
      value: formatObservationTime(weather.observed_at),
    },
  ]
  return entries.flatMap((entry) =>
    entry.value === null
      ? []
      : [
          {
            key: entry.key,
            label: entry.label,
            value: entry.value,
            accessibilityLabel: `${entry.label}, ${entry.value}`,
          },
        ],
  )
}

/**
 * The Conditions after submit, or for someone else's survey: the same two cards as plain text
 * (D-03, UI-SPEC 1.5, U-04). Label and value rows for the weather values that exist, the source
 * line in the third person, the note as selectable text. Nothing can be edited here.
 */
export function ConditionsReadOnly({ note, weather, emptyMode }: ConditionsReadOnlyProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const rows = weatherRows(weather)
  const noteText = note !== null && note.trim().length > 0 ? note : null

  if (rows.length === 0 && noteText === null) {
    return emptyMode === "line" ? <Text style={styles.empty}>{t.readOnly.empty}</Text> : null
  }

  const provenance = weatherProvenance(weather)
  const weatherRowsOrNone: AppGroupedListRow[] =
    rows.length > 0
      ? rows
      : [
          {
            key: "none",
            kind: "custom",
            content: <Text style={styles.empty}>{t.readOnly.noWeather}</Text>,
          },
        ]

  return (
    <View style={styles.container} testID="conditions-read-only">
      <AppGroupedList
        sections={[
          {
            key: "weather",
            title: t.weather.title,
            rows: weatherRowsOrNone,
            footer: provenance ? sourceLine(weather, provenance) : undefined,
          },
        ]}
      />
      {noteText !== null ? (
        <AppCard variant="glass" padding={brandSpacing4.md} style={styles.noteCard}>
          <Text style={styles.noteLabel} accessibilityRole="header">
            {t.note.label}
          </Text>
          <Text style={styles.noteText} selectable testID="conditions-note-text">
            {noteText}
          </Text>
        </AppCard>
      ) : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      gap: brandSpacing4.smd,
    },
    empty: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    noteCard: {
      gap: brandSpacing4.sm,
    },
    noteLabel: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textPrimary,
    },
    noteText: {
      ...brandTypeScale.subhead,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textPrimary,
    },
  })
}
