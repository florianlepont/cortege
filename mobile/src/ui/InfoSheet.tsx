import { Ionicons } from "@expo/vector-icons"
import { useMemo } from "react"
import { Modal, StyleSheet, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"
import { brandSpacing, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppPressable } from "./AppPressable"
import { AppText as Text } from "./AppText"

export type InfoSheetProps = {
  open: boolean
  /** The header of the sheet (the long form of an abbreviation, a word of the method). */
  title: string
  /** A small line above the body (the abbreviation itself). */
  eyebrow?: string
  body: string
  closeLabel: string
  onClose: () => void
  testID?: string
}

/**
 * The small native-looking sheet shared by `AbbreviationInfo` (D-04) and `GlossaryInfo` (phase 30,
 * spec section 3): a page sheet with a header, a close button and a short text. It is mounted only
 * while open, so a screen that renders many info controls mounts no Modal until one is pressed
 * (T-30-31), and it does not slide under Reduce Motion.
 */
export function InfoSheet({
  open,
  title,
  eyebrow,
  body,
  closeLabel,
  onClose,
  testID,
}: InfoSheetProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const reduced = useReducedMotion()

  if (!open) return null

  return (
    <Modal
      visible
      animationType={reduced ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet} testID={testID}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <AppPressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            hitSlop={10}
            disableScale
          >
            <Ionicons name="close-outline" size={24} color={theme.semanticColors.accent} />
          </AppPressable>
        </View>
        <View style={styles.body}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.explanation}>{body}</Text>
        </View>
      </View>
    </Modal>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    sheet: { flex: 1, backgroundColor: theme.colors.canvas },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
      paddingHorizontal: 20,
      paddingTop: brandSpacing.lg,
      paddingBottom: brandSpacing4.smd,
    },
    title: { ...brandTypography.sectionTitle, flex: 1, color: theme.semanticColors.textStrong },
    body: { paddingHorizontal: 20, paddingBottom: brandSpacing.xl, gap: brandSpacing4.sm },
    eyebrow: { ...brandTypography.meta, color: theme.colors.textSecondary },
    explanation: { ...brandTypography.sectionBody, color: theme.colors.textPrimary },
  })
}
