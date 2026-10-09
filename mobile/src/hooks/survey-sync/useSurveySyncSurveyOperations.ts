import { useCallback, useRef } from "react"
import { Alert } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { evaluateSubmitReadinessFromDraft } from "../../app/ibp-scoring"
import { getSubmitBlockReason } from "../../app/survey-logic"
import { fr, logStatusDetail, type StatusMessage } from "../../i18n"
import {
  discardSurveyLocalChanges,
  getLocalSurveyDraft,
  listLocalSurveys,
  LocalSurvey,
  queueDeleteAttachment,
  queueDeleteSurvey,
  queueLocalAttachment,
  retrySurveyNow,
  submitSurvey,
  syncPending,
  updateSurveyVisibility,
} from "../../storage"
import { deleteAttachmentFile } from "../../storage/attachment-files"
import { preparePhotoForStorage } from "../../storage/attachments"
import { isAuthRequiredError } from "../auth-errors"
import { assertSyncOwner, EnsureSyncOwner, isSyncOwnerMismatchError } from "./sync-owner-guard"
import { isSyncSuspendedError, SyncActivity } from "./sync-activity"
import { guessMimeType, isUnauthorizedResultMessage } from "./utils"

// D-04: the paths that drain the whole sync_queue honour the same owner gate as
// useSurveySyncNetwork — the change stays queued locally until then.
const text = fr.status.surveyOps

type SubmitReadiness = ReturnType<typeof evaluateSubmitReadinessFromDraft>

const surveyName = (survey: Pick<LocalSurvey, "site_name"> | undefined): string =>
  survey?.site_name?.trim() || fr.common.untitledSurvey

// D-06: names the missing pieces in French, without the survey id.
const describeReadiness = (name: string, readiness: SubmitReadiness) => {
  const parts: string[] = []
  if (readiness.missing_factors.length > 0) {
    parts.push(text.readiness.missingFactors({ factors: readiness.missing_factors.join(", ") }))
  }
  if (readiness.missing_fields.includes("region_version")) {
    parts.push(text.readiness.missingRegion)
  }
  if (readiness.missing_fields.includes("vegetation_stage")) {
    parts.push(text.readiness.missingVegetationStage)
  }
  if (readiness.missing_fields.includes("ibp_cas")) {
    parts.push(text.readiness.missingCas)
  }
  if (readiness.missing_fields.includes("ibp_method_version")) {
    parts.push(text.readiness.unsupportedMethod)
  }
  if (readiness.missing_fields.includes("parcel_ids")) {
    parts.push(text.readiness.missingParcels)
  }
  if (parts.length === 0) return text.notReadyGeneric({ name })
  return text.notReady({ name, details: parts.join(" ; ") })
}

type UseSurveySyncSurveyOperationsParams = {
  apiUrl: string
  accessToken: string
  selectedSurveyId: string | null
  editingSurveyId: string | null
  surveys: LocalSurvey[]
  clearSession: () => Promise<void>
  withAuthRetry: <T>(
    operation: (token: string, tokenSub: string | null) => Promise<T>,
  ) => Promise<T>
  refreshLocalSurveys: () => Promise<void>
  refreshLocalAttachments: () => Promise<void>
  onCloseSurveyDetail: () => void
  onStopEditing: () => void
  setStatus: (message: StatusMessage) => void
  maybeAutoSync: (trigger: string) => Promise<void>
  handleLoadCanonicalDetails: (surveyId: string, options?: { silent?: boolean }) => Promise<void>
  syncAllowed: boolean
  /** The connectivity probe of useSurveySyncNetwork: offline, the finish is postponed calmly. */
  isOnline: boolean
  ensureSyncOwner: EnsureSyncOwner
  syncActivity: SyncActivity
}

const readLocalSurvey = async (surveyId: string): Promise<LocalSurvey | undefined> =>
  (await listLocalSurveys()).find((survey) => survey.id === surveyId)

export function useSurveySyncSurveyOperations({
  apiUrl,
  accessToken,
  selectedSurveyId,
  editingSurveyId,
  surveys,
  clearSession,
  withAuthRetry,
  refreshLocalSurveys,
  refreshLocalAttachments,
  onCloseSurveyDetail,
  onStopEditing,
  setStatus,
  maybeAutoSync,
  handleLoadCanonicalDetails,
  syncAllowed,
  isOnline,
  ensureSyncOwner,
  syncActivity,
}: UseSurveySyncSurveyOperationsParams) {
  // Drains the queue only after the execution-time owner check passed for the
  // exact token about to be used (CR-01 / WR-01).
  const runOwnerGuardedSync = useCallback(
    () =>
      withAuthRetry(async (token, tokenSub) => {
        await assertSyncOwner(ensureSyncOwner, tokenSub)
        return syncActivity.run(() => syncPending(apiUrl, token))
      }),
    [apiUrl, ensureSyncOwner, syncActivity, withAuthRetry],
  )

  // D-25: the finish sends the survey's pending changes itself, quietly, before the submit call
  // (the server needs the latest upsert first). It goes through the same owner-guarded, single-flight
  // drain as the background sync, so the two never overlap. A drain already running is joined and
  // may have read the queue before the last edit was queued: a second round sends that edit. A
  // survey whose last send failed (backoff, not blocked) is retried at once, like "Réessayer".
  // Returns the survey as stored afterwards; the caller submits only when it reads "synced".
  const sendPendingChangesBeforeFinish = useCallback(
    async (surveyId: string): Promise<LocalSurvey | undefined> => {
      let current = await readLocalSurvey(surveyId)
      if (!current || current.sync_state === "synced" || current.sync_blocked === 1) return current
      if (current.sync_state === "failed") await retrySurveyNow(surveyId)
      for (let round = 0; round < 2; round += 1) {
        await runOwnerGuardedSync()
        current = await readLocalSurvey(surveyId)
        if (!current || current.sync_state !== "pending") break
      }
      return current
    },
    [runOwnerGuardedSync],
  )

  const queueAttachmentAsset = useCallback(
    async (
      surveyId: string,
      asset: ImagePicker.ImagePickerAsset,
      source: "camera" | "library",
      name: string,
    ): Promise<void> => {
      const mimeType = asset.mimeType ?? guessMimeType(asset.uri)

      const prepared = await preparePhotoForStorage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType,
      })

      try {
        await queueLocalAttachment({
          survey_id: surveyId,
          local_uri: prepared.uri,
          mime_type: prepared.mimeType,
          size_bytes: prepared.sizeBytes,
          captured_at: new Date().toISOString(),
          metadata: {
            source,
            file_name: asset.fileName ?? null,
            width: prepared.width,
            height: prepared.height,
            original_width: asset.width ?? null,
            original_height: asset.height ?? null,
          },
        })
      } catch (error) {
        await deleteAttachmentFile(prepared.uri)
        throw error
      }

      await refreshLocalAttachments()
      setStatus(source === "camera" ? text.cameraPhotoQueued({ name }) : text.photoQueued({ name }))
      void maybeAutoSync("attachment-queued")
    },
    [maybeAutoSync, refreshLocalAttachments, setStatus],
  )

  const finishSurvey = useCallback(
    async (surveyId: string): Promise<void> => {
      const name = surveyName(surveys.find((survey) => survey.id === surveyId))
      const blockReason = getSubmitBlockReason(surveyId, surveys)
      if (blockReason === "not_found") {
        setStatus(text.notFound())
        return
      }
      if (blockReason === "already_submitted") {
        setStatus(text.alreadySubmitted({ name }))
        return
      }
      if (blockReason === "survey_blocked") {
        setStatus(text.surveyConflict({ name }))
        return
      }
      if (blockReason === "name_required") {
        setStatus(text.nameRequired())
        return
      }

      try {
        const draft = await getLocalSurveyDraft(surveyId)
        if (!draft) {
          setStatus(text.notFound())
          return
        }

        const readiness = evaluateSubmitReadinessFromDraft({
          ibp_method_version: draft.ibp_method_version,
          ibp_cas: draft.ibp_cas,
          ibp_cas3_scale: draft.ibp_cas3_scale,
          region_version: draft.region_version,
          vegetation_stage: draft.vegetation_stage,
          factors: draft.factors,
          parcel_ids: draft.parcel_ids,
        })

        if (!readiness.ready) {
          setStatus(describeReadiness(name, readiness))
          return
        }
      } catch (error) {
        logStatusDetail("surveyOps.submitCheck", error)
        setStatus(text.submitCheckFailed({ name }))
        return
      }

      if (!syncAllowed || !isOnline) {
        setStatus(text.submitPostponed({ name }))
        return
      }

      try {
        const local = await sendPendingChangesBeforeFinish(surveyId)
        if (local && local.sync_state !== "synced") {
          await refreshLocalSurveys()
          await refreshLocalAttachments()
        }
        if (!local) {
          setStatus(text.notFound())
          return
        }
        if (local.sync_blocked === 1) {
          setStatus(text.surveyConflict({ name }))
          return
        }
        if (local.sync_state !== "synced") {
          setStatus(text.finishNotSentYet({ name }))
          return
        }
      } catch (error) {
        await refreshLocalSurveys()
        await refreshLocalAttachments()
        if (isAuthRequiredError(error)) {
          await clearSession()
          setStatus(text.submitLoginRequired())
          return
        }
        if (isSyncOwnerMismatchError(error) || isSyncSuspendedError(error)) {
          setStatus(text.submitPostponed({ name }))
          return
        }
        logStatusDetail("surveyOps.submitPendingChanges", error)
        setStatus(text.finishNotSentYet({ name }))
        return
      }

      try {
        const result = await withAuthRetry(async (token, tokenSub) => {
          await assertSyncOwner(ensureSyncOwner, tokenSub)
          const submitResult = await submitSurvey(apiUrl, token, surveyId)
          if (!submitResult.ok && isUnauthorizedResultMessage(submitResult.message)) {
            throw new Error(submitResult.message)
          }
          return submitResult
        })

        await refreshLocalSurveys()
        await refreshLocalAttachments()
        if (result.ok) {
          void handleLoadCanonicalDetails(surveyId, { silent: true })
        }
        if (result.ok && editingSurveyId === surveyId) {
          onStopEditing()
        }
        if (!result.ok) logStatusDetail("surveyOps.submit", result.message)
        setStatus(result.ok ? text.submitted({ name }) : text.submitRejected({ name }))
      } catch (error) {
        if (isAuthRequiredError(error)) {
          await clearSession()
          setStatus(text.submitLoginRequired())
          return
        }
        if (isSyncOwnerMismatchError(error)) {
          setStatus(text.submitPostponed({ name }))
          return
        }
        logStatusDetail("surveyOps.submit", error)
        setStatus(text.submitFailed({ name }))
      }
    },
    [
      apiUrl,
      clearSession,
      editingSurveyId,
      ensureSyncOwner,
      handleLoadCanonicalDetails,
      onStopEditing,
      isOnline,
      refreshLocalAttachments,
      refreshLocalSurveys,
      sendPendingChangesBeforeFinish,
      setStatus,
      surveys,
      syncAllowed,
      withAuthRetry,
    ],
  )

  // One finish at a time per survey: a second tap during the sync round or the submit call is
  // ignored, so the server never gets two submits for the same survey from this phone.
  const finishingSurveyIds = useRef(new Set<string>())
  const handleSubmitSurvey = useCallback(
    async (surveyId: string): Promise<void> => {
      if (finishingSurveyIds.current.has(surveyId)) return
      finishingSurveyIds.current.add(surveyId)
      try {
        await finishSurvey(surveyId)
      } finally {
        finishingSurveyIds.current.delete(surveyId)
      }
    },
    [finishSurvey],
  )

  const handleRetrySurvey = useCallback(
    async (surveyId: string): Promise<void> => {
      try {
        const result = await retrySurveyNow(surveyId)
        await refreshLocalSurveys()
        await refreshLocalAttachments()
        setStatus(text.retryQueued({ count: result.queued }))
      } catch (error) {
        logStatusDetail("surveyOps.retry", error)
        setStatus(text.retryFailed())
      }
    },
    [refreshLocalAttachments, refreshLocalSurveys, setStatus],
  )

  const handleDiscardSurvey = useCallback(
    async (surveyId: string): Promise<void> => {
      try {
        const result = await discardSurveyLocalChanges(surveyId)
        await refreshLocalSurveys()
        await refreshLocalAttachments()
        setStatus(text.discarded({ count: result.removed_queue }))
      } catch (error) {
        logStatusDetail("surveyOps.discard", error)
        setStatus(text.discardFailed())
      }
    },
    [refreshLocalAttachments, refreshLocalSurveys, setStatus],
  )

  const handleToggleVisibility = useCallback(
    async (surveyId: string, visibility: "private" | "public"): Promise<void> => {
      const label = text.visibility[visibility]
      try {
        // An empty token makes updateSurveyVisibility queue the change without
        // draining the queue itself; the owner-guarded sync below sends it.
        const queued = await updateSurveyVisibility(apiUrl, "", surveyId, visibility)
        if (!queued.queued || !accessToken) {
          await refreshLocalSurveys()
          setStatus(
            queued.queued
              ? text.visibilityQueuedLoginRequired({ visibility: label })
              : text.visibilityUnchanged({ visibility: label }),
          )
          return
        }

        if (!syncAllowed) {
          await refreshLocalSurveys()
          setStatus(text.visibilityQueuedOwnerPending({ visibility: label }))
          return
        }

        try {
          const result = await runOwnerGuardedSync()
          await refreshLocalSurveys()
          await refreshLocalAttachments()
          if (result.failed > 0) {
            setStatus(text.visibilitySyncWarning({ failed: result.failed }))
            return
          }
          void handleLoadCanonicalDetails(surveyId, { silent: true })
          setStatus(text.visibilitySynced({ visibility: label }))
        } catch (error) {
          await refreshLocalSurveys()
          await refreshLocalAttachments()
          if (isAuthRequiredError(error)) {
            await clearSession()
            setStatus(text.visibilityLoginRequired())
            return
          }
          if (isSyncOwnerMismatchError(error) || isSyncSuspendedError(error)) {
            setStatus(text.visibilityQueuedOwnerPending({ visibility: label }))
            return
          }
          logStatusDetail("surveyOps.visibilitySync", error)
          setStatus(text.visibilityQueuedSyncPending({ visibility: label }))
        }
      } catch (error) {
        logStatusDetail("surveyOps.visibility", error)
        setStatus(text.visibilityFailed())
      }
    },
    [
      accessToken,
      apiUrl,
      clearSession,
      handleLoadCanonicalDetails,
      refreshLocalAttachments,
      refreshLocalSurveys,
      runOwnerGuardedSync,
      setStatus,
      syncAllowed,
    ],
  )

  const confirmDeleteSurvey = useCallback(
    (surveyId: string): void => {
      Alert.alert(text.alerts.deleteSurvey.title, text.alerts.deleteSurvey.message, [
        { text: fr.common.actions.cancel, style: "cancel" },
        {
          text: fr.common.actions.delete,
          style: "destructive",
          onPress: () => {
            queueDeleteSurvey(surveyId)
              .then(async (result) => {
                await refreshLocalSurveys()
                await refreshLocalAttachments()
                if (result.queued_delete && selectedSurveyId === surveyId) {
                  onCloseSurveyDetail()
                }
                setStatus(result.queued_delete ? text.deletionQueued() : text.deleteNotFound())
                if (result.queued_delete) {
                  void maybeAutoSync("survey-delete-queued")
                }
              })
              .catch((error) => {
                logStatusDetail("surveyOps.deleteSurvey", error)
                setStatus(text.deleteFailed())
              })
          },
        },
      ])
    },
    [
      maybeAutoSync,
      onCloseSurveyDetail,
      refreshLocalAttachments,
      refreshLocalSurveys,
      selectedSurveyId,
      setStatus,
    ],
  )

  /**
   * Leaving the new-survey wizard before naming the site: the draft the wizard opened is empty, so
   * it goes at once (no alert, no status line) instead of piling up as "Relevé sans titre".
   */
  const handleDiscardEmptyDraft = useCallback(
    async (surveyId: string): Promise<void> => {
      try {
        const result = await queueDeleteSurvey(surveyId)
        await refreshLocalSurveys()
        await refreshLocalAttachments()
        if (!result.queued_delete) return
        if (selectedSurveyId === surveyId) onCloseSurveyDetail()
        void maybeAutoSync("survey-delete-queued")
      } catch (error) {
        logStatusDetail("surveyOps.discardEmptyDraft", error)
      }
    },
    [
      maybeAutoSync,
      onCloseSurveyDetail,
      refreshLocalAttachments,
      refreshLocalSurveys,
      selectedSurveyId,
    ],
  )

  const handleQueueAttachmentFromLibrary = useCallback(
    async (surveyId: string): Promise<void> => {
      const current = surveys.find((survey) => survey.id === surveyId)
      if (current?.status === "submitted") {
        setStatus(text.readOnly({ name: surveyName(current) }))
        return
      }

      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
          setStatus(text.mediaLibraryPermissionRequired())
          return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.8,
        })

        if (result.canceled || !result.assets?.[0]) {
          setStatus(text.noImageSelected())
          return
        }

        await queueAttachmentAsset(surveyId, result.assets[0], "library", surveyName(current))
      } catch (error) {
        logStatusDetail("surveyOps.queueAttachment", error)
        setStatus(text.attachmentQueueFailed())
      }
    },
    [queueAttachmentAsset, setStatus, surveys],
  )

  const handleQueueAttachmentFromCamera = useCallback(
    async (surveyId: string): Promise<void> => {
      const current = surveys.find((survey) => survey.id === surveyId)
      if (current?.status === "submitted") {
        setStatus(text.readOnly({ name: surveyName(current) }))
        return
      }

      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
          setStatus(text.cameraPermissionRequired())
          return
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.8,
        })

        if (result.canceled || !result.assets?.[0]) {
          setStatus(text.noPhotoCaptured())
          return
        }

        await queueAttachmentAsset(surveyId, result.assets[0], "camera", surveyName(current))
      } catch (error) {
        logStatusDetail("surveyOps.queueAttachment", error)
        setStatus(text.attachmentQueueFailed())
      }
    },
    [queueAttachmentAsset, setStatus, surveys],
  )

  const handleDeleteAttachment = useCallback(
    async (surveyId: string, localAttachmentId: string): Promise<void> => {
      const current = surveys.find((survey) => survey.id === surveyId)
      if (current?.status === "submitted") {
        setStatus(text.readOnly({ name: surveyName(current) }))
        return
      }

      try {
        const result = await queueDeleteAttachment(surveyId, localAttachmentId)
        if (!result.removed_local) {
          setStatus(text.attachmentNotFound())
          return
        }

        if (result.queued_delete && !syncAllowed) {
          await refreshLocalSurveys()
          await refreshLocalAttachments()
          setStatus(text.attachmentRemovedOwnerPending())
          return
        }

        if (result.queued_delete) {
          try {
            const syncResult = await runOwnerGuardedSync()
            await refreshLocalSurveys()
            await refreshLocalAttachments()
            setStatus(text.attachmentRemovedSynced({ failed: syncResult.failed }))
            return
          } catch (error) {
            if (isAuthRequiredError(error)) {
              await refreshLocalSurveys()
              await refreshLocalAttachments()
              setStatus(text.attachmentRemovedLoginRequired())
              return
            }
            if (isSyncOwnerMismatchError(error) || isSyncSuspendedError(error)) {
              await refreshLocalSurveys()
              await refreshLocalAttachments()
              setStatus(text.attachmentRemovedOwnerPending())
              return
            }
            await refreshLocalSurveys()
            await refreshLocalAttachments()
            logStatusDetail("surveyOps.deleteAttachmentSync", error)
            setStatus(text.attachmentRemovedSyncPending())
            return
          }
        }

        await refreshLocalSurveys()
        await refreshLocalAttachments()
        setStatus(text.attachmentRemoved())
      } catch (error) {
        logStatusDetail("surveyOps.deleteAttachment", error)
        setStatus(text.attachmentDeleteFailed())
      }
    },
    [
      refreshLocalAttachments,
      refreshLocalSurveys,
      runOwnerGuardedSync,
      setStatus,
      surveys,
      syncAllowed,
    ],
  )

  return {
    handleSubmitSurvey,
    handleRetrySurvey,
    handleDiscardSurvey,
    handleToggleVisibility,
    confirmDeleteSurvey,
    handleDiscardEmptyDraft,
    handleQueueAttachmentFromLibrary,
    handleQueueAttachmentFromCamera,
    handleDeleteAttachment,
  }
}
