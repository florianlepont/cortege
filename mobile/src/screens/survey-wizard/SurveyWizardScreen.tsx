import { useMemo, useState } from "react"
import { ScrollView, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  resolveMethodVersion,
  type IbpMethodVersion,
} from "@cortege/ibp-domain"
import { brandSpacing4 } from "../../app/brand-tokens"
import { REGION_OPTIONS, VEGETATION_STAGE_OPTIONS_BY_REGION } from "../../app/constants"
import { useBrandTheme } from "../../app/theme"
import { RegionVersion, VegetationStage } from "../../app/types"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { fr } from "../../i18n"
import { AppChoiceChip } from "../../ui/AppChoiceChip"
import { AppField } from "../../ui/AppField"
import { AppText as Text } from "../../ui/AppText"
import { CasPicker } from "../../ui/CasPicker"
import { GlassButton } from "../../ui/GlassButton"
import { finishBarBottomPadding } from "../survey-detail/finish-bar-layout"
import { useFinishBarHeight } from "../survey-detail/useFinishBarHeight"
import type { SurveyFormMethod } from "./method"
import { createWizardStyles } from "./wizard.styles"
import { WizardNativeHeader } from "./WizardNativeHeader"
import { AppPressable } from "../../ui/AppPressable"

const w = fr.surveyForm.wizard

/** The three questions here and the parcel map. */
const TOTAL_STEPS = 4

type WizardStep = "name" | "method" | "context"
const STEPS: readonly WizardStep[] = ["name", "method", "context"]

type SurveyWizardScreenProps = {
  siteName: string
  setSiteName: (value: string) => void
  formErrors: { siteName: string | null }
  method: SurveyFormMethod
  regionVersion: RegionVersion
  vegetationStage: VegetationStage
  setVegetationStage: (value: VegetationStage) => void
  onRegionChange: (nextRegion: RegionVersion) => void
  /** Step 4, the full-screen parcel map, is its own screen. */
  onOpenParcels: () => void
  /** Leaving from the first step. */
  onClose: () => void
  /**
   * 12.2-17: the stack shows its native header (iOS) with the system back button; the wizard then
   * puts the step counter in the bar and draws neither its own back button nor the status bar gap.
   */
  nativeHeader?: boolean
}

const METHOD_CHOICES: ReadonlyArray<{
  version: IbpMethodVersion
  hint: string
  recommended: boolean
}> = [
  { version: IBP_METHOD_V3_2, hint: w.method.v32Hint, recommended: true },
  { version: IBP_METHOD_V3_0, hint: w.method.v30Hint, recommended: false },
]

/**
 * The first three questions of a new survey (OA-25), one per screen, as the onboarding carousel
 * does: the name, the IBP method, then the cas (v3.2) or the region and stage (v3.0). The fourth
 * question, the parcels, is the full-screen map. Each answer is written to the form as it is made,
 * so the draft autosaves and nothing is lost on leaving.
 */
export function SurveyWizardScreen({
  siteName,
  setSiteName,
  formErrors,
  method,
  regionVersion,
  vegetationStage,
  setVegetationStage,
  onRegionChange,
  onOpenParcels,
  onClose,
  nativeHeader = false,
}: SurveyWizardScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createWizardStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const tabBarClearance = useTabBarClearance()
  // The call to action floats over the page: the scroll content ends above it.
  const { barHeight, onBarLayout } = useFinishBarHeight(true)
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const resolved = resolveMethodVersion(method.version)
  const isV32 = resolved === IBP_METHOD_V3_2

  const canContinue =
    step === "name"
      ? siteName.trim().length > 0
      : step === "context" && isV32
        ? method.cas !== null
        : true

  const goNext = (): void => {
    if (!canContinue) return
    if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1)
    else onOpenParcels()
  }
  const goBack = (): void => {
    if (stepIndex === 0) onClose()
    else setStepIndex(stepIndex - 1)
  }

  const title =
    step === "name"
      ? w.name.title
      : step === "method"
        ? w.method.title
        : isV32
          ? w.cas.title
          : w.region.title
  const body =
    step === "name"
      ? w.name.body
      : step === "method"
        ? w.method.body
        : isV32
          ? w.cas.body
          : w.region.body

  const stepLabel = w.stepLabel({ step: stepIndex + 1, total: TOTAL_STEPS })

  return (
    <View style={styles.screen} testID="wizard-screen">
      {nativeHeader ? (
        <WizardNativeHeader
          title={stepLabel}
          canStepBack={stepIndex > 0}
          onStepBack={() => setStepIndex(stepIndex - 1)}
        />
      ) : null}
      <View
        style={[
          styles.topBar,
          // Under the native header the route's ScreenFrame already starts below the bar.
          { paddingTop: nativeHeader ? brandSpacing4.sm : insets.top + 8 },
        ]}
      >
        {nativeHeader ? null : (
          <View style={styles.topRow}>
            <AppPressable
              style={styles.iconButton}
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel={stepIndex === 0 ? w.close : w.back}
              testID="wizard-back"
            >
              <Ionicons
                name={stepIndex === 0 ? "close-outline" : "chevron-back-outline"}
                size={22}
                color={theme.semanticColors.textStrong}
              />
            </AppPressable>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <View style={styles.topSpacer} />
          </View>
        )}
        <View style={styles.progress}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <View
              key={`segment-${index}`}
              style={[
                styles.progressSegment,
                index <= stepIndex ? styles.progressDone : styles.progressTodo,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: (barHeight ?? 0) + brandSpacing4.md },
        ]}
        keyboardShouldPersistTaps="handled"
        testID="wizard-body"
      >
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.lead}>{body}</Text>

        <View style={styles.answer}>
          {step === "name" ? (
            <>
              <AppField
                label={w.name.label}
                value={siteName}
                onChangeText={setSiteName}
                placeholder={w.name.placeholder}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={goNext}
                error={formErrors.siteName}
                testID="wizard-name-field"
              />
              <Text style={styles.hint}>{w.name.example}</Text>
            </>
          ) : null}

          {step === "method"
            ? METHOD_CHOICES.map((choice) => {
                const selected = resolved === choice.version
                return (
                  <AppPressable
                    key={choice.version}
                    style={[styles.choiceCard, selected ? styles.choiceCardSelected : null]}
                    onPress={method.locked ? undefined : () => method.setVersion(choice.version)}
                    accessibilityRole="radio"
                    accessibilityLabel={w.optionA11y({
                      label: fr.ibpMethod.versions[choice.version],
                      caption: choice.hint,
                    })}
                    accessibilityState={{ selected, disabled: method.locked }}
                    testID={`method-option-${choice.version}`}
                  >
                    <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                      {selected ? (
                        <Ionicons
                          name="checkmark-outline"
                          size={14}
                          color={theme.visual.chip.activeText}
                        />
                      ) : null}
                    </View>
                    <View style={styles.choiceCopy}>
                      <View style={styles.choiceTitleRow}>
                        <Text style={styles.choiceTitle}>
                          {fr.ibpMethod.versions[choice.version]}
                        </Text>
                        {choice.recommended ? (
                          <Text style={styles.recommended}>{w.method.recommended}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.choiceHint}>{choice.hint}</Text>
                    </View>
                  </AppPressable>
                )
              })
            : null}

          {step === "context" && isV32 ? (
            <CasPicker
              value={method.cas}
              onChange={method.setCas}
              cas3Scale={method.cas3Scale}
              onCas3ScaleChange={method.setCas3Scale}
            />
          ) : null}

          {step === "context" && !isV32 ? (
            <>
              <Text style={styles.chipGroupLabel}>{fr.surveyForm.region.label}</Text>
              <View style={styles.chipRow}>
                {REGION_OPTIONS.map((option) => (
                  <AppChoiceChip
                    key={option.value}
                    label={option.label}
                    active={regionVersion === option.value}
                    onPress={() => onRegionChange(option.value)}
                  />
                ))}
              </View>
              <Text style={styles.chipGroupLabel}>{fr.surveyForm.vegetation.label}</Text>
              <View style={styles.chipRow}>
                {VEGETATION_STAGE_OPTIONS_BY_REGION[regionVersion].map((option) => (
                  <AppChoiceChip
                    key={option.value}
                    label={option.label}
                    active={vegetationStage === option.value}
                    onPress={() => setVegetationStage(option.value)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        onLayout={onBarLayout}
        style={[styles.footer, { paddingBottom: finishBarBottomPadding(tabBarClearance) }]}
        testID="wizard-footer"
      >
        <GlassButton
          label={w.continue}
          size="lg"
          disabled={!canContinue}
          onPress={goNext}
          testID="wizard-continue"
        />
      </View>
    </View>
  )
}
