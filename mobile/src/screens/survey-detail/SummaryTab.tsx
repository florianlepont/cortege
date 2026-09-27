import { ReactNode } from "react"
import { View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { formatDateTime } from "../../app/formatters"
import { fr } from "../../i18n"
import { LocalSurvey } from "../../storage"
import { AppCard } from "../../ui/AppCard"
import { AppNotice } from "../../ui/AppNotice"
import { styles as sharedStyles } from "./styles"
import { styles } from "./summary.styles"

const t = fr.surveyDetail.summary

type SummaryTabProps = {
  survey: LocalSurvey
  remainingTime: string
  submissionDeadline: string | null
  isDraftNearDeadline: boolean
  // The method and station context card (ScoringContextEditor, plan 01.8-14).
  contextCard: ReactNode
  // The factor tiles and the actions card, rendered after the context card.
  children: ReactNode
}

export function SummaryTab({
  survey,
  remainingTime,
  submissionDeadline,
  isDraftNearDeadline,
  contextCard,
  children,
}: SummaryTabProps) {
  return (
    <View style={sharedStyles.detailSection}>
      {survey.status === "submitted" ? (
        <AppNotice
          tone="success"
          icon="checkmark-done-circle-outline"
          title={t.submittedTitle}
          message={t.submittedMessage}
          style={styles.submittedReadonlyBanner}
        />
      ) : null}

      {survey.status !== "submitted" ? (
        <AppCard
          variant="panelElevated"
          padding={18}
          style={[styles.deadlineCard, isDraftNearDeadline ? styles.deadlineCardWarning : null]}
        >
          <Text style={styles.deadlineLabel}>{t.windowLabel}</Text>
          <Text
            style={[styles.deadlineValue, isDraftNearDeadline ? styles.deadlineValueWarning : null]}
          >
            {remainingTime}
          </Text>
          <Text style={sharedStyles.rowMeta}>{t.deadline(formatDateTime(submissionDeadline))}</Text>
          {isDraftNearDeadline ? (
            <Text style={sharedStyles.warningText}>{t.nearDeadline}</Text>
          ) : null}
        </AppCard>
      ) : null}

      {contextCard}

      {children}
    </View>
  )
}
