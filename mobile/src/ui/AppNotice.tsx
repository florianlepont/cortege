import { ReactNode, useMemo } from "react"
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandSpacing, brandSpacing4, brandTypography } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { AppPressable } from "./AppPressable"

type AppNoticeTone = "info" | "success" | "warning" | "danger"

export type AppNoticeAction = {
  label: string
  onPress: () => void
  accessibilityLabel?: string
}

type AppNoticeProps = {
  message: ReactNode
  title?: string
  tone?: AppNoticeTone
  icon?: keyof typeof Ionicons.glyphMap
  /** SYNC-03: an actionable notice ("Voir", "Réessayer") instead of a dead end. */
  action?: AppNoticeAction
  style?: StyleProp<ViewStyle>
  titleStyle?: StyleProp<TextStyle>
  messageStyle?: StyleProp<TextStyle>
}

export function AppNotice({
  message,
  title,
  tone = "info",
  icon,
  action,
  style,
  titleStyle,
  messageStyle,
}: AppNoticeProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const textTone =
    tone === "danger"
      ? styles.messageDanger
      : tone === "warning"
        ? styles.messageWarning
        : tone === "success"
          ? styles.messageSuccess
          : null

  return (
    <View style={[styles.base, styles[tone], style]}>
      {icon ? <Ionicons name={icon} size={18} style={[styles.icon, textTone]} /> : null}
      <View style={styles.copy}>
        {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}
        <Text style={[styles.message, textTone, messageStyle]}>{message}</Text>
      </View>
      {action ? (
        <AppPressable
          disableScale
          disableRipple
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={[styles.actionText, textTone]}>{action.label}</Text>
        </AppPressable>
      ) : null}
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.sm,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: brandSpacing4.smd,
    },
    info: {
      borderColor: theme.componentColors.notice.infoBorder,
      backgroundColor: theme.componentColors.notice.infoBackground,
    },
    success: {
      borderColor: theme.componentColors.notice.successBorder,
      backgroundColor: theme.componentColors.notice.successBackground,
    },
    warning: {
      borderColor: theme.componentColors.notice.warningBorder,
      backgroundColor: theme.componentColors.notice.warningBackground,
    },
    danger: {
      borderColor: theme.componentColors.notice.dangerBorder,
      backgroundColor: theme.componentColors.notice.dangerBackground,
    },
    icon: {
      marginTop: 1,
      color: theme.componentColors.notice.text,
    },
    copy: {
      flex: 1,
      gap: brandSpacing4.xxs,
    },
    title: {
      ...brandTypography.label,
      color: theme.componentColors.notice.title,
    },
    message: {
      ...brandTypography.sectionBody,
      color: theme.componentColors.notice.text,
    },
    messageSuccess: {
      color: theme.componentColors.notice.successText,
    },
    messageWarning: {
      color: theme.componentColors.notice.warningText,
    },
    messageDanger: {
      color: theme.componentColors.notice.dangerText,
    },
    action: {
      alignSelf: "center",
      minHeight: 32,
      justifyContent: "center",
      paddingHorizontal: brandSpacing.sm,
    },
    actionPressed: {
      opacity: 0.7,
    },
    actionText: {
      ...brandTypography.label,
      color: theme.componentColors.notice.title,
      textDecorationLine: "underline",
    },
  })
}
