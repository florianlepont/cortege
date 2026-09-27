import { useState } from "react"
import { Alert, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { exportAndShareSurveyPdf } from "../../app/survey-pdf-export"
import type { SurveyExportData } from "../../app/survey-pdf-export"
import { formatSyncErrorForUser } from "../../app/formatters"
import { fr, logStatusDetail } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { AppButton } from "../../ui/AppButton"
import { AppCard } from "../../ui/AppCard"
import { AppSectionHeader } from "../../ui/AppSectionHeader"
import { styles as sharedStyles } from "./styles"
import { styles } from "./summary.styles"

const t = fr.surveyDetail.actions

type DetailActionsProps = {
  survey: LocalSurvey
  exportData: SurveyExportData
  onDeleteSurvey: (surveyId: string) => void
  onRetrySurvey: (surveyId: string) => Promise<void>
  onDiscardSurvey: (surveyId: string) => Promise<void>
}

export function DetailActions({
  survey,
  exportData,
  onDeleteSurvey,
  onRetrySurvey,
  onDiscardSurvey,
}: DetailActionsProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  // The user-facing sync error text, keyed by code; the raw text and code stay in DebugTab.
  const syncErrorText = formatSyncErrorForUser(survey.last_sync_error, survey.last_sync_error_code)

  const handleExportPdf = async (): Promise<void> => {
    setIsExportingPdf(true)
    try {
      const { shared } = await exportAndShareSurveyPdf(exportData)
      if (!shared) {
        Alert.alert(t.exportPdf, t.exportShareUnavailable)
      }
    } catch (error) {
      logStatusDetail("surveyDetail.exportPdf", error)
      Alert.alert(t.exportPdf, t.exportFailed)
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <AppCard variant="panelElevated" padding={18} style={styles.actionPanel}>
      <AppSectionHeader title={t.title} subtitle={t.subtitle} />

      <View style={styles.actionButtonsRow}>
        <AppButton
          label={isExportingPdf ? t.exportingPdf : t.exportPdf}
          leadingIcon="share-outline"
          variant="secondary"
          loading={isExportingPdf}
          onPress={() => void handleExportPdf()}
        />
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
