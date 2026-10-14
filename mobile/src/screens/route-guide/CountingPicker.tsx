import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated"
import {
  UNCAPPABLE_FACTORS,
  UNCAPPED_PRESET_IDS,
  type CountingMode,
  type UncappableFactor,
  type UncappedPresetId,
} from "@cortege/ibp-domain"
import { brandMotion, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { COUNTING_TEXT, UNCAPPED_PRESET_TEXT } from "../../app/route-text"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppNotice } from "../../ui/AppNotice"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { GlossaryInfo } from "../../ui/GlossaryInfo"
import { RadioCard } from "../../ui/RadioCard"
import { feedback } from "../../ui/feedback"
import { COUNTING_TERM } from "./glossary-terms"

const guide = fr.routeGuide
const counting = guide.counting

const MODES: readonly CountingMode[] = ["capped", "uncapped"]

export type CountingPickerProps = {
  counting: CountingMode
  preset: UncappedPresetId
  /** The factors counted in full; only read when the mode is "uncapped". */
  factors: readonly UncappableFactor[]
  /** No factor is left: the helper "Choisissez au moins un facteur." shows (R-17). */
  factorsMissing: boolean
  /** Back to plafonné with detail data on the draft: it says the values are kept and hidden. */
  keptValuesNotice: boolean
  onSelectCounting: (mode: CountingMode) => void
  onSelectPreset: (preset: UncappedPresetId) => void
  onToggleFactor: (factor: UncappableFactor) => void
}

/**
 * "Mode de relevé" of the chooser (spec section 6, O-01, O-12): the two modes in the method's words,
 * each with its explanation and glossary glyph; the mode is plafonné unless the observer picks
 * déplafonné by hand. Then, for the déplafonné mode only, the factors counted in full: the five
 * presets (one active at a time, the R-17 note under the two long ones) and one chip per factor,
 * multi-select, H never offered. A preset sets the chips and touching a chip leaves the preset; the
 * lists and the default come from the package through the model. The block fades in over 160 ms.
 */
export function CountingPicker({
  counting: mode,
  preset,
  factors,
  factorsMissing,
  keptValuesNotice,
  onSelectCounting,
  onSelectPreset,
  onToggleFactor,
}: CountingPickerProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const presetText = UNCAPPED_PRESET_TEXT[preset]

  return (
    <View style={styles.root} testID="route-counting">
      <AppSectionHeader title={counting.caption} titleAccessibilityRole="header" />
      <View style={styles.cards} accessibilityRole="radiogroup">
        {MODES.map((id) => {
          const text = COUNTING_TEXT[id]
          return (
            <RadioCard
              key={id}
              selected={mode === id}
              onPress={() => {
                feedback.selection()
                onSelectCounting(id)
              }}
              title={text.name}
              caption={text.explanation}
              trailing={<GlossaryInfo term={COUNTING_TERM[id]} />}
              accessibilityLabel={guide.a11y.optionLabel({
                label: text.name,
                caption: text.explanation,
              })}
              testID={`route-counting-${id}`}
            />
          )
        })}
      </View>

      {mode === "uncapped" ? (
        <Animated.View
          entering={FadeIn.duration(brandMotion.durations.fast).reduceMotion(ReduceMotion.System)}
          style={styles.factors}
          testID="route-counting-factors"
        >
          <Text style={styles.lead}>{counting.factorsLead}</Text>
          <Text style={styles.label} accessibilityRole="header">
            {counting.presetsTitle}
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {UNCAPPED_PRESET_IDS.map((id) => (
              <AppChoiceChip
                key={id}
                label={UNCAPPED_PRESET_TEXT[id].name}
                active={preset === id}
                accessibilityRole="radio"
                onPress={() => onSelectPreset(id)}
                testID={`route-preset-${id}`}
              />
            ))}
          </View>
          <Text style={styles.helper}>{presetText.caption}</Text>
          {presetText.note ? (
            <Text style={styles.helper} testID="route-preset-note">
              {presetText.note}
            </Text>
          ) : null}
          <View style={styles.chips}>
            {UNCAPPABLE_FACTORS.map((letter) => {
              const label = fr.surveyDetail.route.factorItem({
                letter,
                title: fr.labels.factorTitles[letter],
              })
              return (
                <AppChoiceChip
                  key={letter}
                  label={label}
                  active={factors.includes(letter)}
                  onPress={() => onToggleFactor(letter)}
                  testID={`route-factor-${letter}`}
                />
              )
            })}
          </View>
          <Text style={styles.helper}>{counting.factorH}</Text>
          {factorsMissing ? (
            <View accessibilityLiveRegion="polite" testID="route-factors-missing">
              <AppNotice tone="warning" icon="alert-circle-outline" message={counting.atLeastOne} />
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      {keptValuesNotice ? (
        <View accessibilityLiveRegion="polite" testID="route-kept-values">
          <AppNotice tone="info" icon="information-circle-outline" message={counting.keptValues} />
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      gap: brandSpacing4.smd,
    },
    cards: {
      gap: brandSpacing4.sm,
    },
    factors: {
      gap: brandSpacing4.sm,
    },
    lead: {
      ...brandTypeScale.subhead,
      color: theme.colors.textPrimary,
    },
    label: {
      ...brandTypeScale.subhead,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.colors.textPrimary,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
    helper: {
      ...brandTypeScale.subhead,
      color: theme.colors.textSecondary,
    },
  })
}
