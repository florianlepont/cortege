import { useEffect, useMemo, useRef } from "react"
import { ActionSheetIOS, Modal, Platform, StyleSheet, View } from "react-native"
import { AppText as Text } from "./AppText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  brandFontScaleCaps,
  brandOverlayTokens,
  brandRadius,
  brandShadow,
  brandSpacing,
  brandSpacing4,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppPressable } from "./AppPressable"

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
 * DET-03/04: the action sheet of a screen's "…" menu. On iOS it is the system sheet
 * (`ActionSheetIOS`, as the photo sheet of `IdentityCard`): drawn by iOS, with its own cancel
 * button, and destructive options in red. Android has no such system sheet, so it keeps a custom
 * one (Modal, slides up, backdrop dismiss). Same props on both: every option closes the sheet
 * before running, so a caller never has to remember to.
 */
export function AppActionSheet({
  visible,
  onClose,
  title,
  options,
  cancelLabel,
}: AppActionSheetProps) {
  const insets = useSafeAreaInsets()
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const isIos = Platform.OS === "ios"
  // The system sheet is shown by an effect when `visible` turns true; the latest props are read
  // through a ref so a re-render of the caller does not show it again.
  const latest = useRef({ onClose, options, title, cancelLabel })
  latest.current = { onClose, options, title, cancelLabel }

  useEffect(() => {
    if (!isIos || !visible) return
    const {
      onClose: close,
      options: items,
      title: sheetTitle,
      cancelLabel: cancel,
    } = latest.current
    const destructiveIndex = items.findIndex((option) => option.destructive)
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: sheetTitle,
        options: [...items.map((option) => option.label), cancel],
        cancelButtonIndex: items.length,
        destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
      },
      (buttonIndex) => {
        close()
        if (buttonIndex < items.length) items[buttonIndex].onPress()
      },
    )
  }, [isIos, visible])

  if (isIos) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <AppPressable
        style={styles.backdrop}
        onPress={onClose}
        accessible={false}
        accessibilityLabel={cancelLabel}
        disableScale
        disableRipple
      />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, brandSpacing.md) }]}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {options.map((option) => (
          <AppPressable
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
          </AppPressable>
        ))}
        <AppPressable
          style={styles.cancelRow}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        >
          <Text style={styles.cancelLabel} maxFontSizeMultiplier={brandFontScaleCaps.body}>
            {cancelLabel}
          </Text>
        </AppPressable>
      </View>
    </Modal>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: brandOverlayTokens.actionSheetScrim,
    },
    sheet: {
      backgroundColor: theme.colors.panel,
      borderTopLeftRadius: brandRadius.panel,
      borderTopRightRadius: brandRadius.panel,
      paddingHorizontal: brandSpacing.lg,
      paddingTop: brandSpacing.md,
      gap: brandSpacing4.xxs,
      ...brandShadow.card,
    },
    title: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      textAlign: "center",
      paddingBottom: brandSpacing.sm,
    },
    row: {
      minHeight: 50,
      justifyContent: "center",
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    rowLabel: {
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
      textAlign: "center",
    },
    rowLabelDestructive: {
      color: theme.colors.terracotta,
    },
    cancelRow: {
      minHeight: 50,
      justifyContent: "center",
      marginTop: brandSpacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    cancelLabel: {
      ...brandTypography.input,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
  })
}
