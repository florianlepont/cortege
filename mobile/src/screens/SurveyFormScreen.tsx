import { useEffect, useMemo, useState } from "react"
import { View } from "react-native"
import Animated from "react-native-reanimated"
import { REGION_OPTIONS, VEGETATION_STAGE_OPTIONS_BY_REGION } from "../app/constants"
import { computeIbpTotalsFromRetainedScores } from "../app/ibp-scoring"
import { useBrandTheme } from "../app/theme"
import {
  AppScreen,
  FactorField,
  FactorKey,
  FactorRetainedScore,
  GpsCaptureResult,
  RegionVersion,
  VegetationStage,
} from "../app/types"
import type { AutosaveStatus } from "../hooks/useEditingDraft"
import { IbpTotalGauge } from "../ui/IbpTotalGauge"
import { FACTOR_ORDER, WizardStep } from "./survey-form/components"
import { FactorsList, computeFactorProgress } from "./survey-form/FactorsList"
import { FixedActionBar } from "./survey-form/FixedActionBar"
import { FormHeader, StepRail, buildHeroCopy, buildStepMeta } from "./survey-form/FormHeader"
import { ParcelMapModal } from "./survey-form/ParcelMapModal"
import { ParcelsSection } from "./survey-form/ParcelsSection"
import type { SurveyFormMethod } from "./survey-form/MethodVersionPicker"
import { ScoringContextSection, scoringContextPills } from "./survey-form/ScoringContextSection"
import { SiteSection } from "./survey-form/SiteSection"
import { createFormStyles } from "./survey-form/styles"
import { useParcelMap } from "./survey-form/useParcelMap"
import { COLLAPSED_HERO_HEIGHT, useWizardScroll } from "./survey-form/useWizardScroll"
import { fr } from "../i18n"
export { toAddressLabel } from "./survey-screen-helpers"

// FLOW-05: the scroll content needs enough bottom padding to clear the fixed action bar (autosave
// text + back/primary row + its own safe-area padding) now that the CTA no longer scrolls with it.
const ACTION_BAR_CLEARANCE = 140
type SurveyFormScreenProps = {
  apiUrl: string
  accessToken: string | null
  screen: AppScreen
  editingSurveyId: string | null
  siteName: string
  setSiteName: (value: string) => void
  /** The IBP method, its v3.2 context and their setters (01.8-13). */
  method: SurveyFormMethod
  regionVersion: RegionVersion
  vegetationStage: VegetationStage
  setVegetationStage: (value: VegetationStage) => void
  onRegionChange: (nextRegion: RegionVersion) => void
  gpsLocation: {
    lat: string
    lng: string
    collected_at: string
  }
  selectedParcelIds: string[]
  onToggleParcelSelection: (parcelId: string) => void
  onCaptureGpsLocation: () => Promise<GpsCaptureResult | null>
  factorSections: Record<FactorKey, FactorField[]>
  factorRetainedScores: Record<FactorKey, FactorRetainedScore | null>
  formErrors: { siteName: string | null }
  onOpenFactor: (factor: FactorKey) => void
  onOpenParcelFullscreen: () => void
  onSaveSurveyEdits: () => Promise<void>
  onCreateDraft: () => Promise<void>
  /** FLOW-07: the visible autosave indicator's state. */
  autosaveStatus: AutosaveStatus
  /** FLOW-02: forces every factor's error to show, called before the final CTA persists. */
  onSubmitAttempt: () => void
}

export function SurveyFormScreen({
  apiUrl,
  accessToken,
  screen,
  editingSurveyId,
  siteName,
  setSiteName,
  method,
  regionVersion,
  vegetationStage,
  setVegetationStage,
  onRegionChange,
  gpsLocation,
  selectedParcelIds,
  onToggleParcelSelection,
  onCaptureGpsLocation,
  factorSections,
  factorRetainedScores,
  formErrors,
  onOpenFactor,
  onOpenParcelFullscreen,
  onSaveSurveyEdits,
  onCreateDraft,
  autosaveStatus,
  onSubmitAttempt,
}: SurveyFormScreenProps) {
  const [activeStep, setActiveStep] = useState<WizardStep>("identity")
  const theme = useBrandTheme()
  const formStyles = useMemo(() => createFormStyles(theme), [theme])
  const map = useParcelMap({
    apiUrl,
    accessToken,
    screen,
    editingSurveyId,
    gpsLocation,
    activeStep,
    onCaptureGpsLocation,
  })
  const wizard = useWizardScroll(activeStep, setActiveStep)

  const factorProgress = useMemo(() => computeFactorProgress(factorSections), [factorSections])
  const completedFactorCount = FACTOR_ORDER.filter(
    (factor) => factorProgress[factor]?.complete,
  ).length
  const scoreTotals = useMemo(
    () => computeIbpTotalsFromRetainedScores(factorRetainedScores),
    [factorRetainedScores],
  )
  const regionLabel = useMemo(
    () => REGION_OPTIONS.find((option) => option.value === regionVersion)?.label ?? regionVersion,
    [regionVersion],
  )
  const vegetationLabel = useMemo(
    () =>
      VEGETATION_STAGE_OPTIONS_BY_REGION[regionVersion].find(
        (option) => option.value === vegetationStage,
      )?.label ?? vegetationStage,
    [regionVersion, vegetationStage],
  )
  const contextPills = useMemo(
    () =>
      scoringContextPills({
        version: method.version,
        cas: method.cas,
        regionLabel,
        vegetationLabel,
      }),
    [method.cas, method.version, regionLabel, vegetationLabel],
  )

  const identityReady = siteName.trim().length > 0
  const parcelsReady = selectedParcelIds.length > 0
  const factorsReady = completedFactorCount === FACTOR_ORDER.length
  const persistLabel =
    screen === "edit" ? fr.surveyForm.actions.finishEdits : fr.surveyForm.actions.finishEntry

  const selectedParcelCount = selectedParcelIds.length
  const ibpTotal = scoreTotals.ibp_total
  const stepMeta = useMemo(
    () => buildStepMeta({ siteName, identityReady, selectedParcelCount, completedFactorCount }),
    [completedFactorCount, identityReady, selectedParcelCount, siteName],
  )
  const heroCopy = useMemo(
    () =>
      buildHeroCopy({
        screen,
        activeStep,
        siteName,
        selectedParcelCount,
        completedFactorCount,
        contextPills,
        ibpTotal,
      }),
    [
      activeStep,
      completedFactorCount,
      contextPills,
      screen,
      ibpTotal,
      selectedParcelCount,
      siteName,
    ],
  )

  useEffect(() => {
    setActiveStep("identity")
  }, [screen, editingSurveyId])

  const handlePersistSurvey = (): void => {
    onSubmitAttempt()
    if (screen === "edit") {
      void onSaveSurveyEdits()
      return
    }
    void onCreateDraft()
  }

  const handleOpenStep = (nextStep: WizardStep): void => {
    if (nextStep !== "identity" && !identityReady) {
      return
    }
    wizard.openWizardStep(nextStep)
  }

  return (
    <View style={formStyles.container}>
      <FormHeader
        activeStep={activeStep}
        heroCopy={heroCopy}
        heroTopOffset={wizard.heroTopOffset}
        scrollY={wizard.scrollY}
        collapseDistance={wizard.collapseDistance}
        expandedHeroHeight={wizard.expandedHeroHeight}
        collapsedHeroHeight={COLLAPSED_HERO_HEIGHT}
      />

      <Animated.ScrollView
        ref={wizard.scrollRef}
        style={formStyles.pageScroll}
        contentContainerStyle={[
          formStyles.pageContent,
          {
            paddingBottom:
              wizard.scrollContentBottomPadding +
              (activeStep === "identity" ? 0 : ACTION_BAR_CLEARANCE),
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        onScroll={wizard.handleScroll}
      >
        <View style={{ height: wizard.topSpacerHeight }} />

        <StepRail
          activeStep={activeStep}
          stepMeta={stepMeta}
          identityReady={identityReady}
          parcelsReady={parcelsReady}
          factorsReady={factorsReady}
          preserveRailSpace={wizard.preserveIdentityRailSpace}
          scrollY={wizard.scrollY}
          onOpenStep={handleOpenStep}
        />

        {/* FLOW-06: the segmented total gauge is visible from the first wizard step, not only
         * once the factors step is reached. */}
        <IbpTotalGauge order={FACTOR_ORDER} factorProgress={factorProgress} total={ibpTotal} />

        {activeStep === "identity" ? (
          <SiteSection
            method={method}
            siteName={siteName}
            setSiteName={setSiteName}
            siteNameError={formErrors.siteName}
            identityReady={identityReady}
            onLayout={wizard.handleIdentityLayout}
            onFocus={wizard.handleIdentityFocus}
            onBlur={wizard.handleIdentityBlur}
            onContinue={() => handleOpenStep("parcels")}
          />
        ) : null}

        {activeStep === "parcels" ? (
          <>
            <ParcelsSection
              map={map}
              selectedParcelIds={selectedParcelIds}
              onToggleParcelSelection={onToggleParcelSelection}
              onOpenParcelFullscreen={onOpenParcelFullscreen}
            />
            <ScoringContextSection
              method={method}
              regionVersion={regionVersion}
              vegetationStage={vegetationStage}
              onRegionChange={onRegionChange}
              setVegetationStage={setVegetationStage}
            />
            <ParcelMapModal
              map={map}
              siteName={siteName}
              selectedParcelIds={selectedParcelIds}
              onToggleParcelSelection={onToggleParcelSelection}
            />
          </>
        ) : null}

        {activeStep === "factors" ? (
          <FactorsList
            factorProgress={factorProgress}
            factorRetainedScores={factorRetainedScores}
            scoreTotals={scoreTotals}
            onOpenFactor={onOpenFactor}
          />
        ) : null}
      </Animated.ScrollView>

      {/* FLOW-05: a fixed bottom action bar instead of a CTA at the end of a long scroll. */}
      {activeStep === "parcels" ? (
        <FixedActionBar
          primaryLabel={fr.surveyForm.actions.continueToFactors}
          onBack={() => setActiveStep("identity")}
          onPrimary={() => setActiveStep("factors")}
        />
      ) : null}
      {activeStep === "factors" ? (
        <FixedActionBar
          primaryLabel={persistLabel}
          onBack={() => setActiveStep("parcels")}
          onPrimary={handlePersistSurvey}
          autosaveStatus={autosaveStatus}
        />
      ) : null}
    </View>
  )
}
