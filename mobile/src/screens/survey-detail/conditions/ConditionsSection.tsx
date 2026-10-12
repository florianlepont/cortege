import { type SurveyWeather } from "@cortege/ibp-domain"
import { StyleSheet, View } from "react-native"
import { type WeatherViewState } from "../../../app/weather"
import { brandSpacing4 } from "../../../app/brand-tokens"
import { fr } from "../../../i18n"
import { AppSectionHeader } from "../../../ui/AppSectionHeader"
import { ConditionsReadOnly } from "./ConditionsReadOnly"
import type { SurveyConditions } from "./useSurveyConditions"
import { WeatherBlock } from "./WeatherBlock"

const t = fr.conditions

type ConditionsSectionProps = {
  /** False once the survey is submitted (or not the observer's own): plain text, nothing to edit. */
  editable: boolean
  conditions: SurveyConditions
  viewState: WeatherViewState
  onEditWeather: (update: (current: SurveyWeather | null) => SurveyWeather | null) => void
  onRetry: () => void
}

/**
 * The "Météo" section of the Contexte page (D-15, D-32): the weather card with its status line and
 * the full dated source sentence; the same as plain text once the survey cannot be edited (D-03,
 * U-04). The survey note is not here any more (D-33). Optional from end to end: nothing here
 * blocks finishing or submitting.
 */
export function ConditionsSection({
  editable,
  conditions,
  viewState,
  onEditWeather,
  onRetry,
}: ConditionsSectionProps) {
  return (
    <View style={styles.section} testID="conditions-section">
      <AppSectionHeader
        title={t.section.title}
        subtitle={t.section.subtitle}
        titleAccessibilityRole="header"
      />
      {!conditions.loaded ? null : !editable ? (
        <ConditionsReadOnly weather={conditions.weather} emptyMode="line" showTitle={false} />
      ) : (
        <WeatherBlock
          weather={conditions.weather}
          viewState={viewState}
          onEditWeather={onEditWeather}
          onRetry={onRetry}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: brandSpacing4.smd,
  },
})
