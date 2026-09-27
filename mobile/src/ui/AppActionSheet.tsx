import { Modal, Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  brandColors,
  brandFontScaleCaps,
  brandRadius,
  brandShadow,
  brandSpacing,
  brandTypography,
} from "../app/brand-tokens"

export type AppActionSheetOption = {
  label: string
  destructive?: boolean
  onPress: () => void
}

type AppActionSheetProps = {
  visible: boolean
  onClose: () => void
  title?: string
  options: AppActionSheetOption[]
  cancelLabel: string
}

/**
 * DET-03/04: a native-style action sheet (Modal, slides up, backdrop dismiss) for a screen's "…"
 * menu — no extra native dependency, since a plain RN Modal already covers the gesture and looks
 * the part on both platforms. Every option closes the sheet before running, so a caller never has
 * to remember to.
 */
export function AppActionSheet({
  visible,
  onClose,
  title,
  options,
  cancelLabel,
}: AppActionSheetProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessible={false} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, brandSpacing.md) }]}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {options.map((option) => (
          <Pressable
            key={option.label}
            style={styles.row}
            onPress={() => {
              onClose()
              option.onPress()
            }}
            accessibilityRole="button"
            accessibilityLabel={option.label}
          >
            <Text
              style={[styles.rowLabel, option.destructive ? styles.rowLabelDestructive : null]}
              maxFontSizeMultiplier={brandFontScaleCaps.body}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.cancelRow}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        >
          <Text style={styles.cancelLabel} maxFontSizeMultiplier={brandFontScaleCaps.body}>
            {cancelLabel}
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 22, 12, 0.4)",
  },
  sheet: {
    backgroundColor: brandColors.panel,
    borderTopLeftRadius: brandRadius.panel,
    borderTopRightRadius: brandRadius.panel,
    paddingHorizontal: brandSpacing.lg,
    paddingTop: brandSpacing.md,
    gap: 2,
    ...brandShadow.card,
  },
  title: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
    textAlign: "center",
    paddingBottom: brandSpacing.sm,
  },
  row: {
    minHeight: 50,
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: brandColors.divider,
  },
  rowLabel: {
    ...brandTypography.input,
    color: brandColors.forest,
    textAlign: "center",
  },
  rowLabelDestructive: {
    color: brandColors.terracotta,
  },
  cancelRow: {
    minHeight: 50,
    justifyContent: "center",
    marginTop: brandSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: brandColors.divider,
  },
  cancelLabel: {
    ...brandTypography.input,
    color: brandColors.textSecondary,
    textAlign: "center",
  },
})
