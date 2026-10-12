import { useMemo } from "react"
import { AppText as Text } from "../../ui/AppText"
import { formatSyncErrorForUser } from "../../app/formatters"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { AppCard } from "../../ui/AppCard"
import { AppNotice } from "../../ui/AppNotice"
import { OptionalEntrance } from "./OptionalEntrance"
import { createSummaryStyles } from "./summary.styles"

const t = fr.surveyDetail.actions

type DetailActionsProps = {
  survey: LocalSurvey
  onRetrySurvey: (surveyId: string) => Promise<void>
  onDiscardSurvey: (surveyId: string) => Promise<void>
  /** Slot of the notice in the summary's entrance stagger (D-46); no entrance without it. */
  entranceIndex?: number
}

/**
 * DET-04: the sync-error notice, "Réessayer" integrated as the notice's own action instead of a
 * separate equal-weight button. Export ("Partager") and "Supprimer" moved into the header's "…"
 * menu (DetailHeader, DET-03) — this renders nothing when there's no sync problem to report.
 */
export function DetailActions({
  survey,
  onRetrySurvey,
  onDiscardSurvey,
  entranceIndex,
}: DetailActionsProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryStyles(theme), [theme])
  const syncErrorText = formatSyncErrorForUser(survey.last_sync_error, survey.last_sync_error_code)
  if (!syncErrorText) {
    return null
  }

  const isFailed = survey.sync_state === "failed"

  return (
    <OptionalEntrance index={entranceIndex}>
      <AppCard variant="panelElevated" padding={18} style={styles.actionPanel}>
        <AppNotice
          tone="danger"
          icon="warning-outline"
          message={syncErrorText}
          action={
            isFailed
              ? { label: t.retryNow, onPress: () => void onRetrySurvey(survey.id) }
              : undefined
          }
        />
        {isFailed ? (
          <Text
            style={styles.discardLink}
            onPress={() => void onDiscardSurvey(survey.id)}
            accessibilityRole="button"
            accessibilityLabel={t.discardLocalChange}
          >
            {t.discardLocalChange}
          </Text>
        ) : null}
      </AppCard>
    </OptionalEntrance>
  )
}
