import { memo, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react"
import { StyleSheet } from "react-native"
import { useSurveyRoute } from "../../hooks/useSurveyRoute"
import { fr } from "../../i18n"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import { RouteChooseScreen } from "../../screens/route-guide/RouteChooseScreen"
import {
  buildEditedRecord,
  buildPick,
  chooseReducer,
  hasUncappedDetailData,
  initialChooseModel,
  selectChooseView,
  standOfRecord,
} from "../../screens/route-guide/route-choose-model"
import { getLocalSurveyDraft } from "../../storage/surveys"
import { useSurveyActions, useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import type { RouteChooseRouteProps, SurveysStackParamList } from "../types"

const chooser = fr.routeGuide.chooser

type GuideParams = SurveysStackParamList["surveyRouteGuide"]

/**
 * "Choisir le parcours" (phase 30, O-19, O-14): a form sheet on iOS and a modal screen on Android of
 * the survey stack, in two modes.
 *
 * - `pick`: opened from the route step ("Je connais déjà mon parcours", "Changer de parcours",
 *   "Modifier"). "Utiliser ce parcours" hands the selection back to the route step in its params
 *   with a fresh `pickNonce` (the step applies one pick per nonce, T-30-45) and closes the sheet.
 * - `edit`: opened from Contexte on a draft, with or without a recorded route. "Utiliser ce parcours"
 *   saves the canonical record through `updateSurveyRoute` (a draft only: the phone and the server
 *   refuse otherwise, T-30-46) and closes. A save that resolves false means the survey is no longer a
 *   draft, so the sheet closes silently; a thrown failure keeps it open with "Réessayer".
 *
 * Annuler and the Android back close without writing. Nothing here needs the network.
 */
export const RouteChooseRoute = memo(function RouteChooseRoute({
  navigation,
  route,
}: RouteChooseRouteProps) {
  const { surveyId, mode, surfaceHa, preselect, section, suggested } = route.params
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { updateSurveyRoute } = useSurveyActions()
  const { state: surveys } = useSurveys()

  // Edit: the recorded route (when the draft has one) comes back in once it is read from the phone.
  const survey =
    mode === "edit" ? (surveys.surveys.find((item) => item.id === surveyId) ?? null) : null
  const recorded = useSurveyRoute(survey)
  const recordedRoute = recorded.route

  const [model, dispatch] = useReducer(chooseReducer, undefined, () =>
    initialChooseModel({
      preselect: mode === "pick" ? preselect : undefined,
      record: null,
      standHa: surfaceHa ?? null,
      suggested: suggested ?? null,
    }),
  )

  // The first read, and every later one (a guided choice saved from here changes the record).
  useEffect(() => {
    if (mode !== "edit" || recordedRoute === null) return
    dispatch({
      type: "load",
      model: initialChooseModel({
        record: recordedRoute,
        standHa: surfaceHa ?? standOfRecord(recordedRoute),
        suggested: suggested ?? null,
      }),
    })
  }, [mode, recordedRoute, surfaceHa, suggested])

  // U-O10: B cover and F counts stay on the draft when the mode goes back to plafonné.
  const surveyUpdatedAt = survey?.updated_at ?? null
  useEffect(() => {
    if (surveyId === null) return undefined
    let cancelled = false
    void getLocalSurveyDraft(surveyId)
      .then((draft) => {
        if (!cancelled) dispatch({ type: "detailData", has: hasUncappedDetailData(draft?.factors) })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [surveyId, surveyUpdatedAt])

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const busy = useRef(false)

  const title = mode === "edit" && recordedRoute !== null ? chooser.titleEdit : chooser.title
  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerLeft: () => (
        <AppPressable
          style={styles.cancel}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={chooser.cancel}
          testID="route-choose-cancel"
        >
          <Text style={styles.cancelLabel}>{chooser.cancel}</Text>
        </AppPressable>
      ),
    })
  }, [navigation, title, styles])

  const onUsePick = (): void => {
    const picked = buildPick(model)
    if (picked === null) return
    // Back to the route step below the sheet. Its other params stay (`merge`); the nonce is new, so
    // the same selection chosen twice is applied twice.
    navigation.popTo("surveyRouteGuide", { picked, pickNonce: Date.now() } as GuideParams, {
      merge: true,
    })
  }

  const onUseEdit = async (): Promise<void> => {
    const record = buildEditedRecord(model, recordedRoute)
    if (record === null || surveyId === null) return
    busy.current = true
    setSaving(true)
    setSaveError(false)
    try {
      // False: the survey is no longer a draft. The sheet closes with nothing to say (T-30-46).
      await updateSurveyRoute(surveyId, record)
      navigation.goBack()
    } catch (_error) {
      setSaving(false)
      setSaveError(true)
    } finally {
      busy.current = false
    }
  }

  const onUse = useLatestCallback(() => {
    if (busy.current) return
    if (mode === "pick") onUsePick()
    else void onUseEdit()
  })

  const onAdvise = useLatestCallback(() => {
    const stand = surfaceHa ?? (recordedRoute === null ? null : standOfRecord(recordedRoute))
    navigation.navigate("surveyRouteGuide", { mode: "edit", surveyId, surfaceHa: stand })
  })

  const view = selectChooseView(model)
  return (
    <RouteChooseScreen
      mode={mode}
      view={view}
      saveError={saveError}
      saving={saving}
      section={section}
      onSelectMethod={(method) => dispatch({ type: "selectMethod", method })}
      onSelectCounting={(counting) => dispatch({ type: "selectCounting", counting })}
      onSelectPreset={(preset) => dispatch({ type: "selectPreset", preset })}
      onToggleFactor={(factor) => dispatch({ type: "toggleFactor", factor })}
      onChangeDetails={(value) => dispatch({ type: "setDetails", value })}
      onUse={onUse}
      onAdvise={onAdvise}
    />
  )
})

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    cancel: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: brandSpacing4.xs,
    },
    cancelLabel: {
      ...brandTypeScale.headline,
      fontFamily: brandTypography.navTitle.fontFamily,
      color: theme.semanticColors.accent,
    },
  })
}
