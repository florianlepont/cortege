import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, RefreshControl, ScrollView, View } from "react-native"
import { AppText as Text } from "../ui/AppText"
import { Image as ExpoImage } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors } from "../app/brand-tokens"
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
import { SurveyProgressCard } from "../ui/SurveyProgressCard"
import { SyncStatusPill } from "../ui/SyncStatusPill"
import { SectorScoreCard } from "./home/SectorScoreCard"
import { styles } from "./home/styles"

// HOME-02: the hero becomes a "resume" action for a draft touched within the last 48h.
const RESUME_WINDOW_MS = 48 * 60 * 60 * 1000

type HomeScreenProps = {
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

function getFirstName(user: AuthUser | null): string {
  if (!user) return ""
  return user.first_name?.trim() || user.display_name?.split(" ")[0] || ""
}

function formatTodayDate(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())
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
  const insets = useSafeAreaInsets()
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
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [onRefresh])

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={brandColors.moss}
        />
      }
    >
      {/* ── Greeting ──────────────────────────────── */}
      <View style={styles.greeting}>
        <View>
          <Text style={styles.greetingTitle}>
            {firstName ? fr.home.greetingWithName({ name: firstName }) : fr.home.greeting}
          </Text>
          <Text style={styles.greetingDate}>{formatTodayDate()}</Text>
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
                <Ionicons name="person" size={20} color={brandColors.textSecondary} />
              </View>
            )}
          </Pressable>
        </View>
      </View>

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
            ? fr.home.hero.resumeTitle({
                name: resumeDraft.site_name || fr.common.untitledSurvey,
              })
            : fr.home.hero.title}
        </Text>
        <Text style={styles.heroBody}>
          {resumeDraft
            ? fr.home.hero.resumeBody({
                completed: Math.round(Math.max(0, Math.min(100, resumeDraft.completion_rate)) / 10),
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

      {/* ── Progression du brouillon repris ─────────── */}
      {resumeDraft ? (
        <View style={[styles.section, styles.resumeCardWrap]}>
          <SurveyProgressCard survey={resumeDraft} onPress={() => onOpenSurvey(resumeDraft.id)} />
        </View>
      ) : null}

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
          <AppNotice tone="info" icon="location-outline" message={fr.home.nearby.locationDenied} />
        ) : nearbyParcels.error ? (
          <AppNotice tone="warning" icon="wifi-outline" message={fr.home.nearby.loadError} />
        ) : nearbyParcels.loading ? (
          <View style={styles.loadingRow}>
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : nearbyParcels.parcels.length === 0 ? (
          <AppNotice tone="info" icon="leaf-outline" message={fr.home.nearby.empty} />
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
  )
}
