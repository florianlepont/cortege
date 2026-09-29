import { useCallback, useEffect, useMemo, useState } from "react"
import { useHeaderHeight } from "@react-navigation/elements"
import { Pressable, RefreshControl, ScrollView, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { Image as ExpoImage } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useBrandTheme } from "../app/theme"
import { getFirstName } from "./home/first-name"
import { formatSyncErrorForUser } from "../app/formatters"
import { resolveSurveyUiStatus } from "../app/survey-logic"
import type { AuthUser } from "../app/types"
import type { LocalSurvey } from "../storage/types"
import type { SurveyStats } from "../app/types"
import { AppButton } from "../ui/AppButton"
import { AppNotice } from "../ui/AppNotice"
import { AppSectionHeader } from "../ui/AppSectionHeader"
import { ParcelNearbyCard } from "../components/cards/ParcelNearbyCard"
import { hasMixedMethodVersions, type NearbyParcelsState } from "../hooks/useNearbyParcels"
import { fr } from "../i18n"
import { resolveProfilePictureUri } from "./account/IdentityCard"
import { SkeletonRow } from "../ui/Skeleton"
import { SyncStatusPill } from "../ui/SyncStatusPill"
import { SectorScoreCard } from "./home/SectorScoreCard"
import { createStyles } from "./home/styles"

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
    .filter((survey) => survey.status !== "submitted" && survey.status !== "expired")
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
  // OA-85: iOS 26 lays the screen out under the native header, so the content reserves its height.
  const headerHeight = useHeaderHeight()
  const [refreshing, setRefreshing] = useState(false)
  const firstName = getFirstName(currentUser)
  // HOME-06: the avatar shows the profile photo (it used to render nothing once one existed) and
  // is tappable to Compte.
  const profilePictureUri = useMemo(
    () => resolveProfilePictureUri(currentUser?.profile_picture_url, apiUrl),
    [apiUrl, currentUser?.profile_picture_url],
  )

  useEffect(() => {
    onLoadNearbyParcels()
  }, [onLoadNearbyParcels])

  const hasAlerts = surveyStats.blocked > 0 || surveyStats.failed > 0
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
    <View style={[styles.scroll, { paddingTop: nativeHeader ? headerHeight : insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: nativeHeader ? 16 : 20, paddingBottom: insets.bottom + 80 },
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
          // a labelled pill on its own row under it.
          <View style={styles.nativeHeaderSync}>
            <SyncStatusPill
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingCount={surveyStats.pending}
              onPress={onOpenSyncStatus}
            />
          </View>
        ) : (
          <View style={styles.greeting}>
            {/* OA-15: no date (owner decision). OA-16: a long first name shrinks, then ellipsises,
              instead of pushing the pill and the avatar off screen. */}
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
            <View style={styles.headerTrailing}>
              {/* SYNC-02: visible on the dashboard, not only in Settings. */}
              <SyncStatusPill
                isOnline={isOnline}
                isSyncing={isSyncing}
                pendingCount={surveyStats.pending}
                onPress={onOpenSyncStatus}
              />
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
          </View>
        )}

        {/* ── Alertes ───────────────────────────────── */}
        {hasAlerts ? (
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
                    label: isBlockedAlert ? fr.home.alerts.actionView : fr.home.alerts.actionRetry,
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
            style={styles.notice}
          />
        ) : null}

        {/* ── Hero CTA (HOME-02: resume a recent draft, or start a new one) ──── */}
        <View style={styles.heroCta}>
          <Text style={styles.heroEyebrow}>
            {resumeDraft ? fr.home.hero.resumeEyebrow : fr.home.hero.eyebrow}
          </Text>
          <Text style={styles.heroTitle}>
            {resumeDraft
              ? resumeDraft.site_name
                ? fr.home.hero.resumeTitle({ name: resumeDraft.site_name })
                : fr.home.hero.resumeTitleUnnamed
              : fr.home.hero.title}
          </Text>
          <Text style={styles.heroBody}>
            {resumeDraft
              ? fr.home.hero.resumeBody({
                  completed: Math.round(
                    Math.max(0, Math.min(100, resumeDraft.completion_rate)) / 10,
                  ),
                })
              : fr.home.hero.body}
          </Text>
          <AppButton
            label={resumeDraft ? fr.home.hero.resumeButton : fr.home.hero.button}
            leadingIcon={resumeDraft ? "play-outline" : "add"}
            size="lg"
            variant="primary"
            onPress={resumeDraft ? () => onOpenSurvey(resumeDraft.id) : onCreateSurvey}
            style={styles.heroButton}
            labelStyle={styles.heroButtonLabel}
          />
          {resumeDraft ? (
            <AppButton
              label={fr.home.hero.newSurveyButton}
              leadingIcon="add"
              size="md"
              variant="secondary"
              onPress={onCreateSurvey}
              style={styles.heroSecondaryButton}
              labelStyle={styles.heroSecondaryButtonLabel}
            />
          ) : null}
        </View>

        {/* ── Parcelles proches ─────────────────────── */}
        <View style={styles.section}>
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
          ) : nearbyParcels.loading ? (
            <View style={styles.loadingRow}>
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : nearbyParcels.parcels.length === 0 ? (
            // OA-19: the notices ran to the screen edges; they take the page margins like the cards.
            <View style={styles.pageInset}>
              <AppNotice tone="info" icon="leaf-outline" message={fr.home.nearby.empty} />
            </View>
          ) : (
            <View style={styles.parcelsList}>
              {nearbyParcels.parcels.map((parcel) => (
                <ParcelNearbyCard
                  key={parcel.parcel_id}
                  parcel={parcel}
                  distanceKm={parcel.distanceKm}
                  surveyCount={parcel.surveyCount}
                  onPress={onNavigateToExplorer}
                />
              ))}

              {nearbyParcels.sectorAvgScore != null ? (
                <SectorScoreCard
                  score={nearbyParcels.sectorAvgScore}
                  analysedCount={
                    nearbyParcels.parcels.filter((p) => p.latest_ibp_total != null).length
                  }
                  mixedMethods={hasMixedMethodVersions(nearbyParcels.parcels)}
                />
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
