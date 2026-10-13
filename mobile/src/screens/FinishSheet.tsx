import { useMemo } from "react"
import { ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SurveyVisibility } from "@cortege/ibp-domain"
import { useBrandTheme } from "../app/theme"
import { visibilityLabel } from "../app/visibility-display"
import { fr } from "../i18n"
import { AppNotice } from "../ui/AppNotice"
import { AppText as Text } from "../ui/AppText"
import { GlassButton } from "../ui/GlassButton"
import { VisibilityPicker } from "../ui/VisibilityPicker"
import { FinishOutcomeNotice } from "./finish-sheet/FinishOutcomeNotice"
import { createFinishSheetStyles } from "./finish-sheet/finish-sheet.styles"
import type { FinishSheetPhase } from "./finish-sheet/useFinishSheet"

const t = fr.surveyFinish

type FinishSheetProps = {
  siteName: string
  choice: SurveyVisibility
  phase: FinishSheetPhase
  /** Keys the outcome notice: a new finish that did not submit reads the status message again. */
  outcomeKey: number
  offline: boolean
  onSelect: (next: SurveyVisibility) => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Phase 29, D-04, D-05 and D-07: the submission step. The content of the `surveyFinish` route,
 * presented by the stack as a native form sheet on iOS and as a modal on Android
 * (`finishSheetScreenOptions`). One scroll view holds everything, the buttons included, as in the
 * factor help sheet (a header outside it was drawn under scrolled text inside the native sheet).
 * The phase comes from `useFinishSheet`; this component only draws it. At most one notice at a
 * time, by priority: frozen, save error, finish not completed, offline.
 */
export function FinishSheet({
  siteName,
  choice,
  phase,
  outcomeKey,
  offline,
  onSelect,
  onConfirm,
  onCancel,
}: FinishSheetProps) {
  const theme = useBrandTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createFinishSheetStyles(theme, insets), [theme, insets])
  const frozen = phase === "frozen"
  const submitting = phase === "submitting"
  const choiceLabel = visibilityLabel(choice)

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
    >
      <Text style={styles.title} accessibilityRole="header">
        {t.title}
      </Text>
      <View style={styles.picker}>
        <VisibilityPicker value={choice} onChange={onSelect} disabled={submitting || frozen} />
      </View>
      {frozen ? null : <Text style={styles.footnote}>{t.footnote}</Text>}
      <View accessibilityLiveRegion="polite">
        {frozen ? (
          <AppNotice
            tone="info"
            icon="lock-closed-outline"
            message={t.errors.frozen}
            style={styles.notice}
          />
        ) : phase === "saveError" ? (
          <AppNotice
            tone="danger"
            icon="alert-circle-outline"
            message={t.errors.saveFailed}
            style={styles.notice}
          />
        ) : phase === "notFinished" ? (
          <FinishOutcomeNotice key={outcomeKey} style={styles.notice} />
        ) : offline ? (
          <AppNotice
            tone="warning"
            icon="cloud-offline-outline"
            message={t.offline}
            style={styles.notice}
          />
        ) : null}
      </View>
      <View style={styles.buttons}>
        {frozen ? (
          <GlassButton variant="secondary" size="md" label={t.close} onPress={onCancel} />
        ) : (
          <>
            <GlassButton
              variant="primary"
              size="lg"
              label={offline ? t.confirmOffline : t.confirm}
              accessibilityLabel={
                offline
                  ? t.confirmOfflineA11y({ choice: choiceLabel })
                  : t.confirmA11y({ name: siteName, choice: choiceLabel })
              }
              loading={submitting}
              onPress={onConfirm}
              testID="finish-sheet-confirm"
            />
            <GlassButton
              variant="secondary"
              size="md"
              label={t.cancel}
              disabled={submitting}
              onPress={onCancel}
              testID="finish-sheet-cancel"
            />
          </>
        )}
      </View>
    </ScrollView>
  )
}
