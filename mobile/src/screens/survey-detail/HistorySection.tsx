import { useMemo } from "react"
import { Text, View } from "react-native"
import { FACTOR_KEYS } from "@cortege/ibp-domain"
import { computeFactorDeltas, computeIbpTotalDelta } from "../../app/ibp-scoring"
import type { FactorCanonical, IbpScores, ParcelSurveyHistoryItem } from "../../app/types"
import { useBrandTheme } from "../../app/theme"
import { useParcelSurveyHistory } from "../../hooks/useParcelSurveyHistory"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppNotice } from "../../ui/AppNotice"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { createSummaryStyles } from "./summary.styles"

const t = fr.surveyDetail.versionHistory
const ph = fr.parcelHistory

type HistorySectionProps = {
  apiUrl: string
  accessToken: string | null
  parcelId: string | null
  currentSurveyId: string
  currentScores: IbpScores | null
  currentFactorResults: Record<string, FactorCanonical> | null
}

function HistoryRow({
  item,
  styles,
}: {
  item: ParcelSurveyHistoryItem
  styles: ReturnType<typeof createSummaryStyles>
}) {
  return (
    <View style={styles.historyRow}>
      <Text style={styles.historyRowTitle}>
        {ph.entry({ year: item.observation_year, version: item.version_number, isLatest: false })}
      </Text>
      <Text style={styles.historyRowMeta}>{ph.total(item.scores.ibp_total)}</Text>
    </View>
  )
}

/**
 * Previous submitted surveys on this survey's parcel, and this survey's IBP total/factor deltas
 * against the latest one (REQ-B-survey-detail, REQ-C-versioning, ROADMAP Phase 2 criteria 2, 5).
 * Renders nothing without a resolvable parcel, and nothing but a one-line notice when this is the
 * parcel's first submitted survey.
 */
export function HistorySection({
  apiUrl,
  accessToken,
  parcelId,
  currentSurveyId,
  currentScores,
  currentFactorResults,
}: HistorySectionProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryStyles(theme), [theme])
  const { items, loading, error } = useParcelSurveyHistory(apiUrl, accessToken, parcelId)

  if (!parcelId) {
    return null
  }

  const previousItems = items.filter((item) => item.survey_id !== currentSurveyId)
  const latestPrevious = previousItems[previousItems.length - 1] ?? null
  const totalDelta =
    currentScores && latestPrevious
      ? computeIbpTotalDelta(currentScores, latestPrevious.scores)
      : null
  const factorDeltas =
    currentFactorResults && latestPrevious
      ? computeFactorDeltas(currentFactorResults, latestPrevious.factor_results)
      : null

  return (
    <AppCard variant="panelElevated" padding={18} style={styles.historyPanel}>
      <AppSectionHeader title={t.title} subtitle={t.subtitle} />

      {loading ? <AppNotice tone="info" message={t.loading} /> : null}
      {!loading && error ? <AppNotice tone="danger" message={t.loadFailed} /> : null}
      {!loading && !error && previousItems.length === 0 ? (
        <AppNotice tone="info" message={t.none} />
      ) : null}

      {!loading && !error && totalDelta ? (
        <View>
          <Text style={styles.historyRowTitle}>{t.sinceLatest}</Text>
          <View style={styles.historyDeltaRow}>
            <View style={styles.historyDeltaPill}>
              <Text style={styles.historyDeltaPillText}>{ph.delta.total(totalDelta.total)}</Text>
            </View>
            <View style={styles.historyDeltaPill}>
              <Text style={styles.historyDeltaPillText}>
                {ph.delta.stand(totalDelta.standAndManagement)}
              </Text>
            </View>
            <View style={styles.historyDeltaPill}>
              <Text style={styles.historyDeltaPillText}>
                {ph.delta.context(totalDelta.context)}
              </Text>
            </View>
            {factorDeltas
              ? FACTOR_KEYS.filter((factor) => typeof factorDeltas[factor] === "number").map(
                  (factor) => (
                    <View key={factor} style={styles.historyDeltaPill}>
                      <Text style={styles.historyDeltaPillText}>
                        {t.factorDelta(
                          factor,
                          factorDeltas[factor]! > 0
                            ? `+${factorDeltas[factor]}`
                            : String(factorDeltas[factor]),
                        )}
                      </Text>
                    </View>
                  ),
                )
              : null}
          </View>
        </View>
      ) : null}

      {!loading && !error && previousItems.length > 0
        ? previousItems.map((item) => (
            <HistoryRow key={item.survey_id} item={item} styles={styles} />
          ))
        : null}
    </AppCard>
  )
}
