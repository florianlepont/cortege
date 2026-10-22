import { StyleSheet, View } from "react-native"
import type { LargeStandOption } from "@cortege/ibp-domain"
import { brandSpacing4 } from "../../app/brand-tokens"
import { LARGE_STAND_OPTION_TEXT } from "../../app/route-text"
import { fr } from "../../i18n"
import { AppNotice } from "../../ui/AppNotice"
import { GlossaryInfo, type GlossaryTermId } from "../../ui/GlossaryInfo"
import { RadioCard } from "../../ui/RadioCard"
import { feedback } from "../../ui/feedback"
import { WizardHeading, WIZARD_ANSWER_GAP } from "../survey-wizard/WizardChrome"
import { SuggestionEntrance } from "./SuggestionEntrance"

const guide = fr.routeGuide

const OPTION_TERM: Readonly<Record<LargeStandOption, GlossaryTermId>> = {
  subdivide: "peuplement",
  partial: "parcoursPartiel",
}

export type LargeStandOptionsProps = {
  /** The two options of the package, the one to subdivide first. */
  options: readonly LargeStandOption[]
  /** The option the package pre-selects and that carries the tag "Conseillé" (O-03). */
  preselected: LargeStandOption
  /** Undefined until the observer picks: the tag only marks the advised option. */
  selected?: LargeStandOption
  onChoose: (option: LargeStandOption) => void
}

/**
 * Above the subdivision bound (R-11b, O-03) the forest card gives way to two choices, never three:
 * "Découper en sous-peuplements", pre-selected and tagged "Conseillé", then "Parcours partiel, sans
 * découper". Choosing to subdivide is not a parcours: the notice says to make one survey per piece
 * and the screen's "Suivant" then asks for the surface of the first piece (30-20). Nothing is
 * selected until the observer picks, and "Suivant" waits for it.
 */
export function LargeStandOptions({
  options,
  preselected,
  selected,
  onChoose,
}: LargeStandOptionsProps) {
  return (
    <SuggestionEntrance trigger="large-stand">
      <View style={styles.root} testID="route-large-stand">
        <WizardHeading title={guide.largeStand.title} lead={guide.reasons.largeStand} />
        <View style={styles.options} accessibilityRole="radiogroup">
          {options.map((option) => {
            const text = LARGE_STAND_OPTION_TEXT[option]
            const tag = option === preselected ? guide.largeStand.recommended : undefined
            return (
              <RadioCard
                key={option}
                selected={selected === option}
                onPress={() => {
                  feedback.selection()
                  onChoose(option)
                }}
                title={text.title}
                caption={text.caption}
                tag={tag}
                trailing={<GlossaryInfo term={OPTION_TERM[option]} />}
                accessibilityLabel={
                  tag
                    ? guide.a11y.optionLabelTagged({
                        label: text.title,
                        tag,
                        caption: text.caption,
                      })
                    : guide.a11y.optionLabel({ label: text.title, caption: text.caption })
                }
                testID={`route-large-option-${option}`}
              />
            )
          })}
        </View>
        {selected === "subdivide" ? (
          <View testID="route-subdivide-notice">
            <AppNotice
              tone="info"
              icon="information-circle-outline"
              message={guide.largeStand.subdivideNotice}
            />
          </View>
        ) : null}
      </View>
    </SuggestionEntrance>
  )
}

const styles = StyleSheet.create({
  root: {
    gap: brandSpacing4.md,
  },
  options: {
    marginTop: WIZARD_ANSWER_GAP,
    gap: brandSpacing4.sm,
  },
})
