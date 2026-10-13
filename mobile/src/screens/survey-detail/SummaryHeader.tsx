import { useEffect, useMemo, useState } from "react"
import { Alert, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppField } from "../../ui/AppField"
import { AppText as Text } from "../../ui/AppText"
import { useFrameLargeTitle } from "../../ui/frame-large-title"
import { type StatusLine } from "./summary-state"
import { type VisibilityLine } from "./visibility-line"
import { createSummaryScreenStyles } from "./summary-screen.styles"
import { AppPressable } from "../../ui/AppPressable"

const h = fr.surveyDetail.header
const a11y = fr.surveyDetail.a11y
const alerts = fr.surveyDetail.alerts

type SummaryHeaderProps = {
  surveyId: string
  siteName: string
  canEdit: boolean
  statusLine: StatusLine
  /** Read-only: who can read the survey (D-15). Absent: no line (every other screen). */
  visibilityLine?: VisibilityLine | null
  onRenameSurvey: (surveyId: string, nextSiteName: string) => Promise<void> | void
}

/**
 * The title block of the summary: the survey's name, tapped to rename it (OA-50, OA-95), and one
 * line in words saying where the survey stands (OA-37). Phase 29 adds, under it, the read-only
 * line saying who can read the survey (not pressable: the choice is made in the finish sheet).
 *
 * 12.2-17: under the native iOS large title the header shows the name (and keeps it on screen while
 * the page scrolls), so only the status line is drawn here; renaming is in the header's "…" menu.
 */
export function SummaryHeader({
  surveyId,
  siteName,
  canEdit,
  statusLine,
  visibilityLine,
  onRenameSurvey,
}: SummaryHeaderProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const headerStyles = useMemo(() => createHeaderStyles(theme), [theme])
  const nativeTitle = useFrameLargeTitle()
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(siteName)

  useEffect(() => {
    setIsRenaming(false)
    setNameInput(siteName)
  }, [surveyId, siteName])

  const save = (): void => {
    const nextName = nameInput.trim()
    if (!nextName) {
      Alert.alert(alerts.invalidNameTitle, alerts.invalidNameMessage)
      return
    }
    void onRenameSurvey(surveyId, nextName)
    setIsRenaming(false)
  }

  const dotColor =
    statusLine.syncTone === "ok"
      ? theme.semanticColors.accent
      : statusLine.syncTone === "danger"
        ? theme.semanticColors.ctaDanger
        : theme.colors.ochre

  return (
    <View style={styles.titleBlock}>
      {isRenaming ? (
        <View style={styles.renameRow}>
          <AppField
            label={h.renameLabel}
            value={nameInput}
            onChangeText={setNameInput}
            autoFocus
            placeholder={h.renamePlaceholder}
          />
          <View style={styles.renameActions}>
            <AppButton label={fr.common.actions.save} size="sm" onPress={save} />
            <AppButton
              label={fr.common.actions.cancel}
              variant="secondary"
              size="sm"
              onPress={() => {
                setIsRenaming(false)
                setNameInput(siteName)
              }}
            />
          </View>
        </View>
      ) : nativeTitle ? null : (
        <View style={styles.titleRow}>
          {canEdit ? (
            // The title is the control (OA-95): a tap edits it, no pencil.
            <AppPressable
              onPress={() => setIsRenaming(true)}
              accessibilityRole="button"
              accessibilityLabel={a11y.renameSurvey(siteName)}
              style={styles.titlePressable}
            >
              <Text style={headerStyles.title}>{siteName}</Text>
            </AppPressable>
          ) : (
            <Text style={headerStyles.title} accessibilityRole="header">
              {siteName}
            </Text>
          )}
        </View>
      )}
      <View style={styles.statusLine}>
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        <Text style={headerStyles.statusStrong}>{statusLine.status}</Text>
        {statusLine.sync ? (
          <Text style={headerStyles.statusMuted}>{h.syncSuffix(statusLine.sync)}</Text>
        ) : null}
      </View>
      {visibilityLine ? (
        <View
          style={headerStyles.visibilityLine}
          accessible
          accessibilityRole="text"
          accessibilityLabel={visibilityLine.accessibilityLabel}
          testID="summary-visibility-line"
        >
          <Ionicons
            name={visibilityLine.icon}
            size={14}
            color={theme.colors.textSecondary}
            accessible={false}
            importantForAccessibility="no"
          />
          <Text style={headerStyles.visibilityText}>{visibilityLine.text}</Text>
        </View>
      ) : null}
    </View>
  )
}

function createHeaderStyles(theme: BrandTheme) {
  return StyleSheet.create({
    title: {
      flex: 1,
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    statusStrong: {
      ...brandTypeScale.footnote,
      fontFamily: brandTypography.meta.fontFamily,
      color: theme.colors.textSecondary,
    },
    // The title block spaces its children by 8; the line sits 4 under the status line.
    visibilityLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      marginTop: -brandSpacing4.xs,
    },
    visibilityText: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    statusMuted: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
  })
}
