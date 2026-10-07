import { useCallback, useEffect, useMemo, useState } from "react"
import { useHeaderHeight } from "@react-navigation/elements"
import { Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from "react-native"
import Animated from "react-native-reanimated"
import { AppText as Text } from "../ui/AppText"
import { Image as ExpoImage } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandRadius, brandSpacing4 } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { getFirstName } from "./home/first-name"
import { formatSyncErrorForUser } from "../app/formatters"
import { resolveSurveyUiStatus } from "../app/survey-logic"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import type { AuthUser } from "../app/types"
import type { LocalSurvey } from "../storage/types"
import type { SurveyStats } from "../app/types"
import { AppNotice } from "../ui/AppNotice"
import { AppSectionHeader } from "../ui/AppSectionHeader"
import { ScreenBackdrop } from "../ui/ScreenBackdrop"
import type { NearbyParcelsState } from "../hooks/useNearbyParcels"
import { fr } from "../i18n"
import { resolveProfilePictureUri } from "./account/IdentityCard"
import { Skeleton } from "../ui/Skeleton"
import { SyncStatusLine } from "../ui/SyncStatusLine"
import { useEntrance } from "../ui/useEntrance"
import { NearbyMapCard } from "./home/NearbyMapCard"
import { ResumeCard } from "./home/ResumeCard"
import { ToolsSection } from "./home/ToolsSection"
import { createStyles } from "./home/styles"

const MIN_MAP_HEIGHT = 240
const MAP_HEIGHT_RATIO = 0.34

/** OA-89: the least time the pull-to-refresh banner stays open. */
const MIN_REFRESH_MS = 800

// HOME-02: the hero becomes a "resume" action for a draft touched within the last 48h.
const RESUME_WINDOW_MS = 48 * 60 * 60 * 1000

type HomeScreenProps = {
  /** OA-85: the native iOS header carries the greeting and the profile button. */
  nativeHeader?: boolean
  currentUser: AuthUser | null
  accessToken: string | null
  apiUrl: string
  surveys: LocalSurvey[]
  surveyStats: SurveyStats
  isOnline: boolean
  isSyncing: boolean
  nearbyParcels: NearbyParcelsState
  onLoadNearbyParcels: () => void
  onCreateSurvey: () => void
  onCreateSurveyWithGenus: (genus: CnpfFactorAGenusCode) => void
  onAddGenusToSurvey: (surveyId: string, genus: CnpfFactorAGenusCode) => Promise<boolean>
  onOpenSurvey: (surveyId: string) => void
  onRetrySurvey: (surveyId: string) => Promise<void>
  onOpenSyncStatus: () => void
  onNavigateToExplorer: () => void
  onNavigateToAccount: () => void
  onRefresh: () => Promise<void>
}

/** The most recently updated draft, if it was touched within the resume window (HOME-02). */
export function pickResumeDraft(surveys: LocalSurvey[]): LocalSurvey | null {
  const candidates = surveys
    .filter((survey) => survey.status !== "submitted")
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
  const mostRecent = candidates[0]
  if (!mostRecent) return null
  const updatedAt = Date.parse(mostRecent.updated_at)
  if (!Number.isFinite(updatedAt)) return null
  return Date.now() - updatedAt <= RESUME_WINDOW_MS ? mostRecent : null
}

/** The worst survey needing attention: a conflict (blocked) outranks a plain sync error. */
export function pickAlertSurvey(surveys: LocalSurvey[]): LocalSurvey | null {
  return (
    surveys.find((survey) => resolveSurveyUiStatus(survey) === "sync_blocked") ??
    surveys.find((survey) => resolveSurveyUiStatus(survey) === "sync_error") ??
    null
  )
}

export function HomeScreen({
  nativeHeader = false,
  currentUser,
  accessToken,
  apiUrl,
  surveys,
  surveyStats,
  isOnline,
  isSyncing,
  nearbyParcels,
  onLoadNearbyParcels,
  onCreateSurvey,
  onCreateSurveyWithGenus,
  onAddGenusToSurvey,
  onOpenSurvey,
  onRetrySurvey,
  onOpenSyncStatus,
  onNavigateToExplorer,
  onNavigateToAccount,
  onRefresh,
}: HomeScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const entrance = useEntrance()
  // OA-85: iOS 26 lays the screen out under the native header, so the content reserves its height.
  const headerHeight = useHeaderHeight()
  const [refreshing, setRefreshing] = useState(false)
  // The map takes the room left under the hero (OA-19, Home redesign), never less than a card.
  const windowHeight = useWindowDimensions().height
  const mapHeight = Math.max(MIN_MAP_HEIGHT, Math.round(windowHeight * MAP_HEIGHT_RATIO))
  const firstName = getFirstName(currentUser)
  // HOME-06: the avatar shows the profile photo (it used to render nothing once one existed) and
  // is tappable to Compte.
  const profilePictureUri = useMemo(
    () => resolveProfilePictureUri(currentUser?.profile_picture_url, apiUrl),
    [apiUrl, currentUser?.profile_picture_url],
  )

  // The nearby parcels need the access token: loaded again once it arrives (OA-113, the card stayed
  // an empty placeholder when the token came after the first render).
  useEffect(() => {
    if (accessToken) onLoadNearbyParcels()
  }, [accessToken, onLoadNearbyParcels])

  const hasAlerts = surveyStats.blocked > 0 || surveyStats.failed > 0
  // The entrance stagger counts the sections actually shown: the alert notice is the first one.
  const firstSection = hasAlerts ? 1 : 0
  const isBlockedAlert = surveyStats.blocked > 0
  const alertSurvey = hasAlerts ? pickAlertSurvey(surveys) : null
  const resumeDraft = pickResumeDraft(surveys)
  // LIST-07: threads last_sync_error_code through, like SurveyRow/DetailActions already do, so
  // the same survey never shows two different error messages depending on which screen renders it.
  const failedAlertMessage = alertSurvey
    ? (formatSyncErrorForUser(alertSurvey.last_sync_error, alertSurvey.last_sync_error_code) ??
      fr.home.alerts.failedMessage)
    : fr.home.alerts.failedMessage

  // BUG-08 (UX audit, Phase 2): the pull-to-refresh gesture used to reflect no state at all.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // OA-89: with nothing to pull the request answers in a few ms and the iOS banner snapped
      // shut while the view was still moving, over the greeting. It stays open long enough to read.
      await Promise.all([
        onRefresh(),
        new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_MS)),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh])

  return (
    // OA-11: the scroll view starts below the status bar, so the pull-to-refresh spinner shows
    // instead of hiding under it. OA-12: a short text under the spinner says what it fetches.
    <View style={[styles.screen, { paddingTop: nativeHeader ? headerHeight : insets.top }]}>
      <ScreenBackdrop />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: nativeHeader ? brandSpacing4.md : brandSpacing4.md + brandSpacing4.xs,
            paddingBottom: insets.bottom + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={theme.semanticColors.accent}
            title={fr.home.refreshTitle}
            titleColor={theme.colors.textSecondary}
          />
        }
      >
        {nativeHeader ? (
          // OA-85, OA-88: the header holds the greeting and the profile button; the sync state is
          // a quiet line on its own row under it.
          <View style={styles.nativeHeaderSync}>
            <SyncStatusLine
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingCount={surveyStats.pending}
              onPress={onOpenSyncStatus}
            />
          </View>
        ) : (
          <View style={styles.greetingBlock}>
            <View style={styles.greeting}>
              {/* OA-15: no date (owner decision). OA-16: a long first name shrinks, then
                ellipsises, instead of pushing the avatar off screen. */}
              <View style={styles.greetingText}>
                <Text
                  style={styles.greetingTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {firstName ? fr.home.greetingWithName({ name: firstName }) : fr.home.greeting}
                </Text>
              </View>
              <Pressable
                style={styles.avatarButton}
                onPress={onNavigateToAccount}
                accessibilityRole="button"
                accessibilityLabel={fr.home.avatar}
              >
                {profilePictureUri ? (
                  <ExpoImage
                    source={{
                      uri: profilePictureUri,
                      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                    }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    accessible={false}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                  </View>
                )}
              </Pressable>
            </View>
            {/* SYNC-02: visible on the dashboard, not only in Settings. */}
            <SyncStatusLine
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingCount={surveyStats.pending}
              onPress={onOpenSyncStatus}
            />
          </View>
        )}

        {/* ── Alertes ───────────────────────────────── */}
        {hasAlerts ? (
          <Animated.View entering={entrance(0)} style={styles.notice}>
            <AppNotice
              tone={isBlockedAlert ? "danger" : "warning"}
              icon={isBlockedAlert ? "warning-outline" : "cloud-upload-outline"}
              title={
                isBlockedAlert
                  ? fr.home.alerts.blocked({ count: surveyStats.blocked })
                  : fr.home.alerts.failed({ count: surveyStats.failed })
              }
              message={isBlockedAlert ? fr.home.alerts.blockedMessage : failedAlertMessage}
              action={
                alertSurvey
                  ? {
                      label: isBlockedAlert
                        ? fr.home.alerts.actionView
                        : fr.home.alerts.actionRetry,
                      onPress: () => {
                        if (isBlockedAlert) {
                          onOpenSurvey(alertSurvey.id)
                        } else {
                          void onRetrySurvey(alertSurvey.id)
                        }
                      },
                    }
                  : undefined
              }
            />
          </Animated.View>
        ) : null}

        {/* ── Hero CTA (HOME-02: resume a recent draft, or start a new one) ──── */}
        <Animated.View entering={entrance(firstSection)} style={styles.block}>
          <ResumeCard
            resumeDraft={resumeDraft}
            onResume={onOpenSurvey}
            onCreateSurvey={onCreateSurvey}
          />
        </Animated.View>

        {/* ── Outils (OA-107) ───────────────────────── */}
        <Animated.View entering={entrance(firstSection + 1)}>
          <ToolsSection
            surveys={surveys}
            onAddGenusToSurvey={onAddGenusToSurvey}
            onStartSurveyWithGenus={onCreateSurveyWithGenus}
          />
        </Animated.View>

        {/* ── Parcelles proches ─────────────────────── */}
        <Animated.View entering={entrance(firstSection + 2)} style={styles.section}>
          <AppSectionHeader
            title={fr.home.nearby.title}
            trailing={
              <Pressable
                onPress={onNavigateToExplorer}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={fr.home.nearby.seeMapLabel}
              >
                <Text style={styles.trailingLink}>{fr.home.nearby.seeMap}</Text>
              </Pressable>
            }
            style={styles.sectionHeader}
          />

          {nearbyParcels.locationDenied ? (
            <View style={styles.pageInset}>
              <AppNotice
                tone="info"
                icon="location-outline"
                message={fr.home.nearby.locationDenied}
              />
            </View>
          ) : nearbyParcels.error ? (
            <View style={styles.pageInset}>
              <AppNotice tone="warning" icon="wifi-outline" message={fr.home.nearby.loadError} />
            </View>
          ) : nearbyParcels.loading || !nearbyParcels.position ? (
            <View style={styles.pageInset}>
              <Skeleton height={mapHeight} borderRadius={brandRadius.card} />
            </View>
          ) : (
            <View style={styles.pageInset}>
              <NearbyMapCard
                nearby={{ ...nearbyParcels, position: nearbyParcels.position }}
                height={mapHeight}
                onPress={onNavigateToExplorer}
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  )
}
