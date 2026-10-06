import { useMemo } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { Ionicons } from "@expo/vector-icons"
import { formatShortDateTime } from "../../app/formatters"
import { SurveyEventItem } from "../../app/types"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { SkeletonRow } from "../../ui/Skeleton"
import { eventTypeLabel } from "./event-labels"
import { eventVisual, type EventTone } from "./event-icons"
import { createDetailStyles } from "./styles"
import { createTabsStyles } from "./tabs.styles"

type EventsTabProps = {
  events: SurveyEventItem[]
  isLoading: boolean
}

const t = fr.surveyDetail.events

const SKELETON_ROW_COUNT = 3

function toneColors(theme: BrandTheme, tone: EventTone): { background: string; icon: string } {
  switch (tone) {
    case "success":
      return { background: theme.colors.successSoft, icon: theme.colors.forest }
    case "warning":
      return { background: theme.colors.warningSoft, icon: theme.onSurface.warning }
    case "danger":
      return { background: theme.colors.errorSoft, icon: theme.onSurface.danger }
    case "neutral":
    default:
      return { background: theme.colors.panelMuted, icon: theme.colors.textSecondary }
  }
}

/**
 * DET-05 (UX audit, Phase 12): the survey's history as an icon timeline — one dot per event,
 * connected by a rail — instead of plain text rows. Raw payloads and ids stay in the dev-only
 * DebugTab (D-06). Pull-to-refresh lives on the screen's own ScrollView (SurveyDetailScreen),
 * active only while this tab is selected; a loading skeleton covers the first load only, not a
 * pull-to-refresh of an already-loaded list (the RefreshControl spinner covers that case).
 */
export function EventsTab({ events, isLoading }: EventsTabProps) {
  const theme = useBrandTheme()
  const sharedStyles = useMemo(() => createDetailStyles(theme), [theme])
  const styles = useMemo(() => createTabsStyles(theme), [theme])
  const showSkeleton = isLoading && events.length === 0
  const showEmpty = !isLoading && events.length === 0

  return (
    <View style={sharedStyles.detailSection}>
      <AppCard variant="panelElevated" padding={18} style={styles.eventsCard}>
        <AppSectionHeader title={t.title} subtitle={t.subtitle} />
        {showSkeleton
          ? Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <SkeletonRow key={`events-skeleton-${index}`} />
            ))
          : null}
        {showEmpty ? <Text style={sharedStyles.rowMeta}>{t.empty}</Text> : null}
        {!showSkeleton && events.length > 0 ? (
          <View>
            {events.map((event, index) => {
              const visual = eventVisual(event.event_type)
              const colors = toneColors(theme, visual.tone)
              const isLast = index === events.length - 1
              return (
                <View key={event.id} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.background }]}>
                      <Ionicons name={visual.icon} size={14} color={colors.icon} />
                    </View>
                    {!isLast ? <View style={styles.timelineConnector} /> : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.eventTitle}>{eventTypeLabel(event.event_type)}</Text>
                    <Text style={sharedStyles.rowMeta}>
                      {formatShortDateTime(event.created_at)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        ) : null}
      </AppCard>
    </View>
  )
}
