import { StyleSheet, View } from "react-native"
import type { SurveyVisibility } from "@cortege/ibp-domain"
import { brandSpacing } from "../app/brand-tokens"
import {
  visibilityCaption,
  visibilityIcon,
  visibilityKey,
  visibilityLabel,
} from "../app/visibility-display"
import { fr } from "../i18n"
import { feedback } from "./feedback"
import { RadioCard } from "./RadioCard"

// D-04: "Partagé avec l'association" first (the default), "Privé" second.
const ORDER: readonly SurveyVisibility[] = ["public", "private"]

type VisibilityPickerProps = {
  value: SurveyVisibility
  onChange: (next: SurveyVisibility) => void
  /** Locks both cards (submitting, or a survey already finished) without dimming them. */
  disabled?: boolean
}

/**
 * Who can read the survey: two radio cards in a radio group. A tap on the other card changes the
 * value with a selection haptic; a tap on the selected one, or any tap while disabled, does
 * nothing. Instant, no animation.
 */
export function VisibilityPicker({ value, onChange, disabled }: VisibilityPickerProps) {
  return (
    <View
      style={styles.group}
      accessibilityRole="radiogroup"
      accessibilityLabel={fr.surveyFinish.groupA11y}
    >
      {ORDER.map((option) => {
        const label = visibilityLabel(option)
        const caption = visibilityCaption(option)
        return (
          <RadioCard
            key={option}
            selected={option === value}
            disabled={disabled}
            onPress={() => {
              if (disabled || option === value) return
              feedback.selection()
              onChange(option)
            }}
            title={label}
            caption={caption}
            icon={visibilityIcon(option)}
            accessibilityLabel={fr.surveyForm.wizard.optionA11y({ label, caption })}
            testID={`visibility-option-${visibilityKey(option)}`}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: brandSpacing.sm,
  },
})
