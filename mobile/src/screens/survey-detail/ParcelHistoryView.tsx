import { memo, useMemo, type ReactNode } from "react"
import { buildParcelHistory, type HistoryEntry } from "../../app/parcel-history"
import { fr } from "../../i18n"
import { AppNotice } from "../../ui/AppNotice"
import { EntranceView } from "../../ui/EntranceView"
import { FactorDeltasCard } from "./FactorDeltasCard"
import { HistoryList } from "./HistoryList"
import { TrendCard } from "./TrendCard"

const page = fr.parcelHistory.page

export type ParcelHistoryViewProps = {
  /** The parcel's surveys in API order (oldest first). */
  entries: HistoryEntry[]
  /** The community page never shows the per-factor deltas (its entries carry no factors). */
  variant: "own" | "community"
  /** Opens one other survey of the parcel, read-only. */
  onOpenSurvey: (surveyId: string) => void
}

/**
 * The loaded body of the parcel history pages (D-06 to D-10), shared by the own page and the
 * community page: the first-survey notice or the trend card, the per-factor deltas (own page
 * only) or the "different method" notice, then the list of surveys. No title, no scroll view and
 * no fetching here: the page shells own those. Entrance indices count the blocks shown.
 */
export const ParcelHistoryView = memo(function ParcelHistoryView({
  entries,
  variant,
  onOpenSurvey,
}: ParcelHistoryViewProps) {
  const model = useMemo(() => buildParcelHistory(entries), [entries])
  const blocks: ReactNode[] = []
  const add = (key: string, block: ReactNode) =>
    blocks.push(
      <EntranceView key={key} index={blocks.length}>
        {block}
      </EntranceView>,
    )

  if (model.isFirst) add("first", <AppNotice tone="info" message={page.first} />)
  if (model.trend.kind !== "none") {
    add("trend", <TrendCard trend={model.trend} points={model.drawn} />)
  }
  if (variant === "own" && model.deltaCard.kind === "card") {
    add("deltas", <FactorDeltasCard state={model.deltaCard} />)
  }
  if (variant === "own" && model.deltaCard.kind === "differentMethod") {
    add(
      "differentMethod",
      <AppNotice tone="info" icon="git-compare-outline" message={page.deltas.differentMethod} />,
    )
  }
  if (model.rows.length > 0) {
    add("list", <HistoryList rows={model.rows} variant={variant} onOpenSurvey={onOpenSurvey} />)
  }

  return <>{blocks}</>
})
