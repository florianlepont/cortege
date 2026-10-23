import { useMemo } from "react"
import type { RouteRecommendation } from "@cortege/ibp-domain"
import type { GuideView } from "./route-guide-model"
import { ReasonsCard } from "./ReasonsCard"
import { RefineSection } from "./RefineSection"
import { RouteDetailsCard, type RouteDetailsValue } from "./RouteDetailsCard"
import { RouteAdvice, RouteNotices } from "./RouteNotices"
import { SuggestionCard } from "./SuggestionCard"
import type { RouteChooserSection } from "./RouteGuideScreen"
import type { RouteGuideActions } from "./useRouteGuideState"

type ResultBodyProps = {
  view: GuideView
  actions: RouteGuideActions
  recommendation: RouteRecommendation
  onOpenChooser: (mode: "pick" | "edit", section?: RouteChooserSection) => void
}

/**
 * The result screen of the route step: the suggestion (or the parcours picked), its reasons, the
 * details card, the warnings and the folded "Pour affiner" (experience and time available are part
 * of this screen only). Everything comes from the model's view; nothing is decided here.
 */
export function ResultBody({ view, actions, recommendation, onOpenChooser }: ResultBodyProps) {
  const { selection } = view
  const standRow = view.rows.find((row) => row.id === "surface")
  const standHa = standRow?.id === "surface" ? standRow.hectares : null

  const details: RouteDetailsValue = useMemo(
    () => ({
      zoneText: view.zoneFieldText,
      complementDone: selection?.complement?.done ?? false,
      totalText: view.totalFieldText,
    }),
    [view.zoneFieldText, view.totalFieldText, selection?.complement?.done],
  )
  if (selection === null) return null

  const changeDetails = (next: RouteDetailsValue): void => {
    if (next.zoneText !== details.zoneText) actions.setZoneText(next.zoneText)
    if (next.complementDone !== details.complementDone)
      actions.setComplementDone(next.complementDone)
    if (next.totalText !== details.totalText) actions.setTotalText(next.totalText)
  }

  const suggested = selection.source === "suggestion"
  const warnings =
    recommendation.status === "route" && suggested
      ? // The details card raises this one live from the surface typed in its field.
        recommendation.warnings.filter((code) => code !== "partial_over_half")
      : []

  return (
    <>
      <SuggestionCard
        method={selection.method}
        counting={selection.counting}
        uncappedFactors={selection.uncappedFactors}
        zoneHa={selection.zoneHa}
        chosenBy={view.chosenBy ?? "observer"}
        onChange={() => onOpenChooser("pick")}
        onRestore={recommendation.status === "route" ? actions.restoreSuggestion : undefined}
      />
      {recommendation.status === "route" && suggested ? (
        <ReasonsCard reasons={recommendation.reasons} />
      ) : null}
      <RouteDetailsCard
        method={selection.method}
        counting={selection.counting}
        uncappedFactors={selection.uncappedFactors}
        standHa={standHa}
        value={details}
        onChange={changeDetails}
        onEditCounting={() => onOpenChooser("pick", "counting")}
      />
      <RouteNotices warnings={warnings} />
      <RefineSection
        refine={view.refine}
        actions={actions}
        footer={view.advice === null ? null : <RouteAdvice advice={view.advice} />}
      />
    </>
  )
}
