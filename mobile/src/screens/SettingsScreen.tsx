import { useState } from "react"
import { Alert, Platform, ScrollView, StyleSheet } from "react-native"
import { PageTitle } from "../ui/PageTitle"
import Constants from "expo-constants"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandSpacing, brandSpacing4 } from "../app/brand-tokens"
import { shouldShowDevTools } from "../app/dev-tools"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import { formatAreaMegabytes } from "../app/formatters"
import { useAppBottomTabBarHeight } from "../app/useAppBottomTabBarHeight"
import type { OfflineAreasSummary } from "../hooks/useOfflineAreasSummary"
import { AppButton } from "../ui/AppButton"
import { AppCollapsibleSection } from "../ui/AppCollapsibleSection"
import { AppField } from "../ui/AppField"
import { AppGroupedList, type AppGroupedListSection } from "../ui/AppGroupedList"
import { useFrameLargeTitle } from "../ui/frame-large-title"
import { fr } from "../i18n"

const t = fr.settings
const actions = fr.common.actions

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
 * Paramètres (OA-78, OA-79): the offline maps, the about block and, last, the account deletion, as
 * one grouped list. The sync tools are gone (sync is automatic, OA-78) and the status line is gone
 * too: a message appears where its action happened (OA-77). There is no theme choice: the app
 * follows the system appearance (owner decision, 2026-10-08).
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
  const insets = useSafeAreaInsets()
  const tabBarHeight = useAppBottomTabBarHeight(Platform.select({ ios: 84, default: 68 }) ?? 68)
  // D-19: the route's ScreenFrame starts the page below the transparent header and clips there.
  // 12.2-17: under the native large title iOS insets the scroll view (header, tab bar) itself.
  const largeTitle = useFrameLargeTitle()
  const topContentPadding = brandSpacing.md
  const bottomContentPadding =
    (largeTitle ? 0 : Math.max(tabBarHeight, insets.bottom)) + brandSpacing.md

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
    ...(isOfflineMapsEnabled()
      ? ([
          {
            key: "maps",
            title: t.maps.title,
            rows: [
              {
                key: "offline-areas",
                icon: "cloud-download-outline",
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
        ] satisfies AppGroupedListSection[])
      : []),
    {
      key: "about",
      title: t.about.title,
      rows: [
        {
          key: "version",
          icon: "information-circle-outline",
          label: t.about.version,
          value: Constants.expoConfig?.version ?? t.about.versionUnknown,
        },
        {
          key: "credits",
          icon: "leaf-outline",
          label: t.about.credits,
          onPress: showCredits,
        },
      ],
    },
    {
      key: "delete",
      footer: t.account.deleteWarning,
      rows: [
        {
          key: "delete-account",
          icon: "trash-outline",
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
      contentInsetAdjustmentBehavior={largeTitle ? "automatic" : "never"}
      automaticallyAdjustContentInsets={false}
      scrollIndicatorInsets={largeTitle ? undefined : { bottom: tabBarHeight }}
    >
      <PageTitle>{t.title}</PageTitle>

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

const styles = StyleSheet.create({
  // D-19: no background, the route's ScreenFrame is the page (canvas and halo).
  screen: {
    flex: 1,
  },
  content: {
    gap: brandSpacing4.md,
  },
})
