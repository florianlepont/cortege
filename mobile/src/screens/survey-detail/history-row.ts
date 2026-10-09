import type { HistoryRowState } from "../../app/parcel-history"
import { fr } from "../../i18n"

const rowsText = fr.surveyDetail.rows
const a11yText = fr.surveyDetail.a11y

/** What the "Historique de la parcelle" row shows and says. */
export type HistoryRowDisplay = {
  /** The visible value, undefined while loading. */
  value: string | undefined
  accessibilityLabel: string
  /** False only without a parcel: the row has then no chevron and is not a button. */
  pressable: boolean
}

/**
 * The texts of one state of the parcel history row (D-01). Shared by the owner summary and the
 * community page: the same value rule (UI-SPEC Surface 5). Every spoken value equals the visible
 * one except the range, whose arrow is read as words; a loading row speaks its label alone.
 */
export function toHistoryRow(state: HistoryRowState): HistoryRowDisplay {
  const label = rowsText.history
  const spoken = (value: string, spokenValue: string = value, pressable = true) => ({
    value,
    accessibilityLabel: a11yText.historyRow({ label, value: spokenValue }),
    pressable,
  })
  switch (state.kind) {
    case "noParcel":
      return spoken(rowsText.historyNoParcel, undefined, false)
    case "unavailable":
      return spoken(rowsText.historyUnavailable)
    case "first":
      return spoken(rowsText.historyFirst)
    case "count":
      return spoken(rowsText.historyCount(state.count))
    case "loading":
      return { value: undefined, accessibilityLabel: label, pressable: true }
    case "range":
      return spoken(
        rowsText.historyValue({ first: state.first, latest: state.latest }),
        a11yText.historyRange({ first: state.first, latest: state.latest }),
      )
  }
}
