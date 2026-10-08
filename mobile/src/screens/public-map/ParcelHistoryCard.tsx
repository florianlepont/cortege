import { memo, useMemo, useState } from "react"
import { View } from "react-native"
import { computeIbpTotalDelta } from "../../app/ibp-scoring"
import { useBrandTheme } from "../../app/theme"
import type { ParcelSurveyHistoryItem } from "../../app/types"
import { useParcelSurveyHistory } from "../../hooks/useParcelSurveyHistory"
import { fr } from "../../i18n"
import { AppNotice } from "../../ui/AppNotice"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { AppText as Text } from "../../ui/AppText"
import { GlassButton } from "../../ui/GlassButton"
import { ScoreRing } from "../../ui/ScoreRing"
import { createRowStyles } from "../survey-list/row-styles"
import { SurveyRowFrame } from "../survey-list/SurveyRowFrame"
import { PanelRowEntrance } from "./PanelRowEntrance"
import { SheetCloseButton } from "./SheetCloseButton"
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

// 12.2-18: a survey row of Mes Relevés (`SurveyRowFrame`: glass card, 44 pt minimum, green wave on
// press), the entry as the title, the total and the change under it, the ring on the trailing side
// (D-27a). No photo.
function HistoryRow({
  item,
  previous,
  index,
  isLatest,
  onOpen,
}: {
  item: ParcelSurveyHistoryItem
  previous: ParcelSurveyHistoryItem | null
  index: number
  isLatest: boolean
  onOpen: (surveyId: string) => void
}) {
  const theme = useBrandTheme()
  const rowStyles = useMemo(() => createRowStyles(theme), [theme])
  const delta = previous ? computeIbpTotalDelta(item.scores, previous.scores) : null
  const total = item.scores.ibp_total

  const entry = t.entry({ year: item.observation_year, version: item.version_number, isLatest })

  return (
    <SurveyRowFrame
      onPress={() => onOpen(item.survey_id)}
      accessibilityLabel={t.openSurvey(entry)}
      testID={`parcel-history-open-${item.survey_id}`}
      indicator={
        <ScoreRing score={total} index={index} animationKey={`${item.survey_id}:${total}`} />
      }
      title={entry}
      status={
        <>
          <Text style={rowStyles.surveyCardMeta}>{t.total(total)}</Text>
          <Text style={rowStyles.surveyCardMeta}>
            {delta ? t.delta.total(delta.total) : t.delta.unavailable}
          </Text>
        </>
      }
    />
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
          <SheetCloseButton
            accessibilityLabel={fr.publicMap.a11y.closeParcelHistory}
            onPress={onClose}
          />
        }
        titleStyle={styles.title}
      />
      {loading ? <AppNotice tone="info" message={t.loading} /> : null}
      {!loading && error ? <AppNotice tone="danger" message={t.loadFailed} /> : null}
      {offline ? (
        <View style={styles.card}>
          <AppNotice
            tone="warning"
            title={missingT.title}
            message={queued ? missingT.queued : missingT.message}
          />
          {!queued ? (
            <GlassButton label={missingT.downloadAction} size="md" onPress={handleQueueDownload} />
          ) : null}
        </View>
      ) : null}
      {!loading && !error && !offline && items.length === 0 ? (
        <AppNotice tone="info" message={t.empty} />
      ) : null}
      {!loading && !error && !offline && items.length > 0 ? (
        <View style={styles.rows}>
          {items.map((item, index) => (
            <PanelRowEntrance key={item.survey_id} index={index}>
              <HistoryRow
                item={item}
                previous={index > 0 ? items[index - 1] : null}
                index={index}
                isLatest={index === items.length - 1}
                onOpen={onOpenSurvey}
              />
            </PanelRowEntrance>
          ))}
        </View>
      ) : null}
    </View>
  )
})
