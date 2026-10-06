import { memo, useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { computeIbpTotalDelta } from "../../app/ibp-scoring"
import { brandOverlayTokens } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import type { ParcelSurveyHistoryItem } from "../../app/types"
import { useParcelSurveyHistory } from "../../hooks/useParcelSurveyHistory"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppNotice } from "../../ui/AppNotice"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { createPanelStyles } from "./styles"

const t = fr.parcelHistory
const missingT = fr.offlineMap.parcelMissing

export type ParcelHistoryCardProps = {
  parcelId: string
  apiUrl: string
  accessToken: string | null
  /** REQ-D-offline-parcel-warning (08-CONTEXT D-14). */
  isOffline: boolean
  onQueueDownload: (parcelId: string) => void
  /** Opens the read-only page of one of the parcel's surveys (OA-59). */
  onOpenSurvey: (surveyId: string) => void
  onClose: () => void
}

function HistoryRow({
  item,
  previous,
  isLatest,
  onOpen,
}: {
  item: ParcelSurveyHistoryItem
  previous: ParcelSurveyHistoryItem | null
  isLatest: boolean
  onOpen: (surveyId: string) => void
}) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPanelStyles(theme), [theme])
  const delta = previous ? computeIbpTotalDelta(item.scores, previous.scores) : null

  const entry = t.entry({ year: item.observation_year, version: item.version_number, isLatest })

  return (
    <Pressable
      onPress={() => onOpen(item.survey_id)}
      accessibilityRole="button"
      accessibilityLabel={t.openSurvey(entry)}
      testID={`parcel-history-open-${item.survey_id}`}
    >
      <Text style={styles.title}>{entry}</Text>
      <Text style={styles.meta}>{t.total(item.scores.ibp_total)}</Text>
      <Text style={styles.meta}>{delta ? t.delta.total(delta.total) : t.delta.unavailable}</Text>
    </Pressable>
  )
}

/**
 * Previous submitted surveys of a tapped studied parcel (REQ-B-survey-detail, REQ-C-versioning,
 * ROADMAP Phase 2 criterion 6): opened from the Explorer map when a studied parcel polygon is
 * tapped, since the map does not carry a local copy of another member's survey to open its full
 * detail. Oldest entries first, as the API returns them, with each entry's IBP total delta
 * against the previous one. Shown in the Explorer tiered sheet (MAP-01).
 */
export const ParcelHistoryCard = memo(function ParcelHistoryCard({
  parcelId,
  apiUrl,
  accessToken,
  isOffline,
  onQueueDownload,
  onOpenSurvey,
  onClose,
}: ParcelHistoryCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPanelStyles(theme), [theme])
  const { items, loading, error, offline } = useParcelSurveyHistory(
    apiUrl,
    accessToken,
    parcelId,
    isOffline,
  )
  const [queued, setQueued] = useState(false)
  const handleQueueDownload = (): void => {
    onQueueDownload(parcelId)
    setQueued(true)
  }

  return (
    <View style={styles.card}>
      <AppSectionHeader
        title={t.title}
        trailing={
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={fr.publicMap.a11y.closeParcelHistory}
          >
            <Ionicons name="close" size={18} color={brandOverlayTokens.closeIcon} />
          </Pressable>
        }
        titleStyle={styles.title}
      />
      {loading ? <AppNotice tone="info" message={t.loading} /> : null}
      {!loading && error ? <AppNotice tone="danger" message={t.loadFailed} /> : null}
      {offline ? (
        <View>
          <AppNotice
            tone="warning"
            title={missingT.title}
            message={queued ? missingT.queued : missingT.message}
          />
          {!queued ? (
            <AppButton label={missingT.downloadAction} onPress={handleQueueDownload} />
          ) : null}
        </View>
      ) : null}
      {!loading && !error && !offline && items.length === 0 ? (
        <AppNotice tone="info" message={t.empty} />
      ) : null}
      {!loading && !error && !offline
        ? items.map((item, index) => (
            <HistoryRow
              key={item.survey_id}
              item={item}
              previous={index > 0 ? items[index - 1] : null}
              isLatest={index === items.length - 1}
              onOpen={onOpenSurvey}
            />
          ))
        : null}
    </View>
  )
})
