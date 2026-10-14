import { memo, useEffect, useLayoutEffect, useRef, useState } from "react"
import { BackHandler } from "react-native"
import type { SurveyRoute } from "@cortege/ibp-domain"
import { useSurveyRoute } from "../../hooks/useSurveyRoute"
import { fr } from "../../i18n"
import { RouteGuideScreen } from "../../screens/route-guide/RouteGuideScreen"
import type { RouteChooserSection } from "../../screens/route-guide/RouteGuideScreen"
import { useRouteGuideState } from "../../screens/route-guide/useRouteGuideState"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useSurveyActions, useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { useWeatherPrefillState } from "../../state/weather-context"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"
import type { RoutePick, RouteGuideRouteProps } from "../types"
import { finishSurveyCreation } from "./finish-creation"
import { RouteBackButton } from "./RouteBackButton"

/** The route step is the fifth and last step of the creation (O-19): the wizard's three, the map. */
const CREATION_STEPS = { route: 5, total: 5 } as const

/**
 * "Choix du parcours" (phase 30, O-19, P-1): the mandatory last step of a new survey, and the guided
 * choice reached from the chooser for a draft that already exists.
 *
 * Create: the wizard's draft exists on the phone since its first step and is saved by the editing
 * session, but it is only finalised here, when the route is accepted ("Utiliser ce parcours"): the
 * route is written on it first, then the draft is finalised (`createDraft`), the weather point is
 * kept, and the creation flow is replaced by the survey page (`finishSurveyCreation`). Going back
 * (the step's own back button, Android back) before that is a plain return to the parcel map with the editing
 * session still open and nothing written, so no duplicate draft can appear (T-30-44).
 *
 * Edit: the recorded answers come back, the route is saved on the draft and the screen goes back.
 *
 * The step needs no network (spec section 1, T-30-43): a failed write keeps the screen with
 * "Réessayer", and an unknown surface only opens the surface card empty.
 */
export const RouteGuideRoute = memo(function RouteGuideRoute({
  navigation,
  route,
}: RouteGuideRouteProps) {
  const { surveyId, mode, surfaceHa, weatherPoint, picked, pickNonce } = route.params
  const { updateSurveyRoute, openSurvey } = useSurveyActions()
  const { state: form, actions: formActions } = useSurveyFormState()
  const weather = useWeatherPrefillState()
  const { state: surveys } = useSurveys()
  const guide = useRouteGuideState({ surfaceHaPrefill: surfaceHa })
  const { actions } = guide

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const busy = useRef(false)
  // The rare creation path (the wizard had no draft yet): the draft created at acceptance, so a
  // retry after a failed route write writes on it instead of creating a second one.
  const finalisedId = useRef<string | null>(null)

  // Edit: the recorded route comes back into the step once it is read from the phone.
  const survey =
    mode === "edit" ? (surveys.surveys.find((item) => item.id === surveyId) ?? null) : null
  const recorded = useSurveyRoute(survey)
  const loaded = useRef(false)
  useEffect(() => {
    if (mode !== "edit" || loaded.current || !recorded.loaded || recorded.route === null) return
    loaded.current = true
    actions.loadRecord(recorded.route)
  }, [mode, recorded, actions])

  // The chooser's pick, applied once (T-30-45): a fresh nonce for each return from the chooser.
  const appliedNonce = useRef<number | null>(null)
  useEffect(() => {
    if (picked === undefined) return
    const nonce = pickNonce ?? 0
    if (appliedNonce.current === nonce) return
    appliedNonce.current = nonce
    actions.applyPick({
      method: picked.method,
      counting: picked.counting,
      uncappedFactors: picked.uncapped_factors,
    })
    const details = picked.details
    if (details !== undefined) {
      actions.setZoneText(details.zoneText === "" ? null : details.zoneText)
      actions.setComplementDone(details.complementDone)
      actions.setTotalText(details.totalText === "" ? null : details.totalText)
    }
  }, [picked, pickNonce, actions])

  // Back is the step's own: the native back (arrow, swipe) is off in the stack options, so no pop
  // is ever held back natively. One question back while there is one; from the first question the
  // plain return to the parcel map (create) or to the previous page (edit), nothing written.
  const stepBack = useLatestCallback(() => actions.back())
  const goBack = useLatestCallback((): void => {
    if (!stepBack()) navigation.goBack()
  })
  useLayoutEffect(() => {
    navigation.setOptions({ headerLeft: () => <RouteBackButton onPress={goBack} /> })
  }, [navigation, goBack])
  // Android system back: one question back while there is one, else the default pop. Only while
  // this screen is the focused one (the chooser sheet above it handles its own back).
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!navigation.isFocused()) return false
      return stepBack()
    })
    return () => subscription.remove()
  }, [navigation, stepBack])

  const failed = (): void => setSaveError(true)

  /** A route write that did not go through shows the error; a throw counts as a refusal. */
  const writeRoute = async (id: string, record: SurveyRoute): Promise<boolean> => {
    try {
      return await updateSurveyRoute(id, record)
    } catch (_error) {
      return false
    }
  }

  const acceptCreate = async (record: SurveyRoute): Promise<void> => {
    let id = finalisedId.current
    if (id !== null) {
      if (!(await writeRoute(id, record))) return failed()
    } else {
      // Read before the finalisation: it closes the editing session.
      const known = surveyId ?? form.editingSurveyId
      if (known !== null) {
        if (!(await writeRoute(known, record))) return failed()
        id = await formActions.createDraft()
        if (id === null) return
      } else {
        id = await formActions.createDraft()
        if (id === null) return
        finalisedId.current = id
        if (!(await writeRoute(id, record))) return failed()
      }
    }
    if (weatherPoint) void weather.actions.rememberPoint(id, weatherPoint)
    finishSurveyCreation(navigation, openSurvey, id)
  }

  const acceptEdit = async (record: SurveyRoute): Promise<void> => {
    if (surveyId === null || !(await writeRoute(surveyId, record))) return failed()
    navigation.goBack()
  }

  const onUse = useLatestCallback(async () => {
    const record = guide.record
    if (busy.current || record === null) return
    busy.current = true
    setSaving(true)
    setSaveError(false)
    try {
      await (mode === "edit" ? acceptEdit(record) : acceptCreate(record))
    } finally {
      busy.current = false
      setSaving(false)
    }
  })

  const onOpenChooser = useLatestCallback(
    (chooserMode: "pick" | "edit", section?: RouteChooserSection) => {
      const { selection, rows, zoneFieldText, totalFieldText, recommendation } = guide.view
      const stand = rows.find((row) => row.id === "surface")
      const preselect: RoutePick | undefined =
        selection === null
          ? undefined
          : {
              method: selection.method,
              counting: selection.counting,
              uncapped_factors: selection.uncappedFactors,
              details: {
                zoneText: zoneFieldText,
                complementDone: selection.complement?.done ?? false,
                totalText: totalFieldText,
              },
            }
      navigation.navigate("surveyRouteChoose", {
        surveyId,
        mode: chooserMode,
        surfaceHa: stand?.id === "surface" ? stand.hectares : surfaceHa,
        ...(preselect === undefined ? null : { preselect }),
        ...(section === undefined ? null : { section }),
        // The parcours the guide advised carries "Conseillé" in the chooser.
        ...(recommendation.status === "route"
          ? { suggested: { method: recommendation.method, counting: recommendation.counting } }
          : null),
      })
    },
  )

  return (
    // The native large title in the native iOS tab tree (the stack sets the header, 12.2-17).
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <RouteGuideScreen
        state={guide}
        surfaceUnknown={surfaceHa === null}
        saveError={saveError}
        saving={saving}
        stepLabel={
          mode === "create"
            ? fr.surveyForm.wizard.stepLabel({
                step: CREATION_STEPS.route,
                total: CREATION_STEPS.total,
              })
            : undefined
        }
        onUse={onUse}
        onRetry={onUse}
        onOpenChooser={onOpenChooser}
      />
    </ScreenFrame>
  )
})
