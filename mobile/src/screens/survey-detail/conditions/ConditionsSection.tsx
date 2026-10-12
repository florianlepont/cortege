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
 * The "Météo" section of the Contexte page (D-15, D-32): the weather card, its title inside the
 * tile (D-46), with its status line and the full dated source sentence; the same as plain text
 * under a plain title once the survey cannot be edited (D-03, U-04). The survey note is not here any more (D-33). Optional from end to end: nothing here
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
      {conditions.loaded && editable ? (
        // D-46: the editable card carries the "Météo" title inside its tile, like "Méthode et station".
        <WeatherBlock
          weather={conditions.weather}
          viewState={viewState}
          onEditWeather={onEditWeather}
          onRetry={onRetry}
        />
      ) : (
        <>
          <AppSectionHeader title={t.section.title} titleAccessibilityRole="header" />
          {conditions.loaded ? (
            <ConditionsReadOnly weather={conditions.weather} emptyMode="line" showTitle={false} />
          ) : null}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: brandSpacing4.smd,
  },
})
