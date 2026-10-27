import { View } from "react-native"
import type { ExportMode } from "../../app/survey-pdf-export"
import { fr } from "../../i18n"
import { RadioCard } from "../../ui/RadioCard"
import type { ExportChoiceStyles } from "./export-choice.styles"

const t = fr.surveyExportChoice

type ExportModePickerProps = {
  mode: ExportMode
  onChange: (next: ExportMode) => void
  /** The summary is out of reach: its card is dimmed, blocked and spoken as unavailable (D-09). */
  isDraft: boolean
  /** Approximate page count printed on the "Complet" card. */
  completePages: number
  styles: Pick<ExportChoiceStyles, "group" | "dimmed">
}

/**
 * Phase 33, D-05 and D-14: which PDF to export, two radio cards in a radio group. A press on the
 * other card calls `onChange`; a press on the selected card or on the blocked one does nothing.
 * The selection haptic and the draft fallback belong to `useExportChoice`. Instant, no animation.
 */
export function ExportModePicker({
  mode,
  onChange,
  isDraft,
  completePages,
  styles,
}: ExportModePickerProps) {
  const completeCaption = t.options.complete.caption({ count: completePages })
  const summaryCaption = t.options.summary.caption
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t.groupA11y}>
      <RadioCard
        selected={mode === "complete"}
        onPress={() => {
          if (mode !== "complete") onChange("complete")
        }}
        title={t.options.complete.label}
        caption={completeCaption}
        icon="documents-outline"
        accessibilityLabel={fr.surveyForm.wizard.optionA11y({
          label: t.options.complete.label,
          caption: completeCaption,
        })}
        testID="export-option-complete"
      />
      <View style={isDraft ? styles.dimmed : undefined}>
        <RadioCard
          selected={mode === "summary"}
          disabled={isDraft}
          onPress={() => {
            if (!isDraft && mode !== "summary") onChange("summary")
          }}
          title={t.options.summary.label}
          caption={summaryCaption}
          icon="document-text-outline"
          accessibilityLabel={
            isDraft
              ? t.summaryDraftA11y
              : fr.surveyForm.wizard.optionA11y({
                  label: t.options.summary.label,
                  caption: summaryCaption,
                })
          }
          testID="export-option-summary"
        />
      </View>
    </View>
  )
}
