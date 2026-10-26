import { memo, useCallback, useEffect, useMemo, useRef } from "react"
import type { FactorKey } from "../../app/types"
import { useSurveyRoute } from "../../hooks/useSurveyRoute"
import { fr } from "../../i18n"
import type { UncappedEntryProps } from "../../screens/factor-detail/UncappedFieldBlock"
import { FactorPager, type PagerFinishAction } from "../../screens/survey-form/FactorPager"
import { usePagerFinish } from "../../screens/survey-form/usePagerFinish"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { ScreenFrame } from "../../ui/ScreenFrame"
import type { FactorDetailRouteProps } from "../types"

// A stable empty list, so a capped survey does not hand the pager a new array on every render.
const NO_UNCAPPED_FACTORS: readonly FactorKey[] = []

/**
 * Factor detail route (phase 01.9-18, D-01; FLOW-04 pager since phase 3): the form context, and
 * the surveys context for the finish. Hosts the A->J horizontal pager instead of a single factor
 * screen, so navigating between factors no longer round-trips through the factor grid. The native
 * header names the factor on screen, and "Terminer" on the last factor goes back to where the pager
 * was opened from. D-19 (12.2-15): the pager sits in a ScreenFrame under the stack's transparent
 * header, so the halo runs on behind the header and the pager starts below it.
 *
 * D-26: when the survey being edited is complete and named, the last factor offers "Terminer le
 * relevé", which opens the submission step (the `surveyFinish` sheet, Phase 29 D-04); once the
 * survey is finished the stack goes back to the summary, which plays the success haptic, halo and
 * pop.
 *
 * Phase 27 (D-16): the doubt flag and the note of each factor go through the form's setters. A
 * doubt toggle is written at once: the form value is set first, and once the context carries it the
 * draft is flushed one time (the flush reads the form value of the render that carries the change).
 * A note is written by the strip (typing pause, blur, page change) through `flushDraft`.
 *
 * Phase 30 (D-07, plan 30-15): the recorded route is read once here with `useSurveyRoute`; the
 * factors counted in full and the surface décrite go to the pager, which shows the "Relevé
 * déplafonné" signals and prefills the surface fields of C, D and E. A survey with no valid route
 * gives an empty list and no zone: nothing new is shown.
 *
 * Phase 30 (plan 30-19): the typed detail inputs of the relevé déplafonné (B cover per stratum, F
 * counts per group and F's surface) and their three setters travel as one `uncappedEntry` object;
 * the pager hands it to the factor page, which shows it only for B or F counted in full.
 */
export const FactorDetailRoute = memo(function FactorDetailRoute({
  navigation,
  route,
}: FactorDetailRouteProps) {
  const { state, actions } = useSurveyFormState()
  const { state: surveysState } = useSurveys()
  const { factor } = route.params
  const { editingSurveyId } = state
  const survey = useMemo(
    () => surveysState.surveys.find((item) => item.id === editingSurveyId) ?? null,
    [surveysState.surveys, editingSurveyId],
  )

  const { route: surveyRoute } = useSurveyRoute(survey)
  const uncappedFactors = useMemo<readonly FactorKey[]>(
    () =>
      surveyRoute?.counting === "uncapped"
        ? (surveyRoute.uncapped_factors ?? NO_UNCAPPED_FACTORS)
        : NO_UNCAPPED_FACTORS,
    [surveyRoute],
  )
  const zoneSurfaceHa = surveyRoute?.zone_surface_ha ?? null
  const { uncapped } = state
  const { setStratumCover, setDmhCount, bumpDmhGroup, setFSurface } = actions
  const uncappedEntry = useMemo<UncappedEntryProps>(
    () => ({ state: uncapped, setStratumCover, setDmhCount, bumpDmhGroup, setFSurface }),
    [uncapped, setStratumCover, setDmhCount, bumpDmhGroup, setFSurface],
  )

  const handleActiveFactorChange = useCallback(
    (active: FactorKey) => {
      navigation.setOptions({ title: fr.navigation.headers.factor(active) })
    },
    [navigation],
  )
  const handleFinish = useCallback(() => navigation.goBack(), [navigation])
  const { setFactorDoubt, setFactorNote, flushDraft } = actions
  const flushAfterDoubtRef = useRef(false)
  const handleChangeDoubt = useCallback(
    (changed: FactorKey, next: boolean) => {
      flushAfterDoubtRef.current = true
      setFactorDoubt(changed, next)
    },
    [setFactorDoubt],
  )
  // The write waits for the render that carries the new doubt, so it stores the value just set.
  const { factorAnnotations } = state
  useEffect(() => {
    if (!flushAfterDoubtRef.current) return
    flushAfterDoubtRef.current = false
    void flushDraft()
  }, [factorAnnotations, flushDraft])
  const handleCommitNote = useCallback(() => {
    void flushDraft()
  }, [flushDraft])
  const handleOpenHelp = useCallback(
    (help: string, hints: readonly string[]) =>
      navigation.navigate("surveyFactorHelp", { help, hints: [...hints] }),
    [navigation],
  )
  // Back to the summary, also when the pager was opened from the Score page.
  const handleFinished = useLatestCallback(() => navigation.popTo("surveyDetail"))

  const openFinish = useLatestCallback((surveyId: string) =>
    navigation.navigate("surveyFinish", { surveyId }),
  )
  const { offered, finish } = usePagerFinish({
    survey,
    draft: state.draftInput,
    openFinish,
    onFinished: handleFinished,
  })
  const siteName = survey?.site_name ?? ""
  const finishAction = useMemo<PagerFinishAction | null>(
    () =>
      offered
        ? {
            label: fr.surveyDetail.cta.finish,
            accessibilityLabel: fr.surveyDetail.a11y.finishSurvey(siteName),
            loading: false,
            onPress: finish,
            notice: null,
          }
        : null,
    [offered, finish, siteName],
  )

  return (
    <ScreenFrame>
      <FactorPager
        initialFactor={factor}
        factorSections={state.factorSections}
        factorRetainedScores={state.factorRetainedScores}
        methodVersion={state.ibpMethodVersion}
        onActiveFactorChange={handleActiveFactorChange}
        onFinish={handleFinish}
        onOpenHelp={handleOpenHelp}
        finishAction={finishAction}
        factorAnnotations={factorAnnotations}
        onChangeDoubt={handleChangeDoubt}
        onChangeNote={setFactorNote}
        onCommitNote={handleCommitNote}
        uncappedFactors={uncappedFactors}
        zoneSurfaceHa={zoneSurfaceHa}
        uncappedEntry={uncappedEntry}
      />
    </ScreenFrame>
  )
})
