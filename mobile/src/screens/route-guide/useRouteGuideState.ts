import { useEffect, useMemo, useReducer, useRef } from "react"
import type {
  LargeStandOption,
  RouteExperience,
  RouteHomogeneity,
  SurveyRoute,
} from "@cortege/ibp-domain"
import {
  buildRouteRecord,
  canStepBack,
  guideReducer,
  initialGuideModel,
  selectGuideView,
  type GuideView,
  type RouteGuidePick,
} from "./route-guide-model"

// Phase 30 (plan 30-17), D-05: the React state of the route step. The questionnaire state lives in
// the guide route, never in an app context (U-O14: nothing is saved before the observer accepts,
// so a killed app leaves a clean route-less draft). Every rule is in `route-guide-model.ts`; O-04:
// the refine answers are information only.

export type RouteGuideActions = {
  setSurfaceText: (text: string) => void
  /** On blur: shows the error of an unusable surface, never advances. */
  validateSurface: () => void
  /** The surface field's return key: same as "Suivant" on the surface question. */
  commitSurface: () => void
  /** "Suivant": to the next needed question, or to the result when none is left. */
  next: () => void
  /** One question back (the answer typed is kept); false when there is none, the caller leaves. */
  back: () => boolean
  answerHomogeneity: (value: RouteHomogeneity) => void
  answerDifficulty: (value: boolean) => void
  answerNarrow: (value: boolean) => void
  /** Picks an option on the large-stand screen; its "Suivant" applies it. */
  pickLargeStand: (option: LargeStandOption) => void
  chooseLargeStandOption: (option: LargeStandOption) => void
  setExperience: (value: RouteExperience | undefined) => void
  setHoursText: (text: string) => void
  applyPick: (pick: RouteGuidePick) => void
  restoreSuggestion: () => void
  setZoneText: (text: string | null) => void
  setComplementDone: (done: boolean) => void
  setTotalText: (text: string | null) => void
  /** Edit mode: brings the recorded route's answers and choices back into the step. */
  loadRecord: (route: SurveyRoute) => void
}

export type RouteGuideState = {
  view: GuideView
  /** The canonical route to record on acceptance; null while `view.canUse` is false. */
  record: SurveyRoute | null
  /** Stable for the life of the screen. */
  actions: RouteGuideActions
}

export type RouteGuideStateParams = {
  /** The stand surface estimated from the chosen parcels, null when it could not be computed. */
  surfaceHaPrefill: number | null
}

export function useRouteGuideState(params: RouteGuideStateParams): RouteGuideState {
  const { surfaceHaPrefill } = params
  const [model, dispatch] = useReducer(guideReducer, surfaceHaPrefill, (prefill) =>
    initialGuideModel({ surfaceHaPrefill: prefill }),
  )

  // The estimate can arrive after the first render (the parcel geometry is read from the cache);
  // the model keeps it out of a card the observer has already touched.
  useEffect(() => {
    dispatch({ type: "receivePrefill", surfaceHa: surfaceHaPrefill })
  }, [surfaceHaPrefill])

  // `back` is stable: it reads whether a question is left to return to from the latest model.
  const canStepBackRef = useRef(false)
  canStepBackRef.current = canStepBack(model)

  const actions = useMemo<RouteGuideActions>(
    () => ({
      setSurfaceText: (text) => dispatch({ type: "setSurfaceText", text }),
      validateSurface: () => dispatch({ type: "validateSurface" }),
      commitSurface: () => dispatch({ type: "commitSurface" }),
      next: () => dispatch({ type: "next" }),
      back: () => {
        if (!canStepBackRef.current) return false
        dispatch({ type: "back" })
        return true
      },
      answerHomogeneity: (value) => dispatch({ type: "answer", id: "homogeneity", value }),
      answerDifficulty: (value) => dispatch({ type: "answer", id: "difficulty", value }),
      answerNarrow: (value) => dispatch({ type: "answer", id: "narrow", value }),
      pickLargeStand: (option) => dispatch({ type: "pickLargeStand", option }),
      chooseLargeStandOption: (option) => dispatch({ type: "chooseLargeStandOption", option }),
      setExperience: (value) => dispatch({ type: "setRefine", field: "experience", value }),
      setHoursText: (text) => dispatch({ type: "setRefine", field: "hours", text }),
      applyPick: (pick) => dispatch({ type: "applyPick", pick }),
      restoreSuggestion: () => dispatch({ type: "restoreSuggestion" }),
      setZoneText: (text) => dispatch({ type: "setZoneText", text }),
      setComplementDone: (done) => dispatch({ type: "setComplementDone", done }),
      setTotalText: (text) => dispatch({ type: "setTotalText", text }),
      loadRecord: (route) => dispatch({ type: "loadRecord", route }),
    }),
    [],
  )

  const view = useMemo(() => selectGuideView(model), [model])
  const record = useMemo(() => buildRouteRecord(model), [model])
  return { view, record, actions }
}
