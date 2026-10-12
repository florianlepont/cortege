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

/** The four rows of the summary that open its sub-pages: Contexte, Parcelles, factors, history (D-32). */
export function buildSummaryRowSections(
  data: Pick<SurveyDetailData, "scoringContext" | "parcelIds" | "filledFactorCount">,
  historyRow: HistoryRowDisplay,
  handlers: SummaryRowHandlers,
): AppGroupedListSection[] {
  const methodLabel =
    resolveMethodVersion(data.scoringContext.ibp_method_version) === IBP_METHOD_V3_2
      ? "v3.2"
      : "v3.0"
  return [
    {
      key: "pages",
      rows: [
        {
          key: "context",
          label: rowsText.context,
          value: rowsText.contextValue({
            method: methodLabel,
            cas: data.scoringContext.ibp_cas !== null ? String(data.scoringContext.ibp_cas) : null,
          }),
          onPress: handlers.onOpenContext,
        },
        {
          key: "parcels",
          label: rowsText.parcels,
          value:
            data.parcelIds.length > 0
              ? rowsText.parcelsValue(data.parcelIds.length)
              : rowsText.parcelsNone,
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
