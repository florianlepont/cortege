import { Text, View } from "react-native"
import { formatSyncErrorForUser } from "../../app/formatters"
import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { AppButton } from "../../ui/AppButton"
import { AppCard } from "../../ui/AppCard"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { styles as sharedStyles } from "./styles"
import { styles } from "./summary.styles"

const t = fr.surveyDetail.actions

type DetailActionsProps = {
  survey: LocalSurvey
  onDeleteSurvey: (surveyId: string) => void
  onRetrySurvey: (surveyId: string) => Promise<void>
  onDiscardSurvey: (surveyId: string) => Promise<void>
}

export function DetailActions({
  survey,
  onDeleteSurvey,
  onRetrySurvey,
  onDiscardSurvey,
}: DetailActionsProps) {
  // The user-facing sync error text, keyed by code; the raw text and code stay in DebugTab.
  const syncErrorText = formatSyncErrorForUser(survey.last_sync_error, survey.last_sync_error_code)

  return (
    <AppCard variant="panelElevated" padding={18} style={styles.actionPanel}>
      <AppSectionHeader title={t.title} subtitle={t.subtitle} />

      <View style={styles.actionButtonsRow}>
        <AppButton
          label={t.deleteSurvey}
          leadingIcon="trash-outline"
          variant="danger"
          onPress={() => onDeleteSurvey(survey.id)}
        />
      </View>

      {syncErrorText ? <Text style={sharedStyles.warningText}>{syncErrorText}</Text> : null}

      {survey.sync_state === "failed" ? (
        <View style={styles.actionButtonsRow}>
          <AppButton
            label={t.retryNow}
            leadingIcon="refresh-outline"
            onPress={() => void onRetrySurvey(survey.id)}
          />
          <AppButton
            label={t.discardLocalChange}
            leadingIcon="close-circle-outline"
            variant="danger"
            onPress={() => void onDiscardSurvey(survey.id)}
          />
        </View>
      ) : null}
    </AppCard>
  )
}
