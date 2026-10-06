import { useMemo, useState } from "react"
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import Constants from "expo-constants"
import { useHeaderHeight } from "@react-navigation/elements"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandSpacing } from "../app/brand-tokens"
import { shouldShowDevTools } from "../app/dev-tools"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import { formatAreaMegabytes } from "../app/formatters"
import { BrandTheme, BrandThemeMode, useBrandTheme } from "../app/theme"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import type { OfflineAreasSummary } from "../hooks/useOfflineAreasSummary"
import { AppButton } from "../ui/AppButton"
import { AppChoiceChip } from "../ui/AppChoiceChip"
import { AppCollapsibleSection } from "../ui/AppCollapsibleSection"
import { AppField } from "../ui/AppField"
import { AppGroupedList, type AppGroupedListSection } from "../ui/AppGroupedList"
import { fr } from "../i18n"
import { createPageTitleStyles } from "./account/styles"

const t = fr.settings
const actions = fr.common.actions

const THEME_MODE_CHOICES: Array<{ mode: BrandThemeMode; label: string }> = [
  { mode: "automatic", label: t.appearance.automatic },
  { mode: "light", label: t.appearance.light },
  { mode: "dark", label: t.appearance.dark },
]

type SettingsScreenProps = {
  apiUrl: string
  onApiUrlChange: (value: string) => void
  /** The zones downloaded for offline maps, summed up for the "Cartes" row. */
  offlineAreas: OfflineAreasSummary
  onOpenOfflineAreas: () => void
  onDeleteAccount: () => Promise<void>
  onDebugResetIbpData: () => Promise<void>
  onDebugResetUserData: () => Promise<void>
}

/**
 * Paramètres (OA-78, OA-79): the appearance, the offline maps, the about block and, last, the
 * account deletion, as one grouped list. The sync tools are gone (sync is automatic, OA-78) and
 * the status line is gone too: a message appears where its action happened (OA-77).
 */
export function SettingsScreen({
  apiUrl,
  onApiUrlChange,
  offlineAreas,
  onOpenOfflineAreas,
  onDeleteAccount,
  onDebugResetIbpData,
  onDebugResetUserData,
}: SettingsScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const titleStyles = useMemo(() => createPageTitleStyles(theme), [theme])
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight(Platform.select({ ios: 84, default: 68 }) ?? 68)
  const topContentPadding = Platform.OS === "ios" ? headerHeight + brandSpacing.md : brandSpacing.md
  const bottomContentPadding = Math.max(tabBarHeight, insets.bottom) + brandSpacing.md

  const [deleteLoading, setDeleteLoading] = useState(false)

  // The confirmation itself lives in onDeleteAccount (sessionActions.handleDeleteAccount): a
  // second dialog here would double-confirm with a different copy (BUG-05).
  const confirmDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await onDeleteAccount()
    } finally {
      setDeleteLoading(false)
    }
  }

  const confirmDebugResetIbpData = () => {
    Alert.alert(t.alerts.resetIbpData.title, t.alerts.resetIbpData.message, [
      { text: actions.cancel, style: "cancel" },
      { text: t.alerts.empty, style: "destructive", onPress: () => void onDebugResetIbpData() },
    ])
  }

  const confirmDebugResetUserData = () => {
    Alert.alert(t.alerts.resetUserData.title, t.alerts.resetUserData.message, [
      { text: actions.cancel, style: "cancel" },
      { text: t.alerts.empty, style: "destructive", onPress: () => void onDebugResetUserData() },
    ])
  }

  // ADR-002 CC-BY-4.0 obligation (Phase 6): credit the GBIF-sourced training images.
  const showCredits = () => {
    const texts = fr.account.credits
    Alert.alert(texts.alertTitle, texts.alertMessage)
  }

  const sections: AppGroupedListSection[] = [
    {
      key: "appearance",
      title: t.appearance.title,
      rows: [
        {
          key: "appearance",
          kind: "custom",
          content: (
            <View style={styles.appearanceRow}>
              {THEME_MODE_CHOICES.map(({ mode, label }) => (
                <AppChoiceChip
                  key={mode}
                  label={label}
                  active={theme.mode === mode}
                  onPress={() => theme.setMode(mode)}
                  style={styles.appearanceChip}
                />
              ))}
            </View>
          ),
        },
      ],
    },
    ...(isOfflineMapsEnabled()
      ? [
          {
            key: "maps",
            title: t.maps.title,
            rows: [
              {
                key: "offline-areas",
                label: t.maps.offlineRow,
                value:
                  offlineAreas.count > 0
                    ? t.maps.offlineSummary({
                        count: offlineAreas.count,
                        megabytes: formatAreaMegabytes(offlineAreas.bytes),
                      })
                    : t.maps.offlineNone,
                onPress: onOpenOfflineAreas,
              },
            ],
          },
        ]
      : []),
    {
      key: "about",
      title: t.about.title,
      rows: [
        {
          key: "version",
          label: t.about.version,
          value: Constants.expoConfig?.version ?? t.about.versionUnknown,
        },
        { key: "credits", label: t.about.credits, onPress: showCredits },
      ],
    },
    {
      key: "delete",
      footer: t.account.deleteWarning,
      rows: [
        {
          key: "delete-account",
          label: t.account.deleteButton,
          destructive: true,
          centered: true,
          loading: deleteLoading,
          onPress: () => void confirmDeleteAccount(),
        },
      ],
    },
  ]

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topContentPadding,
          paddingBottom: bottomContentPadding,
          paddingHorizontal: brandSpacing.md,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      scrollIndicatorInsets={{
        top: Platform.OS === "ios" ? headerHeight : 0,
        bottom: tabBarHeight,
      }}
    >
      <Text style={titleStyles.pageTitle} accessibilityRole="header">
        {t.title}
      </Text>

      <AppGroupedList sections={sections} />

      {/* Outils développeur (repliés par défaut, builds de développement seulement) */}
      {shouldShowDevTools() ? (
        <AppCollapsibleSection title={t.devTools.title} badge={t.devTools.badge}>
          <AppField
            label={t.devTools.apiUrl}
            value={apiUrl}
            onChangeText={onApiUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AppButton
            label={t.devTools.resetIbpData}
            variant="dangerSoft"
            leadingIcon="bug-outline"
            onPress={confirmDebugResetIbpData}
          />
          <AppButton
            label={t.devTools.resetUserData}
            variant="dangerSoft"
            leadingIcon="bug-outline"
            onPress={confirmDebugResetUserData}
          />
        </AppCollapsibleSection>
      ) : null}
    </ScrollView>
  )
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    content: {
      gap: brandSpacing.md,
    },
    appearanceRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing.xs,
      paddingVertical: brandSpacing.sm,
    },
    appearanceChip: {
      flexGrow: 1,
    },
  })
}
