import { IBP_METHOD_V3_2, resolveMethodVersion } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import type { AppGroupedListSection } from "../../ui/AppGroupedList"
import type { HistoryRowDisplay } from "./history-row"
import type { SurveyDetailData } from "./useSurveyDetailData"

const rowsText = fr.surveyDetail.rows

type SummaryRowHandlers = {
  onOpenContext: () => void
  onOpenParcelsPage: () => void
  onOpenScore: () => void
  onOpenHistory: () => void
}

/**
 * The four rows of the summary that open its sub-pages: Contexte, Parcelles et parcours, factors,
 * history (D-32). The parcels row value is the parcel count, then, on the same line, the short name
 * of the recorded parcours (`routeLabel`, phase 30, U-O9, moved from Contexte on 2026-10-14) or
 * "Parcours à choisir" for a draft with no route (`routePending`); without either it is the count.
 */
export function buildSummaryRowSections(
  data: Pick<SurveyDetailData, "scoringContext" | "parcelIds" | "filledFactorCount"> & {
    routeLabel?: string | null
    routePending?: boolean
  },
  historyRow: HistoryRowDisplay,
  handlers: SummaryRowHandlers,
): AppGroupedListSection[] {
  const methodLabel =
    resolveMethodVersion(data.scoringContext.ibp_method_version) === IBP_METHOD_V3_2
      ? "v3.2"
      : "v3.0"
  const cas = data.scoringContext.ibp_cas !== null ? String(data.scoringContext.ibp_cas) : null
  const contextValue = rowsText.contextValue({ method: methodLabel, cas })
  const parcelsCount =
    data.parcelIds.length > 0 ? rowsText.parcelsValue(data.parcelIds.length) : rowsText.parcelsNone
  const routeText = data.routeLabel ?? (data.routePending ? fr.surveyDetail.route.none : null)
  const parcelsValue = routeText
    ? rowsText.parcelsValueWithRoute({ parcels: parcelsCount, route: routeText })
    : parcelsCount
  return [
    {
      key: "pages",
      rows: [
        {
          key: "context",
          label: rowsText.context,
          value: contextValue,
          onPress: handlers.onOpenContext,
        },
        {
          key: "parcels",
          label: rowsText.parcels,
          value: parcelsValue,
          // The label stays whole ("Parcell/es" at 390 pt), the long value wraps to two lines.
          valueLines: 2,
          onPress: handlers.onOpenParcelsPage,
        },
        {
          key: "score",
          label: rowsText.score,
          value:
            data.filledFactorCount !== null
              ? rowsText.scoreValue(data.filledFactorCount)
              : undefined,
          onPress: handlers.onOpenScore,
        },
        {
          key: "history",
          label: rowsText.history,
          value: historyRow.value,
          multiline: true,
          accessibilityLabel: historyRow.accessibilityLabel,
          onPress: historyRow.pressable ? handlers.onOpenHistory : undefined,
        },
      ],
    },
  ]
}
