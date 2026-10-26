import { useMemo } from "react"
import { ScrollView, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { ExportMode } from "../../app/survey-pdf-export"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppPressable } from "../../ui/AppPressable"
import { AppText as Text } from "../../ui/AppText"
import { GlassButton } from "../../ui/GlassButton"
import { createExportChoiceStyles } from "./export-choice.styles"
import { ExportModePicker } from "./ExportModePicker"

const t = fr.surveyExportChoice

type ExportChoiceSheetProps = {
  siteName: string
  mode: ExportMode
  isDraft: boolean
  completePages: number
  onSelect: (next: ExportMode) => void
  onConfirm: () => void
  onClose: () => void
}

/**
 * Phase 33, D-05, D-09 and D-14: the export choice. The content of the `surveyExportChoice` route,
 * presented by the stack as a native form sheet on iOS and as a modal on Android. One scroll view
 * holds everything, the button included, as in the finish sheet. The selection comes from
 * `useExportChoice`; this component only draws it. It never exports and never opens the share
 * sheet: "Exporter le PDF" hands the chosen mode to the caller.
 *
 * D-20: 24 of room on the sides and above the title. D-21: no secondary "Annuler" button; a small
 * close cross beside the title closes the sheet on both platforms (the Android modal has no swipe;
 * on iOS it serves VoiceOver, U-17). Closing never exports.
 */
export function ExportChoiceSheet({
  siteName,
  mode,
  isDraft,
  completePages,
  onSelect,
  onConfirm,
  onClose,
}: ExportChoiceSheetProps) {
  const theme = useBrandTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createExportChoiceStyles(theme, insets), [theme, insets])

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t.title}
        </Text>
        <AppPressable
          style={styles.close}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.closeA11y}
          testID="export-choice-close"
        >
          <Ionicons name="close-outline" size={20} color={theme.semanticColors.textStrong} />
        </AppPressable>
      </View>
      <View style={styles.picker}>
        <ExportModePicker
          mode={mode}
          onChange={onSelect}
          isDraft={isDraft}
          completePages={completePages}
          styles={styles}
        />
      </View>
      <View accessibilityLiveRegion="polite">
        {isDraft ? (
          <View style={styles.draftNote}>
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={theme.colors.textSecondary}
              accessible={false}
              importantForAccessibility="no"
            />
            <Text style={styles.draftText}>{t.summaryDraft}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.buttons}>
        <GlassButton
          variant="primary"
          size="lg"
          label={t.confirm}
          accessibilityLabel={
            mode === "summary"
              ? t.confirmA11y.summary({ name: siteName })
              : t.confirmA11y.complete({ name: siteName })
          }
          onPress={onConfirm}
          testID="export-choice-confirm"
        />
      </View>
    </ScrollView>
  )
}
