import { useMemo } from "react"
import { ScrollView, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppText as Text } from "../ui/AppText"
import { createDetailStyles } from "./factor-detail.styles"
import { AppPressable } from "../ui/AppPressable"

const t = fr.factorDetail

type FactorHelpSheetProps = {
  onClose: () => void
  help: string
  hints: readonly string[]
}

/**
 * The factor's help, opened from "Que relever ?" (OA-30): what the factor counts, then the field
 * reminders. The content of the `surveyFactorHelp` route, which the stack presents as a native
 * form sheet on iOS (system grabber, swipe down, tap outside) and as a modal screen on Android
 * (`factorHelpScreenOptions`); the close button is the way out where there is no grabber.
 */
export function FactorHelpSheet({ onClose, help, hints }: FactorHelpSheetProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDetailStyles(theme), [theme])
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle} accessibilityRole="header">
          {t.helpTitle}
        </Text>
        <AppPressable
          style={styles.sheetClose}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.helpClose}
        >
          <Ionicons name="close-outline" size={20} color={theme.semanticColors.textStrong} />
        </AppPressable>
      </View>
      <ScrollView>
        <View style={styles.hintsList}>
          <Text style={styles.sheetBody}>{help}</Text>
          {hints.map((hint) => (
            <View key={hint} style={styles.hintRow}>
              <View style={styles.hintDot} />
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
