import { isWeatherSkyCode, type SurveyWeather } from "@cortege/ibp-domain"
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { weatherSourceLine } from "../../../app/weather"
import { brandDefaultFontFamily, brandSpacing4, brandTypeScale } from "../../../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../../../app/theme"
import { fr } from "../../../i18n"
import { AppGroupedList, type AppGroupedListRow } from "../../../ui/AppGroupedList"
import { AppText as Text } from "../../../ui/AppText"
import { weatherRowEntries } from "./weather-rows"

const t = fr.conditions

type ConditionsReadOnlyProps = {
  weather: SurveyWeather | null
  /** "line": a single "nothing entered" line when there is no weather; "hidden": draw nothing. */
  emptyMode: "line" | "hidden"
  /** False under a heading that already says "Météo" (the Contexte page); default true. */
  showTitle?: boolean
}

/**
 * The source line (D-31, D-37): the full dated sentence while the provider's values are shown (it
 * says when the sky is the observer's), else a sky the observer chose alone says so.
 */
function sourceLine(weather: SurveyWeather | null): string | undefined {
  const attribution = weatherSourceLine(weather)
  if (attribution !== null) return attribution
  return isWeatherSkyCode(weather?.sky) ? t.readOnly.sourceManual : undefined
}

function groupedRows(weather: SurveyWeather | null): AppGroupedListRow[] {
  return weatherRowEntries(weather, { sky: true }).map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.value,
    accessibilityLabel: entry.accessibilityLabel,
  }))
}

/**
 * The weather after submit, or for someone else's survey, as plain text (D-03, UI-SPEC 1.5, U-04):
 * label and value rows for the values that exist and the full dated source line in the third
 * person. The survey note is no longer part of it (D-33): it is `SurveyNoteCard`. Nothing can be
 * edited here.
 */
export function ConditionsReadOnly({
  weather,
  emptyMode,
  showTitle = true,
}: ConditionsReadOnlyProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const rows = groupedRows(weather)

  if (rows.length === 0 && emptyMode === "hidden") return null
  if (rows.length === 0) return <Text style={styles.empty}>{t.readOnly.empty}</Text>

  return (
    <View style={styles.container} testID="conditions-read-only">
      <AppGroupedList
        sections={[
          {
            key: "weather",
            title: showTitle ? t.weather.title : undefined,
            rows,
            footer: sourceLine(weather),
          },
        ]}
      />
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
  })
}
