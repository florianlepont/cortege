import { useCallback, useEffect, useRef, useState } from "react"
import * as Network from "expo-network"
import { hasPendingSyncWork, LocalSurvey, pullRemoteChanges, syncPending } from "../../storage"
import { fr, logStatusDetail } from "../../i18n"
import type { StatusMessage } from "../../i18n"
import { isAuthRequiredError, isAuthTemporarilyUnavailableError } from "../auth-errors"
import type { LocalDataOwnerStatus } from "../useLocalDataOwner"
import { assertSyncOwner, EnsureSyncOwner, isSyncOwnerMismatchError } from "./sync-owner-guard"
import { isSyncSuspendedError, SyncActivity } from "./sync-activity"
import { isOnlineNetworkState } from "./utils"

const text = fr.status.sync
const ownerText = fr.status.owner

// D-04: local data owned by another account suspends every automatic and
// manual sync/pull path until the conflict is resolved (owner-check status
// leaves "conflict" or turns "ok"). Only the "conflict" status may say so; any
// other blocking status ("checking", "error", "idle") means the owner check has
// not approved this session yet (WR-07).
function ownerGateMessage(ownerStatus: LocalDataOwnerStatus): StatusMessage {
  return ownerStatus === "conflict" ? ownerText.syncSuspended() : ownerText.checkPending()
}

type UseSurveySyncNetworkParams = {
  apiUrl: string
  accessToken: string | null
  surveys: LocalSurvey[]
  clearSession: () => Promise<void>
  withAuthRetry: <T>(fn: (token: string, tokenSub: string | null) => Promise<T>) => Promise<T>
  refreshLocalSurveys: () => Promise<void>
  refreshLocalAttachments: () => Promise<void>
  setStatus: (message: StatusMessage) => void
  syncAllowed: boolean
  ensureSyncOwner: EnsureSyncOwner
  ownerStatus: LocalDataOwnerStatus
  recheckOwner: () => Promise<void>
  syncActivity: SyncActivity
}

export function useSurveySyncNetwork({
  apiUrl,
  accessToken,
  surveys,
  clearSession,
  withAuthRetry,
  refreshLocalSurveys,
  refreshLocalAttachments,
  setStatus,
  syncAllowed,
  ensureSyncOwner,
  ownerStatus,
  recheckOwner,
  syncActivity,
}: UseSurveySyncNetworkParams) {
  const syncInProgressRef = useRef(false)
  const pullInProgressRef = useRef(false)
  const lastOnlineStateRef = useRef<boolean | null>(null)
  const lastAutoSyncAtRef = useRef<number>(0)
  const ownerStatusRef = useRef<LocalDataOwnerStatus>(ownerStatus)
  ownerStatusRef.current = ownerStatus

  // SYNC-02: reactive mirrors of the connectivity probe and the in-flight push/pull count, read by
  // SyncStatusLine. Optimistic defaults (online, not syncing) avoid a false "offline" flash before
  // the first network probe resolves; `lastOnlineStateRef` above stays the source of truth for the
  // auto-sync gating logic, which already treats "not confirmed online" as not online.
  const [isOnline, setIsOnline] = useState(true)
  const [activeSyncCount, setActiveSyncCount] = useState(0)

  // A manual sync or a new token retries a failed owner check (WR-07).
  const retryFailedOwnerCheck = useCallback((): void => {
    if (ownerStatusRef.current === "error") {
      void recheckOwner()
    }
  }, [recheckOwner])

  const runSync = useCallback(
    async (mode: "manual" | "auto"): Promise<void> => {
      if (!syncAllowed) {
        if (mode === "manual") {
          retryFailedOwnerCheck()
          setStatus(ownerGateMessage(ownerStatusRef.current))
        }
        return
      }

      if (syncInProgressRef.current) {
        if (mode === "manual") {
          setStatus(text.alreadyRunning())
        }
        return
      }

      syncInProgressRef.current = true
      setActiveSyncCount((count) => count + 1)
      try {
        setStatus(mode === "manual" ? text.inProgress() : text.autoInProgress())
        const result = await withAuthRetry(async (token, tokenSub) => {
          await assertSyncOwner(ensureSyncOwner, tokenSub)
          return syncActivity.run(() => syncPending(apiUrl, token))
        })
        await refreshLocalSurveys()
        await refreshLocalAttachments()
        setStatus(
          text.done({
            synced: result.synced,
            failed: result.failed,
            receivedCount: result.pulled_surveys + result.pulled_attachments,
          }),
        )
      } catch (error) {
        if (isSyncSuspendedError(error)) {
          if (mode === "manual") {
            setStatus(text.purgeInProgress())
          }
          return
        }
        if (isSyncOwnerMismatchError(error)) {
          setStatus(ownerText.recheckPending())
          return
        }
        if (isAuthTemporarilyUnavailableError(error)) {
          setStatus(text.retryLater())
          return
        }
        if (isAuthRequiredError(error)) {
          await clearSession()
          setStatus(mode === "manual" ? text.loginRequired() : text.pausedLoginRequired())
          return
        }
        logStatusDetail("sync.run", error)
        setStatus(text.failed())
      } finally {
        syncInProgressRef.current = false
        setActiveSyncCount((count) => count - 1)
      }
    },
    [
      apiUrl,
      clearSession,
      ensureSyncOwner,
      refreshLocalAttachments,
      refreshLocalSurveys,
      retryFailedOwnerCheck,
      setStatus,
      syncActivity,
      syncAllowed,
      withAuthRetry,
    ],
  )

  const maybeAutoSync = useCallback(
    async (trigger: string): Promise<void> => {
      if (!syncAllowed) {
        return
      }
      if (lastOnlineStateRef.current !== true) {
        return
      }
      if (!accessToken) {
        return
      }

      const cooldownMs = 15_000
      const now = Date.now()
      if (now - lastAutoSyncAtRef.current < cooldownMs) {
        return
      }

      const hasWork = await hasPendingSyncWork()
      lastAutoSyncAtRef.current = now

      if (hasWork) {
        await runSync("auto")
        return
      }

      const shouldPullServerChanges =
        trigger === "startup" || trigger === "auth-ready" || trigger === "reconnected"
      if (!shouldPullServerChanges || pullInProgressRef.current || syncInProgressRef.current) {
        return
      }

      pullInProgressRef.current = true
      setActiveSyncCount((count) => count + 1)
      try {
        const result = await withAuthRetry(async (token, tokenSub) => {
          await assertSyncOwner(ensureSyncOwner, tokenSub)
          return syncActivity.run(() => pullRemoteChanges(apiUrl, token))
        })
        if (result.surveys > 0 || result.attachments > 0) {
          await refreshLocalSurveys()
          await refreshLocalAttachments()
          setStatus(
            text.pulled({ surveyCount: result.surveys, attachmentCount: result.attachments }),
          )
        }
      } catch (error) {
        if (isSyncOwnerMismatchError(error) || isSyncSuspendedError(error)) {
          return
        }
        if (isAuthTemporarilyUnavailableError(error)) {
          setStatus(text.retryLater())
          return
        }
        if (isAuthRequiredError(error)) {
          await clearSession()
          setStatus(text.pausedLoginRequired())
          return
        }
      } finally {
        pullInProgressRef.current = false
        setActiveSyncCount((count) => count - 1)
      }
    },
    [
      accessToken,
      apiUrl,
      clearSession,
      ensureSyncOwner,
      refreshLocalAttachments,
      refreshLocalSurveys,
      runSync,
      setStatus,
      syncActivity,
      syncAllowed,
      withAuthRetry,
    ],
  )

  const handleSync = useCallback(async (): Promise<void> => {
    await runSync("manual")
  }, [runSync])

  const handlePullChanges = useCallback(async (): Promise<void> => {
    if (!syncAllowed) {
      retryFailedOwnerCheck()
      setStatus(ownerGateMessage(ownerStatusRef.current))
      return
    }
    setActiveSyncCount((count) => count + 1)
    try {
      setStatus(text.pulling())
      const result = await withAuthRetry(async (token, tokenSub) => {
        await assertSyncOwner(ensureSyncOwner, tokenSub)
        return syncActivity.run(() => pullRemoteChanges(apiUrl, token))
      })
      await refreshLocalSurveys()
      await refreshLocalAttachments()
      setStatus(text.pulled({ surveyCount: result.surveys, attachmentCount: result.attachments }))
    } catch (error) {
      if (isSyncSuspendedError(error)) {
        setStatus(text.purgeInProgress())
        return
      }
      if (isSyncOwnerMismatchError(error)) {
        setStatus(ownerText.recheckPending())
        return
      }
      if (isAuthTemporarilyUnavailableError(error)) {
        setStatus(text.retryLater())
        return
      }
      if (isAuthRequiredError(error)) {
        await clearSession()
        setStatus(text.pullLoginRequired())
        return
      }
      logStatusDetail("sync.pull", error)
      setStatus(text.pullFailed())
    } finally {
      setActiveSyncCount((count) => count - 1)
    }
  }, [
    apiUrl,
    clearSession,
    ensureSyncOwner,
    refreshLocalAttachments,
    refreshLocalSurveys,
    retryFailedOwnerCheck,
    setStatus,
    syncActivity,
    syncAllowed,
    withAuthRetry,
  ])

  useEffect(() => {
    let mounted = true

    const handleNetworkState = (state: Network.NetworkState): void => {
      const online = isOnlineNetworkState(state)
      const wasOnline = lastOnlineStateRef.current
      lastOnlineStateRef.current = online
      setIsOnline(online)

      if (online && wasOnline === false) {
        void maybeAutoSync("reconnected")
      }
    }

    void Network.getNetworkStateAsync()
      .then((state) => {
        if (!mounted) return
        handleNetworkState(state)
        if (isOnlineNetworkState(state)) {
          void maybeAutoSync("startup")
        }
      })
      .catch(() => undefined)

    const subscription = Network.addNetworkStateListener((state) => {
      if (!mounted) return
      handleNetworkState(state)
    })

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [maybeAutoSync])

  useEffect(() => {
    if (!accessToken) {
      return
    }
    void maybeAutoSync("auth-ready")
  }, [accessToken, syncAllowed, maybeAutoSync])

  // A new/refreshed token ("auth-ready") also retries a failed owner check.
  useEffect(() => {
    if (accessToken) {
      retryFailedOwnerCheck()
    }
  }, [accessToken, retryFailedOwnerCheck])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const intervalId = setInterval(() => {
      void maybeAutoSync("heartbeat")
    }, 30_000)

    return () => {
      clearInterval(intervalId)
    }
  }, [accessToken, maybeAutoSync])

  useEffect(() => {
    if (!accessToken) {
      return
    }
    void maybeAutoSync("local-queue-updated")
  }, [surveys, accessToken, syncAllowed, maybeAutoSync])

  return {
    handleSync,
    handlePullChanges,
    maybeAutoSync,
    isOnline,
    isSyncing: activeSyncCount > 0,
  }
}
