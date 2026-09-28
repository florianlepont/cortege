import { useMemo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { AppText as Text } from "../../ui/AppText"
import { useTabBarClearance } from "../../app/useAppBottomTabBarHeight"
import { brandColors, brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import { AppButton } from "../../ui/AppButton"
import { fr } from "../../i18n"
import type { AutosaveStatus } from "../../hooks/useEditingDraft"

const t = fr.surveyForm

function autosaveText(status: AutosaveStatus): { text: string; tone: "neutral" | "danger" } {
  if (status.state === "error") return { text: t.autosave.failed, tone: "danger" }
  if (status.state === "saving") return { text: t.autosave.saving, tone: "neutral" }
  if (status.savedAt) {
    const time = new Date(status.savedAt).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    return { text: t.autosave.saved({ time }), tone: "neutral" }
  }
  return { text: t.autosave.idle, tone: "neutral" }
}

type FixedActionBarProps = {
  primaryLabel: string
  onBack: () => void
  onPrimary: () => void
  autosaveStatus?: AutosaveStatus
}

/** FLOW-05/FLOW-07: a fixed bottom action bar (instead of a CTA at the end of a long scroll) that
 * also carries the visible autosave indicator, so "Enregistré · 14:32" replaces the implication
 * that a manual save is required. */
export function FixedActionBar({
  primaryLabel,
  onBack,
  onPrimary,
  autosaveStatus,
}: FixedActionBarProps) {
  const tabBarClearance = useTabBarClearance()
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const autosave = autosaveStatus ? autosaveText(autosaveStatus) : null

  return (
    <View style={[styles.container, { paddingBottom: tabBarClearance + brandSpacing4.sm }]}>
      {autosave ? (
        <Text
          style={[
            styles.autosaveText,
            autosave.tone === "danger" ? styles.autosaveTextDanger : null,
          ]}
        >
          {autosave.text}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.a11y.back}
          style={styles.secondaryButton}
          onPress={onBack}
        >
          <Text style={styles.secondaryButtonText}>{t.actions.back}</Text>
        </Pressable>
        <AppButton label={primaryLabel} style={styles.primaryButton} onPress={onPrimary} />
      </View>
    </View>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      paddingHorizontal: brandSpacing4.md,
      paddingTop: brandSpacing4.sm,
      gap: brandSpacing4.xs,
    },
    autosaveText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    autosaveTextDanger: {
      color: brandColors.terracotta,
    },
    row: {
      flexDirection: "row",
      gap: brandSpacing4.sm,
    },
    secondaryButton: {
      minHeight: 56,
      paddingHorizontal: brandSpacing4.lg,
      borderRadius: brandRadius.field,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.semanticColors.textStrong,
    },
    primaryButton: {
      flex: 1,
      minHeight: 56,
    },
  })
}
