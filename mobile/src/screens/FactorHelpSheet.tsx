import { useMemo } from "react"
import { Modal, Pressable, ScrollView, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppText as Text } from "../ui/AppText"
import { createDetailStyles } from "./factor-detail.styles"
import { AppPressable } from "../ui/AppPressable"

const t = fr.factorDetail

type FactorHelpSheetProps = {
  visible: boolean
  onClose: () => void
  help: string
  hints: readonly string[]
}

/**
 * The factor's help, opened from "Que relever ?" (OA-30): what the factor counts, then the field
 * reminders. A bottom sheet over the screen, closed by its button or a tap outside.
 */
export function FactorHelpSheet({ visible, onClose, help, hints }: FactorHelpSheetProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createDetailStyles(theme), [theme])
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel={t.helpClose}>
        <Pressable style={styles.sheet} onPress={() => undefined} accessible={false}>
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
        </Pressable>
      </Pressable>
    </Modal>
  )
}
