import { ReactNode } from "react"
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native"
import { AppText as Text } from "./AppText"
import { Ionicons } from "@expo/vector-icons"
import { brandComponentTokens, brandTypography } from "../app/brand-tokens"

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
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={[styles.actionText, textTone]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  info: {
    borderColor: brandComponentTokens.notice.infoBorder,
    backgroundColor: brandComponentTokens.notice.infoBackground,
  },
  success: {
    borderColor: brandComponentTokens.notice.successBorder,
    backgroundColor: brandComponentTokens.notice.successBackground,
  },
  warning: {
    borderColor: brandComponentTokens.notice.warningBorder,
    backgroundColor: brandComponentTokens.notice.warningBackground,
  },
  danger: {
    borderColor: brandComponentTokens.notice.dangerBorder,
    backgroundColor: brandComponentTokens.notice.dangerBackground,
  },
  icon: {
    marginTop: 1,
    color: brandComponentTokens.notice.text,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...brandTypography.label,
    color: brandComponentTokens.notice.title,
  },
  message: {
    ...brandTypography.sectionBody,
    color: brandComponentTokens.notice.text,
  },
  messageSuccess: {
    color: brandComponentTokens.notice.successText,
  },
  messageWarning: {
    color: brandComponentTokens.notice.warningText,
  },
  messageDanger: {
    color: brandComponentTokens.notice.dangerText,
  },
  action: {
    alignSelf: "center",
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    ...brandTypography.label,
    color: brandComponentTokens.notice.title,
    textDecorationLine: "underline",
  },
})
